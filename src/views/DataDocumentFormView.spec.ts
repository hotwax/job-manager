import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { IonSelect, IonSelectOption, alertController } from "@ionic/vue";
import DataDocumentFormView from "./DataDocumentFormView.vue";
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

describe("DataDocumentFormView.vue - Change Primary Entity confirmation", () => {
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
});

describe("DataDocumentFormView.vue - condition operators", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // An order id is a text field and the order date is a date-time, so the backend can read a list or a
  // pattern from one and not from the other.
  const mountWithConditions = (conditions: Array<Record<string, any>>) => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.addFieldPath("orderId");
    store.addFieldPath("orderDate");
    conditions.forEach((condition) => store.addCondition(condition));
    const utilStore = useUtilStore();
    utilStore.entityFields = {
      OrderHeader: [
        { name: "orderId", fieldName: "orderId", type: "id" },
        { name: "orderDate", fieldName: "orderDate", type: "date-time" }
      ]
    };
    utilStore.entityRelationships = { OrderHeader: [{ relationshipName: "OrderItem" }] };

    // The conditions card is only drawn when the view is not embedded.
    return mount(DataDocumentFormView, {
      props: { embedded: false },
      global: {
        stubs: {
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" }
        }
      }
    });
  };

  const operatorSelects = (wrapper: ReturnType<typeof mountWithConditions>) =>
    wrapper.findAllComponents(IonSelect).filter((select) => select.props("label") === "Operator");
  const offeredBy = (select: ReturnType<typeof operatorSelects>[number]) =>
    select.findAllComponents(IonSelectOption).map((option) => option.props("value"));

  it("offers each condition only the operators the backend can run on its field's type", async () => {
    const wrapper = mountWithConditions([
      { fieldNameAlias: "orderId", operator: "equals", fieldValue: "100" },
      { fieldNameAlias: "orderDate", operator: "equals", fieldValue: "2026-09-28 17:43:01" }
    ]);
    await wrapper.vm.$nextTick();

    const [orderId, orderDate] = operatorSelects(wrapper);
    expect(offeredBy(orderId)).toEqual(["equals", "not-equals", "like", "in", "is-null", "is-not-null", "greater", "greater-equals", "less", "less-equals"]);
    expect(offeredBy(orderDate)).toEqual(["equals", "not-equals", "is-null", "is-not-null", "greater", "greater-equals", "less", "less-equals"]);
    expect(offeredBy(orderId)).not.toContain("between");
  });

  it("marks a saved operator its field cannot take, and leaves the others alone", async () => {
    const wrapper = mountWithConditions([
      { fieldNameAlias: "orderId", operator: "in", fieldValue: "100,101" },
      { fieldNameAlias: "orderDate", operator: "like", fieldValue: "2026%" }
    ]);
    await wrapper.vm.$nextTick();

    const [orderId, orderDate] = operatorSelects(wrapper);
    expect(orderId.classes()).not.toContain("ion-invalid");
    expect(orderDate.classes()).toContain("ion-invalid");
    expect(orderDate.props("errorText")).toBe("This operator does not work for this field");
  });
});
