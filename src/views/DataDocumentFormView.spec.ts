import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { alertController } from "@ionic/vue";
import DataDocumentFormView from "./DataDocumentFormView.vue";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useUtilStore } from "@/store/util";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

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
        params: { id: "new" }
      }
    }
  }
}));

vi.mock("@common", async () => {
  const { createCommonMock } = await import("@/test/commonMock");
  return createCommonMock({ api: apiMock });
});

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
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

describe("DataDocumentFormView.vue - Change Primary Entity confirmation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    apiMock.mockResolvedValue({
      data: {
        entityDefinition: {
          fields: [],
          relationships: []
        }
      }
    });
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

    const wrapper = mount(DataDocumentFormView, {
      props: {
        embedded: false
      },
      global: {
        stubs: {
          IonModal: {
            template: "<div><slot /></div>"
          },
          IonContent: {
            template: "<div><slot /></div>"
          }
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

  it("refreshes fields and relationships with one shared definition request", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });

    const wrapper = mount(DataDocumentFormView, {
      props: { embedded: false },
      global: {
        stubs: {
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" }
        }
      }
    });
    await vi.waitFor(() => {
      expect(apiMock).toHaveBeenCalled();
    });
    apiMock.mockClear();

    const refreshButton = wrapper.findAll("ion-button").at(-1);
    await refreshButton.trigger("click");

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/entities/OrderHeader/definition",
      method: "GET"
    });
  });

  it("keeps the new-field picker open on definition failure and retries canonically", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.startNewGraph();
    graphStore.updateMetadata({ primaryEntityName: "OrderHeader" });
    const utilStore = useUtilStore();
    utilStore.entityDefinitions.OrderHeader = { fields: [], relationships: [] };
    const wrapper = mount(DataDocumentFormView, {
      props: { embedded: false },
      global: {
        stubs: {
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" }
        }
      }
    });
    await flushPromises();
    delete utilStore.entityDefinitions.OrderHeader;
    apiMock.mockRejectedValueOnce(new Error("definition unavailable"));
    const presentSpy = vi.mocked(HTMLDivElement.prototype.present);
    presentSpy.mockClear();

    await wrapper.findAll("ion-button").find((button) => button.text().includes("Add field"))?.trigger("click");
    await flushPromises();

    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(utilStore.getEntityDefinitionFetchState("OrderHeader").status).toBe("error");
    expect(wrapper.text()).toContain("definition unavailable");
    const retryButton = wrapper.findAll("ion-button").find((button) => button.text() === "Retry");
    expect(retryButton).toBeDefined();

    const fetchSpy = vi.spyOn(utilStore, "fetchEntityDefinition");
    apiMock.mockClear();
    apiMock.mockResolvedValueOnce({
      data: {
        entityDefinition: {
          fields: [{ name: "orderId" }],
          relationships: []
        }
      }
    });
    await retryButton?.trigger("click");
    await flushPromises();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("OrderHeader", { force: true });
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(utilStore.getEntityDefinitionFetchState("OrderHeader").status).toBe("success");
    expect(wrapper.text()).toContain("orderId");
  });

  it("keeps the existing-field picker open when its definition request fails", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.startNewGraph();
    graphStore.updateMetadata({ primaryEntityName: "OrderHeader" });
    graphStore.addFieldPath("orderId", "orderId");
    const utilStore = useUtilStore();
    utilStore.entityDefinitions.OrderHeader = { fields: [], relationships: [] };
    const wrapper = mount(DataDocumentFormView, {
      props: { embedded: false },
      global: {
        stubs: {
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" }
        }
      }
    });
    await flushPromises();
    delete utilStore.entityDefinitions.OrderHeader;
    apiMock.mockRejectedValueOnce(new Error("definition unavailable"));
    const presentSpy = vi.mocked(HTMLDivElement.prototype.present);
    presentSpy.mockClear();

    await wrapper.find("ion-chip.field-selector").trigger("click");
    await flushPromises();

    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("definition unavailable");
    expect(wrapper.findAll("ion-button").some((button) => button.text() === "Retry")).toBe(true);
  });
});
