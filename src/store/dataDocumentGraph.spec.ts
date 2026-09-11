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

import {
  buildDataDocumentExportPayload,
  buildDataDocumentPreviewPayload,
  canonicalDataDocumentAlias,
  isConditionValueMissing,
  normalizeRelationshipKeyMaps,
  projectDataDocumentGraph,
  serializeGraphConditions,
  serializeGraphFields
} from "../utils/dataDocumentGraph";
import { useDataDocumentGraphStore } from "./dataDocumentGraph";
import { commonApiMock } from "@/test/commonMock";

const document = {
  dataDocumentId: "PicklistRole",
  documentName: "Picklist Role",
  primaryEntityName: "org.apache.ofbiz.shipment.picklist.Picklist"
};

describe("data document graph projection", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    commonApiMock.mockReset();
    commonApiMock.mockResolvedValue({ data: { dataDocumentId: "InvalidOperator", fields: [], conditions: [] } });
  });

  it("converts a document with only direct fields into one root node", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "picklistId", fieldNameAlias: "picklistId" },
        { dataDocumentId: "PicklistRole", fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusId" }
      ]
    });

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toEqual(expect.objectContaining({
      isPrimary: true,
      entityName: "org.apache.ofbiz.shipment.picklist.Picklist",
      fieldCount: 2
    }));
    expect(graph.edges).toHaveLength(0);
    expect(graph.fields.map((field) => field.nodeId)).toEqual(["node:root", "node:root"]);
  });

  it("matches Moqui prettyToCamelCase aliases", () => {
    expect(canonicalDataDocumentAlias("orderId")).toBe("orderid");
    expect(canonicalDataDocumentAlias("ORDER__id value")).toBe("orderIdValue");
    expect(canonicalDataDocumentAlias("Order-ID")).toBe("orderId");
  });

  it("rejects Data Document IDs beyond Moqui's 40-character id field boundary", () => {
    const boundaryGraph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "A123456789012345678901234567890123456789",
        primaryEntityName: "Product"
      }
    });
    const liveQaGraph = projectDataDocumentGraph({
      document: {
        dataDocumentId: "POSSalesOrderItemsWithoutIssuanceQA20260824",
        primaryEntityName: "Product"
      }
    });

    expect(boundaryGraph.validationIssues).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "data_document_id_too_long" })
    ]));
    expect(liveQaGraph.validationIssues).toEqual(expect.arrayContaining([expect.objectContaining({
      code: "data_document_id_too_long",
      severity: "error",
      targetKind: "document",
      message: "Data document ID must be 40 characters or fewer (currently 43). Shorten the Name or edit the ID in Advanced Metadata."
    })]));
  });

  it("rejects non-BMP aliases outside the Java-compatible persistence domain", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [{
        dataDocumentId: "PicklistRole",
        fieldSeqId: "10",
        fieldPath: "orderId",
        fieldNameAlias: "order\u{10400}Id"
      }]
    });

    expect(graph.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unsupported_data_document_alias_character", targetKind: "field", targetId: "10" })
    ]));
    expect(graph.aliasValidationIssues).toHaveLength(1);
  });

  it("rejects aliases with case-expansion characters before persistence", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [{
        dataDocumentId: "PicklistRole",
        fieldSeqId: "10",
        fieldPath: "orderId",
        fieldNameAlias: "order-ß"
      }],
      conditions: [{
        dataDocumentId: "PicklistRole",
        conditionSeqId: "01",
        fieldNameAlias: "order-ß",
        operator: "equals"
      }]
    });

    expect(graph.validationIssues.filter((issue) => issue.code === "unsupported_data_document_alias_character")).toHaveLength(2);
    expect(graph.aliasValidationIssues).toHaveLength(2);
  });

  it("rehydrates and serializes fields and conditions with one canonical alias", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [{ dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "Order ID" }],
      conditions: [{
        dataDocumentId: "PicklistRole",
        conditionSeqId: "01",
        fieldNameAlias: "ORDER-ID",
        operator: "equals",
        fieldValue: "100"
      }]
    });

    expect(graph.fields[0]).toEqual(expect.objectContaining({ fieldNameAlias: "orderId", outputName: "orderId" }));
    expect(graph.conditions[0]).toEqual(expect.objectContaining({ fieldNameAlias: "orderId", targetKind: "field", targetId: "10" }));
    expect(serializeGraphFields(graph)[0].fieldNameAlias).toBe("orderId");
    expect(serializeGraphConditions(graph)[0].fieldNameAlias).toBe("orderId");
  });

  it("assigns stable local identities to unsaved fields during projection", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldPath: "orderId", fieldNameAlias: "orderId" },
        { dataDocumentId: "PicklistRole", fieldPath: "statusId", fieldNameAlias: "statusId" }
      ]
    });

    expect(graph.fields.map((field) => field.localId)).toEqual([
      expect.any(String),
      expect.any(String)
    ]);
    expect(graph.fields[0].localId).not.toBe(graph.fields[1].localId);
    expect(serializeGraphFields(graph).map((field) => field.localId)).toEqual(graph.fields.map((field) => field.localId));
  });

  it("reports aliases that collide after canonicalization", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "Order ID" },
        { dataDocumentId: "PicklistRole", fieldSeqId: "20", fieldPath: "externalOrderId", fieldNameAlias: "order-id" }
      ]
    });

    expect(graph.fields.map((field) => field.outputName)).toEqual(["orderId", "orderId"]);
    expect(graph.validationIssues.filter((issue) => issue.code === "duplicate_output_name")).toHaveLength(2);
  });

  it("converts deep fields into multiple nodes and edges", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        {
          dataDocumentId: "PicklistRole",
          fieldSeqId: "10",
          fieldPath: "picklistShipment:picklist:roles:Person:firstName",
          fieldNameAlias: "roleFirstName"
        }
      ],
      relationshipMetadata: {
        picklistShipment: { entityName: "PicklistShipment", relationshipType: "many", verified: true },
        "picklistShipment:picklist": { entityName: "Picklist", relationshipType: "one", verified: true },
        "picklistShipment:picklist:roles": { entityName: "PartyRole", relationshipType: "many", verified: true },
        "picklistShipment:picklist:roles:Person": { entityName: "Person", relationshipType: "one", verified: true }
      }
    });

    expect(graph.nodes.map((node) => node.pathText)).toEqual([
      "",
      "picklistShipment",
      "picklistShipment:picklist",
      "picklistShipment:picklist:roles",
      "picklistShipment:picklist:roles:Person"
    ]);
    expect(graph.edges.map((edge) => edge.relationshipName)).toEqual(["picklistShipment", "picklist", "roles", "Person"]);
    expect(graph.fields[0]).toEqual(expect.objectContaining({
      fieldPath: "picklistShipment:picklist:roles:Person:firstName",
      fieldName: "firstName",
      nodeId: "node:picklistShipment:picklist:roles:Person"
    }));
  });

  it("does not warn about relationship metadata until lookup has been attempted", () => {
    const notLoaded = projectDataDocumentGraph({
      document,
      fields: [{ fieldSeqId: "10", fieldPath: "manualRelationship:manualField", fieldNameAlias: "manualField" }]
    });
    const attempted = projectDataDocumentGraph({
      document,
      fields: [
        { fieldSeqId: "10", fieldPath: "manualRelationship:firstField", fieldNameAlias: "firstField" },
        { fieldSeqId: "20", fieldPath: "manualRelationship:secondField", fieldNameAlias: "secondField" }
      ],
      relationshipMetadata: {
        manualRelationship: {
          relationshipName: "manualRelationship",
          verified: false,
          attempted: true
        }
      }
    });

    expect(notLoaded.validationIssues.filter((issue) => issue.code === "unverified_relationship_path")).toEqual([]);
    expect(attempted.validationIssues.filter((issue) => issue.code === "unverified_relationship_path")).toHaveLength(1);
    expect(attempted.fields.every((field) => field.isManualPath)).toBe(true);
  });

  it("normalizes singular and plural relationship key maps", () => {
    expect(normalizeRelationshipKeyMaps({
      keyMap: { fieldName: "orderId", relatedFieldName: "orderId" }
    })).toEqual([{ fieldName: "orderId", relatedFieldName: "orderId" }]);
    expect(normalizeRelationshipKeyMaps({
      keyMaps: [{ fieldName: "orderId", relatedFieldName: "orderId" }]
    })).toEqual([{ fieldName: "orderId", relatedFieldName: "orderId" }]);
    expect(normalizeRelationshipKeyMaps({})).toEqual([]);
  });

  it("falls back to a usable singular relationship key map when plural key maps are empty or invalid", () => {
    const singular = { fieldName: "orderId", relatedFieldName: "orderId" };

    expect(normalizeRelationshipKeyMaps({ keyMaps: [], keyMap: singular })).toEqual([singular]);
    expect(normalizeRelationshipKeyMaps({ keyMaps: [null, "invalid"], keyMap: singular })).toEqual([singular]);
  });

  it("projects explicit auto-reverse relationship metadata onto its edge", () => {
    const graph = projectDataDocumentGraph({
      document,
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

    expect(graph.edges[0]).toEqual(expect.objectContaining({
      relationshipName: "party.Party",
      metadataStatus: "verified",
      isAutoReverse: true
    }));
  });

  it("preserves full path strings with package names", () => {
    const fieldPath = "org.apache.ofbiz.shipment.picklist.PicklistShipment:org.apache.ofbiz.shipment.shipment.Shipment:shipmentId";
    const graph = projectDataDocumentGraph({
      document,
      fields: [{ dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath, fieldNameAlias: "shipmentId" }]
    });

    expect(graph.fields[0].fieldPath).toBe(fieldPath);
    expect(serializeGraphFields(graph)[0]).toEqual(expect.objectContaining({ fieldPath }));
  });

  it("preserves # relationship title segments", () => {
    const fieldPath = "Primary#org.apache.ofbiz.order.order.OrderHeader:statusId";
    const graph = projectDataDocumentGraph({
      document,
      fields: [{ dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath, fieldNameAlias: "orderStatusId" }]
    });

    expect(graph.edges[0]).toEqual(expect.objectContaining({
      relationshipTitle: "Primary",
      relationshipName: "org.apache.ofbiz.order.order.OrderHeader",
      pathText: "Primary#org.apache.ofbiz.order.order.OrderHeader"
    }));
    expect(graph.fields[0].fieldPath).toBe(fieldPath);
  });

  it("detects duplicate field output names", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "statusId" },
        { dataDocumentId: "PicklistRole", fieldSeqId: "20", fieldPath: "picklistShipment:statusId" }
      ]
    });

    expect(graph.validationIssues.filter((issue) => issue.code === "duplicate_output_name")).toHaveLength(2);
  });

  it("resolves duplicate output names after alias update", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "statusId" },
        { dataDocumentId: "PicklistRole", fieldSeqId: "20", fieldPath: "picklistShipment:statusId", fieldNameAlias: "shipmentStatusId" }
      ]
    });

    expect(graph.fields.map((field) => field.outputName)).toEqual(["statusid", "shipmentstatusid"]);
    expect(graph.validationIssues.some((issue) => issue.code === "duplicate_output_name")).toBe(false);
  });

  it("serializes graph fields back to original DataDocumentField records", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        {
          dataDocumentId: "PicklistRole",
          fieldSeqId: "10",
          fieldPath: "picklistShipment:shipmentId",
          fieldNameAlias: "shipmentId",
          sequenceNum: 10,
          defaultDisplay: "Y",
          sortable: "Y",
          functionName: "min"
        }
      ]
    });

    expect(serializeGraphFields(graph)).toEqual([
      {
        dataDocumentId: "PicklistRole",
        fieldSeqId: "10",
        fieldPath: "picklistShipment:shipmentId",
        fieldNameAlias: "shipmentid",
        sequenceNum: 10,
        defaultDisplay: "Y",
        sortable: "Y",
        functionName: "min"
      }
    ]);
  });

  it("attaches conditions to existing field aliases", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "picklistId", fieldNameAlias: "picklistId" }
      ],
      conditions: [
        {
          dataDocumentId: "PicklistRole",
          conditionSeqId: "01",
          fieldNameAlias: "picklistId",
          operator: "equals",
          fieldValue: "P100"
        }
      ]
    });

    expect(graph.conditions[0]).toEqual(expect.objectContaining({
      targetKind: "field",
      targetId: "10"
    }));
    expect(graph.nodes[0].conditionCount).toBe(1);
    expect(serializeGraphConditions(graph)[0]).toEqual(expect.objectContaining({
      fieldNameAlias: "picklistid",
      operator: "equals",
      fieldValue: "P100"
    }));
  });

  it("keeps zero condition field values visible for graph projection", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "varianceQuantity", fieldNameAlias: "varianceQuantity" }
      ],
      conditions: [
        {
          dataDocumentId: "PicklistRole",
          conditionSeqId: "01",
          fieldNameAlias: "varianceQuantity",
          operator: "less",
          fieldValue: "0"
        }
      ]
    });

    expect(graph.conditions[0]).toEqual(expect.objectContaining({
      targetKind: "field",
      targetId: "10",
      fieldNameAlias: "variancequantity",
      operator: "less",
      fieldValue: "0"
    }));
    expect(graph.nodes[0].conditionCount).toBe(1);
    expect(serializeGraphConditions(graph)[0]).toEqual(expect.objectContaining({
      operator: "less",
      fieldValue: "0"
    }));
  });

  it("serializes null checks without a field value", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [{ dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "statusId", fieldNameAlias: "statusId" }],
      conditions: [{
        dataDocumentId: "PicklistRole",
        conditionSeqId: "01",
        fieldNameAlias: "statusId",
        operator: "is-null",
        fieldValue: "stale value"
      }]
    });

    expect(serializeGraphConditions(graph)[0]).toEqual(expect.objectContaining({
      operator: "is-null"
    }));
    expect(serializeGraphConditions(graph)[0]).not.toHaveProperty("fieldValue");
  });

  it("rejects unsupported persisted operators before any API request", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "InvalidOperator", documentName: "Invalid Operator", primaryEntityName: "Product" });
    store.addFieldPath("statusId", "statusId");
    store.addCondition({ fieldNameAlias: "statusId", operator: "contains", fieldValue: "OPEN" });

    await expect(store.saveGraph()).rejects.toThrow("Unsupported persisted condition operator");
    expect(commonApiMock).not.toHaveBeenCalled();
  });

  it("writes and refetches matching canonical field and condition aliases", async () => {
    commonApiMock.mockImplementation(({ url }: { url: string }) => {
      if (url === "moqui/dataDocuments") return Promise.resolve({ data: { dataDocumentId: "CanonicalDocument" } });
      if (url === "admin/dataDocuments/CanonicalDocument/fields") return Promise.resolve({ data: {} });
      if (url === "admin/dataDocuments/CanonicalDocument/conditions") return Promise.resolve({ data: {} });
      if (url === "moqui/dataDocuments/CanonicalDocument") {
        return Promise.resolve({
          data: {
            dataDocumentId: "CanonicalDocument",
            documentName: "Canonical Document",
            primaryEntityName: "Product",
            fields: [{ fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "Order ID" }],
            conditions: [{ conditionSeqId: "01", fieldNameAlias: "ORDER-ID", operator: "equals", fieldValue: "100" }]
          }
        });
      }
      if (url === "admin/systemMessages") return Promise.resolve({ data: { systemMessages: [] } });
      return Promise.resolve({ data: {} });
    });

    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "CanonicalDocument", documentName: "Canonical Document", primaryEntityName: "Product" });
    store.addFieldPath("orderId", "Order ID");
    store.addCondition({ fieldNameAlias: "ORDER-ID", operator: "equals", fieldValue: "100" });

    await store.saveGraph();

    expect(commonApiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "admin/dataDocuments/CanonicalDocument/fields",
      data: expect.objectContaining({ fieldNameAlias: "orderId" })
    }));
    expect(commonApiMock).toHaveBeenCalledWith(expect.objectContaining({
      url: "admin/dataDocuments/CanonicalDocument/conditions",
      data: expect.objectContaining({ fieldNameAlias: "orderId" })
    }));
    expect(store.getGraph?.fields[0]).toEqual(expect.objectContaining({ fieldNameAlias: "orderId", outputName: "orderId" }));
    expect(store.getGraph?.conditions[0]).toEqual(expect.objectContaining({ fieldNameAlias: "orderId", targetKind: "field" }));
  });

  it("persists exact custom, listed, changed-target, ambiguous, and null condition values through the API", async () => {
    const scenarios = [
      { name: "custom", fieldPath: "salesChannelEnumId", alias: "salesChannel", value: "POS_SALES_CHANNEL" },
      { name: "listed", fieldPath: "salesChannelEnumId", alias: "salesChannel", value: "ScPos" },
      { name: "changed target", fieldPath: "fulfillmentEnumId", alias: "fulfillment", value: "ScPos" },
      { name: "ambiguous", fieldPath: "orderStatusId", alias: "orderStatus", value: "POS_SALES_CHANNEL" },
      { name: "field to field", fieldPath: "statusId", alias: "statusId", value: undefined, toFieldNameAlias: "otherAlias" },
      { name: "null", fieldPath: "salesChannelEnumId", alias: "salesChannel", value: undefined, operator: "is-null" }
    ];

    for (const scenario of scenarios) {
      setActivePinia(createPinia());
      commonApiMock.mockReset();
      const dataDocumentId = `ConditionPersistence${scenario.name.replace(/\s/g, "")}`;
      const fieldNameAlias = canonicalDataDocumentAlias(scenario.alias);
      const toFieldNameAlias = scenario.toFieldNameAlias ? canonicalDataDocumentAlias(scenario.toFieldNameAlias) : undefined;
      const field = {
        dataDocumentId,
        fieldSeqId: "10",
        fieldPath: scenario.fieldPath,
        fieldNameAlias
      };
      const toField = toFieldNameAlias ? {
        dataDocumentId,
        fieldSeqId: "20",
        fieldPath: "otherId",
        fieldNameAlias: toFieldNameAlias
      } : undefined;
      const condition = {
        dataDocumentId,
        conditionSeqId: "01",
        fieldNameAlias,
        operator: scenario.operator || "equals",
        ...(toFieldNameAlias ? { toFieldNameAlias } : {}),
        ...(scenario.value === undefined ? {} : { fieldValue: scenario.value })
      };
      commonApiMock.mockImplementation(({ url, method }: { url: string; method: string }) => {
        if (url === "moqui/dataDocuments" && method === "POST") return Promise.resolve({ data: { dataDocumentId } });
        if (url === `admin/dataDocuments/${dataDocumentId}/fields` && method === "POST") {
          return Promise.resolve({ data: toFieldNameAlias && commonApiMock.mock.calls.filter(([request]) => request.url === url).length > 1 ? toField : field });
        }
        if (url === `admin/dataDocuments/${dataDocumentId}/conditions` && method === "POST") return Promise.resolve({ data: condition });
        if (url === `moqui/dataDocuments/${dataDocumentId}` && method === "GET") {
          return Promise.resolve({
            data: {
              dataDocumentId,
              documentName: dataDocumentId,
              primaryEntityName: "Product",
              fields: [field, ...(toField ? [toField] : [])],
              conditions: [condition]
            }
          });
        }
        if (url === "admin/systemMessages") return Promise.resolve({ data: { systemMessages: [] } });
        return Promise.resolve({ data: {} });
      });

      const store = useDataDocumentGraphStore();
      store.startNewGraph();
      store.updateMetadata({ dataDocumentId, documentName: dataDocumentId, primaryEntityName: "Product" });
      store.addFieldPath(scenario.fieldPath, scenario.alias);
      if (scenario.toFieldNameAlias) store.addFieldPath("otherId", scenario.toFieldNameAlias);
      store.addCondition({
        fieldNameAlias: scenario.alias,
        operator: scenario.operator || "equals",
        ...(scenario.toFieldNameAlias ? { toFieldNameAlias: scenario.toFieldNameAlias } : {}),
        fieldValue: scenario.value
      });
      expect(store.isDirty).toBe(true);

      await store.saveGraph();

      expect(commonApiMock).toHaveBeenCalledWith({
        url: `moqui/dataDocuments/${dataDocumentId}`,
        method: "GET"
      });
      const conditionRequest = commonApiMock.mock.calls
        .map(([request]) => request)
        .find((request) => request.url === `admin/dataDocuments/${dataDocumentId}/conditions` && request.method === "POST");
      expect(conditionRequest.data).toEqual(expect.objectContaining({
        dataDocumentId,
        fieldNameAlias,
        operator: scenario.operator || "equals",
        ...(toFieldNameAlias ? { toFieldNameAlias } : {})
      }));
      if (scenario.value === undefined) {
        expect(conditionRequest.data).not.toHaveProperty("fieldValue");
      } else {
        expect(conditionRequest.data.fieldValue).toBe(scenario.value);
      }
      expect(store.getGraph?.conditions[0]).toEqual(expect.objectContaining({
        fieldNameAlias,
        operator: scenario.operator || "equals",
        ...(toFieldNameAlias ? { toFieldNameAlias } : {}),
        ...(scenario.value === undefined ? {} : { fieldValue: scenario.value })
      }));
      if (scenario.value === undefined) expect(serializeGraphConditions(store.getGraph!)[0]).not.toHaveProperty("fieldValue");
      expect(store.isDirty).toBe(false);
    }
  });

  it("rejects blank non-null conditions before persistence", async () => {
    const store = useDataDocumentGraphStore();
    store.startNewGraph();
    store.updateMetadata({ dataDocumentId: "BlankCondition", documentName: "Blank Condition", primaryEntityName: "Product" });
    store.addFieldPath("salesChannelEnumId", "salesChannel");
    store.addCondition({ fieldNameAlias: "salesChannel", operator: "equals", fieldValue: "" });

    await expect(store.saveGraph()).rejects.toThrow();
    expect(commonApiMock).not.toHaveBeenCalled();
    expect(store.isDirty).toBe(true);
  });

  it("treats a nonblank field-to-field alias as a condition value", () => {
    expect(isConditionValueMissing("equals", "", "otherAlias")).toBe(false);
    expect(isConditionValueMissing("equals", "", "")).toBe(true);
    expect(isConditionValueMissing("is-null", "", "")).toBe(false);
  });

  it("marks between as unsupported for persisted conditions", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [{ dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "quantity", fieldNameAlias: "quantity" }],
      conditions: [{
        dataDocumentId: "PicklistRole",
        conditionSeqId: "01",
        fieldNameAlias: "quantity",
        operator: "between"
      }]
    });

    expect(graph.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "unsupported_persisted_condition_operator", targetId: "01" })
    ]));
  });

  it("normalizes legacy app operator keys to Moqui operator keys", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "varianceQuantity", fieldNameAlias: "varianceQuantity" }
      ],
      conditions: [
        {
          dataDocumentId: "PicklistRole",
          conditionSeqId: "01",
          fieldNameAlias: "varianceQuantity",
          operator: "less-than",
          fieldValue: "0"
        }
      ]
    });

    expect(graph.conditions[0].operator).toBe("less");
    expect(serializeGraphConditions(graph)[0].operator).toBe("less");
  });

  it("detects missing condition field aliases", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [{ dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "picklistId", fieldNameAlias: "picklistId" }],
      conditions: [{ dataDocumentId: "PicklistRole", conditionSeqId: "01", fieldNameAlias: "missingAlias", operator: "equals" }]
    });

    expect(graph.conditions[0].targetKind).toBe("document");
    expect(graph.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing_condition_field_alias",
        severity: "error",
        targetId: "01"
      })
    ]));
  });

  it("rejects a nonblank field-to-field target that is absent from the canonical field set", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [{ fieldSeqId: "10", fieldPath: "orderId", fieldNameAlias: "orderId" }],
      conditions: [{
        conditionSeqId: "01",
        fieldNameAlias: "orderId",
        operator: "equals",
        toFieldNameAlias: "missingAlias"
      }]
    });

    expect(graph.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "missing_condition_to_field_alias",
        severity: "error",
        targetId: "01"
      })
    ]));
  });

  it("keeps attempted unverified relationship paths editable", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "manualRelationship:manualField", fieldNameAlias: "manualField" }
      ],
      relationshipMetadata: {
        manualRelationship: { relationshipName: "manualRelationship", verified: false, attempted: true }
      }
    });

    expect(graph.fields[0]).toEqual(expect.objectContaining({
      fieldPath: "manualRelationship:manualField",
      isManualPath: true
    }));
    expect(graph.edges[0]).toEqual(expect.objectContaining({
      relationshipName: "manualRelationship",
      metadataStatus: "unverified"
    }));
    expect(graph.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "unverified_relationship_path",
        severity: "warning"
      })
    ]));
  });

  it("builds a preview payload compatible with oms/dataDocumentView", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "picklistId", fieldNameAlias: "picklistId", defaultDisplay: "Y" },
        { dataDocumentId: "PicklistRole", fieldSeqId: "20", fieldPath: "statusId", fieldNameAlias: "statusId", defaultDisplay: "N" }
      ]
    });

    expect(buildDataDocumentPreviewPayload("PicklistRole", {
      filters: [{ fieldNameAlias: "picklistId", operator: "equals", value: "P100" }],
      sort: [{ fieldNameAlias: "picklistId", direction: "DESC" }],
      distinct: true,
      pageSize: 5
    }, graph)).toEqual({
      dataDocumentId: "PicklistRole",
      fieldsToSelect: ["picklistid"],
      customParametersMap: { picklistId: "P100" },
      orderByField: "-picklistId",
      distinct: true,
      pageSize: 5
    });
  });

  it("builds an export payload compatible with ExportDataDocument", () => {
    expect(buildDataDocumentExportPayload("PicklistRole", {
      selectedFields: ["picklistId"],
      format: "json",
      pageSize: 50
    })).toEqual({
      dataDocumentId: "PicklistRole",
      fieldsToSelect: ["picklistId"],
      customParametersMap: {},
      distinct: false,
      pageSize: 50,
      format: "json"
    });
  });
});
