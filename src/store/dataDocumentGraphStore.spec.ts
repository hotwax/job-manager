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

import { api } from "@common";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";

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

  it("refuses to save a graph whose derived id is past the persisted limit", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    // The name that produced the live truncation failure in #1097.
    store.updateMetadata({ documentName: "POS Sales Order Items Without Issuance QA 20260824" });

    expect(store.getGraph?.metadata.dataDocumentId).toHaveLength(43);

    // The parent document is written first, so nothing may reach the API at all.
    vi.mocked(api).mockClear();
    await expect(store.saveGraph()).rejects.toThrow(/43 characters/);
    expect(api).not.toHaveBeenCalled();
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

describe("data document lifecycle", () => {
  const detail = (id: string) => ({ data: {
    dataDocumentId: id, documentName: id, primaryEntityName: "Party",
    fields: [{ fieldSeqId: "10", fieldPath: "partyId", fieldNameAlias: "partyId", dataDocumentId: id }],
    conditions: []
  } });
  const deferred = () => {
    let resolve!: (value: any) => void;
    const promise = new Promise<any>((done) => { resolve = done; });
    return { promise, resolve };
  };
  const respondWith = (routes: Record<string, () => Promise<any>> = {}) => {
    vi.mocked(api).mockImplementation((({ url }: { url: string }) => routes[url]?.()
      ?? Promise.resolve(url.startsWith("moqui/dataDocuments/") ? detail(url.split("/").pop()!) : { data: {} })) as any);
  };
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api).mockReset();
    respondWith();
  });

  it("clears the previous graph while loading and ignores a late response", async () => {
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("Previous");
    const a = deferred(), b = deferred();
    respondWith({ "moqui/dataDocuments/A": () => a.promise, "moqui/dataDocuments/B": () => b.promise });
    const loadingA = store.fetchGraph("A");
    expect(store.getGraph).toBeUndefined();
    expect(store.status).toBe("loading");
    const loadingB = store.fetchGraph("B");
    b.resolve(detail("B"));
    await loadingB;
    a.resolve(detail("A"));
    await loadingA;
    expect(store.getGraph?.dataDocumentId).toBe("B");
    expect(useDataDocumentStore().getCurrentDocument.dataDocumentId).toBe("B");
  });

  it.each(["", {}, new Error("offline")])("clears a failed or missing document and permits retry: %s", async (body) => {
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("A");
    respondWith({ "moqui/dataDocuments/B": () => body instanceof Error ? Promise.reject(body) : Promise.resolve({ data: body }) });
    await store.fetchGraph("B");
    expect(store.status).toBe("error");
    expect(store.getGraph).toBeUndefined();
    expect(store.isPersisted).toBe(false);
    respondWith();
    await store.fetchGraph("B");
    expect(store.status).toBe("ready");
  });

  it("saves a restored existing draft with PUT and retains its fields", async () => {
    const document = detail("A").data;
    respondWith({ "moqui/dataDocuments/A": () => Promise.resolve({ data: document }) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("A");
    store.updateMetadata({ documentTitle: "Restored draft" });
    store.$patch({ owner: "", status: "idle" });
    useDataDocumentStore().resetDocumentScope();
    vi.mocked(api).mockClear();
    await store.fetchGraph("A");
    expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ url: "moqui/dataDocuments/A" }));
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: "admin/systemMessages" }));
    expect(store.getGraph?.metadata.documentTitle).toBe("Restored draft");
    expect(useDataDocumentStore().currentDocument).toBeUndefined();
    vi.mocked(api).mockImplementation((async ({ url, method, data }: any) => {
      if (method === "POST") throw new Error("Duplicate document id");
      if (url !== "moqui/dataDocuments/A") return { data: {} };
      if (method === "PUT") Object.assign(document, data);
      return { data: document };
    }) as any);
    await store.saveGraph();
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: "moqui/dataDocuments/A", method: "PUT" }));
    expect(store.getGraph?.metadata.documentTitle).toBe("Restored draft");
    expect(store.getGraph?.fields).toHaveLength(1);
    expect(store.isDirty).toBe(false);
  });

  it("creates once, ignores an old page's release, and releases only clean work", async () => {
    respondWith({ "moqui/dataDocuments": () => Promise.resolve(detail("NewDoc")) });
    const store = useDataDocumentGraphStore();
    const first = Symbol("first"), next = Symbol("next");
    store.startNewGraph(first);
    store.updateMetadata({ primaryEntityName: "Party" });
    store.updateMetadata({ documentName: "New Doc" });
    await store.saveGraph();
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: "moqui/dataDocuments", method: "POST" }));
    vi.mocked(api).mockClear();
    await store.fetchGraph("NewDoc", { claimant: next });
    expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ url: "moqui/dataDocuments/NewDoc" }));
    store.release(first);
    expect(store.getGraph).toBeDefined();
    store.updateMetadata({ documentTitle: "Unsaved" });
    store.release(next);
    expect(store.isDirty).toBe(true);
    await store.fetchGraph("NewDoc", { force: true });
    store.release(next);
    expect(store.getGraph).toBeUndefined();
    expect(store.status).toBe("idle");
  });

  it("does not repopulate a released page when its request finishes", async () => {
    const pending = deferred();
    respondWith({ "moqui/dataDocuments/A": () => pending.promise });
    const store = useDataDocumentGraphStore();
    const page = Symbol("page");
    const loading = store.fetchGraph("A", { claimant: page });
    store.release(page);
    pending.resolve(detail("A"));
    await loading;
    expect(store.getGraph).toBeUndefined();
    expect(store.status).toBe("idle");
  });

  it.each(["", new Error("offline")])("keeps working data when post-save re-sync fails: %s", async (body) => {
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("A");
    respondWith({ "moqui/dataDocuments/A": () => body instanceof Error ? Promise.reject(body) : Promise.resolve({ data: body }) });
    await expect(store.fetchGraph("A", { force: true })).rejects.toThrow();
    expect(store.status).toBe("ready");
    expect(store.getGraph?.dataDocumentId).toBe("A");
  });
});
