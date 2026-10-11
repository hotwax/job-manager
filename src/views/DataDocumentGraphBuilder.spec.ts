import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { IonButton, alertController } from "@ionic/vue";
import DataDocumentGraphBuilder from "./DataDocumentGraphBuilder.vue";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
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
        params: { id: "new" }
      }
    }
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
