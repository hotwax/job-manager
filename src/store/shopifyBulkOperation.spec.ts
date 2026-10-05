import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useShopifyBulkOperationStore } from "./shopifyBulkOperation";
import { api } from "@common";

vi.mock("@common", () => ({ api: vi.fn() }));
vi.mock("@/logger", () => ({ default: { error: vi.fn() } }));

interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

const defer = <T>(): DeferredPromise<T> => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("Shopify Bulk Operation Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("should implement latest-request-wins for fetchOperations and clear state if missing systemMessageRemoteId", async () => {
    const store = useShopifyBulkOperationStore();

    const req1 = defer<any>();
    const req2 = defer<any>();

    (api as any).mockImplementationOnce(() => req1.promise);
    (api as any).mockImplementationOnce(() => req2.promise);

    // Start first request
    const p1 = store.fetchOperations({ systemMessageRemoteId: "1" });
    expect(store.isLoading).toBe(true);

    // Start second request before first finishes
    const p2 = store.fetchOperations({ systemMessageRemoteId: "2" });

    // Resolve second request
    req2.resolve({
      data: {
        response: {
          bulkOperations: {
            edges: [{ node: { id: "gid://shopify/BulkOperation/2", status: "COMPLETED" } }],
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" }
          }
        }
      }
    });

    await p2;
    expect(store.operations.length).toBe(1);
    expect(store.operations[0].id).toBe("gid://shopify/BulkOperation/2");
    expect(store.isLoading).toBe(false);

    // Resolve first request
    req1.resolve({
      data: {
        response: {
          bulkOperations: {
            edges: [{ node: { id: "gid://shopify/BulkOperation/1", status: "COMPLETED" } }],
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" }
          }
        }
      }
    });

    await p1;
    // Store should not be updated with the old request
    expect(store.operations[0].id).toBe("gid://shopify/BulkOperation/2");
    // Loading should still be false
    expect(store.isLoading).toBe(false);

    // Call without systemMessageRemoteId clears state and ignores old responses
    const req3 = defer<any>();
    (api as any).mockImplementationOnce(() => req3.promise);
    const p3 = store.fetchOperations({ systemMessageRemoteId: "3" });

    // Next call without systemMessageRemoteId
    await store.fetchOperations({});
    expect(store.operations.length).toBe(0);
    expect(store.isLoading).toBe(false);

    req3.resolve({
      data: {
        response: {
          bulkOperations: {
            edges: [{ node: { id: "gid://shopify/BulkOperation/3", status: "COMPLETED" } }],
            pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" }
          }
        }
      }
    });
    await p3;
    expect(store.operations.length).toBe(0); // Should remain clear
  });

  it("should implement latest-request-wins for fetchStats and clear state if missing systemMessageRemoteId", async () => {
    const store = useShopifyBulkOperationStore();

    const req1 = defer<any>();
    const req2 = defer<any>();

    (api as any).mockImplementationOnce(() => req1.promise);
    (api as any).mockImplementationOnce(() => req2.promise);

    const p1 = store.fetchStats({ systemMessageRemoteId: "1" });
    const p2 = store.fetchStats({ systemMessageRemoteId: "2" });

    req2.resolve({
      data: {
        response: {
          bulkOperations: {
            edges: [
              { node: { id: "1", status: "COMPLETED" } },
              { node: { id: "2", status: "COMPLETED" } }
            ],
            pageInfo: { hasNextPage: false }
          }
        }
      }
    });

    await p2;
    expect(store.stats.total).toBe(2);

    req1.resolve({
      data: {
        response: {
          bulkOperations: {
            edges: [
              { node: { id: "3", status: "COMPLETED" } }
            ],
            pageInfo: { hasNextPage: false }
          }
        }
      }
    });

    await p1;
    expect(store.stats.total).toBe(2);

    // Missing remote id
    const req3 = defer<any>();
    (api as any).mockImplementationOnce(() => req3.promise);
    const p3 = store.fetchStats({ systemMessageRemoteId: "3" });

    await store.fetchStats({});
    expect(store.stats.total).toBe(0);

    req3.resolve({
      data: {
        response: {
          bulkOperations: {
            edges: [
              { node: { id: "3", status: "COMPLETED" } }
            ],
            pageInfo: { hasNextPage: false }
          }
        }
      }
    });
    await p3;
    expect(store.stats.total).toBe(0); // empty stats correctly maintained
  });

  it("counts the newest operations whatever order the list is sorted in", async () => {
    const store = useShopifyBulkOperationStore();
    (api as Mock).mockResolvedValue({ data: { response: { bulkOperations: { edges: [], pageInfo: { hasNextPage: false } } } } });

    await store.fetchStats({ systemMessageRemoteId: "SHOP_A", sortKey: "COMPLETED_AT", sortReverse: true });
    await store.fetchStats({ systemMessageRemoteIds: ["SHOP_A", "SHOP_B"], sortKey: "COMPLETED_AT", sortReverse: true });

    (api as Mock).mock.calls.forEach(([options]: any) => {
      expect(options.data.variables).toMatchObject({ sortKey: "CREATED_AT", reverse: false });
    });
    expect(api).toHaveBeenCalledTimes(3);
  });

  it("shows the shops that loaded and names the ones that failed in the combined view", async () => {
    const store = useShopifyBulkOperationStore();
    (api as Mock).mockImplementation(async ({ data }: any) => {
      if(data.systemMessageRemoteId === "SHOP_B") {
        throw new Error("throttled");
      }

      return { data: { response: { bulkOperations: { edges: [
        { node: { id: `gid://shopify/BulkOperation/${data.systemMessageRemoteId}`, createdAt: "2026-10-01T00:00:00Z" } }
      ] } } } };
    });

    await store.fetchOperations({ systemMessageRemoteIds: ["SHOP_A", "SHOP_B", "SHOP_C"] });

    expect(store.operations.map((operation: any) => operation.systemMessageRemoteId)).toEqual(["SHOP_A", "SHOP_C"]);
    expect(store.failedRemoteIds).toEqual(["SHOP_B"]);
    expect(store.combinedShopCount).toBe(2);
    expect(store.lastError).toBe("");

    (api as Mock).mockRejectedValue(new Error("down"));
    await store.fetchOperations({ systemMessageRemoteIds: ["SHOP_A", "SHOP_B"] });

    expect(store.operations).toEqual([]);
    expect(store.failedRemoteIds).toEqual([]);
    expect(store.lastError).not.toBe("");
  });

  describe("HotWax message lookup", () => {
    const probeResponse = (applied: boolean) => ({ data: { systemMessages: applied ? [] : [{ systemMessageId: "NEWEST" }] } });

    it("probes once, and picks one request per page when the instance applies remoteMessageIds", async () => {
      const store = useShopifyBulkOperationStore();
      const probe = defer<any>();
      (api as Mock).mockImplementationOnce(() => probe.promise);

      const first = store.ensureEnrichmentMode();
      const second = store.ensureEnrichmentMode();
      expect(api).toHaveBeenCalledTimes(1);
      expect((api as Mock).mock.calls[0][0].params).toEqual({ remoteMessageIds: "gid://accxui/FilterSupportProbe/none", pageSize: 1 });

      probe.resolve(probeResponse(true));
      expect(await Promise.all([first, second])).toEqual(["batch", "batch"]);
      expect(store.enrichmentMode).toBe("batch");

      await store.ensureEnrichmentMode();
      expect(api).toHaveBeenCalledTimes(1);
    });

    it("falls back to one request per operation when only remoteMessageId is applied", async () => {
      const store = useShopifyBulkOperationStore();
      (api as Mock)
        .mockResolvedValueOnce(probeResponse(false))
        .mockResolvedValueOnce(probeResponse(true));

      expect(await store.ensureEnrichmentMode()).toBe("single");
      expect((api as Mock).mock.calls[1][0].params).toEqual({ remoteMessageId: "gid://accxui/FilterSupportProbe/none", pageSize: 1 });
      expect(store.enrichmentAvailable).toBe(true);
    });

    it("switches enrichment off when the instance applies neither filter", async () => {
      const store = useShopifyBulkOperationStore();
      (api as Mock).mockResolvedValue(probeResponse(false));

      expect(await store.ensureEnrichmentMode()).toBe("none");
      expect(store.enrichmentAvailable).toBe(false);

      await store.fetchEnrichmentFor([{ id: "gid://shopify/BulkOperation/1" }]);
      expect(api).toHaveBeenCalledTimes(2);
    });

    it("does not remember a probe that errored, so the next load tries again", async () => {
      const store = useShopifyBulkOperationStore();
      (api as Mock).mockRejectedValueOnce({ response: { status: 500 } });

      expect(await store.ensureEnrichmentMode()).toBe("none");
      expect(store.enrichmentMode).toBe("");
      expect(store.enrichmentAvailable).toBe(true);

      (api as Mock).mockResolvedValueOnce(probeResponse(true));
      expect(await store.ensureEnrichmentMode()).toBe("batch");
    });

    it("resolves a page in one request, never attaches another operation's message, and refetches on every load", async () => {
      const store = useShopifyBulkOperationStore();
      store.enrichmentMode = "batch";
      const operations = [1, 2, 3].map((id) => ({ id: `gid://shopify/BulkOperation/${id}` }));

      (api as Mock).mockResolvedValueOnce({ data: { systemMessages: [
        { systemMessageId: "M1", remoteMessageId: "gid://shopify/BulkOperation/1", statusId: "SmsgSent" },
        { systemMessageId: "OTHER", remoteMessageId: "gid://shopify/BulkOperation/99", statusId: "SmsgSent" }
      ] } });
      await store.fetchEnrichmentFor(operations);

      expect(api).toHaveBeenCalledTimes(1);
      expect((api as Mock).mock.calls[0][0].params).toEqual({
        remoteMessageIds: "gid://shopify/BulkOperation/1,gid://shopify/BulkOperation/2,gid://shopify/BulkOperation/3",
        pageSize: 3
      });
      expect(store.enrichmentIndex["gid://shopify/BulkOperation/1"].statusId).toBe("SmsgSent");
      expect(store.enrichmentIndex["gid://shopify/BulkOperation/2"]).toBeNull();
      expect(store.enrichmentIndex["gid://shopify/BulkOperation/99"]).toBeUndefined();

      // The HotWax side moves while the page is open, so a reload asks again.
      (api as Mock).mockResolvedValueOnce({ data: { systemMessages: [
        { systemMessageId: "M1", remoteMessageId: "gid://shopify/BulkOperation/1", statusId: "SmsgConsumed" }
      ] } });
      await store.fetchEnrichmentFor(operations);

      expect(api).toHaveBeenCalledTimes(2);
      expect(store.enrichmentIndex["gid://shopify/BulkOperation/1"].statusId).toBe("SmsgConsumed");
    });

    it("asks one operation at a time, at most five in flight, when the instance has no batch filter", async () => {
      const store = useShopifyBulkOperationStore();
      store.enrichmentMode = "single";
      const operations = Array.from({ length: 8 }, (_, id) => ({ id: `gid://shopify/BulkOperation/${id}` }));

      let inFlight = 0;
      let maxInFlight = 0;
      (api as Mock).mockImplementation(async ({ params }: any) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight--;
        if(params.remoteMessageId.endsWith("/3")) {
          throw new Error("network");
        }

        return { data: { systemMessages: [{ systemMessageId: `M${params.remoteMessageId.split("/").pop()}`, remoteMessageId: params.remoteMessageId }] } };
      });

      await store.fetchEnrichmentFor(operations);

      expect(api).toHaveBeenCalledTimes(8);
      expect(maxInFlight).toBeLessThanOrEqual(5);
      expect(store.enrichmentIndex["gid://shopify/BulkOperation/0"].systemMessageId).toBe("M0");
      expect(store.enrichmentIndex["gid://shopify/BulkOperation/3"]).toBeNull();
    });
  });
});
