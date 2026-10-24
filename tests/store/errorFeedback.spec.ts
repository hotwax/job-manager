import { commonUtil } from "@common/utils/commonUtil";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock, toastMock } = vi.hoisted(() => ({ apiMock: vi.fn(), toastMock: vi.fn() }));
vi.mock("@common", async () => ({
  api: apiMock,
  commonUtil: (await import("@common/utils/commonUtil")).commonUtil,
  translate: (value: string) => value
}));
vi.mock("@/utils", () => ({ getTimeInMillis: (value: number) => value, getDateAndTime: vi.fn(), showToast: toastMock }));
vi.mock("@/logger", () => ({ default: { error: vi.fn() } }));

import { useMdmConfigStore } from "@/store/mdmConfig";
import { useSystemMessageStore } from "@/store/systemMessage";

describe("operation failure feedback", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("preserves a rejected configuration error and leaves cached values unchanged", async () => {
    const error = { response: { data: { errors: "Related record does not exist\nCheck the parent type" } } };
    apiMock.mockRejectedValueOnce(error);
    const store = useMdmConfigStore();
    store.configs = [{ configId: "C1", description: "Original" }];
    await expect(store.updateConfig("C1", { description: "Changed" })).rejects.toBe(error);
    expect(store.configs[0].description).toBe("Original");
    expect(commonUtil.getErrorMessage(error)).toBe("Related record does not exist; Check the parent type");
  });

  it("updates cached configuration only after a successful save", async () => {
    apiMock.mockResolvedValueOnce({ data: {} });
    const store = useMdmConfigStore();
    store.configs = [{ configId: "C1", description: "Original" }];
    await expect(store.updateConfig("C1", { description: "Changed" })).resolves.toBe(true);
    expect(store.configs[0].description).toBe("Changed");
  });

  it.each([
    [{ response: { data: { errors: "Parent type does not exist\nChoose an existing type" } } }, "Parent type does not exist; Choose an existing type"],
    [{ response: { data: { _ERROR_MESSAGE_LIST_: ["Invalid status", "Try again"] } } }, "Invalid status, Try again"],
    [new Error("Network Error"), "Network Error"],
    [{ response: { data: "<html>Proxy failure</html>" }, message: "Request failed with status code 502" }, "Request failed with status code 502"],
    [{}, ""]
  ])("keeps operation context, extracts the available reason, and clears loading", async (error, reason) => {
    apiMock.mockRejectedValueOnce(error);
    const store = useSystemMessageStore();
    await store.updateSystemMessage({ endpoint: "retry", data: { systemMessageId: "M1" } });
    expect(toastMock).toHaveBeenCalledOnce();
    expect(toastMock).toHaveBeenCalledWith(`Failed to update system message. ${reason}`);
    expect(store.loading).toBe(false);
  });

  it("does not replace the current message type when a save is rejected", async () => {
    const error = { response: { data: { errors: "Parent type does not exist" } } };
    apiMock.mockRejectedValueOnce(error);
    const store = useSystemMessageStore();
    store.currentSystemMessageType = { systemMessageTypeId: "Existing" };
    const result = await store.saveSystemMessageType({ systemMessageTypeId: "Invalid", parentTypeId: "Missing" });
    expect(result.error).toBe(error);
    expect(store.currentSystemMessageType).toEqual({ systemMessageTypeId: "Existing" });
    expect(store.loading).toBe(false);
  });
});
