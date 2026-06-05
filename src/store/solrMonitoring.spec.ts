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

describe("solr monitoring store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("loads the Solr monitoring summary from the admin endpoint", async () => {
    const store = useSolrMonitoringStore();
    apiMock.mockResolvedValue({
      data: {
        overview: { health: "GREEN" },
        collections: [{ name: "enterpriseSearch", numDocs: 7648 }],
        pings: [{ name: "enterpriseSearch", ok: true, qTime: 3 }]
      }
    });

    await store.fetchSummary();

    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/solrMonitoring",
      method: "GET"
    });
    expect(store.getOverview.health).toBe("GREEN");
    expect(store.getCollections).toHaveLength(1);
    expect(store.getPings[0].qTime).toBe(3);
  });

  it("searches Solr repair documents without requiring a Solr primary key", async () => {
    const store = useSolrMonitoringStore();
    apiMock.mockResolvedValue({
      data: {
        documents: [{
          documentType: "ORDER",
          primaryId: "M100222",
          title: "HCDEV#2554"
        }],
        totalFound: 1
      }
    });

    await store.searchDocuments({ documentType: "ORDER", query: "HCDEV#2554" });

    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/solrDocuments",
      method: "GET",
      params: {
        documentType: "ORDER",
        query: "HCDEV#2554",
        pageSize: 20
      }
    });
    expect(store.getRepairResults[0].primaryId).toBe("M100222");
    expect(store.getRepairTotalFound).toBe(1);
  });

  it("starts and polls a full Solr rebuild service job", async () => {
    const store = useSolrMonitoringStore();
    apiMock
      .mockResolvedValueOnce({ data: { jobRunId: "100001", status: "QUEUED" } })
      .mockResolvedValueOnce({ data: { operation: { jobRunId: "100001", status: "RUNNING" } } });

    await store.startRebuild();
    await store.fetchRebuildStatus("100001");

    expect(apiMock).toHaveBeenNthCalledWith(1, {
      url: "admin/solrRebuilds",
      method: "POST"
    });
    expect(apiMock).toHaveBeenNthCalledWith(2, {
      url: "admin/solrRebuilds/100001",
      method: "GET"
    });
    expect(store.getRebuildOperation.status).toBe("RUNNING");
  });

  it("selectively reindexes an order or product by primary id", async () => {
    const store = useSolrMonitoringStore();
    apiMock.mockResolvedValue({
      data: {
        documentType: "PRODUCT",
        primaryId: "M101072",
        status: "FINISHED"
      }
    });

    const result = await store.reindexDocument({ documentType: "PRODUCT", primaryId: "M101072" });

    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/solrDocuments/reindex",
      method: "POST",
      data: {
        documentType: "PRODUCT",
        primaryId: "M101072"
      }
    });
    expect(result.primaryId).toBe("M101072");
  });
});
