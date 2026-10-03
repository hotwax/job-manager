import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { DateTime } from "luxon";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  translate: (value: string) => value
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useDataDocumentStore } from "@/store/dataDocuments";

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

  it("hydrates nested fields, conditions, and feeds from the Moqui detail response", async () => {
    // The related requests start alongside the document, so answer by URL rather than by call order.
    apiMock.mockImplementation(({ url }: { url: string }) => {
      if(url === "moqui/dataDocuments/ApiDocument") {
        return Promise.resolve({
          data: {
            dataDocumentId: "ApiDocument",
            fields: [{ fieldSeqId: "10", fieldNameAlias: "productId", fieldPath: "Product:productId" }],
            conditions: [{ conditionSeqId: "10", fieldNameAlias: "productId", operator: "not-empty" }],
            feeds: [{ dataFeedId: "ProductFeed", dataDocumentId: "ApiDocument" }]
          }
        });
      }
      if(url === "admin/systemMessages") {
        return Promise.resolve({
          data: {
            systemMessages: [
              { systemMessageId: "DDX1001", messageText: "datamanager/export/ApiDocument_1.csv" },
              { systemMessageId: "DDX1002", messageText: "datamanager/export/OtherDocument_1.csv" }
            ],
            systemMessagesCount: 2
          }
        });
      }

      return Promise.resolve({ data: { serviceJobList: [] } });
    });

    const store = useDataDocumentStore();
    await store.fetchDataDocument("ApiDocument");

    expect(apiMock).toHaveBeenCalledTimes(3);
    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "moqui/dataDocuments/ApiDocument",
      method: "GET"
    }));
    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "admin/systemMessages",
      method: "GET",
      params: expect.objectContaining({
        systemMessageTypeId: "ExportDocumentData"
      })
    }));
    expect(store.getFields).toEqual([
      expect.objectContaining({
        fieldNameAlias: "productId"
      })
    ]);
    expect(store.getConditions).toHaveLength(1);
    expect(store.getRelatedFeeds).toHaveLength(1);
    // The history loads in the background, so wait for it rather than relying on microtask order.
    await vi.waitFor(() => expect(store.getExportHistory).toEqual([
      expect.objectContaining({
        systemMessageId: "DDX1001"
      })
    ]));
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
    await store.runPreview("ProductFacilityAndInventoryItem", {
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
    await store.runPreview("Doc", {
      filters: [
        { fieldNameAlias: "statusId", operator: "equals", value: "OPEN" },
        { fieldNameAlias: "name", operator: "contains", value: "abc" },
        { fieldNameAlias: "code", operator: "starts-with", value: "X" },
        { fieldNameAlias: "type", operator: "not-equals", value: "T" },
        { fieldNameAlias: "tags", operator: "in", value: "a,b" },
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
      note_op: "empty", note_not: "Y",
      qty_from: "5",
      amount_from: "10", amount_thru: "20"
    });
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
          dataDocumentId: "ProductFacilityAndInventoryItem",
          pageSize: 10000,
          pageIndex: 0
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

  it("re-spells a field alias so the API's camel-casing keeps it as typed, on create and on update", async () => {
    apiMock.mockResolvedValue({ data: {} });
    const store = useDataDocumentStore();

    await store.saveField("ApiDocument", { fieldPath: "amount", fieldNameAlias: "shippingRevenue" });
    await store.saveField("ApiDocument", { fieldSeqId: "03", fieldPath: "statusId", fieldNameAlias: "orderStatusId" });

    expect(apiMock.mock.calls[0][0].data.fieldNameAlias).toBe("shipping_Revenue");
    expect(apiMock.mock.calls[1][0].data.fieldNameAlias).toBe("order_Status_Id");
  });

  it("does not invent an alias for a field that has none", async () => {
    apiMock.mockResolvedValue({ data: {} });
    const store = useDataDocumentStore();

    await store.saveField("ApiDocument", { fieldPath: "statusId" });

    expect(apiMock.mock.calls[0][0].data).not.toHaveProperty("fieldNameAlias");
  });

  it("names the alias the API stores in a condition, including the field it is compared to", async () => {
    apiMock.mockResolvedValue({ data: {} });
    const store = useDataDocumentStore();

    await store.saveCondition("ApiDocument", { fieldNameAlias: "orderAdjustmentTypeId", operator: "equals", fieldValue: "SHIPPING_CHARGES" });
    await store.saveCondition("ApiDocument", { conditionSeqId: "02", fieldNameAlias: "order_id", toFieldNameAlias: "ship date" });

    expect(apiMock.mock.calls[0][0].data).toEqual(expect.objectContaining({
      fieldNameAlias: "orderAdjustmentTypeId",
      fieldValue: "SHIPPING_CHARGES"
    }));
    expect(apiMock.mock.calls[0][0].data).not.toHaveProperty("toFieldNameAlias");
    expect(apiMock.mock.calls[1][0].data).toEqual(expect.objectContaining({
      fieldNameAlias: "orderId",
      toFieldNameAlias: "shipDate"
    }));
  });

  it("stores an In list without the spaces the backend would keep as part of a value", async () => {
    apiMock.mockResolvedValue({ data: {} });
    const store = useDataDocumentStore();

    await store.saveCondition("ApiDocument", { fieldNameAlias: "productStoreId", operator: "in", fieldValue: "STORE, STORE_CA" });
    await store.saveCondition("ApiDocument", { fieldNameAlias: "productStoreId", operator: "like", fieldValue: "STORE, %" });
    await store.saveCondition("ApiDocument", { fieldNameAlias: "productStoreId", operator: "is-not-null" });

    expect(apiMock.mock.calls[0][0].data.fieldValue).toBe("STORE,STORE_CA");
    // any other operator keeps the value as typed
    expect(apiMock.mock.calls[1][0].data.fieldValue).toBe("STORE, %");
    // and a condition with no value does not gain one
    expect(apiMock.mock.calls[2][0].data).not.toHaveProperty("fieldValue");
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
      pageIndex: 2,
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
      pageSize: 250,
      pageIndex: 2
    });
    // The export service ignores these, so we must not pretend they were applied.
    expect(data).not.toHaveProperty("fieldsToSelect");
    expect(data).not.toHaveProperty("customParametersMap");
    expect(data).not.toHaveProperty("filters");
    expect(data).not.toHaveProperty("format");
  });
});

describe("data document store - document scope", () => {
  const detail = (id: string) => ({
    data: {
      dataDocumentId: id,
      fields: [{ fieldSeqId: "10", fieldNameAlias: `${id}Field`, dataDocumentId: id }],
      conditions: [{ conditionSeqId: "10", fieldNameAlias: `${id}Field` }],
      feeds: [{ dataFeedId: `${id}Feed`, dataDocumentId: id }],
      jobs: [{ jobName: `${id}Job` }]
    }
  });
  const noHistory = { data: { systemMessages: [], systemMessagesCount: 0 } };
  const deferred = <T = any>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });

    return { promise, resolve, reject };
  };
  // Answer each URL from a table so tests do not depend on the order requests are issued in.
  const respondWith = (routes: Record<string, () => Promise<any>>) => {
    apiMock.mockImplementation(({ url }: { url: string }) => (routes[url] ? routes[url]() : Promise.resolve(noHistory)));
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("resolves the document without waiting for the export history", async () => {
    const history = deferred();
    respondWith({
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "admin/systemMessages": () => history.promise
    });
    const store = useDataDocumentStore();

    await store.fetchDataDocument("DocA");

    expect(store.getFields).toHaveLength(1);
    expect(store.getExportHistory).toEqual([]);
    history.resolve({ data: { systemMessages: [{ systemMessageId: "DDX1", messageText: "export/DocA_1.csv" }] } });
    await vi.waitFor(() => expect(store.getExportHistory).toHaveLength(1));
  });

  it("drops the previous document's data the moment another document is requested", async () => {
    const docB = deferred();
    respondWith({
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "moqui/dataDocuments/DocB": () => docB.promise
    });
    const store = useDataDocumentStore();
    await store.fetchDataDocument("DocA");
    store.previewRows = [{ a: 1 }];
    store.previewTotal = 1;
    store.previewStatus = "success";
    store.scheduledExports = [{ jobName: "x" }];

    const loadingB = store.fetchDataDocument("DocB");

    expect(store.getCurrentDocument).toBeUndefined();
    expect(store.getFields).toEqual([]);
    expect(store.getConditions).toEqual([]);
    expect(store.getRelatedFeeds).toEqual([]);
    expect(store.getRelatedJobs).toEqual([]);
    expect(store.getScheduledExports).toEqual([]);
    expect(store.getExportHistory).toEqual([]);
    expect(store.getPreviewRows).toEqual([]);
    expect(store.getPreviewStatus).toBe("idle");
    docB.resolve(detail("DocB"));
    await loadingB;
    expect(store.getFields).toEqual([expect.objectContaining({ fieldNameAlias: "DocBField" })]);
  });

  it("keeps a document's own preview when the same document is fetched again", async () => {
    respondWith({ "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")) });
    const store = useDataDocumentStore();
    await store.fetchDataDocument("DocA");
    store.previewRows = [{ a: 1 }];
    store.previewTotal = 1;
    store.previewStatus = "success";

    await store.fetchDataDocument("DocA");

    expect(store.getPreviewRows).toEqual([{ a: 1 }]);
    expect(store.getPreviewStatus).toBe("success");
  });

  it("ignores a slow response for a document that is no longer active", async () => {
    const docA = deferred();
    const docB = deferred();
    respondWith({
      "moqui/dataDocuments/DocA": () => docA.promise,
      "moqui/dataDocuments/DocB": () => docB.promise
    });
    const store = useDataDocumentStore();

    const loadingA = store.fetchDataDocument("DocA");
    const loadingB = store.fetchDataDocument("DocB");
    docB.resolve(detail("DocB"));
    await loadingB;
    docA.resolve(detail("DocA"));
    await loadingA;

    expect(store.getCurrentDocument).toEqual(expect.objectContaining({ dataDocumentId: "DocB" }));
    expect(store.getFields).toEqual([expect.objectContaining({ fieldNameAlias: "DocBField" })]);
  });

  it("throws when the document cannot be loaded and leaves nothing of the previous one behind", async () => {
    respondWith({
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "moqui/dataDocuments/DocB": () => Promise.reject(new Error("404"))
    });
    const store = useDataDocumentStore();
    await store.fetchDataDocument("DocA");

    await expect(store.fetchDataDocument("DocB")).rejects.toThrow("404");

    expect(store.getCurrentDocument).toBeUndefined();
    expect(store.getFields).toEqual([]);
    expect(store.getConditions).toEqual([]);
  });

  it("drops a preview that finishes after another document became active", async () => {
    const preview = deferred();
    respondWith({
      "oms/dataDocumentView": () => preview.promise,
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "moqui/dataDocuments/DocB": () => Promise.resolve(detail("DocB"))
    });
    const store = useDataDocumentStore();
    await store.fetchDataDocument("DocA");
    const running = store.runPreview("DocA", { selectedFields: [] });

    await store.fetchDataDocument("DocB");
    preview.resolve({ data: { rows: [{ a: 1 }] } });
    await running;

    expect(store.getPreviewRows).toEqual([]);
    expect(store.getPreviewStatus).toBe("idle");
  });

  it("stops polling the export history once another document is active", async () => {
    const store = useDataDocumentStore();
    store.activeDocumentId = "DocB";

    const newest = await store.pollExportHistory("DocA", { attempts: 3, intervalMs: 1 });

    expect(newest).toBeUndefined();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("never holds the global history page's document filter to the builder's active document", async () => {
    respondWith({ "admin/systemMessages": () => Promise.resolve({ data: { systemMessages: [{ systemMessageId: "DDX1", messageText: "export/DocB_1.csv" }] } }) });
    const store = useDataDocumentStore();
    // A kept unsaved draft leaves DocA active while the user opens the global export history.
    store.activeDocumentId = "DocA";

    await store.fetchExportHistory({ dataDocumentId: "DocB" });

    expect(store.getExportHistory).toEqual([expect.objectContaining({ systemMessageId: "DDX1" })]);
  });

  it("drops a document-scoped history response that arrives after another document became active", async () => {
    const history = deferred();
    respondWith({ "admin/systemMessages": () => history.promise });
    const store = useDataDocumentStore();
    store.activeDocumentId = "DocA";

    const running = store.fetchExportHistory({ dataDocumentId: "DocA" }, { documentScoped: true });
    store.activeDocumentId = "DocB";
    history.resolve({ data: { systemMessages: [{ systemMessageId: "DDX1", messageText: "export/DocA_1.csv" }] } });
    await running;

    expect(store.getExportHistory).toEqual([]);
  });

  it("drops the background history of a document that was left before it arrived", async () => {
    const history = deferred();
    respondWith({
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "admin/systemMessages": () => history.promise
    });
    const store = useDataDocumentStore();

    await store.fetchDataDocument("DocA");
    store.resetDocumentScope();
    history.resolve({ data: { systemMessages: [{ systemMessageId: "DDX1", messageText: "export/DocA_1.csv" }] } });
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({ url: "admin/systemMessages" })));
    await Promise.resolve();

    expect(store.getExportHistory).toEqual([]);
  });

  it("starts the exports and scheduled exports with the document, not after it", async () => {
    const doc = deferred();
    respondWith({ "moqui/dataDocuments/DocA": () => doc.promise });
    const store = useDataDocumentStore();

    const loading = store.fetchDataDocument("DocA");

    // Nothing has resolved yet, and all three requests are already in flight.
    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({ url: "moqui/dataDocuments/DocA" }));
    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({ url: "admin/systemMessages" }));
    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({ url: "admin/serviceJobs" }));
    doc.resolve(detail("DocA"));
    await loading;
  });

  it("loadRelated starts each request once and leaves a running or finished one alone", () => {
    respondWith({});
    const store = useDataDocumentStore();

    store.loadRelated("DocA");
    store.loadRelated("DocA");

    expect(apiMock.mock.calls.filter(([request]) => request.url === "admin/systemMessages")).toHaveLength(1);
    expect(apiMock.mock.calls.filter(([request]) => request.url === "admin/serviceJobs")).toHaveLength(1);
    expect(store.activeDocumentId).toBe("DocA");
  });

  it("loadRelated for another document drops the previous document's scope first", () => {
    respondWith({});
    const store = useDataDocumentStore();
    store.activeDocumentId = "DocA";
    store.previewRows = [{ a: 1 }];
    store.exportHistoryStatus = "ready";

    store.loadRelated("DocB");

    expect(store.getPreviewRows).toEqual([]);
    expect(store.activeDocumentId).toBe("DocB");
    expect(store.getExportHistoryStatus).toBe("loading");
  });

  it("leaves the related requests out of a re-sync", async () => {
    respondWith({ "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")) });
    const store = useDataDocumentStore();

    await store.fetchDataDocument("DocA", { includeRelated: false });

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(store.getExportHistoryStatus).toBe("idle");
    expect(store.getScheduledExportsStatus).toBe("idle");
  });

  it("tracks each background request on its own so a tab can show a placeholder until it lands", async () => {
    const history = deferred();
    const jobs = deferred();
    respondWith({
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "admin/systemMessages": () => history.promise,
      "admin/serviceJobs": () => jobs.promise
    });
    const store = useDataDocumentStore();

    await store.fetchDataDocument("DocA");
    expect(store.getExportHistoryStatus).toBe("loading");
    expect(store.getScheduledExportsStatus).toBe("loading");

    jobs.resolve({ data: { serviceJobList: [] } });
    await vi.waitFor(() => expect(store.getScheduledExportsStatus).toBe("ready"));
    expect(store.getExportHistoryStatus).toBe("loading");

    history.resolve({ data: { systemMessages: [] } });
    await vi.waitFor(() => expect(store.getExportHistoryStatus).toBe("ready"));
  });

  it("marks a failed background request as an error without failing the document", async () => {
    respondWith({
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "admin/systemMessages": () => Promise.reject(new Error("boom")),
      "admin/serviceJobs": () => Promise.reject(new Error("boom"))
    });
    const store = useDataDocumentStore();

    await store.fetchDataDocument("DocA");

    await vi.waitFor(() => expect(store.getExportHistoryStatus).toBe("error"));
    await vi.waitFor(() => expect(store.getScheduledExportsStatus).toBe("error"));
    expect(store.getFields).toHaveLength(1);
  });

  it("does not let a superseded background request change another document's status", async () => {
    const history = deferred();
    respondWith({
      "moqui/dataDocuments/DocA": () => Promise.resolve(detail("DocA")),
      "moqui/dataDocuments/DocB": () => Promise.resolve(detail("DocB")),
      "admin/systemMessages": () => history.promise
    });
    const store = useDataDocumentStore();
    await store.fetchDataDocument("DocA");
    respondWith({
      "moqui/dataDocuments/DocB": () => Promise.resolve(detail("DocB")),
      "admin/systemMessages": () => Promise.resolve({ data: { systemMessages: [] } })
    });

    await store.fetchDataDocument("DocB");
    await vi.waitFor(() => expect(store.getExportHistoryStatus).toBe("ready"));
    history.resolve({ data: { systemMessages: [{ systemMessageId: "DDX1", messageText: "export/DocA_1.csv" }] } });
    await Promise.resolve();

    expect(store.getExportHistoryStatus).toBe("ready");
    expect(store.getExportHistory).toEqual([]);
  });

  it("resetDocumentScope clears the document's data but keeps the catalog list", () => {
    const store = useDataDocumentStore();
    store.dataDocuments = [{ dataDocumentId: "DocA" }];
    store.total = 1;
    store.activeDocumentId = "DocA";
    store.fields = [{ fieldSeqId: "10" }];
    store.previewRows = [{ a: 1 }];
    store.previewStatus = "success";

    store.exportHistoryStatus = "ready";
    store.scheduledExportsStatus = "ready";

    store.resetDocumentScope();

    expect(store.getExportHistoryStatus).toBe("idle");
    expect(store.getScheduledExportsStatus).toBe("idle");
    expect(store.activeDocumentId).toBe("");
    expect(store.getFields).toEqual([]);
    expect(store.getPreviewRows).toEqual([]);
    expect(store.getPreviewStatus).toBe("idle");
    expect(store.getDataDocuments).toEqual([{ dataDocumentId: "DocA" }]);
    expect(store.getTotal).toBe(1);
  });
});
