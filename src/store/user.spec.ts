import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock, emitMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  emitMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: {},
  emitter: { emit: emitMock, on: vi.fn(), off: vi.fn() },
  translate: (value: string) => value
}));

vi.mock("@common/composables/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn() })
}));

vi.mock("@/utils", () => ({
  isAppCompatible: vi.fn(),
  redirectToLegacyApp: vi.fn(),
  showToast: vi.fn()
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn()
  }
}));

import { useUserStore } from "@/store/user";

describe("user store product store switching", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    emitMock.mockReset();
  });

  it("emits productStoreUpdated only after the full store context is refreshed", async () => {
    const store = useUserStore();
    store.current = { stores: [{ productStoreId: "STORE_A", storeName: "Store A" }] };

    apiMock.mockResolvedValue({ data: [] });

    await store.setCurrentProductStore({ productStoreId: "STORE_A" });

    expect(store.currentProductStore).toEqual(expect.objectContaining({ productStoreId: "STORE_A" }));
    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({ url: "oms/shopifyShops/shops" }));
    expect(emitMock).toHaveBeenCalledWith("productStoreUpdated");
    // The Shopify config lookup must complete before listeners are notified so
    // pages re-query with the full new context.
    expect(apiMock.mock.invocationCallOrder[0]).toBeLessThan(emitMock.mock.invocationCallOrder[0]);
  });

  it("resets the selected system message remote when the new store has no shop", async () => {
    const store = useUserStore();
    store.current = { stores: [{ productStoreId: "STORE_B", storeName: "Store B" }] };
    store.selectedSystemMessageRemoteId = "REMOTE_OF_OLD_STORE";

    apiMock.mockResolvedValue({ data: [] });

    await store.setCurrentProductStore({ productStoreId: "STORE_B" });

    expect(store.selectedSystemMessageRemoteId).toBe("");
    expect(emitMock).toHaveBeenCalledWith("productStoreUpdated");
  });
});
