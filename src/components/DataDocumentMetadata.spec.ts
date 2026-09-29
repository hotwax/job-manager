import { IonButton, IonCard, IonInput, IonItem, IonSkeletonText } from "@ionic/vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import DataDocumentMetadata from "./DataDocumentMetadata.vue";

vi.mock("@/router", () => ({
  default: {
    currentRoute: {
      value: {
        params: { id: "OrderItems" }
      }
    }
  }
}));

vi.mock("@common", () => ({
  api: vi.fn(),
  translate: (key: string) => key,
  commonUtil: {
    showToast: vi.fn()
  },
  cookieHelper: () => ({
    get: vi.fn().mockReturnValue(""),
    set: vi.fn(),
    remove: vi.fn()
  })
}));

describe("DataDocumentMetadata.vue - preview until the document is ready", () => {
  // What the catalog list already knows about the document.
  const summary = {
    dataDocumentId: "OrderItems",
    documentName: "Order Items",
    documentTitle: "Order items export",
    primaryEntityName: "OrderItem"
  };

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const mountCard = (props: Record<string, unknown> = {}) => mount(DataDocumentMetadata, {
    props,
    global: {
      stubs: {
        IonModal: { template: "<div><slot /></div>" },
        IonContent: { template: "<div><slot /></div>" }
      }
    }
  });

  // The card comes before the advanced-metadata modal in the fragment, so the first match is the card's.
  const cardInput = (wrapper: ReturnType<typeof mountCard>, label: string) =>
    wrapper.findAllComponents(IonInput).find((input) => input.props("label") === label);
  const cardOptionsButton = (wrapper: ReturnType<typeof mountCard>) =>
    wrapper.findAllComponents(IonButton).find((button) => button.attributes("aria-label") === "Advanced Metadata");

  it("shows the catalog's record, read-only, while the document has not loaded", () => {
    const wrapper = mountCard({ summary });

    expect(cardInput(wrapper, "Name")?.props("value")).toBe("Order Items");
    expect(cardInput(wrapper, "Name")?.props("disabled")).toBe(true);
    expect(cardInput(wrapper, "Title")?.props("value")).toBe("Order items export");
    expect(cardInput(wrapper, "Title")?.props("disabled")).toBe(true);
    expect(wrapper.findAllComponents(IonItem)[0].text()).toContain("OrderItem");
    expect(wrapper.findAllComponents(IonItem)[0].props("disabled")).toBe(true);
    expect(cardOptionsButton(wrapper)?.props("disabled")).toBe(true);
    expect(wrapper.findComponent(IonCard).attributes("aria-busy")).toBe("true");
  });

  it("holds a placeholder for the entity when nothing knows it yet", () => {
    const wrapper = mountCard();

    expect(wrapper.findAllComponents(IonItem)[0].findComponent(IonSkeletonText).exists()).toBe(true);
    expect(wrapper.findAllComponents(IonItem)[0].text()).not.toContain("Select Entity");
    expect(cardInput(wrapper, "Name")?.props("disabled")).toBe(true);
  });

  it("hands over to the loaded graph, which wins over the catalog's record", async () => {
    const store = useDataDocumentGraphStore();
    const wrapper = mountCard({ summary });

    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.updateMetadata({ documentName: "Loaded Name" });
    store.$patch({ owner: "OrderItems", status: "ready" });
    await wrapper.vm.$nextTick();

    expect(cardInput(wrapper, "Name")?.props("value")).toBe("Loaded Name");
    expect(cardInput(wrapper, "Name")?.props("disabled")).toBe(false);
    expect(wrapper.findAllComponents(IonItem)[0].text()).toContain("OrderHeader");
    expect(wrapper.findAllComponents(IonItem)[0].findComponent(IonSkeletonText).exists()).toBe(false);
    expect(cardOptionsButton(wrapper)?.props("disabled")).toBe(false);
    expect(wrapper.findComponent(IonCard).attributes("aria-busy")).toBe("false");
  });

  it("ignores a graph the store holds for a page that has not claimed it", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.updateMetadata({ documentName: "Stale Name" });
    // A reload restores the persisted graph, but nothing owns it until a page claims it.
    store.$patch({ owner: "", status: "idle" });

    const wrapper = mountCard({ summary });

    expect(cardInput(wrapper, "Name")?.props("value")).toBe("Order Items");
    expect(cardInput(wrapper, "Name")?.props("disabled")).toBe(true);
    expect(wrapper.findAllComponents(IonItem)[0].text()).not.toContain("OrderHeader");
  });
});
