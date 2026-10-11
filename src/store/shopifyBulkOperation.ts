import { api, translate } from "@common";
import { defineStore } from "pinia";
import logger from "@/logger";
import { getShopDefaultAppRemoteId } from "@/utils";

// Shopify is the source of truth for this page: bulkOperations returns every bulk operation
// the HotWax app has run against the shop, with the live status, counts and signed result
// URL. HotWax SystemMessages are joined on afterwards to explain WHY each operation ran.
export const SHOPIFY_BULK_GID_PREFIX = "gid://shopify/BulkOperation/";

// Shopify's own BulkOperationStatus and BulkOperationType enums, with the label each one shows.
export const SHOPIFY_STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELING: "Canceling",
  CANCELED: "Canceled"
};
export const SHOPIFY_OPERATION_TYPE_LABELS: Record<string, string> = {
  QUERY: "Query",
  MUTATION: "Mutation"
};
export const SHOPIFY_STATUSES = Object.keys(SHOPIFY_STATUS_LABELS);
export const SHOPIFY_IN_FLIGHT_STATUSES = ["CREATED", "RUNNING", "CANCELING"];
export const SHOPIFY_FAILED_STATUSES = ["FAILED", "CANCELED"];

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

// Shopify caps `first` at 250; the stats window uses that ceiling and the list stays small so
// each page stays a cheap query.
export const OPERATIONS_PAGE_SIZE = 25;
export const STATS_WINDOW_SIZE = 250;
// The tiles always count the newest operations, whatever order the list is sorted in, so
// the window they name stays the same one.
const STATS_SORT = { sortKey: "CREATED_AT", reverse: false };

// Resolving a Shopify operation to the HotWax message that requested it is a filter on the
// system messages list, not a resource of its own, and instances differ in which filters they
// know. One that does not know a filter strips it and answers with the unfiltered list instead
// of an error, so probing with an id that cannot exist separates them: an instance that applies
// the filter returns nothing, one that strips it returns its newest messages.
//   batch  - remoteMessageIds (hotwax-maarg-util#296): one request resolves a whole page
//   single - remoteMessageId only (hotwax-maarg-util#222): one request per operation
//   none   - neither: the page shows Shopify data only
const ENRICHMENT_ENDPOINT = "admin/systemMessages";
const ENRICHMENT_PROBE_ID = "gid://accxui/FilterSupportProbe/none";
// GIDs travel comma separated in the query string, so a batch is capped to keep the URL short.
const ENRICHMENT_BATCH_SIZE = 50;
// Without the batch filter each operation is its own request; a few at a time keeps a page
// from sending all of them at once.
const ENRICHMENT_SINGLE_CONCURRENCY = 5;

let enrichmentModeProbe: Promise<string> | null = null;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for(let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const isFilterApplied = async (params: Record<string, any>) => {
  const response = await api({ url: ENRICHMENT_ENDPOINT, method: "GET", params: { ...params, pageSize: 1 } });

  return !response.data?.systemMessages?.length;
};

const fetchMessagesByRemoteIds = async (mode: string, gids: string[]) => {
  if(mode === "batch") {
    const responses = await Promise.all(chunk(gids, ENRICHMENT_BATCH_SIZE).map((ids) => api({
      url: ENRICHMENT_ENDPOINT,
      method: "GET",
      params: { remoteMessageIds: ids.join(","), pageSize: ids.length }
    })));

    return responses.flatMap((response: any) => response.data?.systemMessages ?? []);
  }

  const messages: any[] = [];
  for(const ids of chunk(gids, ENRICHMENT_SINGLE_CONCURRENCY)) {
    const responses = await Promise.all(ids.map((gid) => api({
      url: ENRICHMENT_ENDPOINT,
      method: "GET",
      params: { remoteMessageId: gid, pageSize: 1 }
    }).catch((err: any) => {
      logger.error(`Bulk Operation [Shopify Operation ID: ${gid}] - Failed to resolve HotWax message`, err);

      return undefined;
    })));
    messages.push(...responses.flatMap((response: any) => response?.data?.systemMessages ?? []));
  }

  return messages;
};

const getShopifyBulkOperationId = (gid: any) =>
  String(gid || "").startsWith(SHOPIFY_BULK_GID_PREFIX) ? String(gid).slice(SHOPIFY_BULK_GID_PREFIX.length) : String(gid || "");

// Accepts what people paste: the number shown on a card (#11339280253092) or the full
// gid://shopify/BulkOperation/... id, one or several separated by spaces or commas.
export const parseOperationIds = (text: string): string[] => [...new Set(String(text || "")
  .split(/[\s,]+/)
  .map((token) => getShopifyBulkOperationId(token.replace(/^#/, "")))
  .filter((token) => /^\d+$/.test(token)))];

const OPERATION_FIELDS = "id status errorCode type createdAt completedAt objectCount rootObjectCount fileSize url partialDataUrl query";

// One query serves both views: a single shop pages with its cursors, several shops pass none.
const OPERATIONS_QUERY = `query bulkOperations($first: Int, $last: Int, $after: String, $before: String, $query: String, $sortKey: BulkOperationsSortKeys, $reverse: Boolean) {
  bulkOperations(first: $first, last: $last, after: $after, before: $before, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges { node { ${OPERATION_FIELDS} } }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
  }
}`;

const STATS_QUERY = `query bulkOperationStats($first: Int!, $query: String, $sortKey: BulkOperationsSortKeys, $reverse: Boolean) {
  bulkOperations(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges { node { id status } }
    pageInfo { hasNextPage }
  }
}`;

const toPageInfo = (info: any = {}) => ({
  hasNextPage: !!info.hasNextPage,
  hasPreviousPage: !!info.hasPreviousPage,
  startCursor: info.startCursor ?? "",
  endCursor: info.endCursor ?? ""
});

const emptyStats = () => ({ total: 0, inFlight: 0, completed: 0, failed: 0, truncated: false });

// Shopify's own error text, such as a missing access scope, is what an admin needs to act on, so
// it is kept, inside a sentence that can be translated.
const getLoadError = (err: any) => err?.message
  ? translate("Failed to load bulk operations from Shopify: {reason}", { reason: err.message })
  : translate("Failed to load bulk operations from Shopify");

// Every Shopify call goes through the OMS passthrough, which returns the GraphQL data object
// directly on `response` (already unwrapped from the usual `data` envelope).
const runShopifyQuery = async (systemMessageRemoteId: string, queryText: string, variables: Record<string, any>) => {
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
};

// Runs one query against each shop's remote. One shop failing must not blank the others, so
// each settles on its own and the failures come back by remote.
const queryShops = async (remoteIds: string[], queryText: string, variables: Record<string, any>) => {
  const settled = await Promise.allSettled(remoteIds.map((remoteId) => runShopifyQuery(remoteId, queryText, variables)));
  const connections: { remoteId: string; connection: any }[] = [];
  const failed: { remoteId: string; error: any }[] = [];

  settled.forEach((result, index) => {
    const remoteId = remoteIds[index];
    if(result.status === "fulfilled") {
      connections.push({ remoteId, connection: result.value?.bulkOperations });
    } else {
      logger.error(`Bulk Operation [System Message Remote ID: ${remoteId}] - Failed to fetch`, result.reason);
      failed.push({ remoteId, error: result.reason });
    }
  });

  return { connections, failed };
};

const getRemoteIds = (payload: Record<string, any>): string[] => (payload.systemMessageRemoteIds ?? []).filter(Boolean);

export const useShopifyBulkOperationStore = defineStore("shopifyBulkOperation", {
  state: () => ({
    operations: [] as any[],
    pageInfo: toPageInfo(),
    shops: [] as any[],
    combinedShopCount: 0,
    failedRemoteIds: [] as string[],
    enrichmentIndex: {} as Record<string, any>,
    enrichmentMode: "",
    stats: emptyStats(),
    isFetchingOperations: false,
    lastError: "",
    _fetchOperationsId: 0,
    _fetchStatsId: 0,
    _fetchEnrichmentId: 0
  }),
  getters: {
    // One row per Shopify operation, with the HotWax message attached when we have it. An
    // absent match is meaningful rather than an error: the operation ran but no HotWax
    // pipeline record for it survives, so the row is shown and flagged instead of hidden.
    getEnrichedOperations: (state: any) => state.operations.map((operation: any) => ({
      ...operation,
      shopifyOperationId: getShopifyBulkOperationId(operation.id),
      shopName: (state.shops.find((shop: any) => shop.systemMessageRemoteId === operation.systemMessageRemoteId) || {}).name,
      objectCount: Number(operation.objectCount ?? 0),
      rootObjectCount: Number(operation.rootObjectCount ?? 0),
      hotwaxMessage: state.enrichmentIndex[operation.id] || undefined
    })),
    // Optimistic until the probe says otherwise, so the HotWax row and facet do not flicker in.
    enrichmentAvailable: (state: any) => state.enrichmentMode !== "none",
    getPageInfo: (state: any) => state.pageInfo,
    getStats: (state: any) => state.stats
  },
  actions: {
    // Shopify filters with its own search syntax rather than query parameters, so the
    // selected facets are composed into a single `query` string.
    buildShopifyQuery(filters: Record<string, any> = {}) {
      const clauses = [];

      if(filters.status) {clauses.push(`status:${String(filters.status).toLowerCase()}`);}
      if(filters.operationType) {clauses.push(`operation_type:${String(filters.operationType).toLowerCase()}`);}
      if(filters.createdAfter) {clauses.push(`created_at:>${filters.createdAfter}`);}
      if(filters.createdBefore) {clauses.push(`created_at:<${filters.createdBefore}`);}

      // Several ids are one OR group, so the other clauses still narrow all of them.
      const ids = filters.operationIds ?? [];
      if(ids.length) {
        const idClause = ids.map((id: string) => `id:${id}`).join(" OR ");
        clauses.push(ids.length > 1 ? `(${idClause})` : idClause);
      }

      return clauses.join(" ");
    },

    // A shop can be mapped to several remotes and only purposeTypeId says which is its Shopify
    // app, so the remote comes from the shopRemotes the ShopifyShop master nests on each row.
    // This is the shops resource Maarg serves; the connector's sob/shopify/shops answers 404 there.
    async fetchShops() {
      try {
        const resp = await api({ url: "oms/shopifyShops/shops", method: "GET", params: { pageSize: 100 } });

        this.shops = (Array.isArray(resp.data) ? resp.data : [])
          .map((shop: any) => ({
            name: shop.name || shop.myshopifyDomain || shop.shopId,
            productStoreId: shop.productStoreId,
            systemMessageRemoteId: getShopDefaultAppRemoteId(shop)
          }))
          .filter((shop: any) => shop.systemMessageRemoteId);
      } catch (err) {
        logger.error("Shop [System: Shopify] - Failed to fetch", err);
        this.shops = [];
      }
    },

    // Each shop has its own cursor space, so one shop pages with Shopify's cursors while several
    // show the most recent page from each, merged by date, with paging off.
    async fetchOperations(payload: Record<string, any> = {}) {
      const remoteIds = getRemoteIds(payload);
      const fetchId = ++this._fetchOperationsId;

      this.failedRemoteIds = [];
      this.lastError = "";

      if(!remoteIds.length) {
        this.lastError = translate("No Shopify shop is configured for this product store");
        this.operations = [];
        this.pageInfo = toPageInfo();
        this.isFetchingOperations = false;

        return;
      }

      this.isFetchingOperations = true;

      const isSingleShop = remoteIds.length === 1;
      const sortKey = SORT_KEYS.includes(payload.sortKey) ? payload.sortKey : "CREATED_AT";
      const reverse = payload.sortReverse === true;
      // Paging backwards needs `last`/`before`; Shopify rejects mixing them with `first`.
      const isBackward = isSingleShop && payload.direction === "previous" && payload.cursor;
      const variables: Record<string, any> = isBackward
        ? { last: OPERATIONS_PAGE_SIZE, before: payload.cursor, sortKey, reverse }
        : { first: OPERATIONS_PAGE_SIZE, after: (isSingleShop && payload.cursor) || null, sortKey, reverse };
      const shopifyQuery = this.buildShopifyQuery(payload);
      if(shopifyQuery) {variables.query = shopifyQuery;}

      try {
        const { connections, failed } = await queryShops(remoteIds, OPERATIONS_QUERY, variables);
        if(fetchId !== this._fetchOperationsId) {return;}

        if(!connections.length) {
          this.lastError = getLoadError(failed[0]?.error);
          this.operations = [];
          this.pageInfo = toPageInfo();

          return;
        }

        const operations = connections.flatMap(({ remoteId, connection }) =>
          (connection?.edges ?? []).map((edge: any) => ({ ...edge.node, systemMessageRemoteId: remoteId })));

        // Shopify already orders one shop's page; merged pages are ordered here by the same key.
        if(!isSingleShop) {
          const dateField = sortKey === "COMPLETED_AT" ? "completedAt" : "createdAt";
          const time = (operation: any) => operation[dateField] ? Date.parse(operation[dateField]) : 0;
          operations.sort((a: any, b: any) => reverse ? time(a) - time(b) : time(b) - time(a));
        }

        this.operations = operations;
        this.pageInfo = isSingleShop ? toPageInfo(connections[0].connection?.pageInfo) : toPageInfo();
        this.combinedShopCount = connections.length;
        // Shops that failed while others loaded are named, so a partial list is not mistaken
        // for a complete one.
        this.failedRemoteIds = failed.map(({ remoteId }) => remoteId);
      } finally {
        if(fetchId === this._fetchOperationsId) {
          this.isFetchingOperations = false;
        }
      }
    },

    // A Shopify connection has no total count, so the tiles count a bounded window of the newest
    // operations. Several shops sum their windows, truncated if any one was.
    async fetchStats(payload: Record<string, any> = {}) {
      const remoteIds = getRemoteIds(payload);
      const fetchId = ++this._fetchStatsId;

      if(!remoteIds.length) {
        this.stats = emptyStats();

        return;
      }

      const variables: Record<string, any> = { first: STATS_WINDOW_SIZE, ...STATS_SORT };
      const shopifyQuery = this.buildShopifyQuery(payload);
      if(shopifyQuery) {variables.query = shopifyQuery;}

      const { connections } = await queryShops(remoteIds, STATS_QUERY, variables);
      if(fetchId !== this._fetchStatsId) {return;}

      const nodes = connections.flatMap(({ connection }) => (connection?.edges ?? []).map((edge: any) => edge.node));
      const countOf = (statuses: string[]) => nodes.filter((node: any) => statuses.includes(node.status)).length;

      this.stats = {
        total: nodes.length,
        inFlight: countOf(SHOPIFY_IN_FLIGHT_STATUSES),
        completed: countOf(["COMPLETED"]),
        failed: countOf(SHOPIFY_FAILED_STATUSES),
        truncated: connections.some(({ connection }) => connection?.pageInfo?.hasNextPage)
      };
    },

    // Decided once per session and shared by every caller while the probe is in flight. A probe
    // that errors is not remembered, so a transient failure does not switch enrichment off for
    // the rest of the session.
    ensureEnrichmentMode(): Promise<string> {
      if(this.enrichmentMode) {
        return Promise.resolve(this.enrichmentMode);
      }

      if(!enrichmentModeProbe) {
        enrichmentModeProbe = (async () => {
          try {
            if(await isFilterApplied({ remoteMessageIds: ENRICHMENT_PROBE_ID })) {
              return "batch";
            }

            return await isFilterApplied({ remoteMessageId: ENRICHMENT_PROBE_ID }) ? "single" : "none";
          } catch (err: any) {
            if(err?.response?.status === 404) {
              return "none";
            }

            logger.error("System Message [Context: remote id filter] - Failed to check instance filter setting", err);

            return "";
          }
        })().then((mode) => {
          if(mode) {
            this.enrichmentMode = mode;
          }
          enrichmentModeProbe = null;

          return mode || "none";
        });
      }

      return enrichmentModeProbe;
    },

    // Resolves each Shopify operation to the HotWax message that requested it, keyed by the GID
    // HotWax stores as remoteMessageId. It runs on every load rather than reusing earlier
    // answers: the HotWax status is the half of the pairing that moves while the page is open.
    async fetchEnrichmentFor(operations: any[]) {
      const gids = [...new Set(operations
        .map((operation: any) => operation?.id)
        .filter((gid: any) => typeof gid === "string" && gid.startsWith(SHOPIFY_BULK_GID_PREFIX)))] as string[];

      if(!gids.length) {
        return;
      }

      const fetchId = ++this._fetchEnrichmentId;
      const mode = await this.ensureEnrichmentMode();
      if(mode === "none" || fetchId !== this._fetchEnrichmentId) {
        return;
      }

      try {
        const messages = await fetchMessagesByRemoteIds(mode, gids);
        if(fetchId !== this._fetchEnrichmentId) {
          return;
        }

        // Matched per GID as well as filtered server-side, so a row can never show another
        // operation's job. HotWax keeps one message per operation; if it ever holds more, the
        // newest wins, since the list is ordered newest first.
        const messageByGid: Record<string, any> = {};
        messages.forEach((message: any) => {
          if(gids.includes(message.remoteMessageId) && !messageByGid[message.remoteMessageId]) {
            messageByGid[message.remoteMessageId] = message;
          }
        });

        // A miss is stored as null: Shopify ran the operation but no HotWax record for it survives.
        gids.forEach((gid) => {
          this.enrichmentIndex[gid] = messageByGid[gid] ?? null;
        });
      } catch (err) {
        if(fetchId !== this._fetchEnrichmentId) {
          return;
        }

        logger.error("Bulk Operation [System: Shopify] - Failed to resolve HotWax messages", err);
      }
    }
  }
});
