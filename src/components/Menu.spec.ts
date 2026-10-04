import { flushPromises, shallowMount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Menu from "./Menu.vue";
import { useUserStore } from "@/store/user";

const mocks = vi.hoisted(() => ({
  emit: vi.fn()
}));

vi.mock("@common", async () => {
  const { defineComponent } = await import("vue");

  return {
    api: vi.fn(),
    translate: (key: string) => key,
    commonUtil: { getOmsURL: () => "" },
    cookieHelper: () => ({
      get: vi.fn().mockReturnValue(""),
      set: vi.fn(),
      remove: vi.fn()
    }),
    emitter: {
      emit: mocks.emit,
      on: vi.fn(),
      off: vi.fn()
    },
    DxpOmsInstanceFooter: defineComponent({
      name: "DxpOmsInstanceFooter",
      props: {
        instanceLabel: { type: String, default: "" },
        productStores: { type: Array, default: () => [] },
        currentProductStoreId: { type: String, default: "" }
      },
      emits: ["update:productStore"],
      render: () => null
    })
  };
});

vi.mock("@common/composables/useAuth", async () => {
  const { ref } = await import("vue");

  return { useAuth: () => ({ isAuthenticated: ref(true) }) };
});

vi.mock("@/router", () => ({
  default: {
    currentRoute: {
      value: { path: "/catalog" }
    }
  }
}));

vi.mock("@/utils", () => ({
  isAppCompatible: vi.fn(),
  redirectToLegacyApp: vi.fn(),
  showToast: vi.fn()
}));

vi.mock("@/logger", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
}));

describe("Menu.vue product store switch", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mountMenu = () => {
    const userStore = useUserStore();
    userStore.current = {
      userId: "dev.user",
      stores: [
        { productStoreId: "STORE_A", storeName: "Store A" },
        { productStoreId: "STORE_B", storeName: "Store B" }
      ]
    };
    userStore.currentProductStore = { productStoreId: "STORE_A", storeName: "Store A" };
    userStore.setCurrentProductStore = vi.fn().mockResolvedValue(undefined);

    // The footer sits in ion-menu's slot, which a stub only renders when asked.
    const wrapper = shallowMount(Menu, { global: { renderStubDefaultSlot: true } });
    const footer = wrapper.findComponent({ name: "DxpOmsInstanceFooter" });

    return { userStore, footer };
  };

  it("ignores a change to the store that is already selected", async () => {
    const { userStore, footer } = mountMenu();

    // Ionic fires ionChange for programmatic value changes too, so the current store comes back here.
    footer.vm.$emit("update:productStore", "STORE_A");
    await flushPromises();

    expect(userStore.setCurrentProductStore).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it("switches to a different store and tells the pages to refresh", async () => {
    const { userStore, footer } = mountMenu();

    footer.vm.$emit("update:productStore", "STORE_B");
    await flushPromises();

    expect(userStore.setCurrentProductStore).toHaveBeenCalledWith({ productStoreId: "STORE_B" });
    expect(mocks.emit).toHaveBeenCalledWith("productStoreUpdated");
  });
});
