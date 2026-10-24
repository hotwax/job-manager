import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { projectDataDocumentGraph, serializeGraphFields } from "@/utils/dataDocumentGraph";

vi.mock("@common", () => ({ api: vi.fn(), commonUtil: {}, translate: (key: string) => key }));
vi.mock("@/logger", () => ({ default: { error: vi.fn() } }));
const document = { dataDocumentId: "ReorderTest", primaryEntityName: "Facility" };
const fields = [
  { fieldSeqId: "A", fieldPath: "facilityId", sequenceNum: 1 },
  { fieldSeqId: "B", fieldPath: "facilityName", sequenceNum: "2" },
  { fieldSeqId: "C", fieldPath: "Parent:facilityId", sequenceNum: 3 },
  { fieldSeqId: "D", fieldPath: "description", sequenceNum: 7 }
];
const makeStore = () => {
  const store = useDataDocumentGraphStore();
  store.graph = projectDataDocumentGraph({ document, fields });

  return store;
};
const sequences = (store: ReturnType<typeof makeStore>) => serializeGraphFields(store.graph!).map(f => [f.fieldSeqId, f.sequenceNum]);

describe("explicit field reordering", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("preserves persisted numeric and string sequences when projecting and serializing", () => {
    const before = JSON.stringify(fields);
    expect(sequences(makeStore())).toEqual([["A", 1], ["B", "2"], ["C", 3], ["D", 7]]);
    expect(JSON.stringify(fields)).toBe(before);
  });

  it("does not renumber on alias edits, metadata edits, removal or addition", () => {
    const store = makeStore();
    store.updateField("A", "facilityId", { fieldNameAlias: "id" });
    store.updateMetadata({ documentName: "Renamed" });
    store.removeField("B");
    store.addFieldPath("facilityTypeEnumId");
    expect(sequences(store).filter(([id]) => id)).toEqual([["A", 1], ["C", 3], ["D", 7]]);
  });

  it("reuses the group's sequence slots and leaves interleaved entity fields untouched", () => {
    const store = makeStore();
    store.reorderFields(3, 0);
    expect(sequences(store)).toEqual([["D", 1], ["A", "2"], ["C", 3], ["B", 7]]);
    store.reorderFields(0, 3);
    expect(sequences(store)).toEqual([["A", 1], ["B", "2"], ["C", 3], ["D", 7]]);
  });

  it("does not dirty or renumber on a same-position, invalid or cross-group drop", () => {
    const store = makeStore();
    const before = JSON.stringify(store.graph);
    for(const [from,to] of [[0,0],[-1,0],[0,99],[0,1.5],[NaN,0],[0,2]]) {store.reorderFields(from,to);}
    expect(JSON.stringify(store.graph)).toBe(before);
  });

  it("keeps missing and duplicate sequences unchanged until a real reorder", () => {
    const store = useDataDocumentGraphStore();
    store.graph = projectDataDocumentGraph({ document, fields: [
      { fieldSeqId: "A", fieldPath: "facilityId", sequenceNum: 1 },
      { fieldSeqId: "B", fieldPath: "facilityName", sequenceNum: 1 },
      { fieldSeqId: "C", fieldPath: "description" },
      { fieldSeqId: "D", fieldPath: "Parent:facilityId", sequenceNum: 10 }
    ] });
    expect(new Map(sequences(store))).toEqual(new Map([["C", undefined],["A",1],["B",1],["D",10]]));
    store.reorderFields(0,2);
    const saved = new Map(sequences(store));
    expect(saved.get("D")).toBe(10);
    expect(new Set([...saved.values()]).size).toBe(4);
    expect(store.graph!.fields.filter(f=>f.nodeId==="node:root").map(f=>f.fieldSeqId)).toEqual(["A","B","C"]);
  });

  it("keeps unsaved field identities stable across reordering and subsequent edits", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    const a=store.addFieldPath("facilityId")!;
    const b=store.addFieldPath("facilityName")!;
    store.reorderFields(1,0);
    store.updateField(a.fieldSeqId,a.fieldPath,{ fieldNameAlias:"stableId" });
    expect(store.graph!.fields.map(f=>[f.fieldPath,f.fieldNameAlias])).toEqual([["facilityName","facilityName"],["facilityId","stableId"]]);
    expect(store.graph!.fields.map(f=>f.localId)).toEqual([b.localId,a.localId]);
    expect(serializeGraphFields(store.graph!).every(f=>!f.fieldSeqId)).toBe(true);
  });
});
