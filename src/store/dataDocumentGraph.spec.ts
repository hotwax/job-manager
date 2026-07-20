import { describe, expect, it } from "vitest";

import {
  buildDataDocumentExportPayload,
  buildDataDocumentPreviewPayload,
  projectDataDocumentGraph,
  serializeGraphConditions,
  serializeGraphFields
} from "../utils/dataDocumentGraph";

const document = {
  dataDocumentId: "PicklistRole",
  documentName: "Picklist Role",
  primaryEntityName: "org.apache.ofbiz.shipment.picklist.Picklist"
};

describe("data document graph projection", () => {
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

    expect(graph.fields.map((field) => field.outputName)).toEqual(["statusId", "shipmentStatusId"]);
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
        fieldNameAlias: "shipmentId",
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
      fieldNameAlias: "picklistId",
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
      fieldNameAlias: "varianceQuantity",
      operator: "less",
      fieldValue: "0"
    }));
    expect(graph.nodes[0].conditionCount).toBe(1);
    expect(serializeGraphConditions(graph)[0]).toEqual(expect.objectContaining({
      operator: "less",
      fieldValue: "0"
    }));
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

  it("keeps unverified relationship paths editable", () => {
    const graph = projectDataDocumentGraph({
      document,
      fields: [
        { dataDocumentId: "PicklistRole", fieldSeqId: "10", fieldPath: "manualRelationship:manualField", fieldNameAlias: "manualField" }
      ]
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
      fieldsToSelect: ["picklistId"],
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
