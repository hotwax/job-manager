import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.mock("@common", () => ({
  api: vi.fn(),
  commonUtil: {},
  translate: (value: string) => value
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";

describe("data document graph store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("defaults a new placeholder field alias to the selected field name", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    const field = store.addFieldPath("", "");

    expect(field?.fieldNameAlias).toBe("");

    store.updateField(field?.fieldSeqId, field?.fieldPath || "", {
      fieldPath: "riskLevelEnumId"
    });

    expect(store.getGraph?.fields[0]).toEqual(expect.objectContaining({
      fieldPath: "riskLevelEnumId",
      fieldNameAlias: "riskLevelEnumId"
    }));
  });

  it("keeps a custom field alias when the selected field changes", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    const field = store.addFieldPath("statusId", "orderStatus");

    store.updateField(field?.fieldSeqId, field?.fieldPath || "", {
      fieldPath: "riskLevelEnumId"
    });

    expect(store.getGraph?.fields[0]).toEqual(expect.objectContaining({
      fieldPath: "riskLevelEnumId",
      fieldNameAlias: "orderStatus"
    }));
  });

  it("tracks unsaved changes via isDirty", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    expect(store.isDirty).toBe(false);

    store.updateMetadata({ documentName: "Order Report" });
    expect(store.isDirty).toBe(true);

    store.discardDraft();
    expect(store.isDirty).toBe(false);
    expect(store.getGraph).toBeUndefined();
  });

  it("auto-derives the id from the name until the user sets it manually", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    store.updateMetadata({ documentName: "Order Export Report" });
    expect(store.getGraph?.metadata.dataDocumentId).toBe("OrderExportReport");

    // editing the name keeps the id in sync
    store.updateMetadata({ documentName: "Sales Report" });
    expect(store.getGraph?.metadata.dataDocumentId).toBe("SalesReport");

    // once the user sets the id by hand, name changes no longer overwrite it
    store.updateMetadata({ dataDocumentId: "MyCustomId" });
    store.updateMetadata({ documentName: "Renamed Again" });
    expect(store.getGraph?.metadata.dataDocumentId).toBe("MyCustomId");
  });

  it("clears fields, conditions, relAliases, and links when primaryEntityName changes, and queues old ones for deletion", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    
    // Add fields, conditions, links, relAliases
    store.addFieldPath("orderId");
    store.addCondition({ fieldNameAlias: "orderId", operator: "equals", fieldValue: "100" });
    store.relAliases = [{ relationshipName: "orderItems", alias: "items" }];
    store.links = [{ relationshipName: "orderItems" }];
    
    expect(store.getGraph?.fields).toHaveLength(1);
    expect(store.getGraph?.conditions).toHaveLength(1);
    expect(store.relAliases).toHaveLength(1);
    expect(store.links).toHaveLength(1);
    
    // Changing primary entity should clear everything and queue persisted items for deletion
    store.updateMetadata({ primaryEntityName: "Party" });
    
    expect(store.getGraph?.metadata.primaryEntityName).toBe("Party");
    expect(store.getGraph?.fields).toHaveLength(0);
    expect(store.getGraph?.conditions).toHaveLength(0);
    expect(store.relAliases).toHaveLength(0);
    expect(store.links).toHaveLength(0);
    expect(store.removedFieldSeqIds).toHaveLength(0);
    expect(store.removedConditionSeqIds).toHaveLength(0);
    
    // Since the added field didn't have a persisted fieldSeqId (it was empty/new), it's not queued.
    // Let's test with mock persisted fieldSeqId.
    store.startNewGraph();
    store.updateMetadata({ primaryEntityName: "OrderHeader" });
    // Let's manually set fields/conditions in the graph with persisted IDs.
    if (store.getGraph) {
      store.getGraph.fields = [
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
      store.getGraph.conditions = [
        {
          dataDocumentId: "DocId",
          conditionSeqId: "01",
          localId: "c1",
          targetKind: "field",
          targetId: "10",
          fieldNameAlias: "orderId",
          operator: "equals",
          fieldValue: "100",
          sourceRecord: { conditionSeqId: "01", fieldNameAlias: "orderId" }
        }
      ];
    }
    
    store.updateMetadata({ primaryEntityName: "Party" });
    expect(store.removedFieldSeqIds).toContain("10");
    expect(store.removedConditionSeqIds).toContain("01");
  });
});
