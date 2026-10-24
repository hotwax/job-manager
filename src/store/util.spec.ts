import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock, instanceMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  instanceMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: {
    getMaargURL: instanceMock,
    isValidVersion: (version: string) => /^v?\d+\.\d+\.\d+$/.test(version),
    isVersionGreaterOrEqual: (_minimum: string, version: string) => Number(version.replace(/^v/, "").split(".")[0]) >= 7 || version === "6.5.0",
    showToast: vi.fn()
  },
  translate: (value: string) => value
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useUtilStore } from "@/store/util";

describe("util store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    instanceMock.mockReturnValue("https://test-maarg.hotwax.io/rest/s1/");
  });

  it("keeps System tasks visible while refreshing the same instance", async () => {
    const store = useUtilStore();
    store.systemInformationInstance = instanceMock();
    store.systemInformation = { instanceInfo: { componentRelease: "6.5.0" } };
    let finish!: (value: any) => void;
    apiMock.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const request = store.fetchSystemInformation();
    expect(store.supportsSystemTasks).toBe(true);
    finish({ data: { instanceInfo: { componentRelease: "6.5.0" } } });
    await request;
    expect(store.supportsSystemTasks).toBe(true);
  });

  it("clears compatibility after a failed refresh", async () => {
    const store = useUtilStore();
    store.systemInformationInstance = instanceMock();
    store.systemInformation = { instanceInfo: { componentRelease: "6.5.0" } };
    apiMock.mockRejectedValue(new Error("Unavailable"));
    await store.fetchSystemInformation();
    expect(store.supportsSystemTasks).toBe(false);
  });

  it("does not carry compatibility to another instance or accept an old response", async () => {
    const store = useUtilStore();
    store.systemInformationInstance = instanceMock();
    store.systemInformation = { instanceInfo: { componentRelease: "6.5.0" } };
    let finishOld!: (value: any) => void;
    apiMock.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
    const oldRequest = store.fetchSystemInformation();
    instanceMock.mockReturnValue("https://other-maarg.hotwax.io/rest/s1/");
    expect(store.supportsSystemTasks).toBe(false);
    apiMock.mockResolvedValueOnce({ data: { instanceInfo: { componentRelease: "6.4.0" } } });
    await store.fetchSystemInformation();
    finishOld({ data: { instanceInfo: { componentRelease: "6.5.0" } } });
    await oldRequest;
    expect(store.systemInformation.instanceInfo.componentRelease).toBe("6.4.0");
    expect(store.supportsSystemTasks).toBe(false);
  });

  it("normalizes entity fields and relationships from the admin definition endpoint", async () => {
    apiMock.mockResolvedValue({
      data: {
        entityDefinition: {
          fields: [
            { name: "statusId", type: "id" },
            { fieldName: "orderId", description: "Order ID" }
          ],
          relationships: [
            {
              relationshipName: "RiskLevel#moqui.basic.Enumeration",
              relatedEntityName: "moqui.basic.Enumeration"
            }
          ]
        }
      }
    });

    const store = useUtilStore();
    await store.fetchEntityFields("org.apache.ofbiz.order.order.OrderHeader");

    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/entities/org.apache.ofbiz.order.order.OrderHeader/definition",
      method: "GET"
    });
    expect(store.getEntityFields("org.apache.ofbiz.order.order.OrderHeader")).toEqual([
      expect.objectContaining({
        name: "orderId",
        fieldName: "orderId",
        description: "Order ID"
      }),
      expect.objectContaining({
        name: "statusId",
        fieldName: "statusId",
        type: "id"
      })
    ]);
    expect(store.getEntityRelationships("org.apache.ofbiz.order.order.OrderHeader")).toEqual([
      expect.objectContaining({
        relationshipName: "RiskLevel#moqui.basic.Enumeration",
        relatedEntityName: "moqui.basic.Enumeration"
      })
    ]);
  });

  it("fetches reusable lookup rows for condition value selectors", async () => {
    apiMock
      .mockResolvedValueOnce({
        data: [
          { enumId: "ORLVL_HIGH", enumTypeId: "ORDER_RISK_LEVEL" }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          { statusId: "ORDER_CREATED", statusTypeId: "OrderHeader" }
        ]
      });

    const store = useUtilStore();
    await store.fetchEnumerations();
    await store.fetchStatuses();

    expect(apiMock).toHaveBeenNthCalledWith(1, {
      url: "admin/enums",
      method: "GET",
      params: {
        pageSize: 5000
      }
    });
    expect(apiMock).toHaveBeenNthCalledWith(2, {
      url: "admin/status",
      method: "GET",
      params: {
        pageSize: 5000
      }
    });
    expect(store.getEnumerations).toEqual([
      { enumId: "ORLVL_HIGH", enumTypeId: "ORDER_RISK_LEVEL" }
    ]);
    expect(store.getStatuses).toEqual([
      { statusId: "ORDER_CREATED", statusTypeId: "OrderHeader" }
    ]);
  });

  it("fetches entity relationships from the admin definition endpoint", async () => {
    apiMock.mockResolvedValue({
      data: {
        entityDefinition: {
          relationships: [
            {
              relationshipName: "OrderType",
              relatedEntityName: "org.apache.ofbiz.order.order.OrderType"
            }
          ]
        }
      }
    });

    const store = useUtilStore();
    await store.fetchEntityRelationships("org.apache.ofbiz.order.order.OrderHeader", true);

    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/entities/org.apache.ofbiz.order.order.OrderHeader/definition",
      method: "GET"
    });
    expect(store.getEntityRelationships("org.apache.ofbiz.order.order.OrderHeader")).toEqual([
      expect.objectContaining({
        relationshipName: "OrderType",
        relatedEntityName: "org.apache.ofbiz.order.order.OrderType"
      })
    ]);
  });

  it("refreshes entity definitions when fields are cached without relationships", async () => {
    apiMock.mockResolvedValue({
      data: {
        entityDefinition: {
          fields: [
            { fieldName: "riskLevelEnumId" }
          ],
          relationships: [
            {
              relationshipName: "RiskLevel#moqui.basic.Enumeration",
              relatedEntityName: "moqui.basic.Enumeration"
            }
          ]
        }
      }
    });

    const store = useUtilStore();
    store.entityFields["co.hotwax.order.OrderHeaderRiskAssessment"] = [{ fieldName: "riskLevelEnumId" }];

    await store.fetchEntityFields("co.hotwax.order.OrderHeaderRiskAssessment");

    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/entities/co.hotwax.order.OrderHeaderRiskAssessment/definition",
      method: "GET"
    });
    expect(store.getEntityRelationships("co.hotwax.order.OrderHeaderRiskAssessment")).toEqual([
      expect.objectContaining({
        relationshipName: "RiskLevel#moqui.basic.Enumeration",
        relatedEntityName: "moqui.basic.Enumeration"
      })
    ]);
  });
});
