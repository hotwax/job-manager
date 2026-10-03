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

describe("data document graph store - who owns the graph", () => {
  const detail = (id: string, name: string) => ({
    data: {
      dataDocumentId: id,
      documentName: name,
      primaryEntityName: "Party",
      fields: [{ fieldSeqId: "10", fieldPath: "partyId", fieldNameAlias: "partyId", dataDocumentId: id, defaultDisplay: "Y", sequenceNum: 10 }],
      conditions: []
    }
  });
  const noHistory = { data: { systemMessages: [], systemMessagesCount: 0 } };
  const deferred = <T = any>() => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });

    return { promise, resolve, reject };
  };
  // Answer each URL from a table so tests do not depend on the order requests are issued in.
  const respondWith = (routes: Record<string, () => Promise<any>>) => {
    vi.mocked(api).mockImplementation((({ url }: { url: string }) => (routes[url] ? routes[url]() : Promise.resolve(noHistory))) as any);
  };
  const DOC_A = "moqui/dataDocuments/DocA";
  const DOC_B = "moqui/dataDocuments/DocB";

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api).mockReset();
  });

  it("drops the previous document and claims the store before the next document's first response", async () => {
    const docB = deferred();
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")), [DOC_B]: () => docB.promise });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    expect(store.status).toBe("ready");
    expect(store.owner).toBe("DocA");
    expect(store.getGraph?.metadata.documentName).toBe("Doc A");

    const loadingB = store.fetchGraph("DocB");

    expect(store.getGraph).toBeUndefined();
    expect(store.status).toBe("loading");
    expect(store.owner).toBe("DocB");
    expect(store.isLoading).toBe(true);
    docB.resolve(detail("DocB", "Doc B"));
    await loadingB;
    expect(store.status).toBe("ready");
    expect(store.getGraph?.metadata.documentName).toBe("Doc B");
    expect(store.isLoading).toBe(false);
  });

  it("ends in an error state, with no document at all, when the load fails; a retry recovers", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")), [DOC_B]: () => Promise.reject(new Error("boom")) });
    const store = useDataDocumentGraphStore();
    const page = Symbol("page");
    await store.fetchGraph("DocA");

    await store.fetchGraph("DocB", { claimant: page });

    expect(store.status).toBe("error");
    expect(store.owner).toBe("DocB");
    expect(store.getGraph).toBeUndefined();
    expect(store.isLoading).toBe(false);
    respondWith({ [DOC_B]: () => Promise.resolve(detail("DocB", "Doc B")) });
    await store.fetchGraph("DocB", { claimant: page });
    expect(store.status).toBe("ready");
    expect(store.getGraph?.metadata.documentName).toBe("Doc B");
  });

  it("clears the error state when the page that hit it is released", async () => {
    respondWith({ [DOC_B]: () => Promise.reject(new Error("boom")) });
    const store = useDataDocumentGraphStore();
    const page = Symbol("page");
    await store.fetchGraph("DocB", { claimant: page });
    expect(store.status).toBe("error");

    store.release(page);

    expect(store.status).toBe("idle");
    expect(store.owner).toBe("");
  });

  // The API answers an id it does not know with an empty 200 (a blank string), not an error.
  it.each([
    ["no body", undefined],
    ["a blank body, which is what an unknown id gets", ""],
    ["a body that is not a document", {}]
  ])("treats %s as a failed load instead of keeping the previous graph or showing a blank one", async (_label, body) => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")), [DOC_B]: () => Promise.resolve({ data: body }) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");

    await store.fetchGraph("DocB");

    expect(store.status).toBe("error");
    expect(store.owner).toBe("DocB");
    expect(store.getGraph).toBeUndefined();
    expect(store.isPersisted).toBe(false);
  });

  it("does not let a slower earlier load land on top of a newer one", async () => {
    const docA = deferred();
    const docB = deferred();
    respondWith({ [DOC_A]: () => docA.promise, [DOC_B]: () => docB.promise });
    const store = useDataDocumentGraphStore();

    const loadingA = store.fetchGraph("DocA");
    const loadingB = store.fetchGraph("DocB");
    docB.resolve(detail("DocB", "Doc B"));
    await loadingB;
    docA.resolve(detail("DocA", "Doc A"));
    await loadingA;

    expect(store.owner).toBe("DocB");
    expect(store.getGraph?.metadata.documentName).toBe("Doc B");
  });

  it("neither reloads nor blanks a document it already owns", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    const graph = store.getGraph;
    vi.mocked(api).mockClear();

    await store.fetchGraph("DocA");

    expect(api).not.toHaveBeenCalled();
    expect(store.getGraph).toBe(graph);
    expect(store.status).toBe("ready");
  });

  it("keeps an unsaved draft of the same document that survived a reload", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    store.updateMetadata({ documentTitle: "Edited" });
    expect(store.isDirty).toBe(true);
    // A reload restores the persisted draft but forgets who owned it.
    store.$patch({ owner: "", status: "idle" });
    vi.mocked(api).mockClear();

    await store.fetchGraph("DocA");

    expect(api).not.toHaveBeenCalled();
    expect(store.getGraph?.metadata.documentTitle).toBe("Edited");
    expect(store.owner).toBe("DocA");
    expect(store.status).toBe("ready");
  });

  it("loads the exports and scheduled exports of a restored draft, which never fetches the document", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    store.updateMetadata({ documentTitle: "Edited" });
    // A reload keeps the draft and the document store's data is gone.
    store.$patch({ owner: "", status: "idle" });
    useDataDocumentStore().resetDocumentScope();
    vi.mocked(api).mockClear();

    await store.fetchGraph("DocA");

    expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ url: DOC_A }));
    expect(useDataDocumentStore().getExportHistoryStatus).not.toBe("idle");
    expect(useDataDocumentStore().getScheduledExportsStatus).not.toBe("idle");
  });

  it("replaces a persisted draft that belongs to a different document", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")), [DOC_B]: () => Promise.resolve(detail("DocB", "Doc B")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    store.updateMetadata({ documentTitle: "Edited" });
    store.$patch({ owner: "", status: "idle" });

    await store.fetchGraph("DocB");

    expect(store.getGraph?.metadata.documentName).toBe("Doc B");
    expect(store.getGraph?.metadata.documentTitle).not.toBe("Edited");
  });

  it("updates an existing draft after reload even though the document store is empty", async () => {
    const document = detail("DocA", "Doc A").data;
    vi.mocked(api).mockImplementation((async ({ url, method, data }: any) => {
      if (url === DOC_A) {
        if (method === "PUT") Object.assign(document, data);
        return { data: document };
      }
      if (url === "moqui/dataDocuments" && method === "POST") {
        throw new Error("Duplicate document id");
      }
      return noHistory;
    }) as any);
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    store.updateMetadata({ documentTitle: "Restored draft" });
    store.$patch({ owner: "", status: "idle" });
    useDataDocumentStore().resetDocumentScope();
    await store.fetchGraph("DocA");
    expect(useDataDocumentStore().currentDocument).toBeUndefined();
    vi.mocked(api).mockClear();

    await store.saveGraph();

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      url: DOC_A,
      method: "PUT",
      data: expect.objectContaining({ documentTitle: "Restored draft" })
    }));
    expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ method: "POST" }));
    expect(store.getGraph?.metadata.documentTitle).toBe("Restored draft");
    expect(store.getGraph?.fields).toHaveLength(1);
    expect(store.isDirty).toBe(false);
  });

  it("releases what the leaving page loaded, but only for the page that claimed the store", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    const page = Symbol("page");
    await store.fetchGraph("DocA", { claimant: page });
    const dataDocumentStore = useDataDocumentStore();
    dataDocumentStore.previewRows = [{ a: 1 }];
    dataDocumentStore.previewStatus = "success";

    store.release(Symbol("some other page"));
    expect(store.getGraph).toBeDefined();

    store.release(page);
    expect(store.getGraph).toBeUndefined();
    expect(store.status).toBe("idle");
    expect(store.owner).toBe("");
    expect(useDataDocumentStore().getPreviewRows).toEqual([]);
  });

  it("lets a page entered for the same document take the store over from the page being left", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    const leaving = Symbol("leaving");
    const entering = Symbol("entering");
    await store.fetchGraph("DocA", { claimant: leaving });

    // The document is reopened (a first save's new id, say) before the old page has finished leaving.
    await store.fetchGraph("DocA", { claimant: entering });
    store.release(leaving);

    expect(store.getGraph?.metadata.documentName).toBe("Doc A");
    store.release(entering);
    expect(store.getGraph).toBeUndefined();
  });

  it("ignores a release that carries no claim", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");

    store.release(undefined as unknown as symbol);

    expect(store.getGraph).toBeDefined();
  });

  it("never releases unsaved work", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    const page = Symbol("page");
    await store.fetchGraph("DocA", { claimant: page });
    store.updateMetadata({ documentTitle: "Edited" });

    store.release(page);

    expect(store.getGraph?.metadata.documentTitle).toBe("Edited");
    expect(store.owner).toBe("DocA");
  });

  it("cancels a load that is still running when its page is released", async () => {
    const docA = deferred();
    respondWith({ [DOC_A]: () => docA.promise });
    const store = useDataDocumentGraphStore();
    const page = Symbol("page");

    const loadingA = store.fetchGraph("DocA", { claimant: page });
    store.release(page);
    docA.resolve(detail("DocA", "Doc A"));
    await loadingA;

    expect(store.getGraph).toBeUndefined();
    expect(store.status).toBe("idle");
    expect(store.isLoading).toBe(false);
  });

  it("takes ownership as a new document and drops the previous document's scope", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");

    store.startNewGraph();

    expect(store.owner).toBe("new");
    expect(store.status).toBe("ready");
    expect(useDataDocumentStore().getFields).toEqual([]);
    expect(store.isPersisted).toBe(false);
  });

  it("keeps the working copy on screen during a re-sync and reports its failure to the caller", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    respondWith({ [DOC_A]: () => Promise.reject(new Error("boom")) });

    await expect(store.fetchGraph("DocA", { force: true })).rejects.toThrow("boom");

    expect(store.status).toBe("ready");
    expect(store.getGraph?.metadata.documentName).toBe("Doc A");
  });

  it("keeps the working copy on screen when a re-sync comes back blank", async () => {
    respondWith({ [DOC_A]: () => Promise.resolve(detail("DocA", "Doc A")) });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("DocA");
    respondWith({ [DOC_A]: () => Promise.resolve({ data: "" }) });

    await expect(store.fetchGraph("DocA", { force: true })).rejects.toThrow("was not found");

    expect(store.status).toBe("ready");
    expect(store.getGraph?.metadata.documentName).toBe("Doc A");
  });

  it("hands the store to the saved id after a first save, so the in-place route change reloads nothing", async () => {
    respondWith({
      "moqui/dataDocuments": () => Promise.resolve({ data: { dataDocumentId: "NewDoc", documentName: "New Doc", primaryEntityName: "Party" } }),
      "moqui/dataDocuments/NewDoc": () => Promise.resolve(detail("NewDoc", "New Doc"))
    });
    const store = useDataDocumentGraphStore();
    const page = Symbol("page");
    store.startNewGraph(page);
    store.updateMetadata({ primaryEntityName: "Party" });
    store.updateMetadata({ documentName: "New Doc" });
    const statuses: string[] = [];
    store.$subscribe(() => statuses.push(store.status));

    await store.saveGraph();

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      url: "moqui/dataDocuments",
      method: "POST",
      data: expect.objectContaining({ dataDocumentId: "NewDoc" })
    }));
    expect(store.owner).toBe("NewDoc");
    expect(store.status).toBe("ready");
    // The page never dropped to loading while it saved.
    expect(statuses).not.toContain("loading");
    vi.mocked(api).mockClear();
    await store.fetchGraph("NewDoc", { claimant: page });
    // The document is not fetched again; only its exports and scheduled exports start.
    expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ url: "moqui/dataDocuments/NewDoc" }));
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: "admin/systemMessages" }));
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ url: "admin/serviceJobs" }));
    // The page that created the document still holds the store, so leaving it leaves nothing behind.
    store.release(page);
    expect(store.getGraph).toBeUndefined();
  });
});
