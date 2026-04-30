import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

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

  it("calls the Moqui Data Document API route for document lists", async () => {
    apiMock.mockResolvedValue({
      data: [
        {
          dataDocumentId: "ApiDocument",
          documentName: "API Document"
        }
      ]
    });

    const store = useDataDocumentStore();
    await store.fetchDataDocuments({ pageSize: 25, queryString: "api" });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "moqui/dataDocuments",
        method: "GET",
        params: expect.objectContaining({
          pageSize: 25,
          orderByField: "dataDocumentId",
          dependentLevels: 1
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
    apiMock.mockResolvedValue({
      data: {
        dataDocumentId: "ApiDocument",
        fields: [{ fieldSeqId: "10", fieldNameAlias: "productId", fieldPath: "Product:productId" }],
        conditions: [{ conditionSeqId: "10", fieldNameAlias: "productId", operator: "not-empty" }],
        feeds: [{ dataFeedId: "ProductFeed", dataDocumentId: "ApiDocument" }]
      }
    });

    const store = useDataDocumentStore();
    await store.fetchDataDocument("ApiDocument");

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        url: "moqui/dataDocuments/ApiDocument",
        method: "GET",
        params: {
          dependentLevels: 1
        }
      })
    );
    expect(store.getFields).toEqual([
      expect.objectContaining({
        fieldNameAlias: "productId"
      })
    ]);
    expect(store.getConditions).toHaveLength(1);
    expect(store.getRelatedFeeds).toHaveLength(1);
  });

  it("normalizes Moqui feed child records for the existing catalog UI", async () => {
    apiMock.mockResolvedValue({
      data: [
        {
          dataDocumentId: "FeedDocument",
          documentName: "Feed Document",
          feeds: [{ dataFeedId: "ProductFeed", dataDocumentId: "FeedDocument" }]
        }
      ]
    });

    const store = useDataDocumentStore();
    await store.fetchDataDocuments({ dataFeedId: "ProductFeed" });

    expect(store.getDataDocuments).toEqual([
      expect.objectContaining({
        relatedFeeds: ["ProductFeed"]
      })
    ]);
    expect(store.getAvailableFeeds).toEqual(["ProductFeed"]);
  });

  it("builds a feed list from Moqui DataFeedDocument child records", async () => {
    apiMock.mockResolvedValue({
      data: [
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
      ]
    });

    const store = useDataDocumentStore();
    await store.fetchDataFeeds();

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "moqui/dataDocuments",
        method: "GET",
        params: expect.objectContaining({
          pageNoLimit: "true",
          dependentLevels: 1
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
        data: [
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
        ]
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
        url: "moqui/dataDocuments",
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
    apiMock.mockResolvedValue({ data: [] });

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
    apiMock.mockResolvedValue({
      data: {
        data: [{ productId: "10001" }],
        count: 1
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
          fieldsToSelect: ["productId"],
          customParametersMap: { facilityId: "WH1" },
          orderByField: "-productId",
          distinct: true,
          pageSize: 5
        })
      })
    );
    expect(store.getPreviewTotal).toBe(1);
  });

  it("queues exports and reads history from Data Document System Message endpoints", async () => {
    apiMock
      .mockResolvedValueOnce({ data: { systemMessageId: "DDX2001", statusId: "SmsgProduced" } })
      .mockResolvedValueOnce({ data: { systemMessages: [{ systemMessageId: "DDX2001" }], systemMessagesCount: 1 } });

    const store = useDataDocumentStore();
    await store.queueExport("ProductFacilityAndInventoryItem", {
      query: { selectedFields: ["productId"], filters: [], pageSize: 25 },
      format: "csv"
    });
    await store.fetchExportHistory({ dataDocumentId: "ProductFacilityAndInventoryItem" });

    expect(apiMock).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        url: "admin/dataDocuments/ProductFacilityAndInventoryItem/exports",
        method: "POST",
        data: expect.objectContaining({
          dataDocumentId: "ProductFacilityAndInventoryItem",
          format: "csv",
          fieldsToSelect: ["productId"]
        })
      })
    );
    expect(apiMock).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        url: "admin/dataDocuments/exports",
        method: "GET",
        params: expect.objectContaining({
          systemMessageTypeId: "ExportDataDocument",
          dataDocumentId: "ProductFacilityAndInventoryItem"
        })
      })
    );
  });
});
