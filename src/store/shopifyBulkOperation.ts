import { api } from "@common";
import { defineStore, Store } from "pinia";
import logger from "@/logger";

interface DeferredTask {
  gid: string;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const probePromises = new WeakMap<Store, Promise<void> | null>();
const enrichmentLimiters = new WeakMap<Store, {
  activeCount: number;
  queue: DeferredTask[];
  inFlight: Map<string, Promise<any>>;
}>();

const ENRICHMENT_CONCURRENCY_LIMIT = 5;

function getLimiter(store: Store) {
  if (!enrichmentLimiters.has(store)) {
    enrichmentLimiters.set(store, { activeCount: 0, queue: [], inFlight: new Map() });
  }
  return enrichmentLimiters.get(store)!;
}

function processEnrichmentQueue(store: Store) {
  const limiter = getLimiter(store);
  while (limiter.activeCount < ENRICHMENT_CONCURRENCY_LIMIT && limiter.queue.length > 0) {
    const task = limiter.queue.shift();
    if (!task) break;

    limiter.activeCount++;
    const p = (async () => {
      try {
        const response = await api({
          url: ENRICHMENT_ENDPOINT,
          method: "GET",
          params: { remoteMessageId: task.gid, pageSize: 1 }
        });
        const message = response.data?.systemMessages?.[0];
        return { gid: task.gid, message: message?.remoteMessageId === task.gid ? message : undefined };
      } catch (err) {
        logger.error(`Failed to resolve the HotWax message for ${task.gid}`, err);
        return { gid: task.gid, message: undefined };
      } finally {
        limiter.inFlight.delete(task.gid);
        limiter.activeCount--;
        Promise.resolve().then(() => processEnrichmentQueue(store));
      }
    })();

    p.then(task.resolve).catch(task.reject);
  }
}

function enqueueEnrichment(store: Store, gid: string): Promise<any> {
  const limiter = getLimiter(store);
  if (limiter.inFlight.has(gid)) {
    return limiter.inFlight.get(gid)!;
  }
  const existingTask = limiter.queue.find(t => t.gid === gid);
  if (existingTask) {
    // If it's in queue, we just need to return a new promise that resolves when that task resolves
    return new Promise((resolve, reject) => {
        const origResolve = existingTask.resolve;
        const origReject = existingTask.reject;
        existingTask.resolve = (val) => { origResolve(val); resolve(val); };
        existingTask.reject = (err) => { origReject(err); reject(err); };
    });
  }

  const p = new Promise<any>((resolve, reject) => {
    limiter.queue.push({ gid, resolve, reject });
  });
  limiter.inFlight.set(gid, p);

  processEnrichmentQueue(store);
  return p;
}

// Shopify is the source of truth for this page: bulkOperations returns every bulk operation
// the HotWax app has run against the shop, with the live status, counts and signed result
// URL. HotWax SystemMessages are joined on afterwards to explain WHY each operation ran.
export const BULK_QUERY_PARENT_TYPE = "ShopifyBulkQuery";
export const BULK_IMPORT_PARENT_TYPE = "ShopifyBulkImport";
export const SHOPIFY_BULK_PARENT_TYPES = [BULK_QUERY_PARENT_TYPE, BULK_IMPORT_PARENT_TYPE];

export const SHOPIFY_BULK_GID_PREFIX = "gid://shopify/BulkOperation/";

// Shopify's own BulkOperationStatus enum. Terminal states stop the poll-for-progress hint.
export const SHOPIFY_STATUSES = ["CREATED", "RUNNING", "COMPLETED", "FAILED", "CANCELING", "CANCELED"];
export const SHOPIFY_IN_FLIGHT_STATUSES = ["CREATED", "RUNNING", "CANCELING"];
export const SHOPIFY_FAILED_STATUSES = ["FAILED", "CANCELED"];

// Connection page size. Shopify caps `first` at 250; the stats window uses that ceiling and
// the list stays small so each page stays a cheap query.
// BulkOperationsSortKeys is the whole sort surface Shopify exposes for this connection.
// COMPLETED_AT and CREATED_AT only diverge once operations run long, fail, or are still
// running (completedAt is null), so both are worth offering.
export const SORT_KEYS = ["CREATED_AT", "COMPLETED_AT"];

export const BULK_OPERATION_SORT_OPTIONS = [
  { label: "Newest created first", value: "createdNewest" },
  { label: "Oldest created first", value: "createdOldest" },
  { label: "Newest completed first", value: "completedNewest" },
  { label: "Oldest completed first", value: "completedOldest" }
];

// One semantic token per sort the user can pick, mapped to the sortKey/reverse pair it
// needs. Verified against the live shop: reverse:false is newest-first and reverse:true is
// oldest-first, the opposite way round from what the field name suggests.
export const BULK_OPERATION_SORT_QUERY: Record<string, { sortKey: string; reverse: boolean }> = {
  createdNewest: { sortKey: "CREATED_AT", reverse: false },
  createdOldest: { sortKey: "CREATED_AT", reverse: true },
  completedNewest: { sortKey: "COMPLETED_AT", reverse: false },
  completedOldest: { sortKey: "COMPLETED_AT", reverse: true }
};

export const DEFAULT_BULK_OPERATION_SORT = "createdNewest";

export const OPERATIONS_PAGE_SIZE = 25;
export const STATS_WINDOW_SIZE = 250;

// Resolving a Shopify operation to the HotWax message that requested it is a filter on the
// system messages list, not a resource of its own.
//
// Older instances accept remoteMessageId and silently ignore it, answering with the whole
// unfiltered set instead of an error. Probing with an id that cannot exist is what separates
// the two: an instance that honours the filter returns nothing, one that ignores it returns
// its newest messages. Checking a real response for a matching remoteMessageId is not enough
// on its own, because for the newest operation the unfiltered first row can be the very
// message being looked for.
const ENRICHMENT_ENDPOINT = "admin/systemMessages";
const ENRICHMENT_PROBE_ID = "gid://accxui/FilterSupportProbe/none";

export const getShopifyBulkOperationId = (gid: any) =>
  String(gid || "").startsWith(SHOPIFY_BULK_GID_PREFIX) ? String(gid).slice(SHOPIFY_BULK_GID_PREFIX.length) : String(gid || "");

const OPERATION_FIELDS = `
  id
  status
  errorCode
  type
  createdAt
  completedAt
  objectCount
  rootObjectCount
  fileSize
  url
  partialDataUrl
  query
`;

export const useShopifyBulkOperationStore = defineStore("shopifyBulkOperation", {
  state: () => ({
    operations: [] as any[],
    pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" },
    enrichmentIndex: {} as Record<string, any>,
    enrichmentAvailable: true,
    enrichmentProbed: false,
    stats: { total: 0, inFlight: 0, completed: 0, failed: 0, windowSize: 0, truncated: false },
    loading: false,
    isFetchingOperations: false,
    lastError: "",
    _fetchOperationsId: 0,
    _fetchStatsId: 0
  }),
  getters: {
    // One row per Shopify operation, with the HotWax message attached when we have it. An
    // absent match is meaningful rather than an error: the operation ran but no HotWax
    // pipeline record for it survives, so the row is shown and flagged instead of hidden.
    getEnrichedOperations: (state: any) => state.operations.map((operation: any) => ({
      ...operation,
      shopifyOperationId: getShopifyBulkOperationId(operation.id),
      objectCount: Number(operation.objectCount ?? 0),
      rootObjectCount: Number(operation.rootObjectCount ?? 0),
      fileSize: operation.fileSize ? Number(operation.fileSize) : 0,
      hotwaxMessage: state.enrichmentIndex[operation.id] || undefined
    })),
    getPageInfo: (state: any) => state.pageInfo,
    getStats: (state: any) => state.stats,
    isLoading: (state: any) => state.loading
  },
  actions: {
    // Every Shopify call goes through the OMS passthrough, which returns the GraphQL data
    // object directly on `response` (already unwrapped from the usual `data` envelope).
    async runShopifyQuery(systemMessageRemoteId: string, queryText: string, variables: Record<string, any>) {
      const response = await api({
        url: "shopify/graphql",
        method: "POST",
        data: { systemMessageRemoteId, queryText, variables }
      });

      const errors = response.data?.response?.errors;
      if(errors?.length) {
        throw new Error(errors.map((error: any) => error.message).join("; "));
      }

      return response.data?.response;
    },

    // Shopify filters with its own search syntax rather than query parameters, so the
    // selected facets are composed into a single `query` string.
    buildShopifyQuery(filters: Record<string, any> = {}) {
      const clauses = [];

      if(filters.status) {clauses.push(`status:${String(filters.status).toLowerCase()}`);}
      if(filters.operationType) {clauses.push(`operation_type:${String(filters.operationType).toLowerCase()}`);}
      if(filters.createdAfter) {clauses.push(`created_at:>${filters.createdAfter}`);}

      return clauses.join(" ");
    },

    async fetchOperations(payload: Record<string, any> = {}) {
      const { systemMessageRemoteId, cursor, direction } = payload;
      const fetchId = ++this._fetchOperationsId;

      if(!systemMessageRemoteId) {
        this.lastError = "No Shopify shop is configured for this product store";
        this.operations = [];
        this.pageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" };
        this.loading = false;
        this.isFetchingOperations = false;
        return;
      }

      this.loading = true;
      this.isFetchingOperations = true;
      this.lastError = "";

      // Paging backwards needs `last`/`before`; Shopify rejects mixing them with `first`.
      const isBackward = direction === "previous" && cursor;
      const variables: Record<string, any> = isBackward
        ? { last: OPERATIONS_PAGE_SIZE, before: cursor }
        : { first: OPERATIONS_PAGE_SIZE, after: cursor || null };

      const shopifyQuery = this.buildShopifyQuery(payload);
      if(shopifyQuery) {variables.query = shopifyQuery;}

      // Verified against the live shop: reverse:false is newest-first and reverse:true is
      // oldest-first, the opposite way round from what the field name suggests.
      variables.sortKey = SORT_KEYS.includes(payload.sortKey) ? payload.sortKey : "CREATED_AT";
      variables.reverse = payload.sortReverse === true;

      const queryText = `query bulkOperations($first: Int, $last: Int, $after: String, $before: String, $query: String, $sortKey: BulkOperationsSortKeys, $reverse: Boolean) {
  bulkOperations(first: $first, last: $last, after: $after, before: $before, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges {
      cursor
      node {${OPERATION_FIELDS}}
    }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
  }
}`;

      try {
        const data = await this.runShopifyQuery(systemMessageRemoteId, queryText, variables);
        if (fetchId !== this._fetchOperationsId) return;

        const connection = data?.bulkOperations;

        this.operations = (connection?.edges ?? []).map((edge: any) => edge.node);
        this.pageInfo = {
          hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
          hasPreviousPage: connection?.pageInfo?.hasPreviousPage ?? false,
          startCursor: connection?.pageInfo?.startCursor ?? "",
          endCursor: connection?.pageInfo?.endCursor ?? ""
        };
      } catch (err: any) {
        if (fetchId !== this._fetchOperationsId) return;
        logger.error("Failed to fetch Shopify bulk operations", err);
        this.lastError = err?.message || "Failed to load bulk operations from Shopify";
        this.operations = [];
        this.pageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" };
      } finally {
        if (fetchId === this._fetchOperationsId) {
          this.loading = false;
          this.isFetchingOperations = false;
        }
      }
    },

    // A Shopify connection has no total count, so the tiles describe a bounded recent window
    // instead of pretending to summarise all history.
    async fetchStats(payload: Record<string, any> = {}) {
      const { systemMessageRemoteId } = payload;
      const fetchId = ++this._fetchStatsId;

      if(!systemMessageRemoteId) {
        this.stats = { total: 0, inFlight: 0, completed: 0, failed: 0, windowSize: 0, truncated: false };
        return;
      }

      const shopifyQuery = this.buildShopifyQuery(payload);
      const variables: Record<string, any> = { first: STATS_WINDOW_SIZE };
      if(shopifyQuery) {variables.query = shopifyQuery;}
      variables.sortKey = SORT_KEYS.includes(payload.sortKey) ? payload.sortKey : "CREATED_AT";
      variables.reverse = payload.sortReverse === true;

      const queryText = `query bulkOperationStats($first: Int!, $query: String, $sortKey: BulkOperationsSortKeys, $reverse: Boolean) {
  bulkOperations(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges { node { id status } }
    pageInfo { hasNextPage }
  }
}`;

      try {
        const data = await this.runShopifyQuery(systemMessageRemoteId, queryText, variables);
        if (fetchId !== this._fetchStatsId) return;

        const nodes = (data?.bulkOperations?.edges ?? []).map((edge: any) => edge.node);

        this.stats = {
          total: nodes.length,
          inFlight: nodes.filter((node: any) => SHOPIFY_IN_FLIGHT_STATUSES.includes(node.status)).length,
          completed: nodes.filter((node: any) => node.status === "COMPLETED").length,
          failed: nodes.filter((node: any) => SHOPIFY_FAILED_STATUSES.includes(node.status)).length,
          windowSize: nodes.length,
          truncated: data?.bulkOperations?.pageInfo?.hasNextPage ?? false
        };
      } catch (err) {
        if (fetchId !== this._fetchStatsId) return;
        logger.error("Failed to fetch Shopify bulk operation stats", err);
        this.stats = { total: 0, inFlight: 0, completed: 0, failed: 0, windowSize: 0, truncated: false };
      }
    },

    // One-time check that this instance actually applies the remoteMessageId filter. An
    // instance that ignores it would hand back arbitrary messages, so enrichment is switched
    // off entirely rather than attaching a wrong job to a row.
    async ensureEnrichmentSupported() {
      if (this.enrichmentProbed) {
        return;
      }

      let probePromise = probePromises.get(this as any);
      if (!probePromise) {
        probePromise = (async () => {
          try {
            const response = await api({
              url: ENRICHMENT_ENDPOINT,
              method: "GET",
              params: { remoteMessageId: ENRICHMENT_PROBE_ID, pageSize: 1 }
            });

            this.enrichmentAvailable = !response.data?.systemMessages?.length;
          } catch (err: any) {
            if (err?.response?.status === 404) {
              this.enrichmentAvailable = false;
              return;
            }

            logger.error("Failed to check whether this instance filters system messages by remote id", err);
            this.enrichmentAvailable = false;
          } finally {
            this.enrichmentProbed = true;
            probePromises.set(this as any, null);
          }
        })();
        probePromises.set(this as any, probePromise);
      }

      return probePromise;
    },

    // Resolves each Shopify operation to the HotWax message that requested it, keyed by the
    // GID that HotWax stores as remoteMessageId. Results are cached across pages so paging
    // back never refetches.
    async fetchEnrichmentFor(operations: any[], force = false) {
      await this.ensureEnrichmentSupported();

      if(!this.enrichmentAvailable) {
        return;
      }

      const pending = operations
        .map((operation: any) => operation?.id)
        .filter((gid: string) => gid?.startsWith(SHOPIFY_BULK_GID_PREFIX))
        .filter((gid: string) => force || !(gid in this.enrichmentIndex));

      const uniquePending = [...new Set(pending)];
      if(!uniquePending.length) {
        return;
      }

      const promises = uniquePending.map(gid => enqueueEnrichment(this as any, gid));
      const results = await Promise.all(promises);

      // A miss is cached as null so a Shopify operation with no HotWax record is not looked
      // up again on every revisit.
      results.forEach((result: any) => {
        // Only update if it wasn't already populated while we were waiting (if force=false)
        if (force || !(result.gid in this.enrichmentIndex)) {
          this.enrichmentIndex[result.gid] = result.message ?? null;
        }
      });
    },

    clearOperations() {
      this.operations = [];
      this.pageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" };
    }
  }
});
