import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DateTime } from "luxon";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", async () => {
  const { createCommonMock } = await import("@/test/commonMock");
  return createCommonMock({ api: apiMock });
});

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useDataDocumentStore } from "@/store/dataDocuments";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { projectDataDocumentGraph, serializeDataDocumentGraph } from "@/utils/dataDocumentGraph";

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const makePreviewEligible = (dataDocumentId: string) => {
  const graphStore = useDataDocumentGraphStore();
  graphStore.graph = projectDataDocumentGraph({
    document: {
      dataDocumentId,
      documentName: dataDocumentId,
      primaryEntityName: "Product"
    },
    fields: []
  });
  graphStore.isPersisted = true;
  graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
  graphStore.activatePreviewTarget(Symbol(dataDocumentId), dataDocumentId);
  return graphStore.savedRevision;
};

describe("data document store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("does not fabricate documents when the API is unavailable", async () => {
    apiMock.mockRejectedValue(new Error("offline"));

    const store = useDataDocumentStore();
    await store.fetchDataDocuments({ queryString: "inventory" });

    expect(store.getDataDocuments).toEqual([]);
    expect(store.getTotal).toBe(0);
  });

  it("calls the admin Data Document API route for document lists", async () => {
    apiMock.mockResolvedValue({
      data: {
        dataDocuments: [
          {
            dataDocumentId: "ApiDocument",
            documentName: "API Document"
          }
        ],
        dataDocumentsCount: 1
      }
    });

    const store = useDataDocumentStore();
    await store.fetchDataDocuments({ pageSize: 25, queryString: "api" });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/dataDocuments",
        method: "GET",
        params: expect.objectContaining({
          pageSize: 25,
          queryString: "api"
        })
      })
    );
    expect(store.getDataDocuments).toEqual([
      expect.objectContaining({
        dataDocumentId: "ApiDocument"
      })
    ]);
    expect(store.getTotal).toBe(1);
  });

  it("returns and hydrates detail without loading export history", async () => {
    const document = {
      dataDocumentId: "ApiDocument",
      fields: [{ fieldSeqId: "10", fieldNameAlias: "productId", fieldPath: "Product:productId" }],
      conditions: [{ conditionSeqId: "10", fieldNameAlias: "productId", operator: "not-empty" }],
      feeds: [{ dataFeedId: "ProductFeed", dataDocumentId: "ApiDocument" }]
    };
    apiMock.mockResolvedValue({ data: document });

    const store = useDataDocumentStore();
    const result = await store.fetchDataDocument("ApiDocument");

    expect(result).toBe(document);
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "moqui/dataDocuments/ApiDocument",
        method: "GET"
      })
    );
    expect(store.getFields).toEqual([
      expect.objectContaining({
        fieldNameAlias: "productId"
      })
    ]);
    expect(store.getConditions).toHaveLength(1);
    expect(store.getRelatedFeeds).toHaveLength(1);
    expect(store.getExportHistory).toEqual([]);
  });

  it("rejects a failed detail request while retaining the last hydrated detail", async () => {
    const store = useDataDocumentStore();
    const document = {
      dataDocumentId: "StableDocument",
      fields: [{ fieldSeqId: "10", fieldNameAlias: "productId" }],
      conditions: [],
      feeds: []
    };
    apiMock.mockResolvedValueOnce({ data: document });
    await store.fetchDataDocument("StableDocument");
    apiMock.mockRejectedValueOnce(new Error("detail unavailable"));

    await expect(store.fetchDataDocument("StableDocument")).rejects.toThrow("detail unavailable");

    expect(store.getCurrentDocument).toEqual(document);
    expect(store.getFields).toEqual(document.fields);
    expect(store.getDetailError).toBeInstanceOf(Error);
    expect(store.isDetailLoading).toBe(false);
    expect(apiMock).toHaveBeenCalledTimes(2);
  });

  it.each(["A then B", "B then A"])("keeps detail owned by B when overlapping A/B requests settle %s", async (settlementOrder) => {
    const detailA = deferred<{ data: Record<string, unknown> }>();
    const detailB = deferred<{ data: Record<string, unknown> }>();
    apiMock.mockReturnValueOnce(detailA.promise).mockReturnValueOnce(detailB.promise);
    const store = useDataDocumentStore();

    const requestA = store.fetchDataDocument("DocumentA");
    const requestB = store.fetchDataDocument("DocumentB");
    if (settlementOrder === "A then B") {
      detailA.resolve({ data: { dataDocumentId: "DocumentA", fields: [], conditions: [] } });
      await requestA;
      expect(store.getCurrentDocument).toBeUndefined();
      expect(store.isDetailLoading).toBe(true);
      detailB.resolve({ data: { dataDocumentId: "DocumentB", fields: [], conditions: [] } });
      await requestB;
    } else {
      detailB.resolve({ data: { dataDocumentId: "DocumentB", fields: [], conditions: [] } });
      await requestB;
      detailA.resolve({ data: { dataDocumentId: "DocumentA", fields: [], conditions: [] } });
      await requestA;
    }

    expect(store.getCurrentDocument).toEqual(expect.objectContaining({ dataDocumentId: "DocumentB" }));
    expect(store.getDetailError).toBeUndefined();
    expect(store.isDetailLoading).toBe(false);
  });

  it("ignores a stale detail rejection after the current document succeeds", async () => {
    const detailA = deferred<{ data: Record<string, unknown> }>();
    const detailB = deferred<{ data: Record<string, unknown> }>();
    apiMock.mockReturnValueOnce(detailA.promise).mockReturnValueOnce(detailB.promise);
    const store = useDataDocumentStore();

    const requestA = store.fetchDataDocument("DocumentA");
    const requestB = store.fetchDataDocument("DocumentB");
    detailB.resolve({ data: { dataDocumentId: "DocumentB", fields: [], conditions: [] } });
    await requestB;
    detailA.reject(new Error("stale A detail failure"));
    await expect(requestA).rejects.toThrow("stale A detail failure");

    expect(store.getCurrentDocument).toEqual(expect.objectContaining({ dataDocumentId: "DocumentB" }));
    expect(store.getDetailError).toBeUndefined();
    expect(store.isDetailLoading).toBe(false);
  });

  it("keeps the newer same-document forced detail when an older request rejects late", async () => {
    const firstDetail = deferred<{ data: Record<string, unknown> }>();
    const forcedDetail = deferred<{ data: Record<string, unknown> }>();
    apiMock.mockReturnValueOnce(firstDetail.promise).mockReturnValueOnce(forcedDetail.promise);
    const store = useDataDocumentStore();

    const firstRequest = store.fetchDataDocument("SameDocument");
    const forcedRequest = (store.fetchDataDocument as any)("SameDocument", { force: true });
    forcedDetail.resolve({ data: { dataDocumentId: "SameDocument", documentTitle: "new", fields: [], conditions: [] } });
    await forcedRequest;
    firstDetail.reject(new Error("old same-document failure"));
    await expect(firstRequest).rejects.toThrow("old same-document failure");

    expect(store.getCurrentDocument).toEqual(expect.objectContaining({ documentTitle: "new" }));
    expect(store.getDetailError).toBeUndefined();
  });

  it.each([
    ["empty", undefined],
    ["array", []]
  ])("rejects an %s detail response while retaining the last hydrated detail", async (_label, invalidDetail) => {
    const store = useDataDocumentStore();
    const document = {
      dataDocumentId: "StableDocument",
      fields: [{ fieldSeqId: "10", fieldNameAlias: "productId" }],
      conditions: [],
      feeds: []
    };
    apiMock
      .mockResolvedValueOnce({ data: document })
      .mockResolvedValueOnce({ data: invalidDetail });
    await store.fetchDataDocument("StableDocument");

    await expect(store.fetchDataDocument("StableDocument")).rejects.toThrow(
      "Invalid data document detail response for StableDocument."
    );

    expect(store.getCurrentDocument).toEqual(document);
    expect(store.getFields).toEqual(document.fields);
    expect(store.getDetailError).toBeInstanceOf(Error);
    expect(store.isDetailLoading).toBe(false);
  });

  it("derives available entity and feed filters from the unfiltered catalog response", async () => {
    apiMock.mockResolvedValue({
      data: {
        dataDocuments: [
          {
            dataDocumentId: "FeedDocument",
            documentName: "Feed Document",
            primaryEntityName: "mantle.product.Product",
            dataFeedId: "ProductFeed"
          },
          {
            dataDocumentId: "OrderDocument",
            documentName: "Order Document",
            primaryEntityName: "mantle.order.OrderHeader"
          }
        ],
        dataDocumentsCount: 2
      }
    });

    const store = useDataDocumentStore();
    await store.fetchDataDocuments();

    expect(store.getAvailablePrimaryEntities).toEqual(["mantle.order.OrderHeader", "mantle.product.Product"]);
    expect(store.getAvailableFeeds).toEqual(["ProductFeed"]);
  });

  it("builds a feed list from Moqui DataFeedDocument child records", async () => {
    apiMock.mockResolvedValue({
      data: {
        dataDocuments: [
          {
            dataDocumentId: "FirstDocument",
            documentName: "First Document",
            primaryEntityName: "mantle.order.OrderHeader",
            feeds: [{
              dataFeedId: "WebhookFeed",
              dataDocumentId: "FirstDocument",
              feed: {
                dataFeedId: "WebhookFeed",
                feedName: "Webhook Feed",
                dataFeedTypeEnumId: "DTFDTP_RT_PUSH",
                lastFeedStamp: "2026-04-30T10:00:00Z"
              }
            }]
          },
          {
            dataDocumentId: "SecondDocument",
            documentName: "Second Document",
            primaryEntityName: "mantle.order.OrderItem",
            feeds: [{
              dataFeedId: "WebhookFeed",
              dataDocumentId: "SecondDocument"
            }]
          }
        ],
        dataDocumentsCount: 2
      }
    });

    const store = useDataDocumentStore();
    await store.fetchDataFeeds();

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/dataDocuments",
        method: "GET",
        params: expect.objectContaining({
          pageNoLimit: "true"
        })
      })
    );
    expect(store.getDataFeeds).toEqual([
      expect.objectContaining({
        dataFeedId: "WebhookFeed",
        feedName: "Webhook Feed",
        dataFeedTypeEnumId: "DTFDTP_RT_PUSH",
        documents: [
          expect.objectContaining({ dataDocumentId: "FirstDocument" }),
          expect.objectContaining({ dataDocumentId: "SecondDocument" })
        ]
      })
    ]);
  });

  it("loads a data feed detail from the feed documents endpoint", async () => {
    apiMock
      .mockResolvedValueOnce({
        data: {
          dataDocuments: [
            {
              dataDocumentId: "WebhookOrderStatus",
              documentName: "Webhook Order Status",
              primaryEntityName: "org.apache.ofbiz.order.order.OrderStatus",
              feeds: [{
                dataFeedId: "WebhookEvents",
                dataDocumentId: "WebhookOrderStatus",
                feed: {
                  dataFeedId: "WebhookEvents",
                  feedName: "Webhook Events",
                  dataFeedTypeEnumId: "DTFDTP_RT_PUSH"
                }
              }]
            }
          ],
          dataDocumentsCount: 1
        }
      })
      .mockResolvedValueOnce({
        data: {
          documentList: [
            {
              dataDocumentId: "WebhookOrderStatus",
              documentName: "Webhook Order Status",
              primaryEntityName: "org.apache.ofbiz.order.order.OrderStatus"
            }
          ]
        }
      });

    const store = useDataDocumentStore();
    await store.fetchDataFeed("WebhookEvents");

    expect(apiMock).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        url: "admin/dataDocuments",
        method: "GET"
      })
    );
    expect(apiMock).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        url: "moqui/dataDocuments/feeds/WebhookEvents/documents",
        method: "GET"
      })
    );
    expect(store.getCurrentFeed).toEqual(expect.objectContaining({
      dataFeedId: "WebhookEvents",
      feedName: "Webhook Events",
      dataFeedTypeEnumId: "DTFDTP_RT_PUSH"
    }));
    expect(store.getFeedDocuments).toEqual([
      expect.objectContaining({
        dataDocumentId: "WebhookOrderStatus"
      })
    ]);
  });

  it("does not send empty catalog filter values to Moqui", async () => {
    apiMock.mockResolvedValue({ data: { dataDocuments: [], dataDocumentsCount: 0 } });

    const store = useDataDocumentStore();
    await store.fetchDataDocuments({
      queryString: "",
      primaryEntityName: "",
      dataFeedId: ""
    });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.not.objectContaining({
          queryString: "",
          primaryEntityName: "",
          dataFeedId: ""
        })
      })
    );
  });

  it("previews through the existing Moqui dataDocumentView service contract", async () => {
    // Live oms/dataDocumentView returns ONLY { entityValueList } and no total count,
    // so previewTotal falls back to the number of returned rows.
    apiMock.mockResolvedValue({
      data: {
        entityValueList: [{ productId: "10001" }]
      }
    });

    const store = useDataDocumentStore();
    makePreviewEligible("ProductFacilityAndInventoryItem");
    await store.runPreview({
      selectedFields: ["productId"],
      filters: [{ fieldNameAlias: "facilityId", operator: "equals", value: "WH1" }],
      sort: [{ fieldNameAlias: "productId", direction: "DESC" }],
      distinct: true,
      pageSize: 5
    });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "oms/dataDocumentView",
        method: "POST",
        data: expect.objectContaining({
          dataDocumentId: "ProductFacilityAndInventoryItem",
          // fieldsToSelect is sent as a comma-separated string (Moqui ignores the array form).
          fieldsToSelect: "productId",
          customParametersMap: { facilityId: "WH1" },
          orderByField: "-productId",
          distinct: true,
          pageSize: 5
        })
      })
    );
    expect(store.getPreviewRows).toHaveLength(1);
    expect(store.getPreviewTotal).toBe(1);
  });

  it("encodes filter operators into Moqui search-form-inputs suffixes for the preview", async () => {
    apiMock.mockResolvedValue({ data: { entityValueList: [] } });
    const store = useDataDocumentStore();
    makePreviewEligible("Doc");
    await store.runPreview({
      filters: [
        { fieldNameAlias: "statusId", operator: "equals", value: "OPEN" },
        { fieldNameAlias: "name", operator: "contains", value: "abc" },
        { fieldNameAlias: "code", operator: "starts-with", value: "X" },
        { fieldNameAlias: "type", operator: "not-equals", value: "T" },
        { fieldNameAlias: "tags", operator: "in", value: "a,b" },
        { fieldNameAlias: "emptyNote", operator: "empty" },
        { fieldNameAlias: "note", operator: "not-empty" },
        { fieldNameAlias: "qty", operator: "greater-equals", value: "5" },
        { fieldNameAlias: "amount", operator: "between", value: "10", toValue: "20" }
      ]
    });

    const sentMap = apiMock.mock.calls[0][0].data.customParametersMap;
    expect(sentMap).toEqual({
      statusId: "OPEN",
      name: "abc", name_op: "contains",
      code: "X", code_op: "begins",
      type: "T", type_op: "equals", type_not: "Y",
      tags: "a,b", tags_op: "in",
      emptyNote_op: "empty",
      note_op: "empty", note_not: "Y",
      qty_from: "5",
      amount_from: "10", amount_thru: "20"
    });
  });

  it("does not encode persisted condition operators as runtime filters", async () => {
    apiMock.mockResolvedValue({ data: { entityValueList: [] } });
    const store = useDataDocumentStore();
    makePreviewEligible("Doc");

    await store.runPreview({
      filters: [{ fieldNameAlias: "quantity", operator: "greater", value: "5" }]
    });

    expect(apiMock.mock.calls[0][0].data.customParametersMap).toEqual({});
  });

  it("keeps a deferred preview response from replacing the latest document revision", async () => {
    const firstPreview = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    const secondPreview = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    apiMock
      .mockReturnValueOnce(firstPreview.promise)
      .mockReturnValueOnce(secondPreview.promise);
    const store = useDataDocumentStore();

    makePreviewEligible("DocumentA");
    const firstRequest = store.runPreview({ pageSize: 25 });
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    const revisionB = makePreviewEligible("DocumentB");
    const secondRequest = store.runPreview({ pageSize: 25 });
    secondPreview.resolve({ data: { entityValueList: [{ document: "B" }] } });
    await secondRequest;

    expect(store.getPreviewRows).toEqual([{ document: "B" }]);
    expect(store.getPreviewOwner).toEqual(expect.objectContaining({
      dataDocumentId: "DocumentB",
      savedRevision: revisionB
    }));

    firstPreview.resolve({ data: { entityValueList: [{ document: "A" }] } });
    await firstRequest;

    expect(store.getPreviewRows).toEqual([{ document: "B" }]);
    expect(store.getPreviewStatus).toBe("success");
  });

  it("ignores a stale preview rejection after the current revision succeeds", async () => {
    const stalePreview = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    const currentPreview = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    apiMock
      .mockReturnValueOnce(stalePreview.promise)
      .mockReturnValueOnce(currentPreview.promise);
    const store = useDataDocumentStore();

    makePreviewEligible("DocumentA");
    const staleRequest = store.runPreview({ pageSize: 25 });
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    makePreviewEligible("DocumentB");
    const currentRequest = store.runPreview({ pageSize: 25 });
    currentPreview.resolve({ data: { entityValueList: [{ document: "B" }] } });
    await currentRequest;
    stalePreview.reject(new Error("stale A failure"));
    await staleRequest;

    expect(store.getPreviewRows).toEqual([{ document: "B" }]);
    expect(store.getPreviewStatus).toBe("success");
    expect(store.getPreviewError).toBe("");
  });

  it.each(["late success", "late rejection"])("keeps the latest same-document same-revision preview after %s", async (lateOutcome) => {
    const firstPreview = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    const secondPreview = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    apiMock.mockReturnValueOnce(firstPreview.promise).mockReturnValueOnce(secondPreview.promise);
    const store = useDataDocumentStore();
    makePreviewEligible("SamePreviewDocument");

    const firstRequest = store.runPreview({ pageSize: 25 });
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    const secondRequest = store.runPreview({ pageSize: 25 });
    secondPreview.resolve({ data: { entityValueList: [{ result: "newest" }] } });
    await secondRequest;
    if (lateOutcome === "late success") {
      firstPreview.resolve({ data: { entityValueList: [{ result: "stale" }] } });
      await firstRequest;
    } else {
      firstPreview.reject(new Error("stale same-owner failure"));
      await firstRequest;
    }

    expect(store.getPreviewRows).toEqual([{ result: "newest" }]);
    expect(store.getPreviewStatus).toBe("success");
    expect(store.getPreviewError).toBe("");
  });

  it.each(["reset", "dirty", "release"])("ignores a late preview success after graph ownership is invalidated by %s", async (invalidation) => {
    const preview = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    apiMock.mockReturnValue(preview.promise);
    const store = useDataDocumentStore();
    const graphStore = useDataDocumentGraphStore();
    makePreviewEligible("InvalidatedPreview");
    const request = store.runPreview({ pageSize: 25 });
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));

    if (invalidation === "reset") store.resetPreview();
    if (invalidation === "dirty") graphStore.updateMetadata({ documentTitle: "dirty after preview" });
    if (invalidation === "release" && graphStore.targetOwnerToken) {
      graphStore.releasePreviewTarget(graphStore.targetOwnerToken);
    }
    preview.resolve({ data: { entityValueList: [{ result: "late" }] } });
    await request;

    expect(store.getPreviewRows).toEqual([]);
    expect(store.getPreviewStatus).toBe("idle");
    expect(store.getPreviewError).toBe("");
  });

  it("queues exports and refreshes history from Data Document System Message endpoints", async () => {
    apiMock
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({
        data: {
          systemMessages: [
            { systemMessageId: "DDX2001", messageText: "datamanager/export/ProductFacilityAndInventoryItem_1.csv" },
            { systemMessageId: "DDX2002", messageText: "datamanager/export/OrderHeader_1.csv" }
          ],
          systemMessagesCount: 2
        }
      });

    const store = useDataDocumentStore();
    // queueExport now POSTs the export AND refreshes the history so the queued export appears.
    await store.queueExport("ProductFacilityAndInventoryItem");

    expect(apiMock).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        url: "admin/dataDocuments/export",
        method: "POST",
        data: expect.objectContaining({
          dataDocumentId: "ProductFacilityAndInventoryItem"
        })
      })
    );
    expect(apiMock).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        url: "admin/systemMessages",
        method: "GET",
        params: expect.objectContaining({
          systemMessageTypeId: "ExportDocumentData"
        })
      })
    );
    expect(store.getExportHistory).toEqual([
      expect.objectContaining({
        systemMessageId: "DDX2001"
      })
    ]);
  });

  it("refreshes export history while polling", async () => {
    apiMock.mockResolvedValue({
      data: {
        systemMessages: [{
          systemMessageId: "DDX2003",
          messageText: "datamanager/export/ProductDocument_1.csv",
          statusId: "SmsgSent"
        }]
      }
    });
    const store = useDataDocumentStore();

    const newest = await store.pollExportHistory("ProductDocument", { attempts: 1, intervalMs: 0 });

    expect(apiMock).toHaveBeenCalledOnce();
    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "admin/systemMessages",
      method: "GET"
    }));
    expect(newest).toEqual(expect.objectContaining({ systemMessageId: "DDX2003" }));
  });

  it("keeps history and schedules owned by the latest document", async () => {
    const historyA = deferred<any>();
    const historyB = deferred<any>();
    const schedulesA = deferred<any>();
    const schedulesB = deferred<any>();
    let historyRequestCount = 0;
    let scheduleRequestCount = 0;
    apiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "admin/systemMessages") {
        historyRequestCount += 1;
        return historyRequestCount === 1 ? historyA.promise : historyB.promise;
      }
      if (url === "admin/serviceJobs") {
        scheduleRequestCount += 1;
        return scheduleRequestCount === 1 ? schedulesA.promise : schedulesB.promise;
      }
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentStore();

    const requestHistoryA = store.fetchExportHistory({ dataDocumentId: "DocumentA" });
    const requestHistoryB = store.fetchExportHistory({ dataDocumentId: "DocumentB" });
    const requestSchedulesA = store.fetchScheduledExports("DocumentA");
    const requestSchedulesB = store.fetchScheduledExports("DocumentB");
    historyB.resolve({ data: { systemMessages: [{ systemMessageId: "B", messageText: "DocumentB", initDate: 2 }] } });
    schedulesB.resolve({ data: { serviceJobList: [{ jobName: "B", serviceJobParameters: [{ parameterName: "dataDocumentId", parameterValue: "DocumentB" }] }] } });
    await Promise.all([requestHistoryB, requestSchedulesB]);
    historyA.resolve({ data: { systemMessages: [{ systemMessageId: "A", messageText: "DocumentA", initDate: 1 }] } });
    schedulesA.resolve({ data: { serviceJobList: [{ jobName: "A", serviceJobParameters: [{ parameterName: "dataDocumentId", parameterValue: "DocumentA" }] }] } });
    await Promise.all([requestHistoryA, requestSchedulesA]);

    expect(store.getExportHistory).toEqual([expect.objectContaining({ systemMessageId: "B" })]);
    expect(store.getScheduledExports).toEqual([expect.objectContaining({ jobName: "B" })]);
  });

  it("stops export polling after the owning route is released", async () => {
    vi.useFakeTimers();
    try {
      const store = useDataDocumentStore();
      const owner = Symbol("poll owner");
      (store as any).activateDocumentTarget(owner, "PollingDocument");
      const poll = store.pollExportHistory("PollingDocument", { attempts: 2, intervalMs: 10 });

      (store as any).releaseDocumentTarget(owner);
      await vi.advanceTimersByTimeAsync(30);
      await poll;

      expect(apiMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not let a late export continuation for A invalidate the active B poll", async () => {
    vi.useFakeTimers();
    try {
      const queuedExportA = deferred<{ data: Record<string, never> }>();
      apiMock.mockImplementation(({ url, data }: { url: string; data?: Record<string, unknown> }) => {
        if (url === "admin/dataDocuments/export" && data?.dataDocumentId === "DocumentA") {
          return queuedExportA.promise;
        }
        if (url === "admin/systemMessages") {
          return Promise.resolve({
            data: {
              systemMessages: [{
                systemMessageId: "B-ready",
                messageText: "datamanager/export/DocumentB_1.csv",
                statusId: "SmsgSent"
              }]
            }
          });
        }
        return Promise.resolve({ data: {} });
      });
      const store = useDataDocumentStore();
      const ownerA = Symbol("route A");
      const ownerB = Symbol("route B");
      store.activateDocumentTarget(ownerA, "DocumentA");

      const lateAContinuation = store.queueExport("DocumentA").then(() => (
        store.pollExportHistory("DocumentA", { attempts: 1, intervalMs: 0 })
      ));
      await vi.waitFor(() => expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({
        url: "admin/dataDocuments/export",
        data: expect.objectContaining({ dataDocumentId: "DocumentA" })
      })));

      store.releaseDocumentTarget(ownerA);
      store.activateDocumentTarget(ownerB, "DocumentB");
      const pollB = store.pollExportHistory("DocumentB", { attempts: 1, intervalMs: 10 });
      queuedExportA.resolve({ data: {} });
      await vi.advanceTimersByTimeAsync(0);
      await lateAContinuation;
      await vi.advanceTimersByTimeAsync(10);

      await expect(pollB).resolves.toEqual(expect.objectContaining({ systemMessageId: "B-ready" }));
      expect(apiMock.mock.calls.filter(([request]) => request.url === "admin/systemMessages")).toHaveLength(1);
      expect(store.getExportHistory).toEqual([expect.objectContaining({ systemMessageId: "B-ready" })]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns the full export history when no filters are applied", async () => {
    apiMock.mockResolvedValue({
      data: {
        systemMessages: [
          { systemMessageId: "DDX2001", messageText: "datamanager/export/ProductDocument_1.csv" },
          { systemMessageId: "DDX2002", messageText: "datamanager/export/OrderDocument_1.csv" }
        ],
        systemMessagesCount: 2
      }
    });

    const store = useDataDocumentStore();
    await store.fetchExportHistory();

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/systemMessages",
        params: expect.not.objectContaining({
          statusId: expect.anything()
        })
      })
    );
    expect(store.getExportHistory).toHaveLength(2);
  });

  it("sends the export history status filter to the server and applies the rest client-side", async () => {
    apiMock.mockResolvedValue({
      data: {
        systemMessages: [
          {
            systemMessageId: "DDX3001",
            messageText: "datamanager/export/ProductDocument_1.csv",
            startedBy: "hotwax.user",
            statusId: "SmsgSent",
            initDate: DateTime.fromISO("2026-06-05T12:00:00").toMillis()
          },
          {
            systemMessageId: "DDX3002",
            messageText: "datamanager/export/ProductDocument_2.csv",
            startedBy: "other.user",
            statusId: "SmsgSent",
            initDate: DateTime.fromISO("2026-06-05T12:00:00").toMillis()
          },
          {
            systemMessageId: "DDX3003",
            messageText: "datamanager/export/ProductDocument_3.csv",
            startedBy: "hotwax.user",
            statusId: "SmsgSent",
            initDate: DateTime.fromISO("2026-05-15T12:00:00").toMillis()
          },
          {
            systemMessageId: "DDX3004",
            messageText: "datamanager/export/OrderDocument_1.csv",
            startedBy: "hotwax.user",
            statusId: "SmsgSent",
            initDate: DateTime.fromISO("2026-06-05T12:00:00").toMillis()
          }
        ],
        systemMessagesCount: 4
      }
    });

    const store = useDataDocumentStore();
    await store.fetchExportHistory({
      dataDocumentId: "ProductDocument",
      statusId: "SmsgSent",
      startedBy: "HOTWAX",
      fromDate: "2026-06-01",
      thruDate: "2026-06-30"
    });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/systemMessages",
        method: "GET",
        params: expect.objectContaining({
          systemMessageTypeId: "ExportDocumentData",
          statusId: "SmsgSent"
        })
      })
    );
    expect(store.getExportHistory).toEqual([
      expect.objectContaining({
        systemMessageId: "DDX3001"
      })
    ]);
  });

  it("creates a new field with POST when it has no seq id, and updates with PUT when it does", async () => {
    apiMock.mockResolvedValue({ data: {} });
    const store = useDataDocumentStore();

    await store.saveField("ApiDocument", { fieldPath: "statusId", fieldNameAlias: "statusId" });
    expect(apiMock).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        url: "admin/dataDocuments/ApiDocument/fields",
        method: "POST"
      })
    );

    await store.saveField("ApiDocument", { fieldSeqId: "03", fieldPath: "statusId", fieldNameAlias: "statusId" });
    expect(apiMock).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        url: "admin/dataDocuments/ApiDocument/fields/03",
        method: "PUT"
      })
    );
  });

  it("deletes fields and conditions through the admin sub-resource endpoints", async () => {
    apiMock.mockResolvedValue({ data: {} });
    const store = useDataDocumentStore();

    await store.deleteField("ApiDocument", "03");
    expect(apiMock).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        url: "admin/dataDocuments/ApiDocument/fields/03",
        method: "DELETE"
      })
    );

    await store.deleteCondition("ApiDocument", "01");
    expect(apiMock).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        url: "admin/dataDocuments/ApiDocument/conditions/01",
        method: "DELETE"
      })
    );
  });

  it("forwards only the export params the queue service honors and drops filters and field selection", async () => {
    apiMock.mockResolvedValue({ data: {} });
    const store = useDataDocumentStore();

    await store.queueExport("ProductDocument", {
      format: "csv",
      query: {
        selectedFields: ["productId"],
        filters: [{ fieldNameAlias: "facilityId", operator: "equals", value: "WH1" }],
        sort: [{ fieldNameAlias: "productId", direction: "DESC" }],
        pageSize: 250
      }
    });

    const data = apiMock.mock.calls[0][0].data;
    expect(data).toEqual({
      dataDocumentId: "ProductDocument",
      orderByField: "-productId",
      pageSize: 250
    });
    // The export service ignores these, so we must not pretend they were applied.
    expect(data).not.toHaveProperty("fieldsToSelect");
    expect(data).not.toHaveProperty("customParametersMap");
    expect(data).not.toHaveProperty("filters");
    expect(data).not.toHaveProperty("format");
  });
});
