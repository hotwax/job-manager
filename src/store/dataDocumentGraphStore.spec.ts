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

  it("manages conditions correctly (add, update, remove)", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    expect(store.getGraph?.conditions).toHaveLength(0);

    store.addCondition({
      fieldNameAlias: "statusId",
      operator: "equals",
      fieldValue: "Approved",
      postQuery: "N"
    });

    expect(store.getGraph?.conditions).toHaveLength(1);
    expect(store.getGraph?.conditions[0]).toEqual(expect.objectContaining({
      fieldNameAlias: "statusId",
      operator: "equals",
      fieldValue: "Approved",
      postQuery: "N"
    }));

    const conditionId = store.getGraph?.conditions[0].localId;
    store.updateCondition(conditionId, { fieldValue: "Cancelled" });

    expect(store.getGraph?.conditions[0].fieldValue).toBe("Cancelled");

    store.removeCondition(conditionId!);
    expect(store.getGraph?.conditions).toHaveLength(0);
  });
});
