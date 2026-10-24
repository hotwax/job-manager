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

  it("fetches a server page, derives row status, and reads the total header", async () => {
    const store = useJobStore();
    apiMock.mockResolvedValue({ data: [
      { jobRunId: "200", startTime: 1000 },
      { jobRunId: "101", hasError: "Y" }
    ], headers: { "x-total-count": "57" } });
    await store.fetchJobRunHistory({ pageIndex: 1, pageSize: 25 });
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith({ url: "admin/serviceJobs/runs", method: "GET", params: {
      pageIndex: 1, pageSize: 25, orderByField: "-lastUpdatedStamp,-jobRunId"
    } });
    expect(store.getJobRunHistory.map((run: any) => [run.jobRunId, run.runStatus])).toEqual([
      ["200", "RUNNING"], ["101", "FAILED"]
    ]);
    expect(store.getJobRunHistoryTotal).toBe(57);
    expect(store.jobRunHistoryHasMore).toBe(true);
  });

  it("passes supported entity filters without pretending to scope the selected store", async () => {
    useUserStore().currentProductStore = { productStoreId: "STORE" };
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });
    await useJobStore().fetchJobRunHistory({ queryString: "#300", jobName: "syncOrders", userId: "admin", status: "FAILED" });
    expect(apiMock.mock.calls[0][0].params).toEqual({
      jobRunId: "300", jobRunId_op: "equals", jobName: "syncOrders", userId: "admin", hasError: "Y",
      pageIndex: 0, pageSize: 25, orderByField: "-lastUpdatedStamp,-jobRunId"
    });
  });

  it("reads all status counts from headers with identical base filters", async () => {
    apiMock.mockImplementation(({ params }: any) => Promise.resolve({ data: [], headers: {
      "x-total-count": !params.hasError_not ? "12" : !params.startTime_not ? "3" : params.endTime_not ? "40" : "2"
    } }));
    const store = useJobStore();
    await store.fetchJobRunHistoryStats({ jobName: "syncOrders" });
    expect(apiMock).toHaveBeenCalledTimes(4);
    for(const [request] of apiMock.mock.calls) expect(request.params).toMatchObject({ jobName: "syncOrders", pageSize: 1, pageIndex: 0 });
    expect(store.getJobRunHistoryStats).toMatchObject({ successful: 40, failed: 12, running: 2, terminated: 3 });
  });

  it("counts only the selected error group", async () => {
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "12" } });
    const store = useJobStore();
    await store.fetchJobRunHistoryStats({ status: "FAILED" });
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(store.getJobRunHistoryStats).toMatchObject({ successful: 0, failed: 12, running: 0, terminated: 0 });
  });

  it("disables next on the last partial page", async () => {
    apiMock.mockResolvedValue({ data: [{ jobRunId: "last" }], headers: { "x-total-count": "26" } });
    const store = useJobStore();
    await store.fetchJobRunHistory({ pageIndex: 1 });
    expect(store.jobRunHistoryHasMore).toBe(false);
  });

  it("keeps an unreadable total unknown and reports the count failure", async () => {
    apiMock.mockResolvedValue({ data: [{ jobRunId: "one" }] });
    const store = useJobStore();
    expect(await store.fetchJobRunHistory()).toBe(true);
    expect(store.getJobRunHistoryTotal).toBeNull();
    expect(store.jobRunHistoryHasMore).toBe(false);
    await store.fetchJobRunHistoryStats();
    expect(store.jobRunStatsError).toContain("Unable to load run counts");
    expect(store.getJobRunHistory).toHaveLength(1);
  });

  it("clears stale rows and total when the entity list fails", async () => {
    const store = useJobStore();
    store.jobRunHistory = [{ jobRunId: "1" }];
    store.jobRunHistoryTotal = 1;
    apiMock.mockRejectedValue(new Error("offline"));
    await store.fetchJobRunHistory();
    expect(store.getJobRunHistory).toEqual([]);
    expect(store.getJobRunHistoryTotal).toBeNull();
    expect(store.jobRunHistoryHasMore).toBe(false);
    expect(store.jobRunHistoryLoading).toBe(false);
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
  });

  it("distinguishes an unavailable API from a successful empty result and recovers on retry", async () => {
    const store = useJobStore();
    apiMock.mockRejectedValueOnce({ response: { status: 404 } });
    expect(await store.fetchJobRunHistory()).toBe(false);
    expect(store.jobRunHistoryError).toContain("unavailable on this server");
    expect(store.jobRunHistoryLoading).toBe(false);
    apiMock.mockResolvedValueOnce({ data: [], headers: { "x-total-count": "0" } });
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
    pending[1].resolve({ data: [{ jobRunId: "new", hasError: "Y" }], headers: { "x-total-count": "1" } });
    await second;
    if(staleFailure) pending[0].reject(new Error("old failure"));
    else pending[0].resolve({ data: [{ jobRunId: "old" }], headers: { "x-total-count": "99" } });
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
    resolveNew({ data: [], headers: { "x-total-count": "0" } });
    await recent;
    expect(store.jobRunHistoryLoading).toBe(false);
  });

  it("keeps history loading independent of job-list loading", async () => {
    const store = useJobStore();
    store.loading = true;
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });
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
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "7" } });
    await store.fetchJobRunHistoryStats({ status: "SUCCESSFUL" });
    resolveOld({ data: [], headers: { "x-total-count": "90" } });
    await old;
    expect(store.getJobRunHistoryStats).toEqual({ total: null, successful: 7, failed: 0, running: 0, terminated: 0 });
  });
});
