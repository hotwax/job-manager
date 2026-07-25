import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useSolrMonitoringStore } from "@/store/solrMonitoring";

// Route each thin-proxy endpoint to a canned Solr response. `overrides` lets a test
// replace the response for specific URLs (e.g. to simulate a down replica).
function mockApiByUrl(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    "admin/solr/config": {
      baseUrl: "http://solr:8983/solr",
      instanceName: "dev",
      defaultCollection: "enterpriseSearch",
      sharedCollections: []
    },
    "admin/solr/system": {
      ok: true,
      response: {
        lucene: { "solr-spec-version": "8.11.2", "lucene-spec-version": "8.11.2" },
        jvm: { version: "11.0.20", memory: { raw: { used: 100, max: 200 } } }
      }
    },
    "admin/solr/cluster": {
      ok: true,
      response: {
        cluster: {
          collections: {
            "dev-enterpriseSearch": {
              health: "GREEN",
              shards: { shard1: { replicas: { core1: { state: "active" } } } }
            }
          },
          live_nodes: ["node1:8983_solr"]
        }
      }
    },
    "admin/solr/collections": {
      ok: true,
      response: {
        "dev-enterpriseSearch": {
          shards: { shard1: { leader: { segInfos: { info: { numDocs: 7648 } }, sizeInBytes: 1048576 } } }
        }
      }
    },
    "admin/solr/zookeeper": {
      ok: true,
      response: { zkStatus: { status: "green", ensembleSize: 3, zkHost: "zk:2181", details: [] } }
    },
    "admin/solr/metrics": {
      ok: true,
      response: { metrics: { "solr.jvm": { "memory.heap.used": 100 } } }
    },
    "admin/solr/collections/dev-enterpriseSearch/ping": {
      ok: true,
      response: { status: "OK", responseHeader: { status: 0, QTime: 3 } }
    }
  };
  const table = { ...defaults, ...overrides };
  apiMock.mockImplementation(({ url }: { url: string }) => Promise.resolve({ data: table[url] ?? {} }));
}

describe("solr monitoring store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("fans out to the thin Solr admin proxies and normalizes a healthy summary", async () => {
    mockApiByUrl();
    const store = useSolrMonitoringStore();

    await store.fetchSummary();

    const calledUrls = apiMock.mock.calls.map((c) => c[0].url);
    expect(calledUrls).toEqual(
      expect.arrayContaining([
        "admin/solr/config",
        "admin/solr/system",
        "admin/solr/cluster",
        "admin/solr/collections",
        "admin/solr/zookeeper",
        "admin/solr/metrics",
        "admin/solr/collections/dev-enterpriseSearch/ping"
      ])
    );

    expect(store.getConfig.solrUrl).toBe("http://solr:8983/solr");
    expect(store.getSystem.solrVersion).toBe("8.11.2");
    expect(store.getSystem.memory.used).toBe(100);

    const collection = store.getCollections[0];
    expect(collection.name).toBe("enterpriseSearch");
    expect(collection.actualName).toBe("dev-enterpriseSearch");
    expect(collection.numDocs).toBe(7648);
    expect(collection.size).toBe("1.0 MB");
    expect(collection.health).toBe("GREEN");

    expect(store.getPings[0].ok).toBe(true);
    expect(store.getPings[0].qTime).toBe(3);
    expect(store.getZookeeper.status).toBe("green");
    expect(store.getChecks).toHaveLength(5);
    expect(store.getOverview.health).toBe("GREEN");
  });

  it("derives RED health when a replica is down", async () => {
    mockApiByUrl({
      "admin/solr/cluster": {
        ok: true,
        response: {
          cluster: {
            collections: {
              "dev-enterpriseSearch": {
                health: "RED",
                shards: { shard1: { replicas: { core1: { state: "down" } } } }
              }
            }
          }
        }
      }
    });
    const store = useSolrMonitoringStore();

    await store.fetchSummary();

    expect(store.getOverview.downReplicas).toBe(1);
    expect(store.getOverview.health).toBe("RED");
  });

  it("derives YELLOW health when a collection ping fails", async () => {
    mockApiByUrl({
      "admin/solr/collections/dev-enterpriseSearch/ping": {
        ok: false,
        errorMessage: "HTTP 503"
      }
    });
    const store = useSolrMonitoringStore();

    await store.fetchSummary();

    expect(store.getPings[0].ok).toBe(false);
    expect(store.getOverview.health).toBe("YELLOW");
  });
});
