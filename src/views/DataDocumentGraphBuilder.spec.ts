import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { alertController } from "@ionic/vue";
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
    expect(alertConfig.message).toBe("Changing the Primary Entity will affect your current configuration. What would you like to do?");

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
