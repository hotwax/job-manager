import { describe, expect, it } from "vitest";

import { getConditionValueOptionSource } from "@/utils/conditionValueOptions";

describe("condition value options", () => {
  it("resolves enum options from an entity relationship and selected field alias", () => {
    const optionSource = getConditionValueOptionSource({
      condition: { fieldNameAlias: "riskLevel" },
      fields: [
        {
          fieldName: "riskLevelEnumId",
          fieldNameAlias: "riskLevel",
          outputName: "riskLevel",
          fieldPath: "riskLevelEnumId"
        }
      ],
      relationships: [
        {
          relationshipName: "RiskLevel#moqui.basic.Enumeration",
          title: "RiskLevel",
          relatedEntityName: "moqui.basic.Enumeration"
        }
      ],
      enumerations: [
        {
          enumId: "ORLVL_MEDIUM",
          description: "Medium",
          enumTypeId: "ORDER_RISK_LEVEL",
          typeDescription: "Order Risk Level",
          sequenceNum: 20
        },
        {
          enumId: "ORLVL_HIGH",
          description: "High",
          enumTypeId: "ORDER_RISK_LEVEL",
          typeDescription: "Order Risk Level",
          sequenceNum: 10
        },
        {
          enumId: "SOMETHING_ELSE",
          description: "Something else",
          enumTypeId: "UNRELATED",
          typeDescription: "Unrelated"
        }
      ],
      statuses: []
    });

    expect(optionSource).toEqual({
      kind: "enum",
      label: "Order Risk Level",
      options: [
        {
          value: "ORLVL_HIGH",
          label: "High",
          detail: "ORDER_RISK_LEVEL"
        },
        {
          value: "ORLVL_MEDIUM",
          label: "Medium",
          detail: "ORDER_RISK_LEVEL"
        }
      ]
    });
  });

  it("does not offer status options when the relationship only says status and multiple status types exist", () => {
    const optionSource = getConditionValueOptionSource({
      condition: { fieldNameAlias: "statusId" },
      fields: [
        {
          fieldName: "statusId",
          fieldNameAlias: "statusId",
          outputName: "statusId",
          fieldPath: "statusId"
        }
      ],
      relationships: [
        {
          relationshipName: "moqui.basic.StatusItem",
          relatedEntityName: "moqui.basic.StatusItem"
        }
      ],
      enumerations: [],
      statuses: [
        {
          statusId: "ORDER_CREATED",
          description: "Order created",
          statusTypeId: "OrderHeader",
          typeDescription: "Order Header"
        },
        {
          statusId: "ITEM_CREATED",
          description: "Item created",
          statusTypeId: "OrderItem",
          typeDescription: "Order Item"
        }
      ]
    });

    expect(optionSource).toBeUndefined();
  });
});
