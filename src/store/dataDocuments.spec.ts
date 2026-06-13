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
    apiMock
      .mockResolvedValueOnce({
        data: {
          dataDocumentId: "ApiDocument",
          fields: [{ fieldSeqId: "10", fieldNameAlias: "productId", fieldPath: "Product:productId" }],
          conditions: [{ conditionSeqId: "10", fieldNameAlias: "productId", operator: "not-empty" }],
          feeds: [{ dataFeedId: "ProductFeed", dataDocumentId: "ApiDocument" }]
        }
      })
      .mockResolvedValueOnce({
        data: {
          systemMessages: [
            { systemMessageId: "DDX1001", messageText: "datamanager/export/ApiDocument_1.csv" },
            { systemMessageId: "DDX1002", messageText: "datamanager/export/OtherDocument_1.csv" }
          ],
          systemMessagesCount: 2
        }
      });

    const store = useDataDocumentStore();
    await store.fetchDataDocument("ApiDocument");

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        url: "moqui/dataDocuments/ApiDocument",
        method: "GET"
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
    expect(store.getFields).toEqual([
      expect.objectContaining({
        fieldNameAlias: "productId"
      })
    ]);
    expect(store.getConditions).toHaveLength(1);
    expect(store.getRelatedFeeds).toHaveLength(1);
    expect(store.getExportHistory).toEqual([
      expect.objectContaining({
        systemMessageId: "DDX1001"
      })
    ]);
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
