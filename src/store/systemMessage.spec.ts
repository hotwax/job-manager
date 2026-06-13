import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  cookieHelper: () => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }),
  translate: (value: string) => value
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useSystemMessageStore } from "@/store/systemMessage";

describe("system message store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("clears monitor data when the API is unavailable", async () => {
    apiMock.mockRejectedValue(new Error("offline"));

    const store = useSystemMessageStore();

    await store.fetchSystemMessages();

    expect(store.getSystemMessages).toEqual([]);
    expect(store.getSystemMessageTotal).toBe(0);
  });

  it("uses API results for monitor data when a system message payload is returned", async () => {
    apiMock.mockResolvedValue({
      data: {
        systemMessages: [
          {
            systemMessageId: "api-1001",
            systemMessageTypeId: "ApiMessageType",
            systemMessageRemoteId: "ApiRemote",
            statusId: "SmsgError",
            isOutgoing: "Y",
            messageText: "{\"ping\":true}"
          }
        ],
        systemMessagesCount: 42
      }
    });

    const store = useSystemMessageStore();
    await store.fetchSystemMessages({ pageSize: 25, pageIndex: 0, statusId: "SmsgError" });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/systemMessages",
        method: "GET",
        params: expect.objectContaining({
          pageSize: 25,
          pageIndex: 0,
          orderBy: "-initDate",
          statusId: "SmsgError"
        })
      })
    );
    expect(store.getSystemMessages).toEqual([
      expect.objectContaining({
        systemMessageId: "api-1001",
        systemMessageTypeId: "ApiMessageType"
      })
    ]);
    expect(store.getSystemMessageTotal).toBe(42);
  });

  it("saves a message type through the API and updates the local store", async () => {
    apiMock.mockResolvedValue({
      data: {
        entity: {
          systemMessageTypeId: "ApiCreatedType",
          description: "Created from API"
        }
      }
    });

    const store = useSystemMessageStore();
    const result = await store.saveSystemMessageType({
      systemMessageTypeId: "ApiCreatedType",
      description: "Created from API"
    });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/systemMessages/types/ApiCreatedType",
        method: "PUT"
      })
    );
    expect(result.data?.success).toBe(true);
    expect(store.getCurrentSystemMessageType).toEqual(
      expect.objectContaining({
        systemMessageTypeId: "ApiCreatedType",
        description: "Created from API"
      })
    );
  });

  it("downloads a linked file through the system message download endpoint", async () => {
    const mockBlob = new Blob(["sample file"], { type: "text/plain;charset=utf-8" });
    apiMock.mockResolvedValue({
      data: mockBlob,
      headers: {
        "content-type": "text/plain;charset=utf-8"
      }
    });

    const store = useSystemMessageStore();
    const result = await store.downloadSystemMessageFile("M245875");

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "inventory-cycle-count/cycleCounts/systemMessages/M245875/downloadFile",
        method: "GET",
        responseType: "blob"
      })
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toBe(mockBlob);
  });

  it("fetches the entire enum sequence bidirectionally", async () => {
    const store = useSystemMessageStore();
    // Setup a 3-step sequence: StepA -> StepB -> StepC
    store.$patch((state: any) => {
      state.enums = [
        { enumId: "StepA", relatedEnumId: "StepB", description: "Step A" },
        { enumId: "StepB", relatedEnumId: "StepC", description: "Step B" },
        { enumId: "StepC", relatedEnumId: null, description: "Step C" }
      ];
    });

    // Start fetching from the middle step (StepB)
    await store.fetchEnumSequence("StepB");
    
    // Should result in [StepA, StepB, StepC]
    const sequence = store.getCurrentEnumSequence;
    expect(sequence).toHaveLength(3);
    expect(sequence[0].enumId).toBe("StepA");
    expect(sequence[1].enumId).toBe("StepB");
    expect(sequence[2].enumId).toBe("StepC");
    expect(store.getCurrentEnumSequence).toEqual(sequence);
  });
});
