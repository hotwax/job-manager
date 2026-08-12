import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: {
    isMoqui: vi.fn(() => true)
  },
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

  it("consumes the standard entity-list response and total-count header", async () => {
    const store = useJobStore();
    store.jobs = [{
      jobName: "indexProducts",
      serviceName: "co.hotwax.IndexProducts",
      productName: "Products"
    }];

    apiMock.mockResolvedValue({
      data: [
        {
          jobRunId: "200",
          jobName: "indexProducts",
          startTime: 1710000200000,
          hasError: "N",
          userId: "admin",
          messages: "Running rebuild"
        },
        {
          jobRunId: "101",
          jobName: "syncOrders",
          startTime: 1710000100000,
          endTime: 1710000120000,
          hasError: "Y",
          userId: "system",
          errors: "Failed to process order"
        }
      ],
      headers: { "x-total-count": "3" }
    });

    await store.fetchJobRunHistory({ pageSize: 2, pageIndex: 0 });

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobs/runs",
        method: "GET",
        params: {
          pageIndex: 0,
          pageSize: 2,
          orderByField: "-createdStamp,-jobRunId"
        }
      })
    );
    expect(store.getJobRunHistoryTotal).toBe(3);
    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(["200", "101"]);
    expect(store.getJobRunHistory[0]).toEqual(
      expect.objectContaining({
        jobName: "indexProducts",
        serviceName: "co.hotwax.IndexProducts",
        productName: "Products",
        runStatus: "RUNNING"
      })
    );
    expect(store.getJobRunHistory[1].runStatus).toBe("FAILED");
    expect(store.getJobRunHistoryError).toBe("");
  });

  it("translates job-name search and field filters into entity-list parameters", async () => {
    const store = useJobStore();
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });

    await store.fetchJobRunHistory({
      queryString: " syncOrd ",
      userId: "system",
      hasMessages: "Y"
    });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          jobName: "syncOrd",
          jobName_op: "contains",
          jobName_ic: "Y",
          userId: "system",
          messages_op: "empty",
          messages_not: "Y"
        })
      })
    );
  });

  it("uses the selected job as an exact filter instead of the search query", async () => {
    const store = useJobStore();
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });

    await store.fetchJobRunHistory({ jobName: "syncOrders", queryString: "ignored" });

    const params = apiMock.mock.calls[0][0].params;
    expect(params.jobName).toBe("syncOrders");
    expect(params).not.toHaveProperty("jobName_op");
    expect(params).not.toHaveProperty("jobName_ic");
    expect(params).not.toHaveProperty("queryString");
  });

  it("falls back to the returned page length when the total-count header is unavailable", async () => {
    const store = useJobStore();
    apiMock.mockResolvedValue({
      data: [{ jobRunId: "1", jobName: "syncOrders", startTime: 1, endTime: 2, hasError: "N" }],
      headers: {}
    });

    await store.fetchJobRunHistory({});

    expect(store.getJobRunHistoryTotal).toBe(1);
  });

  it.each([
    ["FAILED", { hasError: "Y" }],
    ["RUNNING", { startTime_op: "empty", startTime_not: "Y", endTime_op: "empty" }],
    ["SUCCESSFUL", {
      startTime_op: "empty",
      startTime_not: "Y",
      endTime_op: "empty",
      endTime_not: "Y",
      hasError: "N"
    }],
    ["TERMINATED", { startTime_op: "empty" }]
  ])("translates the %s status into entity-list filters", async (status, expectedParams) => {
    const store = useJobStore();
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });

    await store.fetchJobRunHistory({ status });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining(expectedParams) })
    );
  });

  it("requests the selected page from the server instead of slicing a client cache", async () => {
    const store = useJobStore();

    const buildPage = (start: number, size: number) => ({
      data: Array.from({ length: size }, (_, i) => ({
        jobRunId: String(start + i),
        jobName: "syncOrders",
        startTime: 1710000000000 - (start + i) * 1000,
        endTime: 1710000005000 - (start + i) * 1000,
        hasError: "N",
        userId: "system"
      })),
      headers: { "x-total-count": "30" }
    });

    apiMock.mockImplementation(({ params }: any) => Promise.resolve(buildPage(params.pageIndex * params.pageSize + 1, params.pageSize)));

    await store.fetchJobRunHistory({ pageSize: 10, pageIndex: 0 });
    expect(store.getJobRunHistory[0].jobRunId).toBe("1");
    expect(store.getJobRunHistoryTotal).toBe(30);

    await store.fetchJobRunHistory({ pageSize: 10, pageIndex: 1 });

    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ pageIndex: 1, pageSize: 10 })
      })
    );
    expect(store.getJobRunHistory).toHaveLength(10);
    expect(store.getJobRunHistory[0].jobRunId).toBe("11");
  });

  it("ignores a stale response that resolves after a newer request", async () => {
    const store = useJobStore();

    let resolveFirst: (value: any) => void = () => {};
    const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });

    apiMock
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => Promise.resolve({
        data: [{ jobRunId: "2", jobName: "newer", startTime: 2, endTime: 3, hasError: "N" }],
        headers: { "x-total-count": "1" }
      }));

    const firstCall = store.fetchJobRunHistory({ queryString: "old" });
    const secondCall = store.fetchJobRunHistory({ queryString: "new" });
    await secondCall;

    resolveFirst({
      data: [{ jobRunId: "1", jobName: "stale", startTime: 1, endTime: 2, hasError: "N" }],
      headers: { "x-total-count": "1" }
    });
    await firstCall;

    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(["2"]);
    expect(store.isLoading).toBe(false);
  });

  it("surfaces an error state and clears it after a successful request", async () => {
    const store = useJobStore();
    apiMock.mockRejectedValue(new Error("backend unavailable"));

    await store.fetchJobRunHistory({});

    expect(store.getJobRunHistory).toEqual([]);
    expect(store.getJobRunHistoryTotal).toBe(0);
    expect(store.getJobRunHistoryError).toBe("Failed to load job run history");

    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });
    await store.fetchJobRunHistory({});
    expect(store.getJobRunHistoryError).toBe("");
  });
});
