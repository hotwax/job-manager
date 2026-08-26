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
    hasError: () => false,
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
