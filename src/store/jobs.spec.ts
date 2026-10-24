import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

// useAuth reads commonUtil at module scope, and importing the job store reaches useAuth through the user store,
// so the mock has to cover it or nothing in this file collects. importOriginal cannot be used here: the real barrel
// loads Login.vue, which imports useAuth, which imports commonUtil back out of the barrel before it is initialised.
vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: {
    getMaargURL: () => "",
    getOmsURL: () => "",
    getToken: () => "",
    getTokenExpiration: () => "",
    hasError: (resp: any) => !!resp?.data?.errors,
    isAppEmbedded: () => false,
    isMoqui: () => true,
    showToast: vi.fn()
  },
  cookieHelper: () => ({
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }),
  logger: { error: vi.fn() },
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

  it("fetches one page of run history from the search API", async () => {
    const store = useJobStore();
    store.areServiceProductsFetched = true;
    store.products = { SERVICE_SYNC_ORDERS: { productId: "SERVICE_SYNC_ORDERS", productName: "Sync Orders" } };

    apiMock.mockResolvedValue({
      data: {
        jobRunList: [
          { jobRunId: "200", jobName: "indexProducts", status: "RUNNING", userFullName: "Admin User" },
          { jobRunId: "101", jobName: "syncOrders", status: "FAILED", instanceOfProductId: "SERVICE_SYNC_ORDERS" }
        ],
        jobRunCount: 57
      }
    });

    await store.fetchJobRunHistory({ pageIndex: 1, pageSize: 25 });

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobs/runs/search",
        method: "GET",
        params: expect.objectContaining({ pageIndex: 1, pageSize: 25 })
      })
    );
    // Served in the order the service returned, it did the sorting and the paging
    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(["200", "101"]);
    // The service derives the state and returns it as status, the page reads it as runStatus
    expect(store.getJobRunHistory[0]).toEqual(expect.objectContaining({ runStatus: "RUNNING" }));
    expect(store.getJobRunHistory[1]).toEqual(
      expect.objectContaining({ runStatus: "FAILED", productName: "Sync Orders" })
    );
    // Total runs is the count of the very search that fetched the page
    expect(store.getJobRunHistoryTotal).toBe(57);
    expect(store.getJobRunHistoryStats.total).toBe(57);
  });

  it("passes every filter to the search API and leaves the ordering to the service", async () => {
    const store = useJobStore();
    store.areServiceProductsFetched = true;
    useUserStore().currentProductStore = { productStoreId: "STORE" };

    apiMock.mockResolvedValue({ data: { jobRunList: [], jobRunCount: 0 } });

    await store.fetchJobRunHistory({
      queryString: "#300",
      jobName: "syncOrders",
      username: "admin",
      status: "FAILED"
    });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          // The leading # of a run id copied off a card is not part of the stored id
          keyword: "300",
          jobName: "syncOrders",
          username: "admin",
          status: "FAILED",
          productStoreId: "STORE"
        })
      })
    );

    const { params } = apiMock.mock.calls[0][0];
    // The service resolves each job's store itself, so the remote is no longer sent
    expect(params.systemMessageRemoteId).toBeUndefined();
    // Ordering is the service default, pinning it here would lose the jobRunId tiebreak that keeps paging stable
    expect(params.orderByField).toBeUndefined();
  });

  it("reads each status count from a pageSize one search", async () => {
    const store = useJobStore();

    const countByStatus: Record<string, number> = { SUCCESSFUL: 40, FAILED: 12, RUNNING: 5 };
    apiMock.mockImplementation(({ params }: any) =>
      Promise.resolve({ data: { jobRunList: [], jobRunCount: countByStatus[params.status] } })
    );

    await store.fetchJobRunHistoryStats({ jobName: "syncOrders" });

    expect(apiMock).toHaveBeenCalledTimes(3);
    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobs/runs/search",
        params: expect.objectContaining({ status: "FAILED", jobName: "syncOrders", pageSize: 1, pageIndex: 0 })
      })
    );
    expect(store.getJobRunHistoryStats).toEqual(
      expect.objectContaining({ successful: 40, failed: 12, running: 5 })
    );
  });

  it("counts only the selected status when a status filter is applied", async () => {
    const store = useJobStore();

    apiMock.mockResolvedValue({ data: { jobRunList: [], jobRunCount: 12 } });

    await store.fetchJobRunHistoryStats({ status: "FAILED" });

    // The other statuses cannot appear in a result set already narrowed to FAILED, so they need no call
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(store.getJobRunHistoryStats).toEqual(
      expect.objectContaining({ successful: 0, failed: 12, running: 0 })
    );
  });

  it("fetches the SERVICE products in bulk and only once", async () => {
    const store = useJobStore();

    apiMock.mockImplementation(({ url }: any) => {
      if (url === "oms/products") {
        return Promise.resolve({ data: [{ productId: "SERVICE_SYNC_ORDERS", productName: "Sync Orders" }] });
      }
      return Promise.resolve({ data: { jobRunList: [], jobRunCount: 0 } });
    });

    await store.fetchJobRunHistory({});

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "oms/products",
        params: expect.objectContaining({ productTypeId: "SERVICE", pageSize: 250, pageIndex: 0 })
      })
    );
    expect(store.getProducts.SERVICE_SYNC_ORDERS.productName).toBe("Sync Orders");

    apiMock.mockClear();
    await store.fetchJobRunHistory({ pageIndex: 1 });

    // Only the run search, the cached products are reused rather than fetched per run
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).not.toHaveBeenCalledWith(expect.objectContaining({ url: "oms/products" }));
  });

  it("resets the run history when the search API fails", async () => {
    const store = useJobStore();
    store.areServiceProductsFetched = true;
    store.jobRunHistory = [{ jobRunId: "1" }];
    store.jobRunHistoryTotal = 1;

    apiMock.mockRejectedValue(new Error("offline"));

    await store.fetchJobRunHistory({});

    expect(store.getJobRunHistory).toEqual([]);
    expect(store.getJobRunHistoryTotal).toBe(0);
    expect(store.getJobRunHistoryStats).toEqual({ total: 0, successful: 0, failed: 0, running: 0 });
    expect(store.isLoading).toBe(false);
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


describe("run history failure and request ownership", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    useJobStore().areServiceProductsFetched = true;
  });

  it("distinguishes an unavailable API from a successful empty result and recovers on retry", async () => {
    const store = useJobStore();
    apiMock.mockRejectedValueOnce({ response: { status: 404 } });
    expect(await store.fetchJobRunHistory()).toBe(false);
    expect(store.jobRunHistoryError).toContain("unavailable on this server");
    expect(store.jobRunHistoryLoading).toBe(false);
    apiMock.mockResolvedValueOnce({ data: { jobRunList: [], jobRunCount: 0 } });
    expect(await store.fetchJobRunHistory()).toBe(true);
    expect(store.jobRunHistoryError).toBe("");
    expect(store.getJobRunHistoryTotal).toBe(0);
  });

  it.each([
    { data: { errors: "Denied", jobRunList: [], jobRunCount: 0 } },
    { data: {} },
    { data: { jobRunList: [], jobRunCount: -1 } },
    { data: { jobRunList: "invalid", jobRunCount: 1 } }
  ])("rejects error or malformed success envelopes instead of showing empty results", async response => {
    apiMock.mockResolvedValue(response);
    const store = useJobStore();
    expect(await store.fetchJobRunHistory()).toBe(false);
    expect(store.jobRunHistoryError).toBe("Unable to load run history. Try again.");
  });

  it.each([false, true])("ignores a stale list completion, including failures (%s)", async staleFailure => {
    const store = useJobStore();
    const pending: any[] = [];
    apiMock.mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
    const first = store.fetchJobRunHistory({ queryString: "old" });
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    const second = store.fetchJobRunHistory({ queryString: "new" });
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    pending[1].resolve({ data: { jobRunList: [{ jobRunId: "new", status: "FAILED" }], jobRunCount: 1 } });
    await second;
    if(staleFailure) pending[0].reject(new Error("old failure"));
    else pending[0].resolve({ data: { jobRunList: [{ jobRunId: "old" }], jobRunCount: 99 } });
    await first;
    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(["new"]);
    expect(store.getJobRunHistoryTotal).toBe(1);
    expect(store.jobRunHistoryError).toBe("");
    expect(store.jobRunHistoryLoading).toBe(false);
  });

  it("does not let a stale failure clear the loading state of a newer request", async () => {
    const store = useJobStore();
    let rejectOld: any;
    let resolveNew: any;
    apiMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOld = reject; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve; }));
    const old = store.fetchJobRunHistory();
    await vi.waitFor(() => expect(rejectOld).toBeTypeOf("function"));
    const recent = store.fetchJobRunHistory();
    await vi.waitFor(() => expect(resolveNew).toBeTypeOf("function"));
    rejectOld(new Error("old"));
    await old;
    expect(store.jobRunHistoryLoading).toBe(true);
    resolveNew({ data: { jobRunList: [], jobRunCount: 0 } });
    await recent;
    expect(store.jobRunHistoryLoading).toBe(false);
  });

  it("keeps history loading independent of job-list loading", async () => {
    const store = useJobStore();
    store.loading = true;
    apiMock.mockResolvedValue({ data: { jobRunList: [], jobRunCount: 0 } });
    await store.fetchJobRunHistory();
    expect(store.loading).toBe(true);
    expect(store.jobRunHistoryLoading).toBe(false);
  });

  it("reports unavailable counts while retaining a successfully loaded page", async () => {
    const store = useJobStore();
    store.jobRunHistory = [{ jobRunId: "ok" }];
    store.jobRunHistoryStats.total = 22;
    apiMock.mockRejectedValue(new Error("offline"));
    await store.fetchJobRunHistoryStats();
    expect(store.jobRunStatsError).toBe("Unable to load run counts. Try again.");
    expect(store.getJobRunHistory).toEqual([{ jobRunId: "ok" }]);
    expect(store.getJobRunHistoryStats.total).toBe(22);
    expect(store.jobRunStatsLoading).toBe(false);
  });

  it("invalidates pending counts when the filters change", async () => {
    const store = useJobStore();
    let resolveOld: any;
    apiMock.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const old = store.fetchJobRunHistoryStats({ status: "FAILED" });
    store.invalidateJobRunHistoryStats();
    apiMock.mockResolvedValue({ data: { jobRunCount: 7 } });
    await store.fetchJobRunHistoryStats({ status: "SUCCESSFUL" });
    resolveOld({ data: { jobRunCount: 90 } });
    await old;
    expect(store.getJobRunHistoryStats).toEqual({ total: 0, successful: 7, failed: 0, running: 0 });
  });
});
