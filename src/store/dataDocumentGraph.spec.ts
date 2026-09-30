import { describe, expect, it } from "vitest";

import {
  DATA_DOCUMENT_CONDITION_OPERATORS,
  DATA_DOCUMENT_ID_MAX_LENGTH,
  buildDataDocumentExportPayload,
  buildDataDocumentPreviewPayload,
  conditionOperatorNeedsValue,
  deriveDataDocumentId,
  getConditionOperatorHint,
  getConditionOperatorsForFieldType,
  isConditionValueMissing,
  isSupportedConditionOperator,
  normalizeConditionValue,
  normalizeDataDocumentOperator,
  projectDataDocumentGraph,
  serializeGraphConditions,
  serializeGraphFields,
  toApiFieldAlias,
  toStoredFieldAlias
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

describe("data document id length", () => {
  // The name that produced the live truncation failure in #1097.
  const overlongName = "POS Sales Order Items Without Issuance QA 20260824";

  it("accepts an id of exactly the persisted limit", () => {
    // Trimmed from the overlong id so the boundary case cannot drift from the limit.
    const dataDocumentId = deriveDataDocumentId(overlongName).slice(0, DATA_DOCUMENT_ID_MAX_LENGTH);
    expect(dataDocumentId).toHaveLength(DATA_DOCUMENT_ID_MAX_LENGTH);

    const graph = projectDataDocumentGraph({ document: { ...document, dataDocumentId }, fields: [] });

    expect(graph.validationIssues.some((issue) => issue.code === "data_document_id_too_long")).toBe(false);
  });

  it("reports the actual length when a derived id is past the limit", () => {
    const dataDocumentId = deriveDataDocumentId(overlongName);
    expect(dataDocumentId).toHaveLength(43);

    const graph = projectDataDocumentGraph({ document: { ...document, dataDocumentId }, fields: [] });
    const issue = graph.validationIssues.find((item) => item.code === "data_document_id_too_long");

    expect(issue).toEqual(expect.objectContaining({ severity: "error", targetKind: "document" }));
    // The message has to name the length and where to fix it, not just that it is too long.
    expect(issue?.message).toContain("43 characters");
    expect(issue?.message).toContain("Advanced metadata");
  });

  it("reports a missing id rather than a length problem when the id is blank", () => {
    const graph = projectDataDocumentGraph({ document: { ...document, dataDocumentId: "" }, fields: [] });

    expect(graph.validationIssues.some((issue) => issue.code === "missing_document_id")).toBe(true);
    expect(graph.validationIssues.some((issue) => issue.code === "data_document_id_too_long")).toBe(false);
  });
});

// A port of org.moqui.util.StringUtilities.prettyToCamelCase(pretty, false), which the API applies to a
// field's alias on create and update.
const apiCamelCase = (pretty: string) => {
  let upperNext = false;
  let camelCase = "";
  for(const char of pretty) {
    if(/[\p{L}\p{Nd}]/u.test(char)) {
      camelCase += upperNext ? char.toUpperCase() : char.toLowerCase();
      upperNext = false;
    } else {
      upperNext = true;
    }
  }

  return camelCase;
};

describe("field aliases the API keeps", () => {
  it("flattens a camelCase alias that is sent as it is, which is why aliases are re-spelled", () => {
    expect(apiCamelCase("shippingRevenue")).toBe("shippingrevenue");
    expect(apiCamelCase("orderAdjustmentTypeId")).toBe("orderadjustmenttypeid");
  });

  it.each(["shippingRevenue", "orderAdjustmentTypeId", "productStoreID", "address2Line", "orderId", "amount", "OrderId", "ORDERID"])(
    "sends %s in a form the API turns back into itself",
    (alias) => {
      expect(apiCamelCase(toApiFieldAlias(alias))).toBe(alias);
    }
  );

  it("leaves an alias that already has separators to the API", () => {
    expect(toApiFieldAlias("ship_rev")).toBe("ship_rev");
    expect(toApiFieldAlias("ship rev")).toBe("ship rev");
    expect(toApiFieldAlias("ORDER_ID")).toBe("ORDER_ID");
  });

  it.each([
    ["shippingRevenue", "shippingRevenue"],
    ["orderAdjustmentTypeId", "orderAdjustmentTypeId"],
    ["order_id", "orderId"],
    ["ship rev", "shipRev"],
    ["ORDER_ID", "orderId"],
    ["", ""]
  ])("names the alias the API stores for %j as %j", (alias, stored) => {
    expect(toStoredFieldAlias(alias)).toBe(stored);
    // what a field keeps after it is saved is what a condition has to name
    expect(toStoredFieldAlias(alias)).toBe(apiCamelCase(toApiFieldAlias(alias)));
  });
});

// The names Moqui's EntityConditionFactoryImpl.stringComparisonOperatorMap accepts, copied from the framework
// as an independent list. EntityFind.condition() throws "Operator [x] is not a valid field comparison
// operator" for any other name, which fails the document when it runs.
const MOQUI_OPERATORS = new Set([
  "=", "equals", "not-equals", "not-equal", "!=", "<>",
  "less-than", "less", "<", "greater-than", "greater", ">",
  "less-than-equal-to", "less-equals", "<=", "greater-than-equal-to", "greater-equals", ">=",
  "in", "IN", "not-in", "NOT IN", "between", "BETWEEN", "not-between", "NOT BETWEEN",
  "like", "LIKE", "not-like", "NOT LIKE", "is-null", "IS NULL", "is-not-null", "IS NOT NULL"
]);

describe("condition operators the backend can run", () => {
  const offered = DATA_DOCUMENT_CONDITION_OPERATORS.map((operator) => operator.value);

  it("offers only names the backend accepts", () => {
    expect(offered.filter((value) => !MOQUI_OPERATORS.has(value))).toEqual([]);
  });

  it.each(["contains", "starts-with", "empty", "not-empty"])("does not offer %s, which the backend rejects when the document runs", (operator) => {
    expect(offered).not.toContain(operator);
  });

  it("offers each operator once, with a label", () => {
    expect(new Set(offered).size).toBe(offered.length);
    expect(DATA_DOCUMENT_CONDITION_OPERATORS.every((operator) => operator.label.length > 0)).toBe(true);
  });

  it("does not turn a legacy alias into a name the backend lacks", () => {
    expect(normalizeDataDocumentOperator("in-list")).toBe("in");
    expect(normalizeDataDocumentOperator("greater-than")).toBe("greater");
    expect(normalizeDataDocumentOperator("is-empty")).toBe("is-empty");
    expect(normalizeDataDocumentOperator("is-not-empty")).toBe("is-not-empty");
  });

  it("says which operators the backend can run", () => {
    for(const operator of [undefined, "", "equals", "greater-than", "like", "IS NULL", "is-not-null"]) {
      expect(isSupportedConditionOperator(operator)).toBe(true);
    }
    for(const operator of ["contains", "starts-with", "begins", "empty", "not-empty", "is-empty"]) {
      expect(isSupportedConditionOperator(operator)).toBe(false);
    }
  });

  it("asks for a value only from an operator that takes one", () => {
    expect(conditionOperatorNeedsValue("equals")).toBe(true);
    expect(conditionOperatorNeedsValue("in")).toBe(true);
    expect(conditionOperatorNeedsValue("is-null")).toBe(false);
    expect(conditionOperatorNeedsValue("is-not-null")).toBe(false);
    expect(isConditionValueMissing("equals", "")).toBe(true);
    expect(isConditionValueMissing("equals", "SHIPPING_CHARGES")).toBe(false);
    expect(isConditionValueMissing("is-null", "")).toBe(false);
    expect(isConditionValueMissing("is-not-null", undefined)).toBe(false);
  });

  it("tells how In list and Like take their value", () => {
    expect(getConditionOperatorHint("in")).toBe("Separate values with commas");
    expect(getConditionOperatorHint("like")).toBe("Use % as a wildcard, e.g. %text%");
    expect(getConditionOperatorHint("equals")).toBe("");
  });

  // The backend converts the whole stored value to the field's type before it reads a list or a pattern
  // out of it. A comma-separated value only survives that on a text field: on a date-time field the
  // preview failed with "The value [2026-09-28 17:35:35,2026-09-30 23:59:59] is not a valid date/time".
  describe("by field type", () => {
    const offeredFor = (fieldType?: string) => getConditionOperatorsForFieldType(fieldType).map((operator) => operator.value);
    const onEveryType = ["equals", "not-equals", "is-null", "is-not-null", "greater", "greater-equals", "less", "less-equals"];

    it.each(["id", "id-long", "text-indicator", "text-short", "text-medium", "text-intermediate", "text-long", "text-very-long"])(
      "offers Like and In list on a %s field",
      (fieldType) => {
        expect(offeredFor(fieldType)).toEqual(["equals", "not-equals", "like", "in", "is-null", "is-not-null", "greater", "greater-equals", "less", "less-equals"]);
      }
    );

    it.each(["date-time", "date", "time", "number-integer", "number-decimal", "number-float", "currency-amount", "currency-precise", "binary-very-long"])(
      "offers neither Like nor In list on a %s field, which the backend cannot read them from",
      (fieldType) => {
        expect(offeredFor(fieldType)).toEqual(onEveryType);
      }
    );

    it("offers only what works on every type until the type is known", () => {
      expect(offeredFor(undefined)).toEqual(onEveryType);
      expect(offeredFor("")).toEqual(onEveryType);
      expect(offeredFor("a-type-nobody-defined")).toEqual(onEveryType);
    });

    it("never offers Between, which needs two values in one text; a range is two conditions", () => {
      expect(offered).not.toContain("between");
      for(const fieldType of [undefined, "id", "text-medium", "date-time", "currency-amount"]) {
        expect(offeredFor(fieldType)).not.toContain("between");
      }
      for(const rangeEnd of ["greater-equals", "less-equals"]) {
        expect(offeredFor("date-time")).toContain(rangeEnd);
      }
    });

    it("only ever narrows the list", () => {
      for(const fieldType of [undefined, "id", "date-time"]) {
        expect(offeredFor(fieldType).every((value) => offered.includes(value))).toBe(true);
      }
    });
  });

  // The backend cuts an In list at every comma and keeps the spaces: with "STORE, STORE_CA" a preview
  // of shipping revenue returned only STORE, because " STORE_CA" matched nothing.
  describe("the value of a condition", () => {
    it("stores an In list without spaces around its values", () => {
      expect(normalizeConditionValue("in", "STORE, STORE_CA")).toBe("STORE,STORE_CA");
      expect(normalizeConditionValue("in", " STORE ,STORE_CA ,")).toBe("STORE,STORE_CA");
      expect(normalizeConditionValue("in", "STORE")).toBe("STORE");
      expect(normalizeConditionValue("in-list", "A, B")).toBe("A,B");
    });

    it("leaves the value of any other operator as typed", () => {
      expect(normalizeConditionValue("equals", " a, b ")).toBe(" a, b ");
      expect(normalizeConditionValue("like", "SHIPPING %")).toBe("SHIPPING %");
      expect(normalizeConditionValue("in", undefined)).toBeUndefined();
      expect(normalizeConditionValue(undefined, "a, b")).toBe("a, b");
    });
  });

  describe("in a saved document", () => {
    const graphWith = (conditions: Array<Record<string, any>>) => projectDataDocumentGraph({
      document: { dataDocumentId: "Doc", documentName: "Doc", primaryEntityName: "org.apache.ofbiz.order.order.OrderHeader" },
      fields: [{ dataDocumentId: "Doc", fieldSeqId: "01", fieldPath: "orderId", fieldNameAlias: "orderId" }],
      conditions: conditions.map((condition, index) => ({ dataDocumentId: "Doc", conditionSeqId: `0${index + 1}`, fieldNameAlias: "orderId", ...condition }))
    });
    const operatorIssues = (graph: ReturnType<typeof graphWith>) =>
      graph.validationIssues.filter((issue) => issue.code === "unsupported_condition_operator");

    it("reports a condition whose operator the backend would reject", () => {
      const issues = operatorIssues(graphWith([{ operator: "contains", fieldValue: "10" }]));

      expect(issues).toHaveLength(1);
      expect(issues[0]).toEqual(expect.objectContaining({ severity: "error", targetKind: "condition", targetId: "01" }));
      expect(issues[0].message).toContain("\"orderId\"");
      expect(issues[0].message).toContain("\"contains\"");
    });

    it("reports each unsupported operator the old list offered", () => {
      const graph = graphWith(["contains", "starts-with", "empty", "not-empty"].map((operator) => ({ operator })));

      expect(operatorIssues(graph)).toHaveLength(4);
    });

    it("stays quiet for every operator that is offered, for a legacy alias, and for no operator", () => {
      const graph = graphWith([
        ...offered.map((operator) => ({ operator, fieldValue: "1,2" })),
        { operator: "in-list", fieldValue: "1,2" },
        { operator: "greater-than", fieldValue: "1" },
        { fieldValue: "1" }
      ]);

      expect(operatorIssues(graph)).toEqual([]);
    });

    it("leaves a post-query condition alone, since its operator never reaches the query", () => {
      expect(operatorIssues(graphWith([{ operator: "contains", postQuery: "Y", fieldValue: "10" }]))).toEqual([]);
    });
  });
});
