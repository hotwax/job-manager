import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: { hasError: (response: any) => Boolean(response.data?._ERROR_MESSAGE_) },
  cookieHelper: () => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }),
  translate: (value: string) => value
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { useJobStore } from "@/store/jobs";
import { useUserStore } from "@/store/user";

describe("job store detail", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("returns normalized job detail from the detail API", async () => {
    const store = useJobStore();

    apiMock.mockResolvedValue({
      data: {
        jobDetail: {
          jobName: "generate_CreateOrderFeed",
          serviceName: "co.hotwax.netsuite.OrderServices.generate#CreateOrderFeed",
          serviceJobParameters: [],
          serviceInParameters: []
        }
      }
    });

    const jobDetail = await store.fetchJobDetail("generate_CreateOrderFeed");

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobs/generate_CreateOrderFeed",
        method: "GET",
        params: { pageSize: 1000 }
      })
    );
    expect(jobDetail).toEqual(
      expect.objectContaining({
        jobName: "generate_CreateOrderFeed",
        serviceName: "co.hotwax.netsuite.OrderServices.generate#CreateOrderFeed",
        serviceInParameters: [],
        serviceJobParameters: []
      })
    );
  });

  it("returns an empty detail object when the detail API has no jobDetail payload", async () => {
    const store = useJobStore();

    apiMock.mockResolvedValue({
      data: {}
    });

    const jobDetail = await store.fetchJobDetail("generate_CreateOrderFeed");

    expect(jobDetail).toEqual({});
  });

  it("returns an empty detail object when the detail API fails", async () => {
    const store = useJobStore();

    apiMock.mockRejectedValue(new Error("offline"));

    const jobDetail = await store.fetchJobDetail("generate_CreateOrderFeed");

    expect(jobDetail).toEqual({});
  });

  it("loads instance-wide history and reads the server total independently of cached jobs", async () => {
    const store = useJobStore();
    store.jobs = [{ jobName: "syncOrders", serviceName: "co.hotwax.SyncOrders" }];
    apiMock.mockResolvedValue({
      data: [
        { jobRunId: "200", jobName: "uncachedJob", startTime: 1710000200000, hasError: "N" },
        { jobRunId: "101", jobName: "syncOrders", startTime: 1710000100000, endTime: 1710000120000, hasError: "Y" }
      ],
      headers: { "x-total-count": "3" }
    });

    expect(await store.fetchJobRunHistory({ pageSize: 2, pageIndex: 0 })).toBe(true);

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith({
      url: "admin/serviceJobs/runs",
      method: "GET",
      params: { pageSize: 2, pageIndex: 0, orderByField: "-lastUpdatedStamp,-jobRunId" }
    });
    expect(store.getJobRunHistoryTotal).toBe(3);
    expect(store.getJobRunHistoryStats.total).toBe(3);
    expect(store.jobRunHistoryHasMore).toBe(true);
    expect(store.getJobRunHistory.map((run: any) => [run.jobRunId, run.runStatus])).toEqual([
      ["200", "RUNNING"], ["101", "FAILED"]
    ]);
    expect(store.getJobRunHistory[0].jobName).toBe("uncachedJob");
    expect(store.jobRunHistoryError).toBe("");
    expect(store.jobRunHistoryLoading).toBe(false);
  });

  it("sends job, failed status, user and text filters to the entity list and count requests", async () => {
    const store = useJobStore();
    apiMock.mockResolvedValue({
      data: [{ jobRunId: "300", jobName: "syncOrders", hasError: "Y", userId: "system", errors: "Order sync failed" }],
      headers: { "x-total-count": "1" }
    });
    const filters = {
      jobName: " syncOrders ", status: "FAILED", userId: " system ",
      searchField: "errors", queryString: " failed "
    };

    expect(await store.fetchJobRunHistory(filters)).toBe(true);
    await store.fetchJobRunHistoryStats(filters);

    const expectedParams = {
      pageIndex: 0, orderByField: "-lastUpdatedStamp,-jobRunId",
      jobName: "syncOrders", hasError: "Y", userId: "system",
      errors: "failed", errors_op: "contains", errors_ic: "Y"
    };
    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenNthCalledWith(1, {
      url: "admin/serviceJobs/runs", method: "GET", params: { ...expectedParams, pageSize: 25 }
    });
    expect(apiMock).toHaveBeenNthCalledWith(2, {
      url: "admin/serviceJobs/runs", method: "GET", params: { ...expectedParams, pageSize: 1 }
    });
    expect(store.getJobRunHistory).toEqual([
      expect.objectContaining({ jobRunId: "300", jobName: "syncOrders", runStatus: "FAILED" })
    ]);
    expect(store.getJobRunHistoryStats).toEqual({ total: 1, failed: 1, successful: 0, running: 0, terminated: 0 });
    expect(store.jobRunStatsLoaded).toBe(true);
    expect(store.jobRunStatsError).toBe("");
  });

  it("fetches each server page and replaces the previous rows using the total count", async () => {
    const store = useJobStore();
    const page = (offset: number) => Array.from({ length: 10 }, (_, i) => ({
      jobRunId: String(offset + i + 1), jobName: "syncOrders",
      startTime: 1710000000000 + i * 1000, endTime: 1710000005000 + i * 1000, hasError: "N"
    }));
    apiMock.mockResolvedValueOnce({ data: page(0), headers: { "x-total-count": "20" } });
    apiMock.mockResolvedValueOnce({ data: page(10), headers: { "x-total-count": "20" } });

    expect(await store.fetchJobRunHistory({ pageSize: 10, pageIndex: 0 })).toBe(true);
    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(page(0).map(run => run.jobRunId));
    expect(store.getJobRunHistoryTotal).toBe(20);
    expect(store.jobRunHistoryHasMore).toBe(true);

    expect(await store.fetchJobRunHistory({ pageSize: 10, pageIndex: 1 })).toBe(true);
    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenNthCalledWith(2, {
      url: "admin/serviceJobs/runs", method: "GET",
      params: { pageIndex: 1, pageSize: 10, orderByField: "-lastUpdatedStamp,-jobRunId" }
    });
    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(page(10).map(run => run.jobRunId));
    expect(store.getJobRunHistoryTotal).toBe(20);
    expect(store.jobRunHistoryHasMore).toBe(false);
  });
});

describe("job store remote scoping", () => {
  const remoteJob = (jobName: string, systemMessageRemoteId: string) => ({
    jobName,
    instanceOfProductId: jobName,
    serviceJobParameters: [{ parameterName: "systemMessageRemoteId", parameterValue: systemMessageRemoteId }]
  });

  const jobs = [
    remoteJob("import_NetSuiteInventoryReset", "RemoteSftp"),
    remoteJob("import_ShopAOrders", "ShopARemote"),
    remoteJob("import_ShopBOrders", "ShopBRemote")
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    vi.stubEnv("VITE_PRT_STR_DEP_SER_JOB_IDENTIFIER", JSON.stringify(["productStoreIds", "productStoreId", "systemMessageRemoteId"]));

    const userStore = useUserStore();
    userStore.selectedSystemMessageRemoteId = "ShopARemote";
    userStore.shopSystemMessageRemoteIds = ["ShopARemote", "ShopBRemote"];
  });

  it("lists jobs on shared remotes and the selected shop's remote, but not another shop's", async () => {
    const store = useJobStore();
    apiMock.mockResolvedValue({ data: { serviceJobList: jobs } });

    await store.fetchJobs();

    expect(store.getJobs.map((job: any) => job.jobName)).toEqual(["import_NetSuiteInventoryReset", "import_ShopAOrders"]);
  });

  it("hides every remote-scoped job until the shop remotes are known", async () => {
    const store = useJobStore();
    useUserStore().shopSystemMessageRemoteIds = undefined;
    apiMock.mockResolvedValue({ data: { serviceJobList: jobs } });

    await store.fetchJobs();

    expect(store.getJobs.map((job: any) => job.jobName)).toEqual(["import_ShopAOrders"]);
  });

  it("returns detail for a job on a shared remote and none for another shop's job", async () => {
    const store = useJobStore();

    apiMock.mockResolvedValueOnce({ data: { jobDetail: jobs[0] } });
    expect(await store.fetchJobDetail("import_NetSuiteInventoryReset")).toEqual(expect.objectContaining({ jobName: "import_NetSuiteInventoryReset" }));

    apiMock.mockResolvedValueOnce({ data: { jobDetail: jobs[2] } });
    expect(await store.fetchJobDetail("import_ShopBOrders")).toEqual({});
  });
});

describe("user store shop remotes", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("marks only remotes whose internalId is a Shopify shop as shop remotes", async () => {
    const userStore = useUserStore();
    userStore.currentShopifyConfig = { shopId: "SHOP_A" };

    apiMock.mockImplementation(({ url }) => Promise.resolve(url === "oms/systemMessageRemotes"
      ? { data: { systemMessageRemoteList: [
        { systemMessageRemoteId: "ShopARemote", internalId: "SHOP_A" },
        { systemMessageRemoteId: "ShopBRemote", internalId: "SHOP_B" },
        { systemMessageRemoteId: "RemoteSftp" },
        { systemMessageRemoteId: "NetSuiteRemote", internalId: "1234" }
      ] } }
      : { data: [{ shopId: "SHOP_A" }, { shopId: "SHOP_B" }] }));

    await userStore.fetchSystemMessageRemoteByShop();

    expect(userStore.getSelectedSystemMessageRemoteId).toBe("ShopARemote");
    expect(userStore.getShopSystemMessageRemoteIds).toEqual(["ShopARemote", "ShopBRemote"]);
  });
});
