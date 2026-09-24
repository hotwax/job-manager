import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { alertController } from "@ionic/vue";
import { nextTick } from "vue";
import { createI18n } from "vue-i18n";
import DataDocumentGraphBuilder from "./DataDocumentGraphBuilder.vue";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";
import { useUtilStore } from "@/store/util";
import { PERSISTED_CONDITION_OPERATORS, projectDataDocumentGraph, serializeDataDocumentGraph } from "@/utils/dataDocumentGraph";
import { getConditionValueOptionSource } from "@/utils/conditionValueOptions";
import en from "@/locales/en.json";

const { apiMock, routeHarness, ionicLifecycleHarness } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  routeHarness: { currentRoute: undefined as any },
  ionicLifecycleHarness: {
    willEnterCallbacks: [] as Array<() => Promise<void> | void>,
    willLeaveCallbacks: [] as Array<() => void>
  }
}));

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

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

vi.mock("@/router", async () => {
  const { ref } = await vi.importActual<typeof import("vue")>("vue");
  routeHarness.currentRoute = ref({
    name: "DataDocumentGraphBuilder",
    params: { id: "new" },
    query: {} as Record<string, unknown>
  });
  return {
    default: {
      push: vi.fn(),
      replace: vi.fn(),
      currentRoute: routeHarness.currentRoute
    }
  };
});

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
    onIonViewWillEnter: (callback: () => Promise<void> | void) => {
      ionicLifecycleHarness.willEnterCallbacks.push(callback);
    },
    onIonViewWillLeave: (callback: () => void) => {
      ionicLifecycleHarness.willLeaveCallbacks.push(callback);
    },
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
    apiMock.mockResolvedValue({
      data: {
        entityValueList: [],
        entityDefinition: {
          fields: [],
          relationships: []
        }
      }
    });
    alertConfig = null;
    ionicLifecycleHarness.willEnterCallbacks.length = 0;
    ionicLifecycleHarness.willLeaveCallbacks.length = 0;
    routeHarness.currentRoute.value.name = "DataDocumentGraphBuilder";
    routeHarness.currentRoute.value.params.id = "new";
    routeHarness.currentRoute.value.query = {};
    HTMLDivElement.prototype.dismiss = vi.fn();
    HTMLDivElement.prototype.present = vi.fn();
  });

  it("should show confirmation alert when changing Primary Entity with existing fields/conditions", async () => {
    apiMock.mockResolvedValue({
      data: {
        entityDefinition: {
          fields: [],
          relationships: []
        }
      }
    });
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
          IonBackButton: true,
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

  it("provides isMoqui when auth initialization consumes the shared common mock", async () => {
    const { commonUtil } = await import("@common");
    const { useAuth } = await import("@common/composables/useAuth");

    expect(commonUtil.isMoqui).toEqual(expect.any(Function));
    expect(useAuth().isAuthenticated.value).toBe(false);
  });

  it("does not log field metadata while rendering the graph builder", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    try {
      mount(DataDocumentGraphBuilder, {
        props: {
          id: "new"
        },
        global: {
          stubs: {
            IonBackButton: true,
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
      await nextTick();

      expect(logSpy).not.toHaveBeenCalledWith("entityFields", expect.anything());
    } finally {
      logSpy.mockRestore();
    }
  });

  it("waits for explicit confirmation before fetching a manually entered entity name", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    const utilStore = useUtilStore();
    utilStore.entityDefinitions.OrderHeader = {
      fields: [],
      relationships: [{
        relationshipName: "StatusItem",
        relatedEntityName: " StatusItem "
      }]
    };
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();
    const openRelatedFieldButton = wrapper.findAll("ion-item").find((item) => item.text().includes("Add related field"));
    expect(openRelatedFieldButton).toBeDefined();
    await openRelatedFieldButton?.trigger("click");
    await flushPromises();
    const relationshipButton = wrapper.findAll("ion-item").find((item) => item.text().includes("StatusItem"));
    expect(relationshipButton).toBeDefined();
    await relationshipButton?.trigger("click");
    await nextTick();
    apiMock.mockClear();
    apiMock.mockResolvedValue({
      data: {
        entityDefinition: {
          fields: [{ name: "statusId" }],
          relationships: []
        }
      }
    });

    const targetEntityInput = wrapper.findAll("ion-input").filter((input) => (
      input.attributes("modelvalue") === " StatusItem "
    )).at(-1);

    for (const entityName of ["O", "Or", "OrderHeader"]) {
      await targetEntityInput?.trigger("ionInput", { detail: { value: entityName } });
    }
    expect(apiMock).not.toHaveBeenCalled();

    const confirmButton = wrapper.findAll("ion-button").find((button) => button.text().includes("Choose fields"));
    expect(confirmButton).toBeDefined();
    await confirmButton?.trigger("click");
    await flushPromises();

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/entities/StatusItem/definition",
      method: "GET"
    });
    expect(useUtilStore().getEntityDefinitionFetchState(" StatusItem ").status).toBe("success");
    expect(useUtilStore().getEntityFields(" StatusItem ").map((field: any) => field.fieldName)).toEqual(["statusId"]);
    expect((wrapper.vm as any).relatedEntityName).toBe("StatusItem");
    expect(wrapper.text()).toContain("statusId");
  });

  it("keeps related-field confirmation open on failure and retries metadata loading", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.startNewGraph();
    graphStore.updateMetadata({ primaryEntityName: "OrderHeader" });
    const utilStore = useUtilStore();
    utilStore.entityDefinitions.OrderHeader = {
      fields: [],
      relationships: [{ relationshipName: "StatusItem", relatedEntityName: "StatusItem" }]
    };
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();
    await wrapper.findAll("ion-item").find((item) => item.text().includes("Add related field"))?.trigger("click");
    await flushPromises();
    await wrapper.findAll("ion-item").find((item) => item.text().includes("StatusItem"))?.trigger("click");
    await nextTick();
    apiMock.mockRejectedValueOnce(new Error("definition unavailable"));

    await wrapper.findAll("ion-button").find((button) => button.text().includes("Choose fields"))?.trigger("click");
    await flushPromises();

    expect(wrapper.findAll("ion-button").some((button) => button.text().includes("Choose fields"))).toBe(true);
    expect(wrapper.text()).toContain("definition unavailable");
    const retryButton = wrapper.findAll("ion-button").find((button) => button.text() === "Retry");
    expect(retryButton).toBeDefined();

    apiMock.mockResolvedValueOnce({
      data: {
        entityDefinition: {
          fields: [{ name: "statusId" }],
          relationships: []
        }
      }
    });
    await retryButton?.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("statusId");
  });

  it("shows a singular relationship key map without inventing missing join facts", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.startNewGraph();
    graphStore.updateMetadata({ primaryEntityName: "OrderHeader" });
    const utilStore = useUtilStore();
    utilStore.entityDefinitions.OrderHeader = {
      fields: [],
      relationships: [
        {
          relationshipName: "OrderItem",
          relatedEntityName: "OrderItem",
          type: "many",
          keyMap: { fieldName: "orderId", relatedFieldName: "orderId" }
        },
        {
          relationshipName: "StatusItem",
          relatedEntityName: "StatusItem",
          type: "one"
        }
      ]
    };
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();
    await wrapper.findAll("ion-item").find((item) => item.text().includes("Add related field"))?.trigger("click");
    await flushPromises();

    await wrapper.findAll("ion-item").find((item) => item.text().includes("OrderItem"))?.trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("orderId = orderId");

    await wrapper.findAll("ion-button").find((button) => button.text().includes("Back"))?.trigger("click");
    await nextTick();
    await wrapper.findAll("ion-item").find((item) => item.text().includes("StatusItem"))?.trigger("click");
    await nextTick();
    expect(wrapper.text()).not.toContain("Join keys unavailable.");
    expect(wrapper.text()).not.toContain("orderId = orderId");
  });

  it("shows explicit auto-reverse status for a selected graph edge", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.graph = projectDataDocumentGraph({
      document: { dataDocumentId: "AutoReverseGraph", primaryEntityName: "OrderHeader" },
      fields: [{ fieldSeqId: "10", fieldPath: "Party:partyId", fieldNameAlias: "partyId" }],
      relationshipMetadata: {
        Party: {
          relationshipName: "party.Party",
          entityName: "Party",
          relationshipType: "one",
          verified: true,
          attempted: true,
          isAutoReverse: true
        }
      }
    });
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "AutoReverseGraph" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });

    await wrapper.find("svg g").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Auto reverse");
  });

  it("keeps the root field modal open on failure and retries canonically", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.startNewGraph();
    graphStore.updateMetadata({ primaryEntityName: "OrderHeader" });
    const utilStore = useUtilStore();
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();
    apiMock.mockRejectedValueOnce(new Error("definition unavailable"));
    const presentSpy = vi.mocked(HTMLDivElement.prototype.present);
    presentSpy.mockClear();

    await wrapper.findAll("ion-button").find((button) => button.text().trim() === "Add")?.trigger("click");
    await flushPromises();

    expect(presentSpy).toHaveBeenCalledTimes(1);
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
    expect(wrapper.text()).toContain("orderId");
  });

  it("keeps the relationship selection modal open on failure without advancing the wizard", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.startNewGraph();
    graphStore.updateMetadata({ primaryEntityName: " OrderHeader " });
    const utilStore = useUtilStore();
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();
    apiMock.mockRejectedValueOnce(new Error("definition unavailable"));
    const presentSpy = vi.mocked(HTMLDivElement.prototype.present);
    presentSpy.mockClear();

    await wrapper.findAll("ion-item").find((item) => item.text().includes("Add related field"))?.trigger("click");
    await flushPromises();

    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as any).relatedFieldStep).toBe("relationship");
    expect(wrapper.text()).toContain("definition unavailable");
    const retryButton = wrapper.findAll("ion-button").find((button) => button.text() === "Retry");
    expect(retryButton).toBeDefined();

    const fetchSpy = vi.spyOn(utilStore, "fetchEntityDefinition");
    apiMock.mockClear();
    apiMock.mockResolvedValueOnce({
      data: {
        entityDefinition: {
          fields: [],
          relationships: [{ relationshipName: "StatusItem", relatedEntityName: "StatusItem" }]
        }
      }
    });
    await retryButton?.trigger("click");
    await flushPromises();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("OrderHeader", { force: true });
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(presentSpy).toHaveBeenCalledTimes(1);
    expect((wrapper.vm as any).relatedFieldStep).toBe("relationship");
    expect(wrapper.text()).toContain("StatusItem");
  });

  it("contains static translations for the primary entity confirmation and export error", () => {
    expect(en["You already have fields and conditions defined. Changing the primary entity will clear the current configuration. Do you wish to proceed?"]).toBe("You already have fields and conditions defined. Changing the primary entity will clear the current configuration. Do you wish to proceed?");
    expect(en["Failed to queue data document export."]).toBe("Failed to queue data document export.");
    expect(en["Suggested values"]).toBe("Suggested values");
    expect(en["Custom value"]).toBe("Custom value");
  });

  it("renders exactly the persisted condition operators", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });

    expect(wrapper.findAll("[data-testid^='persisted-condition-operator-']").map((option) => option.attributes("data-testid")?.replace("persisted-condition-operator-", ""))).toEqual([
      "equals", "not-equals", "less", "greater", "less-equals", "greater-equals", "in", "not-in",
      "not-between", "like", "not-like", "is-null", "is-not-null"
    ]);
  });

  it("resolves every persisted operator label through real i18n without missing-key console warnings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const i18n = createI18n({
        legacy: false,
        locale: "en-US",
        fallbackLocale: "en-US",
        messages: { "en-US": en }
      });

      expect(PERSISTED_CONDITION_OPERATORS.map((operator) => i18n.global.t(operator.label))).toEqual([
        "Equals", "Not equals", "Less than", "Greater than", "Less than or equal", "Greater than or equal",
        "In", "Not in", "Not between", "Like", "Not like", "Is null", "Is not null"
      ]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("uses graph-field selections for both sides of a field-to-field condition", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "FieldSelectors", primaryEntityName: "OrderHeader" });
    store.addFieldPath("orderId", "orderid");
    store.addFieldPath("externalId", "externalid");
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    (wrapper.vm as any).activeCondition = {
      fieldNameAlias: "orderid",
      operator: "equals",
      fieldValue: "",
      toFieldNameAlias: "externalid",
      postQuery: "N"
    };
    await nextTick();

    const fieldSelect = wrapper.find("[data-testid='condition-field-alias']");
    const toFieldSelect = wrapper.find("[data-testid='condition-to-field-alias']");
    expect(fieldSelect.exists()).toBe(true);
    expect(toFieldSelect.exists()).toBe(true);
    expect(wrapper.findAll("ion-input").some((input) => input.attributes("label") === "To Field Alias")).toBe(false);
    expect(toFieldSelect.findAll("ion-select-option").map((option) => (option.element as HTMLOptionElement).value)).toEqual([
      "", "orderid", "externalid"
    ]);
    await toFieldSelect.trigger("ionChange", { detail: { value: "orderid" } });
    expect((wrapper.vm as any).activeCondition).toEqual(expect.objectContaining({
      toFieldNameAlias: "orderid",
      toTargetId: store.getGraph?.fields[0].localId
    }));
  });

  it("keeps an unlisted enum condition value editable beside suggested values", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.addFieldPath("salesChannelEnumId", "salesChannel");
    store.addCondition({ fieldNameAlias: "salesChannel", operator: "equals", fieldValue: "POS_SALES_CHANNEL" });

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();

    const utilStore = useUtilStore();
    utilStore.$patch({
      entityDefinitions: {
        OrderHeader: {
          fields: [],
          relationships: [{
            relationshipName: "SalesChannel#moqui.basic.Enumeration",
            title: "SalesChannel",
            relatedEntityName: "moqui.basic.Enumeration"
          }]
        }
      },
      enumerations: [{
        enumId: "ScPos",
        description: "Point of sale",
        enumTypeId: "SALES_CHANNEL",
        typeDescription: "Sales Channel"
      }]
    });

    expect(getConditionValueOptionSource({
      condition: store.getGraph?.conditions[0],
      fields: [store.getGraph?.fields[0]],
      relationships: utilStore.getEntityRelationships("OrderHeader"),
      enumerations: utilStore.getEnumerations,
      statuses: []
    })).toEqual(expect.objectContaining({
      options: [expect.objectContaining({ value: "ScPos" })]
    }));

    await wrapper.find(".graph-bottom ion-segment").trigger("ionChange", { detail: { value: "conditions" } });
    await nextTick();
    const conditionItem = wrapper.findAll("ion-item").find((item) => item.text().includes("POS_SALES_CHANNEL"));
    expect(conditionItem).toBeDefined();
    await conditionItem?.trigger("click");
    await nextTick();

    expect((wrapper.vm as any).activeConditionValueOptions).toEqual(expect.objectContaining({
      options: [expect.objectContaining({ value: "ScPos" })]
    }));
    const customValue = wrapper.find("[data-testid='condition-custom-value']");
    expect(customValue.exists()).toBe(true);
    expect((customValue.element as HTMLInputElement).value).toBe("POS_SALES_CHANNEL");
    expect(wrapper.find("[data-testid='condition-value-mode']").attributes("aria-label")).toBe("Condition value mode");

    await wrapper.find("[data-testid='condition-value-mode']").trigger("ionChange", { detail: { value: "suggested" } });
    await nextTick();

    expect((wrapper.vm as any).activeCondition.fieldValue).toBe("POS_SALES_CHANNEL");
    expect(wrapper.find("[data-testid='condition-custom-value']").exists()).toBe(true);
    await wrapper.find("[data-testid='condition-custom-value']").trigger("ionInput", { detail: { value: "" } });
    await wrapper.find("[data-testid='condition-value-mode']").trigger("ionChange", { detail: { value: "suggested" } });
    await nextTick();
    expect(wrapper.find("[data-testid='condition-value-suggestion-ScPos']").exists()).toBe(true);
    await wrapper.find("[data-testid='condition-suggested-value']").trigger("ionChange", { detail: { value: "ScPos" } });
    expect((wrapper.vm as any).activeCondition.fieldValue).toBe("ScPos");

    await wrapper.find("[data-testid='condition-value-mode']").trigger("ionChange", { detail: { value: "custom" } });
    await nextTick();
    expect((wrapper.vm as any).activeCondition.fieldValue).toBe("ScPos");
    expect(wrapper.find("[data-testid='condition-custom-value']").exists()).toBe(true);
  });

  it("keeps a listed value visible as custom when its suggestions refresh without it", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.addFieldPath("salesChannelEnumId", "salesChannel");
    store.addCondition({ fieldNameAlias: "salesChannel", operator: "equals", fieldValue: "ScPos" });

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();

    const utilStore = useUtilStore();
    utilStore.$patch({
      entityDefinitions: {
        OrderHeader: {
          fields: [],
          relationships: [{
            relationshipName: "SalesChannel#moqui.basic.Enumeration",
            title: "SalesChannel",
            relatedEntityName: "moqui.basic.Enumeration"
          }]
        }
      },
      enumerations: [{
        enumId: "ScPos",
        description: "Point of sale",
        enumTypeId: "SALES_CHANNEL",
        typeDescription: "Sales Channel"
      }]
    });

    await wrapper.find(".graph-bottom ion-segment").trigger("ionChange", { detail: { value: "conditions" } });
    await nextTick();
    const conditionItem = wrapper.findAll("ion-item").find((item) => item.text().includes("ScPos"));
    expect(conditionItem).toBeDefined();
    await conditionItem?.trigger("click");
    await nextTick();

    expect(wrapper.find("[data-testid='condition-suggested-value']").exists()).toBe(true);
    utilStore.enumerations = [{
      enumId: "ScWeb",
      description: "Web store",
      enumTypeId: "SALES_CHANNEL",
      typeDescription: "Sales Channel"
    }];
    await nextTick();

    const customValue = wrapper.find("[data-testid='condition-custom-value']");
    expect(customValue.exists()).toBe(true);
    expect((customValue.element as HTMLInputElement).value).toBe("ScPos");
    expect(store.getGraph?.conditions[0].fieldValue).toBe("ScPos");

    utilStore.enumerations = [{
      enumId: "ScPos",
      description: "Point of sale",
      enumTypeId: "SALES_CHANNEL",
      typeDescription: "Sales Channel"
    }];
    await nextTick();

    expect(wrapper.find("[data-testid='condition-custom-value']").exists()).toBe(true);
    expect(store.getGraph?.conditions[0].fieldValue).toBe("ScPos");
  });

  it("keeps the exact value visible and persisted when the condition field changes", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.addFieldPath("salesChannelEnumId", "salesChannel");
    store.addFieldPath("fulfillmentEnumId", "fulfillment");
    store.addCondition({ fieldNameAlias: "salesChannel", operator: "equals", fieldValue: "ScPos" });

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();

    useUtilStore().$patch({
      entityDefinitions: {
        OrderHeader: {
          fields: [],
          relationships: [
            {
              relationshipName: "SalesChannel#moqui.basic.Enumeration",
              title: "SalesChannel",
              relatedEntityName: "moqui.basic.Enumeration"
            },
            {
              relationshipName: "Fulfillment#moqui.basic.Enumeration",
              title: "Fulfillment",
              relatedEntityName: "moqui.basic.Enumeration"
            }
          ]
        }
      },
      enumerations: [
        {
          enumId: "ScPos",
          description: "Point of sale",
          enumTypeId: "SALES_CHANNEL",
          typeDescription: "Sales Channel"
        },
        {
          enumId: "ScFulfillment",
          description: "Fulfillment",
          enumTypeId: "FULFILLMENT",
          typeDescription: "Fulfillment"
        }
      ]
    });

    expect(getConditionValueOptionSource({
      condition: store.getGraph?.conditions[0],
      fields: [store.getGraph?.fields[0]],
      relationships: useUtilStore().getEntityRelationships("OrderHeader"),
      enumerations: useUtilStore().getEnumerations,
      statuses: useUtilStore().getStatuses
    })).toEqual(expect.objectContaining({
      options: [expect.objectContaining({ value: "ScPos" })]
    }));
    expect(getConditionValueOptionSource({
      condition: { fieldNameAlias: "fulfillment" },
      fields: [store.getGraph?.fields[1]],
      relationships: useUtilStore().getEntityRelationships("OrderHeader"),
      enumerations: useUtilStore().getEnumerations,
      statuses: useUtilStore().getStatuses
    })).toEqual(expect.objectContaining({
      options: [expect.objectContaining({ value: "ScFulfillment" })]
    }));

    (wrapper.vm as any).openCondition(store.getGraph?.conditions[0]);
    await nextTick();
    expect(wrapper.find("[data-testid='condition-suggested-value']").exists()).toBe(true);

    (wrapper.vm as any).activeCondition.fieldNameAlias = "fulfillment";
    (wrapper.vm as any).activeCondition.targetId = store.getGraph?.fields[1].fieldPath;
    await nextTick();

    expect((wrapper.vm as any).activeConditionValueOptions).toEqual(expect.objectContaining({
      options: [expect.objectContaining({ value: "ScFulfillment" })]
    }));
    const customValue = wrapper.find("[data-testid='condition-custom-value']");
    expect(customValue.exists()).toBe(true);
    expect((customValue.element as HTMLInputElement).value).toBe("ScPos");
    (wrapper.vm as any).closeConditionModal(true);
    expect(store.getGraph?.conditions[0]).toEqual(expect.objectContaining({
      fieldNameAlias: "fulfillment",
      fieldValue: "ScPos"
    }));
  });

  it("keeps ambiguous lookup values as free text when saving the graph", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.addFieldPath("orderStatusId", "orderStatus");
    store.addCondition({ fieldNameAlias: "orderStatus", operator: "equals", fieldValue: "INITIAL" });

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();

    const utilStore = useUtilStore();
    utilStore.$patch({
      entityDefinitions: {
        OrderHeader: {
          fields: [],
          relationships: [{
            relationshipName: "Order#moqui.basic.StatusItem",
            title: "Order",
            relatedEntityName: "moqui.basic.StatusItem"
          }]
        }
      },
      statuses: [
        { statusId: "ORDER_A", description: "A", statusTypeId: "ORDER_A", typeDescription: "Order" },
        { statusId: "ORDER_B", description: "B", statusTypeId: "ORDER_B", typeDescription: "Order" }
      ]
    });

    expect(getConditionValueOptionSource({
      condition: store.getGraph?.conditions[0],
      fields: [store.getGraph?.fields[0]],
      relationships: utilStore.getEntityRelationships("OrderHeader"),
      enumerations: utilStore.getEnumerations,
      statuses: utilStore.getStatuses
    })).toBeUndefined();

    (wrapper.vm as any).openCondition(store.getGraph?.conditions[0]);
    await nextTick();
    expect(wrapper.find("[data-testid='condition-value-mode']").exists()).toBe(false);
    (wrapper.vm as any).activeCondition.fieldValue = "POS_SALES_CHANNEL";
    (wrapper.vm as any).closeConditionModal(true);
    expect(store.getGraph?.conditions[0].fieldValue).toBe("POS_SALES_CHANNEL");
  });

  it("persists intentional condition values while cancel and validation leave the graph unchanged", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    store.addFieldPath("salesChannelEnumId", "salesChannel");

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await flushPromises();

    const utilStore = useUtilStore();
    utilStore.$patch({
      entityDefinitions: {
        OrderHeader: {
          fields: [],
          relationships: [{
            relationshipName: "SalesChannel#moqui.basic.Enumeration",
            title: "SalesChannel",
            relatedEntityName: "moqui.basic.Enumeration"
          }]
        }
      },
      enumerations: [{
        enumId: "ScPos",
        description: "Point of sale",
        enumTypeId: "SALES_CHANNEL",
        typeDescription: "Sales Channel"
      }]
    });
    store.baseline = JSON.stringify(serializeDataDocumentGraph(store.getGraph!));
    expect(store.isDirty).toBe(false);

    (wrapper.vm as any).selectField(store.getGraph?.fields[0].fieldPath);
    (wrapper.vm as any).openConditionModal();
    await nextTick();
    await wrapper.find("[data-testid='condition-value-mode']").trigger("ionChange", { detail: { value: "custom" } });
    await wrapper.find("[data-testid='condition-custom-value']").trigger("ionInput", { detail: { value: "POS_SALES_CHANNEL" } });
    (wrapper.vm as any).closeConditionModal(true);

    expect(store.getGraph?.conditions).toEqual([expect.objectContaining({ fieldValue: "POS_SALES_CHANNEL" })]);
    expect(store.isDirty).toBe(true);

    const savedGraph = JSON.stringify(serializeDataDocumentGraph(store.getGraph!));
    apiMock.mockClear();
    (wrapper.vm as any).openCondition(store.getGraph?.conditions[0]);
    await nextTick();
    expect(wrapper.find("[data-testid='condition-custom-value']").exists()).toBe(true);
    (wrapper.vm as any).closeConditionModal();
    expect(JSON.stringify(serializeDataDocumentGraph(store.getGraph!))).toBe(savedGraph);
    expect(store.isDirty).toBe(true);
    expect(apiMock).not.toHaveBeenCalled();

    (wrapper.vm as any).openCondition(store.getGraph?.conditions[0]);
    await nextTick();
    await wrapper.find("[data-testid='condition-value-mode']").trigger("ionChange", { detail: { value: "suggested" } });
    expect(wrapper.find("[data-testid='condition-custom-value']").exists()).toBe(true);
    await wrapper.find("[data-testid='condition-custom-value']").trigger("ionInput", { detail: { value: "" } });
    await wrapper.find("[data-testid='condition-value-mode']").trigger("ionChange", { detail: { value: "suggested" } });
    await wrapper.find("[data-testid='condition-suggested-value']").trigger("ionChange", { detail: { value: "ScPos" } });
    (wrapper.vm as any).closeConditionModal(true);
    expect(store.getGraph?.conditions[0].fieldValue).toBe("ScPos");

    (wrapper.vm as any).openCondition(store.getGraph?.conditions[0]);
    await nextTick();
    expect(wrapper.find("[data-testid='condition-suggested-value']").exists()).toBe(true);
    await wrapper.find("[data-testid='condition-value-mode']").trigger("ionChange", { detail: { value: "custom" } });
    await wrapper.find("[data-testid='condition-custom-value']").trigger("ionInput", { detail: { value: "" } });
    (wrapper.vm as any).closeConditionModal(true);
    expect(store.getGraph?.conditions[0].fieldValue).toBe("ScPos");

    (wrapper.vm as any).openCondition(store.getGraph?.conditions[0]);
    (wrapper.vm as any).activeCondition.operator = "is-null";
    await nextTick();
    expect((wrapper.vm as any).activeCondition.fieldValue).toBeUndefined();
    (wrapper.vm as any).closeConditionModal(true);
    expect(store.getGraph?.conditions[0].fieldValue).toBeUndefined();

    (wrapper.vm as any).openCondition(store.getGraph?.conditions[0]);
    (wrapper.vm as any).activeCondition.operator = "equals";
    await nextTick();
    expect((wrapper.vm as any).isOperatorValueInvalid).toBe(true);
    (wrapper.vm as any).closeConditionModal(true);
    expect(store.getGraph?.conditions[0].fieldValue).toBeUndefined();
  });

  it("enables preview only for a persisted clean graph without validation errors while not saving", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    graphStore.startNewGraph();
    graphStore.updateMetadata({
      dataDocumentId: "PreviewGateDocument",
      documentName: "Preview gate document",
      primaryEntityName: "Product"
    });
    graphStore.graph = projectDataDocumentGraph({
      document: graphStore.getGraph!.metadata,
      fields: [{ fieldPath: "unverifiedRelationship:orderId", fieldNameAlias: "orderId" }],
      relationshipMetadata: {
        unverifiedRelationship: {
          relationshipName: "unverifiedRelationship",
          verified: false,
          attempted: true
        }
      }
    });
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    graphStore.loadedDataDocumentId = "PreviewGateDocument";
    routeHarness.currentRoute.value.params.id = "PreviewGateDocument";

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "PreviewGateDocument" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await wrapper.find(".graph-bottom ion-segment").trigger("ionChange", { detail: { value: "preview" } });
    await nextTick();
    const previewButton = () => wrapper.findAll("ion-button").find((button) => button.text() === "Preview");
    apiMock.mockClear();

    expect((previewButton()?.element as HTMLButtonElement).disabled).toBe(true);
    await previewButton()?.trigger("click");
    expect(apiMock).not.toHaveBeenCalled();

    graphStore.isPersisted = true;
    graphStore.targetDataDocumentId = "PreviewGateDocument";
    await nextTick();
    expect(graphStore.getGraph?.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "warning" })
    ]));
    expect(graphStore.canPreview).toBe(true);
    expect((previewButton()?.element as HTMLButtonElement).disabled).toBe(false);
    await previewButton()?.trigger("click");
    await flushPromises();
    expect(previewStore.getPreviewStatus).toBe("success");

    routeHarness.currentRoute.value.params.id = "DifferentDocument";
    await nextTick();
    expect(previewButton()).toBeUndefined();
    expect(wrapper.find(".graph-builder").exists()).toBe(false);
    expect(previewStore.getPreviewStatus).toBe("idle");
    routeHarness.currentRoute.value.params.id = "PreviewGateDocument";
    await nextTick();

    graphStore.updateMetadata({ documentTitle: "Dirty preview title" });
    await nextTick();
    expect(graphStore.isDirty).toBe(true);
    expect(previewStore.getPreviewStatus).toBe("idle");
    expect((previewButton()?.element as HTMLButtonElement).disabled).toBe(true);

    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    graphStore.saving = true;
    await nextTick();
    expect((previewButton()?.element as HTMLButtonElement).disabled).toBe(true);

    graphStore.saving = false;
    graphStore.updateMetadata({ primaryEntityName: "" });
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    await nextTick();
    expect(graphStore.getGraph?.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "error" })
    ]));
    expect((previewButton()?.element as HTMLButtonElement).disabled).toBe(true);
    const requestCount = apiMock.mock.calls.filter(([request]) => request.url === "oms/dataDocumentView").length;
    await previewButton()?.trigger("click");
    expect(apiMock.mock.calls.filter(([request]) => request.url === "oms/dataDocumentView")).toHaveLength(requestCount);
  });

  it("does not translate saved conditions into preview filters", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "PreviewDocument", primaryEntityName: "Product" });
    store.addFieldPath("statusId", "statusId");
    store.addCondition({ fieldNameAlias: "statusId", operator: "equals", fieldValue: "OPEN" });
    store.isPersisted = true;
    store.baseline = JSON.stringify(serializeDataDocumentGraph(store.getGraph!));
    store.loadedDataDocumentId = "PreviewDocument";
    store.targetDataDocumentId = "PreviewDocument";
    routeHarness.currentRoute.value.params.id = "PreviewDocument";

    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "PreviewDocument" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });

    await wrapper.find(".graph-bottom ion-segment").trigger("ionChange", { detail: { value: "preview" } });
    await nextTick();
    apiMock.mockClear();
    const previewButton = wrapper.findAll("ion-button").find((button) => button.text() === "Preview");
    expect(previewButton).toBeDefined();
    await previewButton?.trigger("click");
    await flushPromises();

    expect(apiMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ customParametersMap: {} })
    }));
  });

  it("renders route-owned loading, error, and retry for a fresh detail failure", async () => {
    routeHarness.currentRoute.value.params.id = "FailedDocument";
    const detail = deferred<any>();
    apiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/FailedDocument") return detail.promise;
      return Promise.resolve({ data: [] });
    });
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "FailedDocument" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    const enter = ionicLifecycleHarness.willEnterCallbacks.at(-1);
    expect(enter).toBeTypeOf("function");
    if (!enter) return;

    const entering = enter();
    await nextTick();
    expect(wrapper.text()).toContain("Loading graph builder.");
    detail.reject(new Error("detail unavailable"));
    await expect(entering).resolves.toBeUndefined();
    await nextTick();

    expect(wrapper.text()).toContain("Unable to load data document.");
    expect(wrapper.text()).toContain("detail unavailable");
    const retryButton = wrapper.findAll("ion-button").find((button) => button.text() === "Retry");
    expect(retryButton).toBeDefined();
    expect(wrapper.find(".graph-builder").exists()).toBe(false);
    apiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/FailedDocument") {
        return Promise.resolve({
          data: {
            dataDocumentId: "FailedDocument",
            documentName: "Recovered document",
            primaryEntityName: "Product",
            fields: [],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/Product/definition") {
        return Promise.resolve({ data: { entityDefinition: { fields: [], relationships: [] } } });
      }
      if (url === "admin/serviceJobs") return Promise.resolve({ data: { serviceJobList: [] } });
      return Promise.resolve({ data: [] });
    });
    await retryButton?.trigger("click");
    await flushPromises();
    expect(wrapper.find(".graph-builder").exists()).toBe(true);
    expect(useDataDocumentGraphStore().getGraph?.metadata.documentName).toBe("Recovered document");
    wrapper.unmount();
  });

  it("hides cached A and disables save when route B fails", async () => {
    const graphStore = useDataDocumentGraphStore();
    graphStore.graph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "DocumentA",
        documentName: "Document A cached graph",
        primaryEntityName: "Product"
      },
      fields: []
    });
    graphStore.isPersisted = true;
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    routeHarness.currentRoute.value.params.id = "DocumentB";
    apiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/DocumentB") return Promise.reject(new Error("B unavailable"));
      return Promise.resolve({ data: [] });
    });
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "DocumentB" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    const enter = ionicLifecycleHarness.willEnterCallbacks.at(-1);
    expect(enter).toBeTypeOf("function");
    if (!enter) return;
    await expect(enter()).resolves.toBeUndefined();
    await nextTick();

    expect(wrapper.text()).not.toContain("Document A cached graph");
    expect(wrapper.find(".graph-builder").exists()).toBe(false);
    expect(wrapper.text()).toContain("B unavailable");
    const saveButton = wrapper.findAll("ion-button").find((button) => button.text() === "Save");
    expect((saveButton?.element as HTMLButtonElement).disabled).toBe(true);
    wrapper.unmount();
  });

  it("hides a cached same-document graph after forced reload failure and restores it only after retry succeeds", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const graphStore = useDataDocumentGraphStore();
    graphStore.graph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "SameDocument",
        documentName: "Cached same document",
        primaryEntityName: "Product"
      },
      fields: []
    });
    graphStore.loadedDataDocumentId = "SameDocument";
    graphStore.isPersisted = true;
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    routeHarness.currentRoute.value.params.id = "SameDocument";
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "SameDocument" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    await nextTick();
    expect(wrapper.find(".graph-builder").exists()).toBe(true);
    apiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/SameDocument") return Promise.reject(new Error("forced reload unavailable"));
      return Promise.resolve({ data: [] });
    });

    await expect(graphStore.fetchGraph("SameDocument", { force: true })).rejects.toThrow("forced reload unavailable");
    await nextTick();

    expect(graphStore.getGraph?.metadata.documentName).toBe("Cached same document");
    expect(wrapper.text()).toContain("forced reload unavailable");
    expect(wrapper.find(".graph-builder").exists()).toBe(false);
    const saveButton = () => wrapper.findAll("ion-button").find((button) => button.text() === "Save");
    expect((saveButton()?.element as HTMLButtonElement).disabled).toBe(true);

    apiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/SameDocument") {
        return Promise.resolve({
          data: {
            dataDocumentId: "SameDocument",
            documentName: "Reloaded same document",
            primaryEntityName: "Product",
            fields: [],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/Product/definition") {
        return Promise.resolve({ data: { entityDefinition: { fields: [], relationships: [] } } });
      }
      if (url === "admin/serviceJobs") return Promise.resolve({ data: { serviceJobList: [] } });
      return Promise.resolve({ data: [] });
    });
    const retryButton = wrapper.findAll("ion-button").find((button) => button.text() === "Retry");
    expect(retryButton).toBeDefined();
    await retryButton?.trigger("click");
    await flushPromises();

    expect(wrapper.find(".graph-builder").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("forced reload unavailable");
    expect(graphStore.getGraph?.metadata.documentName).toBe("Reloaded same document");
    expect((saveButton()?.element as HTMLButtonElement).disabled).toBe(false);
    wrapper.unmount();
  });

  it("loads export history once when entering the Exports segment", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "ExportDocument", primaryEntityName: "Product" });
    store.isPersisted = true;
    routeHarness.currentRoute.value.params.id = "ExportDocument";
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "ExportDocument" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    apiMock.mockClear();

    await (wrapper.vm as any).setSegment("exports");
    await flushPromises();

    const historyRequests = apiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url === "admin/systemMessages" && request.method === "GET");
    expect(historyRequests).toHaveLength(1);
    expect(historyRequests[0].params).toEqual(expect.objectContaining({
      systemMessageTypeId: "ExportDocumentData"
    }));
  });

  it("loads export history from an Exports deep link during Ionic entry", async () => {
    routeHarness.currentRoute.value.params.id = "DeepLinkDocument";
    routeHarness.currentRoute.value.query = { segment: "exports" };
    apiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/DeepLinkDocument") {
        return Promise.resolve({
          data: {
            dataDocumentId: "DeepLinkDocument",
            documentName: "Deep link document",
            primaryEntityName: "Product",
            fields: [],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/Product/definition") {
        return Promise.resolve({ data: { entityDefinition: { fields: [], relationships: [] } } });
      }
      if (url === "admin/serviceJobs") return Promise.resolve({ data: { serviceJobList: [] } });
      if (url === "admin/systemMessages") return Promise.resolve({ data: { systemMessages: [] } });
      return Promise.resolve({ data: [] });
    });
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "DeepLinkDocument" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    const enter = ionicLifecycleHarness.willEnterCallbacks.at(-1);
    expect(enter).toBeTypeOf("function");
    if (!enter) return;

    await enter();
    await flushPromises();

    expect((wrapper.vm as any).bottomPanel).toBe("exports");
    expect(apiMock.mock.calls.filter(([request]) => request.url === "admin/systemMessages")).toHaveLength(1);
    wrapper.unmount();
  });

  it("disables the toolbar save only while the store is saving", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    const saveButton = () => wrapper.findAll("ion-button").find((button) => button.text() === "Save");

    expect((saveButton()?.element as HTMLButtonElement).disabled).toBe(false);

    store.saving = true;
    await nextTick();
    expect((saveButton()?.element as HTMLButtonElement).disabled).toBe(true);
    expect(wrapper.find(".graph-builder").attributes("inert")).toBe("");
    expect(wrapper.find(".graph-builder").attributes("aria-busy")).toBe("true");

    store.saving = false;
    await nextTick();
    expect((saveButton()?.element as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the actionable ID limit issue and prevents the live-QA draft POST", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ documentName: "POS Sales Order Items Without Issuance QA 20260824" });
    store.updateMetadata({ primaryEntityName: "Product" });
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "new" },
      global: {
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });

    expect(wrapper.text()).toContain(
      "Data document ID must be 40 characters or fewer (currently 43). Shorten the Name or edit the ID in Advanced Metadata."
    );
    await wrapper.findAll("ion-button").find((button) => button.text() === "Save")?.trigger("click");
    await flushPromises();

    expect(apiMock.mock.calls.filter(([request]) => (
      request.url === "moqui/dataDocuments" && request.method === "POST"
    ))).toHaveLength(0);
  });

  it("invalidates a deferred preview on unmount and ignores its late success", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    routeHarness.currentRoute.value.name = "DataDocumentGraphBuilder";
    routeHarness.currentRoute.value.params.id = "UnmountPreview";
    graphStore.graph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "UnmountPreview",
        documentName: "Unmount Preview",
        primaryEntityName: "Product"
      },
      fields: []
    });
    graphStore.isPersisted = true;
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    const previewResponse = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    apiMock.mockReturnValue(previewResponse.promise);
    const wrapper = mount(DataDocumentGraphBuilder, {
      props: { id: "UnmountPreview" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    graphStore.targetDataDocumentId = "UnmountPreview";
    expect(graphStore.canPreview).toBe(true);

    setActivePinia(pinia);
    expect(useDataDocumentGraphStore()).toBe(graphStore);
    const request = previewStore.runPreview({ pageSize: 25 });
    await flushPromises();
    expect(previewStore.getPreviewStatus).toBe("loading");
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    wrapper.unmount();
    expect(previewStore.getPreviewStatus).toBe("idle");

    previewResponse.resolve({ data: { entityValueList: [{ document: "late success" }] } });
    await request;

    expect(previewStore.getPreviewRows).toEqual([]);
    expect(previewStore.getPreviewStatus).toBe("idle");
    const previewRequestCount = apiMock.mock.calls.length;
    await previewStore.runPreview({ pageSize: 25 });
    expect(apiMock).toHaveBeenCalledTimes(previewRequestCount);
  });

  it("invalidates a deferred preview on Ionic leave and ignores its late rejection", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    routeHarness.currentRoute.value.name = "DataDocumentGraphBuilder";
    routeHarness.currentRoute.value.params.id = "LeavePreview";
    graphStore.graph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "LeavePreview",
        documentName: "Leave Preview",
        primaryEntityName: "Product"
      },
      fields: []
    });
    graphStore.isPersisted = true;
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    const previewResponse = deferred<{ data: { entityValueList: Array<Record<string, string>> } }>();
    apiMock.mockReturnValue(previewResponse.promise);
    mount(DataDocumentGraphBuilder, {
      props: { id: "LeavePreview" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    graphStore.targetDataDocumentId = "LeavePreview";
    expect(graphStore.canPreview).toBe(true);

    setActivePinia(pinia);
    expect(useDataDocumentGraphStore()).toBe(graphStore);
    const request = previewStore.runPreview({ pageSize: 25 });
    await flushPromises();
    expect(previewStore.getPreviewStatus).toBe("loading");
    await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    const leave = ionicLifecycleHarness.willLeaveCallbacks.at(-1);
    expect(leave).toBeTypeOf("function");
    if (!leave) return;
    leave();
    expect(previewStore.getPreviewStatus).toBe("idle");

    previewResponse.reject(new Error("late rejection"));
    await request;

    expect(previewStore.getPreviewRows).toEqual([]);
    expect(previewStore.getPreviewStatus).toBe("idle");
    expect(previewStore.getPreviewError).toBe("");
  });

  it("does not activate preview ownership for a non-builder route with an id param", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const graphStore = useDataDocumentGraphStore();
    routeHarness.currentRoute.value.name = "JobDetail";
    routeHarness.currentRoute.value.params.id = "NotADataDocument";
    graphStore.startNewGraph();

    mount(DataDocumentGraphBuilder, {
      props: { id: "NotADataDocument" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });

    expect(graphStore.targetDataDocumentId).toBe("");
    expect(graphStore.canPreview).toBe(false);
  });

  it("does not let an old cached builder release a newer builder target", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const graphStore = useDataDocumentGraphStore();
    routeHarness.currentRoute.value.name = "DataDocumentGraphBuilder";
    routeHarness.currentRoute.value.params.id = "DocumentA";
    graphStore.startNewGraph();
    mount(DataDocumentGraphBuilder, {
      props: { id: "DocumentA" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    const oldLeave = ionicLifecycleHarness.willLeaveCallbacks[0];

    routeHarness.currentRoute.value.params.id = "DocumentB";
    graphStore.graph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "DocumentB",
        documentName: "Document B",
        primaryEntityName: "Product"
      },
      fields: []
    });
    graphStore.isPersisted = true;
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    mount(DataDocumentGraphBuilder, {
      props: { id: "DocumentB" },
      global: {
        plugins: [pinia],
        stubs: {
          IonBackButton: true,
          IonModal: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          DataDocumentExportList: true,
          DataDocumentPreviewTable: true
        }
      }
    });
    expect(oldLeave).toBeTypeOf("function");
    if (!oldLeave) return;

    oldLeave();

    expect(graphStore.targetDataDocumentId).toBe("DocumentB");
    expect(graphStore.canPreview).toBe(true);
  });
});
