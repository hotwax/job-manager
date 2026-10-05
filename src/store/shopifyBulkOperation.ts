import { api, translate } from "@common";
import { defineStore } from "pinia";
import logger from "@/logger";
import { getShopDefaultAppRemoteId } from "@/utils";

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

// The ShopifyShopRemote purpose that identifies a shop's Shopify-facing app credentials.
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

// Shopify's own error text, such as a missing access scope, is what an admin needs to act on, so
// it is kept, inside a sentence that can be translated.
const getLoadError = (err: any) => err?.message
  ? translate("Failed to load bulk operations from Shopify: {reason}", { reason: err.message })
  : translate("Failed to load bulk operations from Shopify");

export const useShopifyBulkOperationStore = defineStore("shopifyBulkOperation", {
  state: () => ({
    operations: [] as any[],
    pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" },
    shops: [] as any[],
    isFetchingShops: false,
    combinedShopCount: 0,
    failedRemoteIds: [] as string[],
    enrichmentIndex: {} as Record<string, any>,
    enrichmentMode: "",
    stats: { total: 0, inFlight: 0, completed: 0, failed: 0, windowSize: 0, truncated: false },
    loading: false,
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
      fileSize: operation.fileSize ? Number(operation.fileSize) : 0,
      hotwaxMessage: state.enrichmentIndex[operation.id] || undefined
    })),
    // Optimistic until the probe says otherwise, so the HotWax row and facet do not flicker in.
    enrichmentAvailable: (state: any) => state.enrichmentMode !== "none",
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

    // An OMS can be connected to more than one Shopify shop, and a shop's bulk operations are
    // reachable only through that shop's system message remote.
    //
    // ShopifyShopRemote is the mapping that answers which remote to use: a shop can have
    // several, and only purposeTypeId distinguishes them. Deriving it any other way is
    // guesswork — on a multi-shop instance the shopId and the remote id are different values,
    // and a shop's remotes differ only by naming convention.
    async fetchShops() {
      this.isFetchingShops = true;

      try {
        // The ShopifyShop master nests each shop's remote mappings as shopRemotes, so the
        // shops list already carries everything needed to reach every shop's Shopify app.
        //
        // This is the shops resource the Maarg instance serves; sob/shopify/shops lives in the
        // Shopify connector and answers 404 there.
        const resp = await api({
          url: "oms/shopifyShops/shops",
          method: "GET",
          params: { pageSize: 100 }
        });

        const rows = Array.isArray(resp.data) ? resp.data : [];

        this.shops = rows
          .map((shop: any) => ({
            shopId: shop.shopId,
            name: shop.name || shop.myshopifyDomain || shop.shopId,
            myshopifyDomain: shop.myshopifyDomain,
            productStoreId: shop.productStoreId,
            systemMessageRemoteId: getShopDefaultAppRemoteId(shop)
          }))
          .filter((shop: any) => shop.systemMessageRemoteId);
      } catch (err) {
        logger.error("Shop [System: Shopify] - Failed to fetch", err);
        this.shops = [];
      } finally {
        this.isFetchingShops = false;
      }
    },

    async fetchOperations(payload: Record<string, any> = {}) {
      const { systemMessageRemoteId, cursor, direction } = payload;
      const remoteIds = (payload.systemMessageRemoteIds ?? []).filter(Boolean);

      // More than one shop cannot share a cursor space, so the combined view takes its own
      // path rather than pretending to page through a single connection.
      if(remoteIds.length > 1) {
        return await this.fetchOperationsForShops(payload, remoteIds);
      }

      const fetchId = ++this._fetchOperationsId;
      this.failedRemoteIds = [];

      if(!systemMessageRemoteId) {
        this.lastError = translate("No Shopify shop is configured for this product store");
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

        this.operations = (connection?.edges ?? []).map((edge: any) => ({ ...edge.node, systemMessageRemoteId }));
        this.combinedShopCount = 1;
        this.pageInfo = {
          hasNextPage: connection?.pageInfo?.hasNextPage ?? false,
          hasPreviousPage: connection?.pageInfo?.hasPreviousPage ?? false,
          startCursor: connection?.pageInfo?.startCursor ?? "",
          endCursor: connection?.pageInfo?.endCursor ?? ""
        };
      } catch (err: any) {
        if (fetchId !== this._fetchOperationsId) return;
        logger.error("Bulk Operation [System: Shopify] - Failed to fetch", err);
        this.lastError = getLoadError(err);
        this.operations = [];
        this.pageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" };
      } finally {
        if (fetchId === this._fetchOperationsId) {
          this.loading = false;
          this.isFetchingOperations = false;
        }
      }
    },

    // One page per shop, merged and ordered here. Shopify has no cross-shop connection, so a
    // combined view cannot use its cursors: each shop has its own cursor space and there is no
    // meaningful "next" across them. The view therefore shows the most recent page from each
    // shop and says so, rather than offering paging it cannot honour.
    async fetchOperationsForShops(payload: Record<string, any>, remoteIds: string[]) {
      const fetchId = ++this._fetchOperationsId;

      this.loading = true;
      this.isFetchingOperations = true;
      this.lastError = "";
      this.failedRemoteIds = [];

      const sortKey = SORT_KEYS.includes(payload.sortKey) ? payload.sortKey : "CREATED_AT";
      const reverse = payload.sortReverse === true;
      const variables: Record<string, any> = { first: OPERATIONS_PAGE_SIZE, sortKey, reverse };
      const shopifyQuery = this.buildShopifyQuery(payload);
      if(shopifyQuery) {variables.query = shopifyQuery;}

      const queryText = `query bulkOperations($first: Int, $query: String, $sortKey: BulkOperationsSortKeys, $reverse: Boolean) {
  bulkOperations(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges { node {${OPERATION_FIELDS}} }
  }
}`;

      try {
        // One shop failing must not blank the whole view, so each result is settled
        // independently and the failures are counted rather than thrown.
        const settled = await Promise.allSettled(remoteIds.map(async (remoteId: string) => {
          const data = await this.runShopifyQuery(remoteId, queryText, variables);

          return (data?.bulkOperations?.edges ?? []).map((edge: any) => ({ ...edge.node, systemMessageRemoteId: remoteId }));
        }));

        if(fetchId !== this._fetchOperationsId) {
          return;
        }

        const failedRemoteIds = remoteIds.filter((remoteId: string, index: number) => {
          const result = settled[index];
          if(result.status !== "rejected") {
            return false;
          }

          logger.error(`Bulk Operation [System Message Remote ID: ${remoteId}] - Failed to fetch`, result.reason);
          return true;
        });

        const dateField = sortKey === "COMPLETED_AT" ? "completedAt" : "createdAt";
        const merged = settled
          .filter((result: any) => result.status === "fulfilled")
          .flatMap((result: any) => result.value)
          .sort((a: any, b: any) => {
            const left = a[dateField] ? Date.parse(a[dateField]) : 0;
            const right = b[dateField] ? Date.parse(b[dateField]) : 0;

            return reverse ? left - right : right - left;
          });

        this.operations = merged;
        this.combinedShopCount = remoteIds.length - failedRemoteIds.length;
        this.pageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" };

        // Some shops failing still shows the rest, but names the missing ones so a partial list
        // is not mistaken for a complete one.
        if(failedRemoteIds.length === remoteIds.length) {
          this.lastError = translate("Failed to load bulk operations from Shopify");
        } else {
          this.failedRemoteIds = failedRemoteIds;
        }
      } catch (err: any) {
        if(fetchId !== this._fetchOperationsId) {
          return;
        }

        logger.error("Bulk Operation [System: Shopify] - Failed to fetch across shops", err);
        this.lastError = getLoadError(err);
        this.operations = [];
      } finally {
        if(fetchId === this._fetchOperationsId) {
          this.loading = false;
          this.isFetchingOperations = false;
        }
      }
    },

    // A Shopify connection has no total count, so the tiles describe a bounded recent window
    // instead of pretending to summarise all history.
    async fetchStats(payload: Record<string, any> = {}) {
      const { systemMessageRemoteId } = payload;
      const remoteIds = (payload.systemMessageRemoteIds ?? []).filter(Boolean);

      if(remoteIds.length > 1) {
        return await this.fetchStatsForShops(payload, remoteIds);
      }

      const fetchId = ++this._fetchStatsId;

      if(!systemMessageRemoteId) {
        this.stats = { total: 0, inFlight: 0, completed: 0, failed: 0, windowSize: 0, truncated: false };
        return;
      }

      const shopifyQuery = this.buildShopifyQuery(payload);
      const variables: Record<string, any> = { first: STATS_WINDOW_SIZE, ...STATS_SORT };
      if(shopifyQuery) {variables.query = shopifyQuery;}

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
        logger.error("Bulk Operation [System: Shopify] - Failed to fetch stats", err);
        this.stats = { total: 0, inFlight: 0, completed: 0, failed: 0, windowSize: 0, truncated: false };
      }
    },

    // One-time check that this instance actually applies the remoteMessageId filter. An
    // instance that ignores it would hand back arbitrary messages, so enrichment is switched
    // off entirely rather than attaching a wrong job to a row.
    // Each shop reports its own window, so the combined tiles are the sum of those windows and
    // are truncated if any single shop was.
    async fetchStatsForShops(payload: Record<string, any>, remoteIds: string[]) {
      const statsId = ++this._fetchStatsId;
      const variables: Record<string, any> = { first: STATS_WINDOW_SIZE, ...STATS_SORT };
      const shopifyQuery = this.buildShopifyQuery(payload);
      if(shopifyQuery) {variables.query = shopifyQuery;}

      const queryText = `query bulkOperationStats($first: Int!, $query: String, $sortKey: BulkOperationsSortKeys, $reverse: Boolean) {
  bulkOperations(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
    edges { node { id status } }
    pageInfo { hasNextPage }
  }
}`;

      try {
        const settled = await Promise.allSettled(remoteIds.map((remoteId: string) =>
          this.runShopifyQuery(remoteId, queryText, variables)));

        if(statsId !== this._fetchStatsId) {
          return;
        }

        const connections = settled
          .filter((result: any) => result.status === "fulfilled")
          .map((result: any) => result.value?.bulkOperations)
          .filter(Boolean);
        const nodes = connections.flatMap((connection: any) => (connection.edges ?? []).map((edge: any) => edge.node));

        this.stats = {
          total: nodes.length,
          inFlight: nodes.filter((node: any) => SHOPIFY_IN_FLIGHT_STATUSES.includes(node.status)).length,
          completed: nodes.filter((node: any) => node.status === "COMPLETED").length,
          failed: nodes.filter((node: any) => SHOPIFY_FAILED_STATUSES.includes(node.status)).length,
          windowSize: nodes.length,
          truncated: connections.some((connection: any) => connection.pageInfo?.hasNextPage)
        };
      } catch (err) {
        if(statsId !== this._fetchStatsId) {
          return;
        }

        logger.error("Bulk Operation [System: Shopify] - Failed to fetch stats across shops", err);
        this.stats = { total: 0, inFlight: 0, completed: 0, failed: 0, windowSize: 0, truncated: false };
      }
    },

    // Decided once per session and shared by every caller while the probe is in flight. A probe
    // that errors is not remembered, so a transient failure does not switch enrichment off for
    // the rest of the session.
    async ensureEnrichmentMode(): Promise<string> {
      if(this.enrichmentMode) {
        return this.enrichmentMode;
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
