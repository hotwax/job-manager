import { Mock } from 'vitest';
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

  it("should deduplicate the capability probe in ensureEnrichmentSupported and replace settled promise", async () => {
    const store = useShopifyBulkOperationStore();

    const req = defer<any>();
    (api as any).mockImplementationOnce(() => req.promise);

    const p1 = store.ensureEnrichmentSupported();
    const p2 = store.ensureEnrichmentSupported();

    expect(api).toHaveBeenCalledTimes(1);

    req.resolve({
      data: { systemMessages: [] }
    });

    await Promise.all([p1, p2]);
    expect(store.enrichmentAvailable).toBe(true);
    expect(store.enrichmentProbed).toBe(true);

    // Because it is settled, it should return early
    const p3 = store.ensureEnrichmentSupported();
    await p3;
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("should cap enrichment concurrency globally across multiple fetchEnrichmentFor calls", async () => {
    const store = useShopifyBulkOperationStore();

    store.ensureEnrichmentSupported = vi.fn(() => Promise.resolve());
    store.enrichmentAvailable = true;

    const reqs: DeferredPromise<any>[] = [];
    let activeCalls = 0;
    let maxActiveCalls = 0;

    (api as Mock).mockImplementation((opts: any) => {
      activeCalls++;
      if (activeCalls > maxActiveCalls) maxActiveCalls = activeCalls;

      const d = defer<any>();
      d.promise.catch(() => {});
      (d.promise as any).gid = opts.params.remoteMessageId;
      reqs.push(d);

      return d.promise.finally(() => {
        activeCalls--;
      });
    });

    const batch1 = Array.from({ length: 4 }, (_, i) => ({ id: `gid://shopify/BulkOperation/${i}` }));
    const batch2 = Array.from({ length: 4 }, (_, i) => ({ id: `gid://shopify/BulkOperation/${i + 4}` }));

    const p1 = store.fetchEnrichmentFor(batch1);
    const p2 = store.fetchEnrichmentFor(batch2);

    // Let microtasks run so the store invokes api
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // We should only see 5 requests in flight due to concurrency limit, even across 2 calls
    expect(reqs.length).toBe(5);
    expect(activeCalls).toBe(5);

    // Resolve one
    reqs[0].resolve({ data: { systemMessages: [{ remoteMessageId: "gid://shopify/BulkOperation/0" }] } });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Now the 6th request should be launched
    expect(reqs.length).toBe(6);

    // Deterministic drain
    let resolvedCount = 0;
    while (reqs.length < 8 || resolvedCount < 8) {
      // Find unresolved reqs and resolve them
      const currentReqs = reqs.slice(resolvedCount);
      for (const req of currentReqs) {
        req.resolve({ data: { systemMessages: [{ remoteMessageId: (req.promise as any).gid }] } });
        resolvedCount++;
      }
      // Flush microtasks
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    }

    await Promise.all([p1, p2]);

    // Total 8 distinct requests made
    expect(reqs.length).toBe(8);
    expect(Object.keys(store.enrichmentIndex).length).toBe(8);
    expect(maxActiveCalls).toBe(5);
  });
});