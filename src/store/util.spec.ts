import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createApp } from "vue";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", async () => {
  const { createCommonMock } = await import("@/test/commonMock");
  return createCommonMock({ api: apiMock });
});

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useUtilStore } from "@/store/util";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
};

describe("util store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    localStorage.clear();
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

  it.each([
    ["Order/Item", "Order%2FItem"],
    ["Party#Role", "Party%23Role"],
    ["Product?View", "Product%3FView"],
    ["Order Item", "Order%20Item"]
  ])("encodes reserved characters in the entity definition path for %s", async (entityName, encodedEntityName) => {
    apiMock.mockResolvedValue({
      data: { entityDefinition: { fields: [], relationships: [] } }
    });
    const store = useUtilStore();

    await store.fetchEntityDefinition(entityName);

    expect(apiMock).toHaveBeenCalledWith({
      url: `admin/entities/${encodedEntityName}/definition`,
      method: "GET"
    });
  });

  it("shares one in-flight definition request across parallel legacy consumers", async () => {
    const response = createDeferred<any>();
    apiMock.mockReturnValue(response.promise);
    const store = useUtilStore();

    const fieldsRequest = store.fetchEntityFields(" OrderHeader ");
    const relationshipsRequest = store.fetchEntityRelationships("OrderHeader");
    const definitionRequest = store.fetchEntityDefinition("OrderHeader");

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(fieldsRequest).toBe(relationshipsRequest);
    expect(fieldsRequest).toBe(definitionRequest);
    expect(useUtilStore.$id).toBe("util");

    response.resolve({
      data: {
        entityDefinition: {
          fields: [{ name: "statusId" }],
          relationships: [{ relationshipName: "StatusItem", relatedEntityName: "StatusItem" }]
        }
      }
    });

    const [fieldsResult, relationshipsResult, definitionResult] = await Promise.all([
      fieldsRequest,
      relationshipsRequest,
      definitionRequest
    ]);

    expect(fieldsResult).toBe(relationshipsResult);
    expect(fieldsResult).toBe(definitionResult);
    expect(store.getEntityDefinition("OrderHeader")).toEqual(definitionResult);
    expect(store.getEntityDefinition(" OrderHeader ")).toEqual(definitionResult);
    expect(store.getEntityDefinitionFetchState(" OrderHeader ").status).toBe("success");
    expect(store.getEntityFields(" OrderHeader ").map((field: any) => field.fieldName)).toEqual(["statusId"]);
    expect(store.getEntityRelationships(" OrderHeader ")).toHaveLength(1);
    expect(store.getEntityDefinition("OrderHeader")).toEqual({
      fields: [expect.objectContaining({ name: "statusId", fieldName: "statusId" })],
      relationships: [expect.objectContaining({ relationshipName: "StatusItem" })]
    });
  });

  it("tracks definition loading independently for each entity", async () => {
    const orderResponse = createDeferred<any>();
    const partyResponse = createDeferred<any>();
    apiMock
      .mockReturnValueOnce(orderResponse.promise)
      .mockReturnValueOnce(partyResponse.promise);
    const store = useUtilStore();

    const orderRequest = store.fetchEntityDefinition("OrderHeader");
    const partyRequest = store.fetchEntityDefinition("Party");

    expect(store.getEntityDefinitionFetchState("OrderHeader")).toEqual({
      status: "pending",
      error: undefined,
      generation: 1
    });
    expect(store.getEntityDefinitionFetchState("Party")).toEqual({
      status: "pending",
      error: undefined,
      generation: 1
    });

    orderResponse.resolve({
      data: { entityDefinition: { fields: [{ name: "orderId" }], relationships: [] } }
    });
    await orderRequest;

    expect(store.getEntityDefinitionFetchState("OrderHeader").status).toBe("success");
    expect(store.getEntityDefinitionFetchState("Party").status).toBe("pending");

    partyResponse.resolve({
      data: { entityDefinition: { fields: [{ name: "partyId" }], relationships: [] } }
    });
    await partyRequest;
  });

  it("does not let an older forced response overwrite a newer generation", async () => {
    const olderResponse = createDeferred<any>();
    const newerResponse = createDeferred<any>();
    apiMock
      .mockReturnValueOnce(olderResponse.promise)
      .mockReturnValueOnce(newerResponse.promise);
    const store = useUtilStore();

    const olderRequest = store.fetchEntityDefinition("OrderHeader");
    const newerRequest = store.fetchEntityDefinition("OrderHeader", { force: true });

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(store.getEntityDefinitionFetchState("OrderHeader").generation).toBe(2);

    newerResponse.resolve({
      data: { entityDefinition: { fields: [{ name: "newerField" }], relationships: [] } }
    });
    const newerDefinition = await newerRequest;

    olderResponse.resolve({
      data: { entityDefinition: { fields: [{ name: "olderField" }], relationships: [] } }
    });
    await olderRequest;

    expect(store.getEntityDefinition("OrderHeader")).toEqual(newerDefinition);
    expect(store.getEntityFields("OrderHeader").map((field: any) => field.fieldName)).toEqual(["newerField"]);
    expect(store.getEntityDefinitionFetchState("OrderHeader")).toEqual({
      status: "success",
      error: undefined,
      generation: 2
    });
  });

  it("does not let an older request error replace a newer successful generation", async () => {
    const olderResponse = createDeferred<any>();
    const newerResponse = createDeferred<any>();
    apiMock
      .mockReturnValueOnce(olderResponse.promise)
      .mockReturnValueOnce(newerResponse.promise);
    const store = useUtilStore();

    const olderRequest = store.fetchEntityDefinition("OrderHeader");
    const newerRequest = store.fetchEntityDefinition("OrderHeader", { force: true });

    newerResponse.resolve({
      data: { entityDefinition: { fields: [{ name: "orderId" }], relationships: [] } }
    });
    await newerRequest;
    olderResponse.reject(new Error("stale failure"));
    await expect(olderRequest).rejects.toThrow("stale failure");

    expect(store.getEntityDefinitionFetchState("OrderHeader")).toEqual({
      status: "success",
      error: undefined,
      generation: 2
    });
    expect(store.getEntityFields("OrderHeader").map((field: any) => field.fieldName)).toEqual(["orderId"]);
  });

  it("keeps a newer failure after an older success settles and permits a clean retry", async () => {
    const olderResponse = createDeferred<any>();
    const newerResponse = createDeferred<any>();
    apiMock
      .mockReturnValueOnce(olderResponse.promise)
      .mockReturnValueOnce(newerResponse.promise)
      .mockResolvedValueOnce({
        data: { entityDefinition: { fields: [{ name: "retryField" }], relationships: [] } }
      });
    const store = useUtilStore();

    const olderRequest = store.fetchEntityDefinition("OrderHeader");
    const newerRequest = store.fetchEntityDefinition("OrderHeader", { force: true });
    newerResponse.reject(new Error("newer failure"));
    await expect(newerRequest).rejects.toThrow("newer failure");
    olderResponse.resolve({
      data: { entityDefinition: { fields: [{ name: "staleField" }], relationships: [] } }
    });
    await olderRequest;

    expect(store.getEntityDefinition("OrderHeader")).toBeUndefined();
    expect(store.getEntityDefinitionFetchState("OrderHeader")).toEqual({
      status: "error",
      error: "newer failure",
      generation: 2
    });

    await expect(store.fetchEntityDefinition("OrderHeader", { force: true })).resolves.toEqual(expect.objectContaining({
      fields: [expect.objectContaining({ fieldName: "retryField" })]
    }));
  });

  it("shares a forced in-flight request with a later non-force caller", async () => {
    const response = createDeferred<any>();
    apiMock.mockReturnValue(response.promise);
    const store = useUtilStore();

    const forcedRequest = store.fetchEntityDefinition("OrderHeader", { force: true });
    const nonForceRequest = store.fetchEntityDefinition("OrderHeader");

    expect(nonForceRequest).toBe(forcedRequest);
    expect(apiMock).toHaveBeenCalledTimes(1);
    response.resolve({ data: { entityDefinition: { fields: [], relationships: [] } } });
    await forcedRequest;
  });

  it("does not expose the cached definition or mutate the API response source", async () => {
    const sourceDefinition = {
      fields: [{ name: "zField" }, { name: "aField" }],
      relationships: [{ relationshipName: "ZRelation", keyMap: { fieldName: "id", relatedFieldName: "id" } }]
    };
    apiMock.mockResolvedValue({ data: { entityDefinition: sourceDefinition } });
    const store = useUtilStore();

    const result = await store.fetchEntityDefinition("OrderHeader");
    result!.fields[0].fieldName = "callerMutation";
    result!.relationships[0].relationshipName = "CallerMutation";

    expect(sourceDefinition).toEqual({
      fields: [{ name: "zField" }, { name: "aField" }],
      relationships: [{ relationshipName: "ZRelation", keyMap: { fieldName: "id", relatedFieldName: "id" } }]
    });
    expect(store.getEntityFields("OrderHeader").map((field: any) => field.fieldName)).toEqual(["aField", "zField"]);
    expect(store.getEntityRelationships("OrderHeader")).toEqual([
      expect.objectContaining({ relationshipName: "ZRelation" })
    ]);
  });

  it("rejects a current failure, retains cache, and succeeds on retry with empty relationships", async () => {
    const store = useUtilStore();
    store.entityDefinitions.OrderHeader = {
      fields: [{ name: "cachedField", fieldName: "cachedField", description: "" }],
      relationships: [{ relationshipName: "CachedRelation", relatedEntityName: "Party" }]
    };
    apiMock
      .mockRejectedValueOnce(new Error("definition unavailable"))
      .mockResolvedValueOnce({
        data: {
          entityDefinition: {
            fields: [{ name: "freshField" }],
            relationships: []
          }
        }
      });

    await expect(store.fetchEntityDefinition("OrderHeader", { force: true })).rejects.toThrow("definition unavailable");

    expect(store.getEntityDefinitionFetchState("OrderHeader")).toEqual({
      status: "error",
      error: "definition unavailable",
      generation: 1
    });
    expect(store.getEntityFields("OrderHeader").map((field: any) => field.fieldName)).toEqual(["cachedField"]);

    const definition = await store.fetchEntityDefinition("OrderHeader", { force: true });

    expect(definition?.relationships).toEqual([]);
    expect(store.getEntityDefinitionFetchState("OrderHeader")).toEqual({
      status: "success",
      error: undefined,
      generation: 2
    });
    expect(store.getEntityFields("OrderHeader").map((field: any) => field.fieldName)).toEqual(["freshField"]);
  });

  it("hydrates cached definitions without restoring a requestless pending state", () => {
    localStorage.setItem("util", JSON.stringify({
      entityDefinitions: {
        OrderHeader: {
          fields: [{ name: "orderId", fieldName: "orderId", description: "" }],
          relationships: []
        }
      },
      entityDefinitionFetchStates: {
        OrderHeader: {
          status: "pending",
          error: undefined,
          generation: 7
        }
      }
    }));
    const pinia = createPinia().use(piniaPluginPersistedstate);
    createApp({ template: "<div />" }).use(pinia);
    setActivePinia(pinia);

    const store = useUtilStore();

    expect(store.getEntityFields("OrderHeader").map((field: any) => field.fieldName)).toEqual(["orderId"]);
    expect(store.getEntityDefinitionFetchState("OrderHeader").status).toBe("none");
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
