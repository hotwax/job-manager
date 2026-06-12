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
});
