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

import { useSystemMessageStore } from "@/store/systemMessage";

describe("system message store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("falls back to split mock data when the API is unavailable", async () => {
    apiMock.mockRejectedValue(new Error("offline"));

    const store = useSystemMessageStore();

    await Promise.all([
      store.fetchSystemMessageTypes(),
      store.fetchSystemMessageRemotes(),
      store.fetchSystemMessages(),
      store.fetchSystemMessageErrors("100117")
    ]);

    expect(store.getSystemMessageTypes.length).toBeGreaterThan(0);
    expect(store.getSystemMessageRemotes.length).toBeGreaterThan(0);
    expect(store.getSystemMessages.length).toBeGreaterThan(0);
    expect(store.getSystemMessageErrors.length).toBeGreaterThan(0);
    expect(store.getSystemMessageStatuses.length).toBeGreaterThan(0);
    expect(store.getSystemMessageStatusFlows.length).toBeGreaterThan(0);
    expect(store.getSystemMessageStatusTransitions.length).toBeGreaterThan(0);
  });

  it("uses API results for monitor data when a collection payload is returned", async () => {
    apiMock.mockResolvedValue({
      data: {
        data: [
          {
            systemMessageId: "api-1001",
            systemMessageTypeId: "ApiMessageType",
            systemMessageRemoteId: "ApiRemote",
            statusId: "SmsgError",
            isOutgoing: "Y",
            messageText: "{\"ping\":true}"
          }
        ],
        count: 42
      }
    });

    const store = useSystemMessageStore();
    await store.fetchSystemMessages({ pageSize: 25, pageIndex: 0, statusId: "SmsgError" });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "system/messages",
        method: "GET",
        params: expect.objectContaining({
          pageSize: 25,
          pageIndex: 0,
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
        url: "system/message/types",
        method: "POST"
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

  it("still exposes allowed transitions derived from the status flow graph", () => {
    const store = useSystemMessageStore();
    const replayTransitions = store.getAllowedTransitions({
      statusId: "SmsgError",
      isOutgoing: "Y"
    });

    const transitionStatusIds = replayTransitions.map((transition: any) => transition.toStatusId);

    expect(transitionStatusIds).toEqual(
      expect.arrayContaining([
        "SmsgCancelled",
        "SmsgProduced",
        "SmsgSending",
        "SmsgSent"
      ])
    );
    expect(replayTransitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toStatusId: "SmsgProduced",
          toStatusDescription: "Produced",
          toStatusColor: "primary"
        }),
        expect.objectContaining({
          toStatusId: "SmsgCancelled",
          toStatusDescription: "Cancelled",
          toStatusColor: "medium"
        })
      ])
    );
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
    const sequence = await store.fetchEnumSequence("StepB");
    
    // Should result in [StepA, StepB, StepC]
    expect(sequence).toHaveLength(3);
    expect(sequence[0].enumId).toBe("StepA");
    expect(sequence[1].enumId).toBe("StepB");
    expect(sequence[2].enumId).toBe("StepC");
    expect(store.getCurrentEnumSequence).toEqual(sequence);
  });
});
