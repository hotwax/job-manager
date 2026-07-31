import Papa from "papaparse";

export type PayloadKey = "original" | "errors";
export type PayloadContentType = "json" | "csv" | "text";
export type CsvRow = Record<string, string>;

export type CsvPageResult = {
  cancelled: boolean;
  columns: string[];
  page: number;
  pageSize: number;
  rows: CsvRow[];
  totalMatches: number;
  totalRows: number;
};

export type JsonSearchResult = {
  path: string;
  value: string;
};

export type JsonSearchResponse = {
  cancelled: boolean;
  results: JsonSearchResult[];
  totalMatches: number;
  truncated: boolean;
};

export type ParsePayloadResult = {
  contentType: PayloadContentType;
  csvPage?: CsvPageResult;
  jsonPreview?: unknown;
  previewNodeCount?: number;
  previewTruncated: boolean;
  rawLength: number;
  textPreview?: string;
};

export type PayloadParserApi = {
  cancelSearch(payloadKey: PayloadKey, requestId: number): Promise<void>;
  clear(): Promise<void>;
  getCsvPage(
    payloadKey: PayloadKey,
    query: string,
    page: number,
    pageSize: number,
    requestId: number
  ): Promise<CsvPageResult>;
  getRawText(payloadKey: PayloadKey): Promise<string>;
  parsePayload(
    payloadKey: PayloadKey,
    raw: string,
    fileName: string | undefined,
    pageSize: number
  ): Promise<ParsePayloadResult>;
  releasePayload(payloadKey: PayloadKey): Promise<void>;
  searchJson(
    payloadKey: PayloadKey,
    query: string,
    requestId: number
  ): Promise<JsonSearchResponse>;
};

type CachedPayload = {
  contentType: PayloadContentType;
  csvColumns?: string[];
  csvRows?: CsvRow[];
  jsonData?: unknown;
  raw: string;
};

const JSON_COLLECTION_PREVIEW_LIMIT = 50;
const JSON_PREVIEW_NODE_LIMIT = 500;
const JSON_SEARCH_RESULT_LIMIT = 200;
const SEARCH_YIELD_INTERVAL = 2000;
const TEXT_PREVIEW_CHARACTER_LIMIT = 200000;
const WORKER_RAW_COPY_LIMIT = 1000000;

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const searchKey = (payloadKey: PayloadKey, requestId: number) => `${payloadKey}:${requestId}`;
const retainRawForCopy = (raw: string) => raw.length <= WORKER_RAW_COPY_LIMIT ? raw : "";

const appendJsonPath = (path: string, key: string | number, isArray: boolean) => {
  if(isArray) {return `${path}[${key}]`;}
  if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(key))) {return `${path}.${key}`;}

  return `${path}[${JSON.stringify(String(key))}]`;
};

const summarizeJsonValue = (value: unknown) => {
  if(value === null) {return "null";}
  if(Array.isArray(value)) {return `[${value.length} items]`;}
  if(typeof value === "object") {return `{${Object.keys(value as Record<string, unknown>).length} keys}`;}
  const text = String(value);

  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
};

const createJsonPreview = (root: unknown) => {
  let nodeCount = 0;
  let truncated = false;

  const visit = (value: unknown): unknown => {
    if(value === null || typeof value !== "object") {
      nodeCount += 1;

      return value;
    }

    if(nodeCount >= JSON_PREVIEW_NODE_LIMIT) {
      truncated = true;

      return "[Preview limit reached]";
    }

    nodeCount += 1;
    if(Array.isArray(value)) {
      const preview: unknown[] = [];
      const limit = Math.min(value.length, JSON_COLLECTION_PREVIEW_LIMIT);
      for(let index = 0; index < limit && nodeCount < JSON_PREVIEW_NODE_LIMIT; index += 1) {
        preview.push(visit(value[index]));
      }
      if(limit < value.length || nodeCount >= JSON_PREVIEW_NODE_LIMIT) {
        truncated = true;
        preview.push(`[${value.length - preview.length} more items]`);
      }

      return preview;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const preview: Record<string, unknown> = {};
    const limit = Math.min(entries.length, JSON_COLLECTION_PREVIEW_LIMIT);
    for(let index = 0; index < limit && nodeCount < JSON_PREVIEW_NODE_LIMIT; index += 1) {
      const [key, child] = entries[index];
      preview[key] = visit(child);
    }
    if(limit < entries.length || nodeCount >= JSON_PREVIEW_NODE_LIMIT) {
      truncated = true;
      let previewKey = "__preview__";
      while(Object.prototype.hasOwnProperty.call(preview, previewKey)) {
        previewKey = `_${previewKey}`;
      }
      preview[previewKey] = `${entries.length - Object.keys(preview).length} more properties`;
    }

    return preview;
  };

  const preview = visit(root);

  return {
    nodeCount,
    preview,
    truncated
  };
};

export const createPayloadParser = (): PayloadParserApi => {
  const payloads = new Map<PayloadKey, CachedPayload>();
  const cancelledSearches = new Set<string>();

  const cancelSearch = (payloadKey: PayloadKey, requestId: number) => {
    cancelledSearches.add(searchKey(payloadKey, requestId));

    return Promise.resolve();
  };

  const getCsvPage = async (
    payloadKey: PayloadKey,
    query: string,
    page: number,
    pageSize: number,
    requestId: number
  ): Promise<CsvPageResult> => {
    const payload = payloads.get(payloadKey);
    if(!payload?.csvRows || !payload.csvColumns) {
      throw new Error(`CSV payload ${payloadKey} is not available`);
    }

    const cancellationKey = searchKey(payloadKey, requestId);
    cancelledSearches.delete(cancellationKey);
    const normalizedQuery = query.trim().toLowerCase();
    let matches = payload.csvRows;

    if(normalizedQuery) {
      matches = [];
      for(let index = 0; index < payload.csvRows.length; index += 1) {
        const row = payload.csvRows[index];
        if(Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))) {
          matches.push(row);
        }
        if(index > 0 && index % SEARCH_YIELD_INTERVAL === 0) {
          await nextTask();
          if(cancelledSearches.has(cancellationKey)) {
            cancelledSearches.delete(cancellationKey);

            return {
              cancelled: true,
              columns: payload.csvColumns,
              page,
              pageSize,
              rows: [],
              totalMatches: 0,
              totalRows: payload.csvRows.length
            };
          }
        }
      }
    }

    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    const resolvedPage = Math.min(Math.max(page, 1), totalPages);
    const start = (resolvedPage - 1) * pageSize;
    cancelledSearches.delete(cancellationKey);

    return {
      cancelled: false,
      columns: payload.csvColumns,
      page: resolvedPage,
      pageSize,
      rows: matches.slice(start, start + pageSize),
      totalMatches: matches.length,
      totalRows: payload.csvRows.length
    };
  };

  const parsePayload = async (
    payloadKey: PayloadKey,
    raw: string,
    fileName: string | undefined,
    pageSize: number
  ): Promise<ParsePayloadResult> => {
    const normalizedFileName = (fileName || "").toLowerCase();
    const firstNonWhitespace = raw.match(/\S/)?.[0];
    const looksLikeJson = firstNonWhitespace === "{" || firstNonWhitespace === "[";
    const isCsvFile = normalizedFileName.endsWith(".csv");

    if(looksLikeJson && !isCsvFile) {
      try {
        const jsonData = JSON.parse(raw);
        const preview = createJsonPreview(jsonData);
        payloads.set(payloadKey, {
          contentType: "json",
          jsonData,
          raw: retainRawForCopy(raw)
        });

        return {
          contentType: "json",
          jsonPreview: preview.preview,
          previewNodeCount: preview.nodeCount,
          previewTruncated: preview.truncated,
          rawLength: raw.length
        };
      } catch {
        // Invalid JSON may still be CSV or plain text.
      }
    }

    const parsed = Papa.parse<CsvRow>(raw, {
      header: true,
      skipEmptyLines: true
    });
    const columns = parsed.meta.fields || [];
    const isStructuredCsv = parsed.data.length > 0 &&
      parsed.errors.length === 0 &&
      columns.length >= (isCsvFile ? 1 : 2);

    if(isStructuredCsv) {
      payloads.set(payloadKey, {
        contentType: "csv",
        csvColumns: columns,
        csvRows: parsed.data,
        raw: retainRawForCopy(raw)
      });
      const csvPage = await getCsvPage(payloadKey, "", 1, pageSize, 0);

      return {
        contentType: "csv",
        csvPage,
        previewTruncated: false,
        rawLength: raw.length
      };
    }

    payloads.set(payloadKey, {
      contentType: "text",
      raw: retainRawForCopy(raw)
    });

    return {
      contentType: "text",
      previewTruncated: raw.length > TEXT_PREVIEW_CHARACTER_LIMIT,
      rawLength: raw.length,
      textPreview: raw.slice(0, TEXT_PREVIEW_CHARACTER_LIMIT)
    };
  };

  const searchJson = async (
    payloadKey: PayloadKey,
    query: string,
    requestId: number
  ): Promise<JsonSearchResponse> => {
    const payload = payloads.get(payloadKey);
    if(payload?.contentType !== "json") {
      throw new Error(`JSON payload ${payloadKey} is not available`);
    }

    const normalizedQuery = query.trim().toLowerCase();
    if(!normalizedQuery) {
      return {
        cancelled: false,
        results: [],
        totalMatches: 0,
        truncated: false
      };
    }

    const cancellationKey = searchKey(payloadKey, requestId);
    cancelledSearches.delete(cancellationKey);
    const results: JsonSearchResult[] = [];
    let totalMatches = 0;
    let visited = 0;
    const stack: Array<{ path: string; value: unknown }> = [{ path: "$", value: payload.jsonData }];

    while(stack.length) {
      const current = stack.pop() as { path: string; value: unknown };
      visited += 1;
      if(current.value !== null && typeof current.value === "object") {
        const isArray = Array.isArray(current.value);
        const entries = Object.entries(current.value as Record<string, unknown>);
        for(let index = entries.length - 1; index >= 0; index -= 1) {
          const [key, value] = entries[index];
          const path = appendJsonPath(current.path, key, isArray);
          if(!isArray && key.toLowerCase().includes(normalizedQuery)) {
            totalMatches += 1;
            if(results.length < JSON_SEARCH_RESULT_LIMIT) {
              results.push({ path, value: summarizeJsonValue(value) });
            }
          }
          stack.push({ path, value });
        }
      } else if(summarizeJsonValue(current.value).toLowerCase().includes(normalizedQuery)) {
        totalMatches += 1;
        if(results.length < JSON_SEARCH_RESULT_LIMIT) {
          results.push({
            path: current.path,
            value: summarizeJsonValue(current.value)
          });
        }
      }

      if(visited % SEARCH_YIELD_INTERVAL === 0) {
        await nextTask();
        if(cancelledSearches.has(cancellationKey)) {
          cancelledSearches.delete(cancellationKey);

          return {
            cancelled: true,
            results: [],
            totalMatches: 0,
            truncated: false
          };
        }
      }
    }

    cancelledSearches.delete(cancellationKey);

    return {
      cancelled: false,
      results,
      totalMatches,
      truncated: totalMatches > results.length
    };
  };

  return {
    cancelSearch,
    clear: () => {
      payloads.clear();
      cancelledSearches.clear();

      return Promise.resolve();
    },
    getCsvPage,
    getRawText: (payloadKey: PayloadKey) => Promise.resolve(payloads.get(payloadKey)?.raw || ""),
    parsePayload,
    releasePayload: (payloadKey: PayloadKey) => {
      payloads.delete(payloadKey);

      return Promise.resolve();
    },
    searchJson
  };
};
