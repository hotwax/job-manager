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

  it("physically reorders fields and recalculates their sequence numbers correctly", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    const f1 = store.addFieldPath("field1");
    const f2 = store.addFieldPath("field2");

    expect(store.getGraph?.fields).toHaveLength(2);
    expect(store.getGraph?.fields[0].fieldPath).toBe("field1");
    expect(store.getGraph?.fields[0].sequenceNum).toBe(10);
    expect(store.getGraph?.fields[1].fieldPath).toBe("field2");
    expect(store.getGraph?.fields[1].sequenceNum).toBe(20);

    // Drag field2 (index 1) to the first position (index 0)
    store.reorderFields(1, 0);

    expect(store.getGraph?.fields[0].fieldPath).toBe("field2");
    expect(store.getGraph?.fields[0].sequenceNum).toBe(10);
    expect(store.getGraph?.fields[1].fieldPath).toBe("field1");
    expect(store.getGraph?.fields[1].sequenceNum).toBe(20);
  });
});
