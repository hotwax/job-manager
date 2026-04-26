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

  it("falls back to mock documents when the API is unavailable", async () => {
    apiMock.mockRejectedValue(new Error("offline"));

    const store = useDataDocumentStore();
    await store.fetchDataDocuments({ queryString: "inventory" });

    expect(store.getDataDocuments.length).toBeGreaterThan(0);
    expect(store.getDataDocuments[0]).toEqual(
      expect.objectContaining({
        dataDocumentId: "ProductFacilityAndInventoryItem"
      })
    );
  });

  it("calls the entity-style API route for document lists", async () => {
    apiMock.mockResolvedValue({
      data: {
        data: [
          {
            dataDocumentId: "ApiDocument",
            documentName: "API Document"
          }
        ],
        count: 1
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
