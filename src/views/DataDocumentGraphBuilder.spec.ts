import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { IonButton, IonSegment, IonSegmentButton, alertController } from "@ionic/vue";
import DataDocumentGraphBuilder from "./DataDocumentGraphBuilder.vue";
import DataDocumentExportList from "@/components/DataDocumentExportList.vue";
import DataDocumentMetadata from "@/components/DataDocumentMetadata.vue";
import SkeletonList from "@/components/SkeletonList.vue";
import router from "@/router";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";
import { useUtilStore } from "@/store/util";

// Mock router
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useRoute: () => ({
    params: { id: "new" }
  })
}));

vi.mock("@/router", () => ({
  default: {
    currentRoute: {
      value: {
        params: { id: "new" },
        query: {}
      }
    },
    push: vi.fn(),
    replace: vi.fn()
  }
}));

// Mock translation and api
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

// Mock Ionic alertController
let alertConfig: any = null;
const mockAlert = {
  present: vi.fn().mockResolvedValue(undefined),
  onDidDismiss: vi.fn()
};

vi.mock("@ionic/vue", async () => {
  const actual: any = await vi.importActual("@ionic/vue");
  return {
    ...actual,
    alertController: {
      create: vi.fn().mockImplementation((config) => {
        alertConfig = config;
        return Promise.resolve(mockAlert);
      })
    }
  };
});

describe("DataDocumentGraphBuilder.vue - Change Primary Entity confirmation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    alertConfig = null;
    HTMLDivElement.prototype.dismiss = vi.fn();
    HTMLDivElement.prototype.present = vi.fn();
  });

  it("should show confirmation alert when changing Primary Entity with existing fields/conditions", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    
    // Set mock fields so configuration is considered "existing"
    if (store.graph) {
      store.graph.fields = [
        {
          dataDocumentId: "DocId",
          fieldSeqId: "10",
          nodeId: "node:root",
          fieldPath: "orderId",
          fieldName: "orderId",
          outputName: "orderId",
          fieldNameAlias: "orderId",
          sequenceNum: 10,
          defaultDisplay: "Y",
          sortable: "N",
          functionName: "",
          isManualPath: false,
          sourceRecord: { fieldSeqId: "10", fieldPath: "orderId" }
        }
      ];
    }

    const utilStore = useUtilStore();
    utilStore.$patch({
      entities: [
        {
          entityName: "OrderHeader",
          package: "order",
          isView: "N",
          fullEntityName: "order.OrderHeader",
          tableName: "ORDER_HEADER"
        },
        {
          entityName: "Party",
          package: "party",
          isView: "N",
          fullEntityName: "party.Party",
          tableName: "PARTY"
        }
      ]
    });

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: {
        id: "new"
      },
      global: {
        stubs: {
          IonModal: {
            template: "<div><slot /></div>"
          },
          IonContent: {
            template: "<div><slot /></div>"
          },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });

    // Find the entity item for 'Party' and click it to trigger selectEntity
    const items = wrapper.findAll("ion-item");
    const partyItem = items.find(item => item.text().includes("Party"));
    expect(partyItem).toBeDefined();
    
    await partyItem?.trigger("click");

    // Expect alertController.create to have been called
    expect(alertController.create).toHaveBeenCalled();
    expect(alertConfig).not.toBeNull();
    expect(alertConfig.header).toBe("Change Primary Entity?");
    expect(alertConfig.message).toBe("You already have fields and conditions defined. Changing the primary entity will clear the current configuration. Do you wish to proceed?");

    // Option 1: Keep Configuration (role: cancel)
    const keepButton = alertConfig.buttons.find((btn: any) => btn.role === "cancel");
    expect(keepButton).toBeDefined();
    expect(keepButton.text).toBe("Keep Configuration");

    // Call keepButton's handler
    keepButton.handler();
    // Verify that primaryEntityName was NOT updated
    expect(store.getGraph?.metadata.primaryEntityName).toBe("OrderHeader");

    // Option 2: Clear Configuration (role: confirm)
    const clearButton = alertConfig.buttons.find((btn: any) => btn.role === "confirm");
    expect(clearButton).toBeDefined();
    expect(clearButton.text).toBe("Clear Configuration");

    // Call clearButton's handler
    clearButton.handler();
    // Verify that primaryEntityName was updated to "party.Party" and config reset
    expect(store.getGraph?.metadata.primaryEntityName).toBe("party.Party");
    expect(store.getGraph?.fields).toHaveLength(0);
  });
});

describe("DataDocumentGraphBuilder.vue - document id length", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    HTMLDivElement.prototype.dismiss = vi.fn();
    HTMLDivElement.prototype.present = vi.fn();
  });

  const mountBuilder = () => mount(DataDocumentGraphBuilder, {
    props: { id: "new" },
    global: {
      stubs: {
        IonModal: { template: "<div><slot /></div>" },
        IonContent: { template: "<div><slot /></div>" },
        DataDocumentExportList: true,
        DataDocumentPreviewTable: true
      }
    }
  });

  // Ionic applies `disabled` on the underlying web component, which jsdom never upgrades, so
  // the rendered attribute is absent either way. Read the prop the template binds instead.
  const findSaveButton = (wrapper: ReturnType<typeof mountBuilder>) =>
    wrapper.findAllComponents(IonButton).find((button) => button.text().includes("Save"));

  const startGraphNamed = (documentName: string) => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    // Separate calls: setting primaryEntityName resets the draft, which would drop a
    // documentName passed in the same patch before the id is derived from it.
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.updateMetadata({ documentName });
    return store;
  };

  it("blocks Save and explains the problem while the derived id is past the limit", async () => {
    // The name that produced the live truncation failure in #1097.
    const store = startGraphNamed("POS Sales Order Items Without Issuance QA 20260824");
    expect(store.getGraph?.metadata.dataDocumentId).toHaveLength(43);

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    const saveButton = findSaveButton(wrapper);
    expect(saveButton).toBeDefined();
    expect(saveButton?.props("disabled")).toBe(true);
    expect(wrapper.text()).toContain("43 characters");
  });

  it("leaves Save available once the id is within the limit", async () => {
    const store = startGraphNamed("POS Sales Order Items QA");
    expect(store.getGraph?.metadata.dataDocumentId.length).toBeLessThanOrEqual(40);

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    const saveButton = findSaveButton(wrapper);
    expect(saveButton).toBeDefined();
    expect(saveButton?.props("disabled")).toBe(false);
  });
});

describe("DataDocumentGraphBuilder.vue - only renders the document it owns", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mountBuilder = () => mount(DataDocumentGraphBuilder, {
    props: { id: "new" },
    global: {
      stubs: {
        IonModal: { template: "<div><slot /></div>" },
        IonContent: { template: "<div><slot /></div>" },
        DataDocumentExportList: true,
        DataDocumentPreviewTable: true
      }
    }
  });

  it("renders the graph once the store is ready for it", async () => {
    useDataDocumentGraphStore().startNewGraph();

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(DataDocumentMetadata).exists()).toBe(true);
    expect(wrapper.find("main").attributes("aria-busy")).toBe("false");
    expect(wrapper.findAllComponents(SkeletonList)).toHaveLength(0);
  });

  it("shows the loading shell, not a persisted graph that no page has claimed yet", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.updateMetadata({ documentName: "Previous Document" });
    // A reload restores the persisted graph, but nothing owns it until a page claims it.
    store.$patch({ owner: "", status: "idle" });

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    // The store still holds it, and the page renders none of it.
    expect(store.getGraph?.metadata.documentName).toBe("Previous Document");
    expect(wrapper.find("main").attributes("aria-busy")).toBe("true");
    expect(wrapper.findAll("button.graph-node")).toHaveLength(0);
    expect(wrapper.text()).not.toContain("OrderHeader");
    expect(wrapper.findComponent(DataDocumentMetadata).props("summary")).toBeUndefined();
  });

  it("shows the failure and a Retry that reloads the document named in the URL", async () => {
    const store = useDataDocumentGraphStore();
    store.$patch({ owner: "DocA", status: "error" });
    const fetchGraph = vi.spyOn(store, "fetchGraph").mockResolvedValue(undefined as any);
    const params = (router as any).currentRoute.value.params;
    params.id = "DocA";

    try {
      const wrapper = mountBuilder();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Failed to load this data document.");
      expect(wrapper.find("main").exists()).toBe(false);
      expect(wrapper.findComponent(DataDocumentMetadata).exists()).toBe(false);
      const retry = wrapper.findAllComponents(IonButton).find((button) => button.text() === "Retry");
      expect(retry).toBeDefined();
      await retry?.trigger("click");
      expect(fetchGraph).toHaveBeenCalledWith("DocA", { claimant: expect.any(Symbol) });
    } finally {
      params.id = "new";
    }
  });
});

describe("DataDocumentGraphBuilder.vue - fills in as its data arrives", () => {
  const documentId = "OrderItems";
  // What the catalog list already knows about the document before the document itself is fetched.
  const catalogRecord = {
    dataFeedId: "OrderItemsFeed",
    dataDocumentId: documentId,
    documentName: "Order Items",
    documentTitle: "Order items export",
    primaryEntityName: "OrderItem"
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // The route is a module-level mock shared with the other suites, so put it back when done.
  const onDocument = async (id: string, test: () => Promise<void>) => {
    const params = (router as any).currentRoute.value.params;
    params.id = id;
    try {
      await test();
    } finally {
      params.id = "new";
    }
  };

  const mountBuilder = () => mount(DataDocumentGraphBuilder, {
    props: { id: documentId },
    global: {
      stubs: {
        IonModal: { template: "<div><slot /></div>" },
        IonContent: { template: "<div><slot /></div>" },
        DataDocumentExportList: true,
        DataDocumentPreviewTable: true
      }
    }
  });

  const findButton = (wrapper: ReturnType<typeof mountBuilder>, label: string) =>
    wrapper.findAllComponents(IonButton).find((button) => button.text().includes(label));

  const tabLabel = (wrapper: ReturnType<typeof mountBuilder>, value: string) =>
    wrapper.findAllComponents(IonSegmentButton).find((tab) => tab.props("value") === value)?.text();

  const openTab = async (wrapper: ReturnType<typeof mountBuilder>, value: string) => {
    wrapper.findComponent(IonSegment).vm.$emit("ionChange", { detail: { value } });
    await wrapper.vm.$nextTick();
  };

  // The store after its load resolved: a graph with a primary entity, ready for this document.
  const finishLoading = (graphStore: ReturnType<typeof useDataDocumentGraphStore>) => {
    graphStore.startNewGraph();
    graphStore.updateMetadata({ primaryEntityName: "OrderItem" });
    graphStore.updateMetadata({ documentName: "Order Items" });
    graphStore.$patch({ owner: documentId, status: "ready" });
  };

  it("shows the page with the catalog's record while the document loads", () => onDocument(documentId, async () => {
    useDataDocumentStore().dataDocuments = [catalogRecord];
    useDataDocumentGraphStore().$patch({ owner: documentId, status: "loading" });

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    const page = wrapper.find("main");
    expect(page.attributes("aria-busy")).toBe("true");
    expect(page.attributes("aria-label")).toBe("Loading graph builder.");
    // The top card starts from the catalog's own record for this id.
    expect(wrapper.findComponent(DataDocumentMetadata).props("summary")).toMatchObject({
      dataDocumentId: documentId,
      documentName: "Order Items"
    });
    // The root node is already there, named by the entity the catalog knows, with no real nodes yet.
    expect(wrapper.find(".graph-node-ghost").text()).toContain("OrderItem");
    expect(wrapper.findAll("button.graph-node")).toHaveLength(0);
    // The inspector and the open tab hold their place instead of rendering empty.
    expect(wrapper.findAllComponents(SkeletonList)).toHaveLength(2);
    // Nothing is saved or exported against a document that has not loaded.
    expect(findButton(wrapper, "Save")?.props("disabled")).toBe(true);
    expect(findButton(wrapper, "Export")?.props("disabled")).toBe(true);
  }));

  it("does not borrow another document's catalog record", () => onDocument("SomethingElse", async () => {
    useDataDocumentStore().dataDocuments = [catalogRecord];
    useDataDocumentGraphStore().$patch({ owner: "SomethingElse", status: "loading" });

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    expect(wrapper.findComponent(DataDocumentMetadata).props("summary")).toBeUndefined();
    expect(wrapper.find(".graph-node-ghost").text()).not.toContain("OrderItem");
    // With nothing known yet the root node is a placeholder for its name and entity too.
    expect(wrapper.find(".graph-node-ghost").findAll("ion-skeleton-text").length).toBeGreaterThan(0);
  }));

  it("swaps each placeholder for its data in place once the document is ready", () => onDocument(documentId, async () => {
    useDataDocumentStore().dataDocuments = [catalogRecord];
    const graphStore = useDataDocumentGraphStore();
    graphStore.$patch({ owner: documentId, status: "loading" });

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();
    expect(wrapper.find("aside").classes()).not.toContain("hydrate");

    finishLoading(graphStore);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("main").attributes("aria-busy")).toBe("false");
    expect(wrapper.find("main").attributes("aria-label")).toBeUndefined();
    expect(wrapper.find(".graph-node-ghost").exists()).toBe(false);
    expect(wrapper.findAll("button.graph-node")).toHaveLength(1);
    expect(wrapper.findAllComponents(SkeletonList)).toHaveLength(0);
    // The inspector pops in once, when its data lands, not again on every selection.
    expect(wrapper.find("aside").classes()).toContain("hydrate");
    expect(findButton(wrapper, "Save")?.props("disabled")).toBe(false);
  }));

  it("labels a tab with its count only once the count is known", () => onDocument(documentId, async () => {
    const graphStore = useDataDocumentGraphStore();
    const dataDocumentStore = useDataDocumentStore();
    graphStore.$patch({ owner: documentId, status: "loading" });

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    expect(tabLabel(wrapper, "issues")).toBe("Issues");
    expect(tabLabel(wrapper, "fields")).toBe("Fields");
    expect(tabLabel(wrapper, "conditions")).toBe("Conditions");
    expect(tabLabel(wrapper, "exports")).toBe("Recent Exports");

    // The document arrives before its export history does: the graph tabs count, exports does not.
    finishLoading(graphStore);
    dataDocumentStore.exportHistoryStatus = "loading";
    await wrapper.vm.$nextTick();
    expect(tabLabel(wrapper, "issues")).toMatch(/^Issues \(\d+\)$/);
    expect(tabLabel(wrapper, "fields")).toBe("Fields (0)");
    expect(tabLabel(wrapper, "conditions")).toBe("Conditions (0)");
    expect(tabLabel(wrapper, "exports")).toBe("Recent Exports");

    dataDocumentStore.exportHistory = [{ messageId: "M1" }, { messageId: "M2" }];
    dataDocumentStore.exportHistoryStatus = "ready";
    await wrapper.vm.$nextTick();
    expect(tabLabel(wrapper, "exports")).toBe("Recent Exports (2)");
  }));

  it("fills the recent exports tab from its own request, whenever that lands", () => onDocument(documentId, async () => {
    const graphStore = useDataDocumentGraphStore();
    const dataDocumentStore = useDataDocumentStore();
    finishLoading(graphStore);
    dataDocumentStore.exportHistoryStatus = "loading";

    const wrapper = mountBuilder();
    await openTab(wrapper, "exports");

    // The document is already on screen; only this tab waits.
    expect(wrapper.findAllComponents(SkeletonList)).toHaveLength(1);
    expect(wrapper.findComponent(DataDocumentExportList).exists()).toBe(false);

    dataDocumentStore.exportHistory = [{ messageId: "M1", statusId: "SmsgSent" }];
    dataDocumentStore.exportHistoryStatus = "ready";
    await wrapper.vm.$nextTick();
    expect(wrapper.findAllComponents(SkeletonList)).toHaveLength(0);
    expect(wrapper.findComponent(DataDocumentExportList).props("messages")).toHaveLength(1);
    expect(wrapper.findComponent(DataDocumentExportList).props("emptyMessage")).toBe("No recent exports.");
  }));

  it("says so when the recent exports could not be loaded, instead of showing an empty list", () => onDocument(documentId, async () => {
    const graphStore = useDataDocumentGraphStore();
    const dataDocumentStore = useDataDocumentStore();
    finishLoading(graphStore);
    dataDocumentStore.exportHistoryStatus = "error";

    const wrapper = mountBuilder();
    await openTab(wrapper, "exports");

    expect(wrapper.findComponent(DataDocumentExportList).props("emptyMessage")).toBe("Could not load recent exports.");
    expect(tabLabel(wrapper, "exports")).toBe("Recent Exports");
  }));

  it("asks for a primary entity on a new document instead of showing an empty canvas", async () => {
    useDataDocumentGraphStore().startNewGraph();

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Start with a primary entity");
    expect(wrapper.text()).toContain("Nothing to configure yet");
    expect(wrapper.find(".graph-canvas").exists()).toBe(false);
    expect(wrapper.findAllComponents(SkeletonList)).toHaveLength(0);

    // The call to action opens the same entity picker as the top card.
    const present = vi.fn();
    (wrapper.findComponent({ ref: "entityModal" }).element as any).present = present;
    vi.spyOn(useUtilStore(), "fetchEntities").mockResolvedValue(undefined as any);
    await wrapper.find(".graph-empty-state").findComponent(IonButton).trigger("click");
    await wrapper.vm.$nextTick();
    expect(present).toHaveBeenCalled();
  });

  it("swaps the call to action for the canvas once the primary entity is chosen", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.startNewGraph();

    const wrapper = mountBuilder();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".graph-empty-state").exists()).toBe(true);

    graphStore.updateMetadata({ primaryEntityName: "OrderHeader" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".graph-empty-state").exists()).toBe(false);
    expect(wrapper.findAll("button.graph-node")).toHaveLength(1);
    expect(wrapper.text()).not.toContain("Nothing to configure yet");
  });
});
