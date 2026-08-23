import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.mock("@common", async () => {
  const { commonApiMock, createCommonMock } = await import("@/test/commonMock");
  return createCommonMock({ api: commonApiMock });
});

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";
import { useUtilStore } from "@/store/util";
import { commonApiMock } from "@/test/commonMock";
import { projectDataDocumentGraph, serializeDataDocumentGraph } from "@/utils/dataDocumentGraph";

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("data document graph store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    commonApiMock.mockReset();
    commonApiMock.mockResolvedValue({ data: {} });
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
      fieldNameAlias: "risklevelenumid"
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
      fieldNameAlias: "orderstatus"
    }));
  });

  it("updates an auto-derived canonical alias when the selected field changes", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    const field = store.addFieldPath("statusId");
    store.updateField(field?.fieldSeqId, field?.fieldPath || "", { fieldPath: "riskLevelEnumId" });

    expect(store.getGraph?.fields[0]).toEqual(expect.objectContaining({
      fieldPath: "riskLevelEnumId",
      fieldNameAlias: "risklevelenumid"
    }));
  });

  it("keeps both condition field links stable through a rename collision and recovery", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "StableConditionLinks", primaryEntityName: "OrderHeader" });
    const leftField = store.addFieldPath("orderId", "leftAlias")!;
    const rightField = store.addFieldPath("externalId", "rightAlias")!;
    store.addCondition({
      fieldNameAlias: "leftAlias",
      operator: "equals",
      toFieldNameAlias: "rightAlias"
    });

    store.updateField(leftField.localId, leftField.fieldPath || "", { fieldNameAlias: "renamedLeft" });
    store.updateField(rightField.localId, rightField.fieldPath || "", { fieldNameAlias: "renamedLeft" });
    expect(store.getGraph?.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "duplicate_output_name" })
    ]));

    store.updateField(rightField.localId, rightField.fieldPath || "", { fieldNameAlias: "renamedRight" });

    expect(store.getGraph?.conditions[0]).toEqual(expect.objectContaining({
      fieldNameAlias: "renamedleft",
      toFieldNameAlias: "renamedright"
    }));
    expect(store.getGraph?.validationIssues).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "missing_condition_field_alias" }),
      expect.objectContaining({ code: "missing_condition_to_field_alias" })
    ]));
  });

  it("relinks both condition sides when a store caller selects fields by alias", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "ConditionSelection", primaryEntityName: "OrderHeader" });
    const first = store.addFieldPath("orderId", "first")!;
    const second = store.addFieldPath("externalId", "second")!;
    store.addCondition({ fieldNameAlias: "first", operator: "equals", toFieldNameAlias: "second" });
    const conditionId = store.getGraph?.conditions[0].localId;

    store.updateCondition(conditionId, { fieldNameAlias: "second", toFieldNameAlias: "first" });

    expect(store.getGraph?.conditions[0]).toEqual(expect.objectContaining({
      fieldNameAlias: "second",
      targetId: second.localId,
      toFieldNameAlias: "first",
      toTargetId: first.localId
    }));
  });

  it("preserves the graph store definition id contract", () => {
    expect(useDataDocumentGraphStore.$id).toBe("dataDocumentGraph");
  });

  it("migrates restored raw aliases before blocking their post-canonical collision", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "RestoredCollision", documentName: "Restored Collision", primaryEntityName: "Product" });
    const restoredGraph: any = {
      ...store.getGraph,
      fields: [
        {
          dataDocumentId: "RestoredCollision",
          fieldSeqId: "10",
          nodeId: "node:root",
          fieldPath: "orderId",
          fieldName: "orderId",
          outputName: "Order ID",
          fieldNameAlias: "Order ID",
          isManualPath: false,
          sourceRecord: { dataDocumentId: "RestoredCollision", fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "Order ID" }
        },
        {
          dataDocumentId: "RestoredCollision",
          fieldSeqId: "20",
          nodeId: "node:root",
          fieldPath: "externalOrderId",
          fieldName: "externalOrderId",
          outputName: "order-id",
          fieldNameAlias: "order-id",
          isManualPath: false,
          sourceRecord: { dataDocumentId: "RestoredCollision", fieldSeqId: "20", fieldPath: "externalOrderId", fieldNameAlias: "order-id" }
        }
      ],
      conditions: [{
        dataDocumentId: "RestoredCollision",
        conditionSeqId: "01",
        targetKind: "field",
        targetId: "10",
        fieldNameAlias: "Order ID",
        operator: "equals",
        sourceRecord: { dataDocumentId: "RestoredCollision", conditionSeqId: "01", fieldNameAlias: "Order ID", operator: "equals" }
      }],
      validationIssues: []
    };
    delete restoredGraph.aliasesCanonical;
    store.graph = restoredGraph;

    await expect(store.saveGraph()).rejects.toThrow('Output field name "orderId" is used by more than one field.');
    expect(commonApiMock).not.toHaveBeenCalled();
  });

  it("does not transform an already canonical alias during graph updates", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    const field = store.addFieldPath("orderId", "Order ID");
    store.updateField(field?.fieldSeqId, field?.fieldPath || "", { sortable: "Y" });

    expect(store.getGraph?.fields[0]).toEqual(expect.objectContaining({ fieldNameAlias: "orderId", outputName: "orderId" }));
  });

  it("keeps external unsupported aliases blocked through unrelated graph updates", async () => {
    const store = useDataDocumentGraphStore();
    store.graph = projectDataDocumentGraph({
      document: { dataDocumentId: "UnsupportedAliases", documentName: "Unsupported aliases", primaryEntityName: "Product" },
      fields: [
        { fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "order-ß" },
        { fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusId" }
      ],
      conditions: [
        { conditionSeqId: "01", fieldNameAlias: "condition-ß", operator: "equals", fieldValue: "OPEN" },
        { conditionSeqId: "02", fieldNameAlias: "statusId", toFieldNameAlias: "to-ß", operator: "equals", fieldValue: "OPEN" }
      ]
    });

    store.updateMetadata({ documentTitle: "Updated title" });
    store.updateField("10", "orderId", { sortable: "Y" });
    store.updateCondition("01", { fieldValue: "CLOSED" });
    store.updateCondition("02", { fieldValue: "CLOSED" });

    expect(store.getGraph?.aliasValidationIssues).toHaveLength(3);
    await expect(store.saveGraph()).rejects.toThrow("Data document aliases support ASCII characters only.");
    expect(commonApiMock).not.toHaveBeenCalled();
  });

  it("keeps restored unsaved field alias provenance attached to its stable local identity", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments") return Promise.resolve({ data: { dataDocumentId: "StableFieldAlias" } });
      if (url === "admin/dataDocuments/StableFieldAlias/fields") return Promise.resolve({ data: {} });
      if (url === "moqui/dataDocuments/StableFieldAlias") {
        return Promise.resolve({
          data: {
            dataDocumentId: "StableFieldAlias",
            documentName: "Stable Field Alias",
            primaryEntityName: "Product",
            fields: [{ fieldSeqId: "10", fieldPath: "badId", fieldNameAlias: "safeAlias" }]
          }
        });
      }
      if (url === "admin/systemMessages") return Promise.resolve({ data: { systemMessages: [] } });
      return Promise.resolve({ data: {} });
    });

    const store = useDataDocumentGraphStore();
    const restoredGraph: any = projectDataDocumentGraph({
      document: { dataDocumentId: "StableFieldAlias", documentName: "Stable Field Alias", primaryEntityName: "Product" },
      fields: [
        { fieldSeqId: "", fieldPath: "firstId", fieldNameAlias: "firstId" },
        { fieldSeqId: "", fieldPath: "badId", fieldNameAlias: "bad-ß" },
        { fieldSeqId: "", fieldPath: "lastId", fieldNameAlias: "lastId" }
      ]
    });
    // This is a persisted graph from before field local identities existed.
    restoredGraph.fields.forEach((field: any) => delete field.localId);
    store.graph = restoredGraph;

    store.removeField(store.getGraph?.fields[0].fieldSeqId || "");
    const unrelatedField = store.getGraph?.fields.find((field) => field.fieldPath === "lastId");

    store.updateField(unrelatedField?.fieldSeqId, unrelatedField?.fieldPath || "", { sortable: "Y" });
    await expect(store.saveGraph()).rejects.toThrow("Data document aliases support ASCII characters only.");
    expect(commonApiMock).not.toHaveBeenCalled();

    store.removeField(store.getGraph?.fields.find((field) => field.fieldPath === "lastId")?.fieldSeqId || "");
    await expect(store.saveGraph()).rejects.toThrow("Data document aliases support ASCII characters only.");
    expect(commonApiMock).not.toHaveBeenCalled();

    const invalidField = store.getGraph?.fields.find((field) => field.fieldPath === "badId");
    store.updateField(invalidField?.fieldSeqId, invalidField?.fieldPath || "", { fieldNameAlias: "safe alias" });
    expect(store.getGraph?.aliasValidationIssues).toEqual([]);

    await expect(store.saveGraph()).resolves.toBe("StableFieldAlias");
    const fieldSave = commonApiMock.mock.calls
      .map(([request]) => request)
      .find((request) => request.url === "admin/dataDocuments/StableFieldAlias/fields");
    expect(fieldSave.data).toEqual(expect.objectContaining({ fieldNameAlias: "safeAlias" }));
    expect(fieldSave.data).not.toHaveProperty("localId");
  });

  it("clears each replaced invalid alias and saves normally", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments") return Promise.resolve({ data: { dataDocumentId: "RepairedAlias" } });
      if (url === "admin/dataDocuments/RepairedAlias/fields") return Promise.resolve({ data: {} });
      if (url === "admin/dataDocuments/RepairedAlias/fields/10") return Promise.resolve({ data: {} });
      if (url.startsWith("admin/dataDocuments/RepairedAlias/conditions/")) return Promise.resolve({ data: {} });
      if (url === "moqui/dataDocuments/RepairedAlias") {
        return Promise.resolve({
          data: {
            dataDocumentId: "RepairedAlias",
            documentName: "Repaired Alias",
            primaryEntityName: "Product",
            fields: [
              { fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "safeAlias" },
              { fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusId" },
              { fieldSeqId: "30", fieldPath: "otherId", fieldNameAlias: "otherAlias" }
            ],
            conditions: [
              { conditionSeqId: "01", fieldNameAlias: "statusId", operator: "equals", fieldValue: "OPEN" },
              { conditionSeqId: "02", fieldNameAlias: "statusId", toFieldNameAlias: "otherAlias", operator: "equals" }
            ]
          }
        });
      }
      if (url === "admin/systemMessages") return Promise.resolve({ data: { systemMessages: [] } });
      return Promise.resolve({ data: {} });
    });

    const store = useDataDocumentGraphStore();
    store.graph = projectDataDocumentGraph({
      document: { dataDocumentId: "RepairedAlias", documentName: "Repaired Alias", primaryEntityName: "Product" },
      fields: [
        { fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "order-ß" },
        { fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusId" },
        { fieldSeqId: "30", fieldPath: "otherId", fieldNameAlias: "otherAlias" }
      ],
      conditions: [
        { conditionSeqId: "01", fieldNameAlias: "condition-ß", operator: "equals", fieldValue: "OPEN" },
        { conditionSeqId: "02", fieldNameAlias: "statusId", toFieldNameAlias: "to-ß", operator: "equals" }
      ]
    });

    store.updateField("10", "orderId", { fieldNameAlias: "safe alias" });
    store.updateCondition("01", { fieldNameAlias: "statusId" });
    store.updateCondition("02", { toFieldNameAlias: "otheralias" });

    await expect(store.saveGraph()).resolves.toBe("RepairedAlias");
    expect(store.getGraph?.aliasValidationIssues).toEqual([]);
    expect(commonApiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "admin/dataDocuments/RepairedAlias/fields/10",
      data: expect.objectContaining({ fieldNameAlias: "safeAlias" })
    }));
    expect(commonApiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "admin/dataDocuments/RepairedAlias/conditions/02",
      data: expect.objectContaining({ toFieldNameAlias: "otheralias" })
    }));
  });

  it("uses canonical aliases while updating field and condition selections", () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    const field = store.addFieldPath("orderId", "Order ID");
    store.addCondition({ fieldNameAlias: "ORDER-ID", operator: "equals", fieldValue: "100" });
    store.updateField(field?.fieldSeqId, field?.fieldPath || "", { fieldNameAlias: "Order-ID" });

    expect(store.getGraph?.fields[0]).toEqual(expect.objectContaining({ fieldNameAlias: "orderId", outputName: "orderId" }));
    expect(store.getGraph?.conditions[0]).toEqual(expect.objectContaining({ fieldNameAlias: "orderId", targetKind: "field" }));
  });

  it("rejects post-canonical alias collisions before any API write", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "CollisionDocument", documentName: "Collision Document", primaryEntityName: "Product" });
    store.addFieldPath("orderId", "Order ID");
    store.addFieldPath("externalOrderId", "order-id");

    await expect(store.saveGraph()).rejects.toThrow('Output field name "orderId" is used by more than one field.');
    expect(commonApiMock).not.toHaveBeenCalled();
  });

  it("rejects the live-QA overlong derived ID before any document POST", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ documentName: "POS Sales Order Items Without Issuance QA 20260824" });
    store.updateMetadata({ primaryEntityName: "Product" });

    expect(store.getGraph?.dataDocumentId).toBe("POSSalesOrderItemsWithoutIssuanceQA20260824");
    await expect(store.saveGraph()).rejects.toThrow(
      "Data document ID must be 40 characters or fewer (currently 43). Shorten the Name or edit the ID in Advanced Metadata."
    );
    expect(store.isSaving).toBe(false);
    expect(commonApiMock).not.toHaveBeenCalled();
  });

  it("rejects every graph error before transport while allowing warnings", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();

    await expect(store.saveGraph()).rejects.toThrow("Data document ID is required. Primary entity is required.");
    expect(store.isSaving).toBe(false);
    expect(commonApiMock).not.toHaveBeenCalled();

    store.updateMetadata({
      dataDocumentId: "WarningDocument",
      documentName: "Warning document",
      primaryEntityName: "Product"
    });
    store.graph = projectDataDocumentGraph({
      document: store.getGraph!.metadata,
      fields: [{ fieldPath: "unverifiedRelationship:orderId", fieldNameAlias: "orderId" }],
      relationshipMetadata: {
        unverifiedRelationship: { relationshipName: "unverifiedRelationship", verified: false, attempted: true }
      }
    });
    expect(store.getGraph?.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unverified_relationship_path", severity: "warning" })
    ]));

    await expect(store.saveGraph()).resolves.toBe("WarningDocument");
    expect(commonApiMock).toHaveBeenCalled();
  });

  it("shares one save through the post-save refetch and clears it after success", async () => {
    const parentSave = deferred<{ data: { dataDocumentId: string } }>();
    const postSaveFetch = deferred<{ data: Record<string, unknown> }>();
    commonApiMock.mockImplementation(({ url, method }: { url: string; method: string }) => {
      if (url === "moqui/dataDocuments" && method === "POST") return parentSave.promise;
      if (url === "moqui/dataDocuments/SingleFlight" && method === "GET") return postSaveFetch.promise;
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "SingleFlight",
      documentName: "Single flight",
      primaryEntityName: "Product"
    });

    const firstSave = store.saveGraph();
    const concurrentSave = store.saveGraph();
    expect(concurrentSave).toBe(firstSave);
    expect(store.isSaving).toBe(true);
    expect(commonApiMock).toHaveBeenCalledTimes(1);

    parentSave.resolve({ data: { dataDocumentId: "SingleFlight" } });
    await vi.waitFor(() => expect(commonApiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "moqui/dataDocuments/SingleFlight",
      method: "GET"
    })));
    const saveDuringRefetch = store.saveGraph();
    expect(saveDuringRefetch).toBe(firstSave);
    expect(store.isSaving).toBe(true);

    postSaveFetch.resolve({
      data: {
        dataDocumentId: "SingleFlight",
        documentName: "Single flight",
        primaryEntityName: "Product",
        fields: [],
        conditions: []
      }
    });
    await expect(firstSave).resolves.toBe("SingleFlight");
    await expect(concurrentSave).resolves.toBe("SingleFlight");
    await expect(saveDuringRefetch).resolves.toBe("SingleFlight");
    expect(store.isSaving).toBe(false);

    const nextSave = store.saveGraph();
    expect(nextSave).not.toBe(firstSave);
    await expect(nextSave).resolves.toBe("SingleFlight");
  });

  it("shares a failed save, resets state, and permits one retry", async () => {
    const failedTransport = deferred<{ data: Record<string, unknown> }>();
    commonApiMock.mockImplementationOnce(() => failedTransport.promise);
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "RetryDocument",
      documentName: "Retry document",
      primaryEntityName: "Product"
    });

    const firstSave = store.saveGraph();
    const concurrentSave = store.saveGraph();
    expect(concurrentSave).toBe(firstSave);
    failedTransport.reject(new Error("save failed"));

    await expect(firstSave).rejects.toThrow("save failed");
    await expect(concurrentSave).rejects.toThrow("save failed");
    expect(store.isSaving).toBe(false);
    expect(commonApiMock).toHaveBeenCalledTimes(1);

    commonApiMock.mockResolvedValue({ data: {} });
    const retry = store.saveGraph();
    expect(retry).not.toBe(firstSave);
    await expect(retry).resolves.toBe("RetryDocument");
    expect(store.isSaving).toBe(false);
  });

  it("rejects one failed forced detail refresh and preserves the last valid graph", async () => {
    commonApiMock.mockResolvedValueOnce({
      data: {
        dataDocumentId: "StableGraph",
        documentName: "Stable graph",
        primaryEntityName: "Product",
        fields: [{ fieldSeqId: "10", fieldPath: "productId", fieldNameAlias: "productid" }],
        conditions: []
      }
    });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("StableGraph");
    const validGraph = store.getGraph;
    commonApiMock.mockRejectedValueOnce(new Error("detail refresh failed"));

    await expect(store.fetchGraph("StableGraph", { force: true })).rejects.toThrow("detail refresh failed");

    expect(store.getGraph).toBe(validGraph);
    expect(store.getGraph?.dataDocumentId).toBe("StableGraph");
    expect(commonApiMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty detail response before projection and preserves the last valid graph", async () => {
    commonApiMock
      .mockResolvedValueOnce({
        data: {
          dataDocumentId: "StableGraph",
          documentName: "Stable graph",
          primaryEntityName: "Product",
          fields: [{ fieldSeqId: "10", fieldPath: "productId", fieldNameAlias: "productid" }],
          conditions: []
        }
      })
      .mockResolvedValueOnce({ data: undefined });
    const store = useDataDocumentGraphStore();
    await store.fetchGraph("StableGraph");
    const validGraph = store.getGraph;

    await expect(store.fetchGraph("StableGraph", { force: true })).rejects.toThrow(
      "Invalid data document detail response for StableGraph."
    );

    expect(store.getGraph).toBe(validGraph);
    expect(store.getGraph?.dataDocumentId).toBe("StableGraph");
    expect(commonApiMock).toHaveBeenCalledTimes(2);
  });

  it("does not let a late A graph projection replace a newer B graph", async () => {
    const detailA = deferred<{ data: Record<string, unknown> }>();
    const detailB = deferred<{ data: Record<string, unknown> }>();
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/DocumentA") return detailA.promise;
      if (url === "moqui/dataDocuments/DocumentB") return detailB.promise;
      return Promise.resolve({ data: { entityDefinition: { fields: [], relationships: [] } } });
    });
    const store = useDataDocumentGraphStore();

    const requestA = store.fetchGraph("DocumentA");
    const requestB = store.fetchGraph("DocumentB");
    detailB.resolve({ data: { dataDocumentId: "DocumentB", primaryEntityName: "Product", fields: [], conditions: [] } });
    await requestB;
    detailA.resolve({ data: { dataDocumentId: "DocumentA", primaryEntityName: "Product", fields: [], conditions: [] } });
    await requestA;

    expect(store.getGraph?.dataDocumentId).toBe("DocumentB");
    expect((store as any).loadError).toBeUndefined();
    expect(store.isLoading).toBe(false);
  });

  it("hydrates persisted relationship prefixes through aliases, titles, and auto-reverse definitions", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/HydratedGraph") {
        return Promise.resolve({
          data: {
            dataDocumentId: "HydratedGraph",
            documentName: "Hydrated graph",
            primaryEntityName: "OrderHeader",
            fields: [
              { fieldSeqId: "10", fieldPath: "items:Product relationship#Product:productName", fieldNameAlias: "productName" },
              { fieldSeqId: "20", fieldPath: "Party:partyId", fieldNameAlias: "partyId" },
              { fieldSeqId: "30", fieldPath: "unknownRelationship:externalId", fieldNameAlias: "externalId" },
              { fieldSeqId: "40", fieldPath: "OrderItem:Product:productId", fieldNameAlias: "exactProductId" }
            ],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/OrderHeader/definition") {
        return Promise.resolve({
          data: {
            entityDefinition: {
              fields: [],
              relationships: [
                { relationshipName: "AWrongOrderItem", shortAlias: "OrderItem", relatedEntityName: "WrongOrderItem", type: "one", title: "OrderItem" },
                { relationshipName: "OrderItem", shortAlias: "items", relatedEntityName: "OrderItem", type: "many", title: "Items" },
                { relationshipName: "party.Party", shortAlias: "party", relatedEntityName: "Party", type: "one", title: "Primary party", isAutoReverse: true }
              ]
            }
          }
        });
      }
      if (url === "admin/entities/OrderItem/definition") {
        return Promise.resolve({
          data: {
            entityDefinition: {
              fields: [],
              relationships: [
                { relationshipName: "AWrongProduct", shortAlias: "wrongProduct", relatedEntityName: "WrongProduct", type: "many", title: "Product relationship" },
                { relationshipName: "Product", shortAlias: "product", relatedEntityName: "Product", type: "one", title: "Product relationship" }
              ]
            }
          }
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    const store = useDataDocumentGraphStore();
    await store.fetchGraph("HydratedGraph");

    expect(store.getGraph?.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ pathText: "items", relationshipName: "OrderItem", relationshipType: "many", metadataStatus: "verified" }),
      expect.objectContaining({ pathText: "items:Product relationship#Product", relationshipName: "Product", relationshipTitle: "Product relationship", metadataStatus: "verified" }),
      expect.objectContaining({ pathText: "Party", relationshipName: "party.Party", metadataStatus: "verified", isAutoReverse: true }),
      expect.objectContaining({ pathText: "OrderItem", relationshipName: "OrderItem", metadataStatus: "verified" }),
      expect.objectContaining({ pathText: "OrderItem:Product", relationshipName: "Product", metadataStatus: "verified" })
    ]));
    expect(store.getGraph?.nodes.find((node) => node.pathText === "items:Product relationship#Product")?.entityName).toBe("Product");
    expect(store.getGraph?.nodes.find((node) => node.pathText === "OrderItem:Product")?.entityName).toBe("Product");
    expect(store.getGraph?.validationIssues.filter((issue) => issue.code === "unverified_relationship_path")).toEqual([
      expect.objectContaining({ targetId: "edge:unknownRelationship", severity: "warning" })
    ]);

    store.updateMetadata({ documentTitle: "Still hydrated" });
    expect(store.getGraph?.validationIssues.filter((issue) => issue.code === "unverified_relationship_path")).toHaveLength(1);
    expect(store.getGraph?.edges.find((edge) => edge.pathText === "items:Product relationship#Product")?.metadataStatus).toBe("verified");
  });

  it("does not use unflagged or ambiguous target entities as auto-reverse paths", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/AutoReverseQualification") {
        return Promise.resolve({
          data: {
            dataDocumentId: "AutoReverseQualification",
            primaryEntityName: "OrderHeader",
            fields: [
              { fieldSeqId: "10", fieldPath: "Party:partyId", fieldNameAlias: "partyId" },
              { fieldSeqId: "20", fieldPath: "ContactMech:contactMechId", fieldNameAlias: "contactMechId" },
              { fieldSeqId: "30", fieldPath: "PostalAddress:contactMechId", fieldNameAlias: "postalContactMechId" }
            ],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/OrderHeader/definition") {
        return Promise.resolve({
          data: {
            entityDefinition: {
              fields: [],
              relationships: [
                { relationshipName: "PrimaryParty", relatedEntityName: "Party", type: "one" },
                { relationshipName: "BillingContactMech", relatedEntityName: "ContactMech", type: "one", isAutoReverse: true },
                { relationshipName: "ShippingContactMech", relatedEntityName: "ContactMech", type: "one", autoReverse: "Y" },
                { relationshipName: "PostalContactMech", relatedEntityName: "PostalAddress", type: "one", autoReverse: "Y" }
              ]
            }
          }
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    const store = useDataDocumentGraphStore();
    await store.fetchGraph("AutoReverseQualification");

    expect(store.getGraph?.edges.find((edge) => edge.pathText === "Party")).toEqual(expect.objectContaining({
      metadataStatus: "unverified",
      isAutoReverse: undefined
    }));
    expect(store.getGraph?.edges.find((edge) => edge.pathText === "ContactMech")).toEqual(expect.objectContaining({
      metadataStatus: "unverified",
      isAutoReverse: undefined
    }));
    expect(store.getGraph?.edges.find((edge) => edge.pathText === "PostalAddress")).toEqual(expect.objectContaining({
      relationshipName: "PostalContactMech",
      metadataStatus: "verified",
      isAutoReverse: true
    }));
    expect(store.getGraph?.validationIssues.filter((issue) => issue.code === "unverified_relationship_path")).toHaveLength(2);
  });

  it("marks a relationship without a usable target unresolved and does not attempt deeper prefixes", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/PartialRelationship") {
        return Promise.resolve({
          data: {
            dataDocumentId: "PartialRelationship",
            primaryEntityName: "OrderHeader",
            fields: [
              { fieldSeqId: "10", fieldPath: "items:orderItemId", fieldNameAlias: "orderItemId" },
              { fieldSeqId: "20", fieldPath: "items:product:productId", fieldNameAlias: "productId" }
            ],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/OrderHeader/definition") {
        return Promise.resolve({
          data: {
            entityDefinition: {
              fields: [],
              relationships: [{ relationshipName: "OrderItem", shortAlias: "items", type: "many", title: "Items" }]
            }
          }
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    const store = useDataDocumentGraphStore();
    await store.fetchGraph("PartialRelationship");

    expect(store.getGraph?.edges.find((edge) => edge.pathText === "items")).toEqual(expect.objectContaining({
      relationshipName: "OrderItem",
      relationshipTitle: "Items",
      relationshipType: "many",
      metadataStatus: "unverified"
    }));
    expect(store.getGraph?.nodes.find((node) => node.pathText === "items")?.metadataStatus).toBe("unverified");
    expect(store.getGraph?.edges.find((edge) => edge.pathText === "items:product")?.metadataStatus).toBe("missing");
    expect(store.getGraph?.validationIssues.filter((issue) => issue.code === "unverified_relationship_path")).toEqual([
      expect.objectContaining({ targetId: "edge:items" })
    ]);
  });

  it("projects a valid detail with explicit unverified warnings when relationship metadata transport fails", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/StableHydratedGraph") {
        return Promise.resolve({
          data: {
            dataDocumentId: "StableHydratedGraph",
            primaryEntityName: "Product",
            fields: [{ fieldSeqId: "10", fieldPath: "productId", fieldNameAlias: "productId" }],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/Product/definition") {
        return Promise.resolve({ data: { entityDefinition: { fields: [], relationships: [] } } });
      }
      if (url === "moqui/dataDocuments/FailedHydration") {
        return Promise.resolve({
          data: {
            dataDocumentId: "FailedHydration",
            primaryEntityName: "OrderHeader",
            fields: [{ fieldSeqId: "10", fieldPath: "items:orderItemId", fieldNameAlias: "orderItemId" }],
            conditions: []
          }
        });
      }
      if (url === "admin/entities/OrderHeader/definition") {
        return Promise.reject(new Error("definition unavailable"));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    const store = useDataDocumentGraphStore();
    const utilStore = useUtilStore();
    await utilStore.fetchEntityDefinition("Product");
    await store.fetchGraph("StableHydratedGraph");
    const stableDefinition = utilStore.getEntityDefinition("Product");

    await expect(store.fetchGraph("FailedHydration", { force: true })).resolves.toEqual(expect.objectContaining({
      dataDocumentId: "FailedHydration"
    }));

    expect(store.getGraph?.dataDocumentId).toBe("FailedHydration");
    expect(store.getGraph?.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "unverified_relationship_path",
        severity: "warning",
        targetId: "edge:items"
      })
    ]));
    expect(store.getLoadError).toBeUndefined();
    expect(utilStore.getEntityDefinition("Product")).toBe(stableDefinition);
  });

  it("does not recover after persistence completes and the final detail refetch fails", async () => {
    let detailFetchCount = 0;
    commonApiMock.mockImplementation(({ url, method }: { url: string; method: string }) => {
      if (url === "moqui/dataDocuments" && method === "POST") {
        return Promise.resolve({ data: { dataDocumentId: "FinalRefetchFailure" } });
      }
      if (url === "moqui/dataDocuments/FinalRefetchFailure" && method === "GET") {
        detailFetchCount += 1;
        if (detailFetchCount === 1) return Promise.reject(new Error("post-save detail unavailable"));
        return Promise.resolve({
          data: {
            dataDocumentId: "FinalRefetchFailure",
            documentName: "Final refetch failure",
            primaryEntityName: "Product",
            fields: [],
            conditions: []
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "FinalRefetchFailure",
      documentName: "Final refetch failure",
      primaryEntityName: "Product"
    });

    await expect(store.saveGraph()).rejects.toThrow("post-save detail unavailable");

    expect(detailFetchCount).toBe(1);
    expect(store.isSaving).toBe(false);
  });

  it("saves and refetches a document with zero history without requesting export history", async () => {
    commonApiMock.mockImplementation(({ url, method }: { url: string; method: string }) => {
      if (url === "moqui/dataDocuments" && method === "POST") {
        return Promise.resolve({ data: { dataDocumentId: "ZeroHistory" } });
      }
      if (url === "moqui/dataDocuments/ZeroHistory" && method === "GET") {
        return Promise.resolve({
          data: {
            dataDocumentId: "ZeroHistory",
            documentName: "Zero history",
            primaryEntityName: "Product",
            fields: [],
            conditions: []
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "ZeroHistory", documentName: "Zero history", primaryEntityName: "Product" });

    await store.saveGraph();

    expect(commonApiMock.mock.calls.map(([request]) => request.url)).not.toContain("admin/systemMessages");
  });

  it("retries a partial child failure without posting an acknowledged field twice when recovery fails", async () => {
    let fieldPostCount = 0;
    let detailFetchCount = 0;
    commonApiMock.mockImplementation(({ url, method, data }: { url: string; method: string; data?: Record<string, any> }) => {
      if (url === "moqui/dataDocuments" && method === "POST") {
        return Promise.resolve({ data: { dataDocumentId: "PartialRetry" } });
      }
      if (url === "moqui/dataDocuments/PartialRetry" && method === "PUT") {
        return Promise.resolve({ data: { dataDocumentId: "PartialRetry" } });
      }
      if (url === "admin/dataDocuments/PartialRetry/fields" && method === "POST") {
        fieldPostCount += 1;
        if (data?.fieldNameAlias === "orderid") {
          return Promise.resolve({ data: { ...data, fieldSeqId: "10" } });
        }
        if (fieldPostCount === 2) return Promise.reject(new Error("second child failed"));
        return Promise.resolve({ data: { ...data, fieldSeqId: "20" } });
      }
      if (url === "admin/dataDocuments/PartialRetry/fields/10" && method === "PUT") {
        return Promise.resolve({ data: { ...data, fieldSeqId: "10" } });
      }
      if (url === "moqui/dataDocuments/PartialRetry" && method === "GET") {
        detailFetchCount += 1;
        if (detailFetchCount === 1) return Promise.reject(new Error("recovery failed"));
        return Promise.resolve({
          data: {
            dataDocumentId: "PartialRetry",
            documentName: "Partial retry",
            primaryEntityName: "Product",
            fields: [
              { fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "orderid" },
              { fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusid" }
            ],
            conditions: []
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "PartialRetry",
      documentName: "Partial retry",
      primaryEntityName: "Product"
    });
    const acknowledgedField = store.addFieldPath("orderId", "orderId");
    const pendingField = store.addFieldPath("statusId", "statusId");

    await expect(store.saveGraph()).rejects.toThrow("second child failed");
    expect(detailFetchCount).toBe(1);
    expect(store.getGraph?.fields.find((field) => field.localId === acknowledgedField?.localId)?.sourceRecord?.fieldSeqId).toBe("10");
    expect(store.getGraph?.fields.find((field) => field.localId === pendingField?.localId)).toEqual(expect.objectContaining({
      fieldNameAlias: "statusid"
    }));

    await expect(store.saveGraph()).resolves.toBe("PartialRetry");
    const orderFieldWrites = commonApiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.data?.fieldNameAlias === "orderid");
    expect(orderFieldWrites.filter((request) => request.method === "POST")).toHaveLength(1);
    expect(orderFieldWrites.filter((request) => request.method === "PUT")).toHaveLength(1);
    expect(fieldPostCount).toBe(3);
  });

  it("keeps children that were not reached when recovery refetch succeeds", async () => {
    let fieldPostCount = 0;
    let detailFetchCount = 0;
    commonApiMock.mockImplementation(({ url, method, data }: { url: string; method: string; data?: Record<string, any> }) => {
      if (url === "moqui/dataDocuments" && method === "POST") {
        return Promise.resolve({ data: { dataDocumentId: "RecoveryMerge" } });
      }
      if (url === "moqui/dataDocuments/RecoveryMerge" && method === "PUT") {
        return Promise.resolve({ data: { dataDocumentId: "RecoveryMerge" } });
      }
      if (url === "admin/dataDocuments/RecoveryMerge/fields" && method === "POST") {
        fieldPostCount += 1;
        if (data?.fieldNameAlias === "orderid") {
          return Promise.resolve({ data: { ...data, fieldSeqId: "10" } });
        }
        if (fieldPostCount === 2) return Promise.reject(new Error("second child failed"));
        return Promise.resolve({ data: { ...data, fieldSeqId: "20" } });
      }
      if (url === "admin/dataDocuments/RecoveryMerge/fields/10" && method === "PUT") {
        return Promise.resolve({ data: { ...data, fieldSeqId: "10" } });
      }
      if (url === "moqui/dataDocuments/RecoveryMerge" && method === "GET") {
        detailFetchCount += 1;
        return Promise.resolve({
          data: {
            dataDocumentId: "RecoveryMerge",
            documentName: "Recovery merge",
            primaryEntityName: "Product",
            fields: detailFetchCount === 1
              ? [{ fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "orderid" }]
              : [
                { fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "orderid" },
                { fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusid" }
              ],
            conditions: []
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "RecoveryMerge",
      documentName: "Recovery merge",
      primaryEntityName: "Product"
    });
    store.addFieldPath("orderId", "orderId");
    const pendingField = store.addFieldPath("statusId", "statusId");

    await expect(store.saveGraph()).rejects.toThrow("second child failed");
    expect(store.getGraph?.fields.find((field) => field.localId === pendingField?.localId)).toEqual(expect.objectContaining({
      fieldNameAlias: "statusid"
    }));

    await expect(store.saveGraph()).resolves.toBe("RecoveryMerge");
    const orderFieldPosts = commonApiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url === "admin/dataDocuments/RecoveryMerge/fields"
        && request.method === "POST"
        && request.data?.fieldNameAlias === "orderid");
    expect(orderFieldPosts).toHaveLength(1);
  });

  it("retries a partial condition failure without posting an acknowledged condition twice", async () => {
    let conditionPostCount = 0;
    let detailFetchCount = 0;
    commonApiMock.mockImplementation(({ url, method, data }: { url: string; method: string; data?: Record<string, any> }) => {
      if (url === "moqui/dataDocuments" && method === "POST") {
        return Promise.resolve({ data: { dataDocumentId: "ConditionRetry" } });
      }
      if (url === "moqui/dataDocuments/ConditionRetry" && method === "PUT") {
        return Promise.resolve({ data: { dataDocumentId: "ConditionRetry" } });
      }
      if (url === "admin/dataDocuments/ConditionRetry/fields" && method === "POST") {
        const fieldSeqId = data?.fieldNameAlias === "orderid" ? "10" : "20";
        return Promise.resolve({ data: { ...data, fieldSeqId } });
      }
      if (url.startsWith("admin/dataDocuments/ConditionRetry/fields/") && method === "PUT") {
        return Promise.resolve({ data });
      }
      if (url === "admin/dataDocuments/ConditionRetry/conditions" && method === "POST") {
        conditionPostCount += 1;
        if (data?.fieldNameAlias === "orderid") {
          return Promise.resolve({ data: { ...data, conditionSeqId: "01" } });
        }
        if (conditionPostCount === 2) return Promise.reject(new Error("second condition failed"));
        return Promise.resolve({ data: { ...data, conditionSeqId: "02" } });
      }
      if (url === "admin/dataDocuments/ConditionRetry/conditions/01" && method === "PUT") {
        return Promise.resolve({ data: { ...data, conditionSeqId: "01" } });
      }
      if (url === "moqui/dataDocuments/ConditionRetry" && method === "GET") {
        detailFetchCount += 1;
        if (detailFetchCount === 1) return Promise.reject(new Error("recovery failed"));
        return Promise.resolve({
          data: {
            dataDocumentId: "ConditionRetry",
            documentName: "Condition retry",
            primaryEntityName: "Product",
            fields: [
              { fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "orderid" },
              { fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusid" }
            ],
            conditions: [
              { conditionSeqId: "01", fieldNameAlias: "orderid", operator: "equals", fieldValue: "100" },
              { conditionSeqId: "02", fieldNameAlias: "statusid", operator: "equals", fieldValue: "OPEN" }
            ]
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "ConditionRetry",
      documentName: "Condition retry",
      primaryEntityName: "Product"
    });
    store.addFieldPath("orderId", "orderId");
    store.addFieldPath("statusId", "statusId");
    store.addCondition({ fieldNameAlias: "orderId", operator: "equals", fieldValue: "100" });
    store.addCondition({ fieldNameAlias: "statusId", operator: "equals", fieldValue: "OPEN" });
    const acknowledgedCondition = store.getGraph?.conditions[0];
    const pendingCondition = store.getGraph?.conditions[1];

    await expect(store.saveGraph()).rejects.toThrow("second condition failed");
    expect(store.getGraph?.conditions.find((condition) => condition.localId === acknowledgedCondition?.localId)?.conditionSeqId).toBe("01");
    expect(store.getGraph?.conditions.find((condition) => condition.localId === pendingCondition?.localId)).toEqual(expect.objectContaining({
      fieldNameAlias: "statusid"
    }));

    await expect(store.saveGraph()).resolves.toBe("ConditionRetry");
    const orderConditionWrites = commonApiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.data?.fieldNameAlias === "orderid" && request.url.includes("/conditions"));
    expect(orderConditionWrites.filter((request) => request.method === "POST")).toHaveLength(1);
    expect(orderConditionWrites.filter((request) => request.method === "PUT")).toHaveLength(1);
    expect(conditionPostCount).toBe(3);
  });

  it.each([
    { recordKind: "field", failurePoint: "preceding child", expectedDeleteAttempts: 1 },
    { recordKind: "field", failurePoint: "delete", expectedDeleteAttempts: 2 },
    { recordKind: "condition", failurePoint: "preceding child", expectedDeleteAttempts: 1 },
    { recordKind: "condition", failurePoint: "delete", expectedDeleteAttempts: 2 }
  ])("preserves pending $recordKind deletion through a $failurePoint failure and retries it once", async ({
    recordKind,
    failurePoint,
    expectedDeleteAttempts
  }) => {
    setActivePinia(createPinia());
    commonApiMock.mockReset();
    const dataDocumentId = `DeleteRecovery${recordKind}${failurePoint.replace(/\s/g, "")}`;
    let deleteAttempts = 0;
    let childAttempts = 0;
    let deletionAcknowledged = false;
    let newChildAcknowledged = false;
    const serverDocument = () => ({
      dataDocumentId,
      documentName: dataDocumentId,
      primaryEntityName: "OrderHeader",
      fields: [
        ...(recordKind === "field" && !deletionAcknowledged
          ? [{ fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "orderid" }]
          : []),
        ...(recordKind === "condition" || newChildAcknowledged
          ? [{ fieldSeqId: recordKind === "condition" ? "10" : "20", fieldPath: "statusId", fieldNameAlias: "statusid" }]
          : [])
      ],
      conditions: [
        ...(recordKind === "condition" && !deletionAcknowledged
          ? [{ conditionSeqId: "01", fieldNameAlias: "statusid", operator: "equals", fieldValue: "OPEN" }]
          : []),
        ...(recordKind === "condition" && newChildAcknowledged
          ? [{ conditionSeqId: "02", fieldNameAlias: "statusid", operator: "equals", fieldValue: "CLOSED" }]
          : [])
      ]
    });
    commonApiMock.mockImplementation(({ url, method, data }: { url: string; method: string; data?: Record<string, any> }) => {
      if (url === `moqui/dataDocuments/${dataDocumentId}` && method === "GET") {
        return Promise.resolve({ data: serverDocument() });
      }
      if (url === `moqui/dataDocuments/${dataDocumentId}` && method === "PUT") {
        return Promise.resolve({ data: { dataDocumentId } });
      }
      if (url.includes(`/fields/`) && method === "PUT") return Promise.resolve({ data });
      if (url.endsWith("/fields") && method === "POST") {
        childAttempts += 1;
        if (failurePoint === "preceding child" && childAttempts === 1) return Promise.reject(new Error("field child failed"));
        newChildAcknowledged = true;
        return Promise.resolve({ data: { ...data, fieldSeqId: "20" } });
      }
      if (url.endsWith("/conditions") && method === "POST") {
        childAttempts += 1;
        if (failurePoint === "preceding child" && childAttempts === 1) return Promise.reject(new Error("condition child failed"));
        newChildAcknowledged = true;
        return Promise.resolve({ data: { ...data, conditionSeqId: "02" } });
      }
      if (method === "DELETE") {
        deleteAttempts += 1;
        if (failurePoint === "delete" && deleteAttempts === 1) return Promise.reject(new Error(`${recordKind} delete failed`));
        deletionAcknowledged = true;
        return Promise.resolve({ data: {} });
      }
      return Promise.resolve({ data: {} });
    });

    const store = useDataDocumentGraphStore();
    await store.fetchGraph(dataDocumentId);
    if (recordKind === "field") {
      store.removeField("10");
      if (failurePoint === "preceding child") store.addFieldPath("statusId", "statusid");
    } else {
      store.removeCondition("01");
      if (failurePoint === "preceding child") {
        store.addCondition({ fieldNameAlias: "statusid", operator: "equals", fieldValue: "CLOSED" });
      }
    }

    await expect(store.saveGraph()).rejects.toThrow(failurePoint === "delete" ? `${recordKind} delete failed` : `${recordKind} child failed`);
    expect(recordKind === "field" ? store.removedFieldSeqIds : store.removedConditionSeqIds).toEqual([recordKind === "field" ? "10" : "01"]);
    expect(recordKind === "field"
      ? store.getGraph?.fields.some((field) => field.sourceRecord?.fieldSeqId === "10")
      : store.getGraph?.conditions.some((condition) => condition.conditionSeqId === "01")).toBe(false);

    await expect(store.saveGraph()).resolves.toBe(dataDocumentId);
    expect(deleteAttempts).toBe(expectedDeleteAttempts);
    expect(recordKind === "field" ? store.removedFieldSeqIds : store.removedConditionSeqIds).toEqual([]);
  });

  it("rejects programmatic edits to every graph slice while a save is in flight", async () => {
    const parentSave = deferred<{ data: { dataDocumentId: string } }>();
    commonApiMock.mockImplementation(({ url, method, data }: { url: string; method: string; data?: Record<string, any> }) => {
      if (url === "moqui/dataDocuments" && method === "POST") return parentSave.promise;
      if (url.endsWith("/fields") && method === "POST") return Promise.resolve({ data: { ...data, fieldSeqId: "10" } });
      if (url.endsWith("/conditions") && method === "POST") return Promise.resolve({ data: { ...data, conditionSeqId: "01" } });
      if (url === "moqui/dataDocuments/ImmutableSave" && method === "GET") {
        return Promise.resolve({
          data: {
            dataDocumentId: "ImmutableSave",
            documentName: "Immutable save",
            documentTitle: "Original title",
            primaryEntityName: "OrderHeader",
            fields: [{ fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "orderid" }],
            conditions: [{ conditionSeqId: "01", fieldNameAlias: "orderid", operator: "equals", fieldValue: "100" }]
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({
      dataDocumentId: "ImmutableSave",
      documentName: "Immutable save",
      documentTitle: "Original title",
      primaryEntityName: "OrderHeader"
    });
    const field = store.addFieldPath("orderId", "orderid")!;
    store.addCondition({ fieldNameAlias: "orderid", operator: "equals", fieldValue: "100" });
    const condition = store.getGraph!.conditions[0];
    const beforeSave = serializeDataDocumentGraph(store.getGraph!);

    const save = store.saveGraph();
    expect(store.isSaving).toBe(true);
    store.updateMetadata({ documentTitle: "Late title" });
    store.updateField(field.localId, field.fieldPath, { fieldNameAlias: "latefield" });
    store.addFieldPath("statusId", "latefield");
    store.removeField(field.localId!);
    store.updateCondition(condition.localId, { fieldValue: "LATE" });
    store.addCondition({ fieldNameAlias: "orderid", operator: "equals", fieldValue: "LATE" });
    store.removeCondition(condition.localId!);
    store.startNewGraph();
    store.discardDraft();

    expect(store.getGraph).toBeDefined();
    expect(serializeDataDocumentGraph(store.getGraph!)).toEqual(beforeSave);

    parentSave.resolve({ data: { dataDocumentId: "ImmutableSave" } });
    await expect(save).resolves.toBe("ImmutableSave");
    expect(store.isSaving).toBe(false);
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

  it("keeps the saved revision stable and clears preview when the graph becomes dirty", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/DocumentA") {
        return Promise.resolve({
          data: {
            dataDocumentId: "DocumentA",
            documentName: "Document A",
            primaryEntityName: "Product",
            fields: []
          }
        });
      }
      if (url === "oms/dataDocumentView") {
        return Promise.reject(new Error("preview failed"));
      }
      return Promise.resolve({ data: {} });
    });
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    graphStore.activatePreviewTarget(Symbol("DocumentA"), "DocumentA");
    await graphStore.fetchGraph("DocumentA");
    const savedRevision = graphStore.savedRevision;
    await previewStore.runPreview({ pageSize: 25 });
    expect(previewStore.getPreviewStatus).toBe("error");
    expect(previewStore.getPreviewError).toBe("preview failed");

    graphStore.updateMetadata({ documentName: "Dirty Document A" });

    expect(graphStore.isDirty).toBe(true);
    expect(graphStore.savedRevision).toBe(savedRevision);
    expect(previewStore.getPreviewRows).toEqual([]);
    expect(previewStore.getPreviewStatus).toBe("idle");
    expect(previewStore.getPreviewError).toBe("");
  });

  it("clears preview when a different persisted document becomes active", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/DocumentA" || url === "moqui/dataDocuments/DocumentB") {
        const dataDocumentId = url.endsWith("DocumentA") ? "DocumentA" : "DocumentB";
        return Promise.resolve({
          data: {
            dataDocumentId,
            documentName: dataDocumentId,
            primaryEntityName: "Product",
            fields: []
          }
        });
      }
      if (url === "oms/dataDocumentView") {
        return Promise.resolve({ data: { entityValueList: [{ document: "A" }] } });
      }
      return Promise.resolve({ data: {} });
    });
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    graphStore.activatePreviewTarget(Symbol("DocumentA"), "DocumentA");
    await graphStore.fetchGraph("DocumentA");
    await previewStore.runPreview({ pageSize: 25 });

    await graphStore.fetchGraph("DocumentB");

    expect(graphStore.getGraph?.dataDocumentId).toBe("DocumentB");
    expect(previewStore.getPreviewOwner).toBeUndefined();
    expect(previewStore.getPreviewRows).toEqual([]);
    expect(previewStore.getPreviewStatus).toBe("idle");
  });

  it("clears A preview before a deferred B fetch settles and blocks A preview transport", async () => {
    const documentB = deferred<{ data: Record<string, unknown> }>();
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/DocumentA") {
        return Promise.resolve({
          data: {
            dataDocumentId: "DocumentA",
            documentName: "Document A",
            primaryEntityName: "Product",
            fields: []
          }
        });
      }
      if (url === "moqui/dataDocuments/DocumentB") return documentB.promise;
      return Promise.resolve({ data: {} });
    });
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    graphStore.activatePreviewTarget(Symbol("DocumentA"), "DocumentA");
    await graphStore.fetchGraph("DocumentA");
    previewStore.$patch({
      previewRows: [{ document: "A" }],
      previewTotal: 1,
      previewStatus: "success",
      previewError: "",
      previewOwner: {
        dataDocumentId: "DocumentA",
        savedRevision: graphStore.savedRevision,
        requestId: 1
      },
      previewTargetGeneration: graphStore.targetOwnerGeneration,
      previewRequestId: 1
    });

    const fetchDocumentB = graphStore.fetchGraph("DocumentB");
    const immediatePreviewState = {
      rows: [...previewStore.getPreviewRows],
      status: previewStore.getPreviewStatus
    };
    await previewStore.runPreview({ pageSize: 25 });
    const previewRequestsWhileLoading = commonApiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url === "oms/dataDocumentView");
    documentB.resolve({
      data: {
        dataDocumentId: "DocumentB",
        documentName: "Document B",
        primaryEntityName: "Product",
        fields: []
      }
    });
    await fetchDocumentB;

    expect(immediatePreviewState).toEqual({ rows: [], status: "idle" });
    expect(previewRequestsWhileLoading).toHaveLength(0);
  });

  it("keeps A preview cleared when the B fetch rejects", async () => {
    const documentB = deferred<{ data: Record<string, unknown> }>();
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments/DocumentA") {
        return Promise.resolve({
          data: {
            dataDocumentId: "DocumentA",
            documentName: "Document A",
            primaryEntityName: "Product",
            fields: []
          }
        });
      }
      if (url === "moqui/dataDocuments/DocumentB") return documentB.promise;
      return Promise.resolve({ data: {} });
    });
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    graphStore.activatePreviewTarget(Symbol("DocumentA"), "DocumentA");
    await graphStore.fetchGraph("DocumentA");
    previewStore.$patch({
      previewRows: [{ document: "A" }],
      previewTotal: 1,
      previewStatus: "success",
      previewError: "",
      previewOwner: {
        dataDocumentId: "DocumentA",
        savedRevision: graphStore.savedRevision,
        requestId: 1
      },
      previewTargetGeneration: graphStore.targetOwnerGeneration,
      previewRequestId: 1
    });

    const fetchDocumentB = graphStore.fetchGraph("DocumentB");
    documentB.reject(new Error("B unavailable"));
    await expect(fetchDocumentB).rejects.toThrow("B unavailable");
    await previewStore.runPreview({ pageSize: 25 });

    expect(graphStore.getGraph?.dataDocumentId).toBe("DocumentA");
    expect(previewStore.getPreviewRows).toEqual([]);
    expect(previewStore.getPreviewStatus).toBe("idle");
    expect(commonApiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url === "oms/dataDocumentView")).toHaveLength(0);
  });

  it.each([
    "unsaved derived ID",
    "dirty graph",
    "validation error",
    "save in progress",
    "route target mismatch",
    "mismatched saved baseline"
  ])("blocks direct preview transport for a %s", async (blockedState) => {
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();

    if (blockedState === "unsaved derived ID") {
      graphStore.startNewGraph();
      graphStore.updateMetadata({ documentName: "Unsaved Document", primaryEntityName: "Product" });
      graphStore.activatePreviewTarget(Symbol(blockedState), "UnsavedDocument");
    } else {
      graphStore.graph = projectDataDocumentGraph({
        document: {
          dataDocumentId: "PreviewBoundary",
          documentName: "Preview Boundary",
          primaryEntityName: blockedState === "validation error" ? "" : "Product"
        },
        fields: []
      });
      graphStore.isPersisted = true;
      graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
      graphStore.activatePreviewTarget(Symbol(blockedState), blockedState === "route target mismatch"
        ? "DifferentDocument"
        : "PreviewBoundary");
      if (blockedState === "dirty graph") graphStore.updateMetadata({ documentTitle: "Dirty" });
      if (blockedState === "save in progress") graphStore.saving = true;
      if (blockedState === "mismatched saved baseline") graphStore.baseline = "other-saved-revision";
    }

    await previewStore.runPreview({ pageSize: 25 });

    expect(commonApiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url === "oms/dataDocumentView")).toHaveLength(0);
  });

  it("allows direct preview transport for a clean warning-only saved graph", async () => {
    commonApiMock.mockResolvedValue({ data: { entityValueList: [{ orderId: "10000" }] } });
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    graphStore.graph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "WarningPreview",
        documentName: "Warning Preview",
        primaryEntityName: "Product"
      },
      fields: [{ fieldPath: "unverifiedRelationship:orderId", fieldNameAlias: "orderId" }],
      relationshipMetadata: {
        unverifiedRelationship: {
          relationshipName: "unverifiedRelationship",
          verified: false,
          attempted: true
        }
      }
    });
    graphStore.isPersisted = true;
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    graphStore.activatePreviewTarget(Symbol("WarningPreview"), "WarningPreview");

    await previewStore.runPreview({ pageSize: 25 });

    expect(graphStore.getGraph?.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "warning" })
    ]));
    expect(previewStore.getPreviewRows).toEqual([{ orderId: "10000" }]);
    expect(previewStore.getPreviewStatus).toBe("success");
  });

  it("rejects caller-supplied preview ownership for an otherwise eligible graph", async () => {
    const graphStore = useDataDocumentGraphStore();
    const previewStore = useDataDocumentStore();
    graphStore.graph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "OwnedPreview",
        documentName: "Owned Preview",
        primaryEntityName: "Product"
      },
      fields: []
    });
    graphStore.isPersisted = true;
    graphStore.baseline = JSON.stringify(serializeDataDocumentGraph(graphStore.getGraph!));
    graphStore.activatePreviewTarget(Symbol("OwnedPreview"), "OwnedPreview");

    await (previewStore.runPreview as any)({
      dataDocumentId: "OwnedPreview",
      savedRevision: "forged-revision"
    }, { pageSize: 25 });

    expect(commonApiMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url === "oms/dataDocumentView")).toHaveLength(0);
    expect(previewStore.getPreviewStatus).toBe("idle");
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
