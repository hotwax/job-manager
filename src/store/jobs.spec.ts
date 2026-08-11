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

  it("fetches global run history from the serviceJobRuns endpoint in a single request", async () => {
    const store = useJobStore();

    apiMock.mockResolvedValue({
      data: {
        jobRunList: [
          {
            jobRunId: "200",
            jobName: "indexProducts",
            serviceName: "co.hotwax.IndexProducts",
            startTime: 1710000200000,
            hasError: "N",
            userId: "admin",
            messages: "Running rebuild"
          },
          {
            jobRunId: "101",
            jobName: "syncOrders",
            serviceName: "co.hotwax.SyncOrders",
            startTime: 1710000100000,
            endTime: 1710000120000,
            hasError: "Y",
            userId: "system",
            errors: "Failed to process order"
          }
        ],
        jobRunCount: 3,
        statusCounts: { total: 3, successful: 1, failed: 1, running: 1, terminated: 0 }
      }
    });

    await store.fetchJobRunHistory({ pageSize: 2, pageIndex: 0 });

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobRuns",
        method: "GET",
        params: expect.objectContaining({
          pageIndex: 0,
          pageSize: 2,
          orderByField: "-startTime,-jobRunId"
        })
      })
    );
    expect(store.getJobRunHistoryTotal).toBe(3);
    expect(store.getJobRunHistoryStats).toEqual({
      total: 3,
      successful: 1,
      failed: 1,
      running: 1,
      terminated: 0
    });
    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(["200", "101"]);
    expect(store.getJobRunHistory[0]).toEqual(
      expect.objectContaining({
        jobName: "indexProducts",
        serviceName: "co.hotwax.IndexProducts",
        runStatus: "RUNNING"
      })
    );
    expect(store.getJobRunHistory[1].runStatus).toBe("FAILED");
    expect(store.getJobRunHistoryError).toBe("");
  });

  it("passes all filters to the server and normalizes the query string", async () => {
    const store = useJobStore();

    apiMock.mockResolvedValue({
      data: {
        jobRunList: [
          {
            jobRunId: "300",
            jobName: "syncOrders",
            startTime: 1710000300000,
            endTime: 1710000310000,
            hasError: "Y",
            userId: "system",
            logs: [{ logId: "M100" }],
            messages: "Order sync failed"
          }
        ],
        jobRunCount: 1,
        statusCounts: { total: 1, successful: 0, failed: 1, running: 0, terminated: 0 }
      }
    });

    await store.fetchJobRunHistory({
      jobName: "syncOrders",
      status: "FAILED",
      hasError: "Y",
      hasDataLogs: "Y",
      userId: "system",
      queryString: " #300 "
    });

    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobRuns",
        params: expect.objectContaining({
          jobName: "syncOrders",
          runStatus: "FAILED",
          hasError: "Y",
          hasDataLogs: "Y",
          userId: "system",
          queryString: "300"
        })
      })
    );
    expect(store.getJobRunHistory).toEqual([
      expect.objectContaining({
        jobRunId: "300",
        jobName: "syncOrders",
        runStatus: "FAILED"
      })
    ]);
    expect(store.getJobRunHistoryStats.failed).toBe(1);
  });

  it("requests the selected page from the server instead of slicing a client cache", async () => {
    const store = useJobStore();

    const buildPage = (start: number, size: number) => ({
      data: {
        jobRunList: Array.from({ length: size }, (_, i) => ({
          jobRunId: String(start + i),
          jobName: "syncOrders",
          startTime: 1710000000000 - (start + i) * 1000,
          endTime: 1710000005000 - (start + i) * 1000,
          hasError: "N",
          userId: "system"
        })),
        jobRunCount: 30,
        statusCounts: { total: 30, successful: 30, failed: 0, running: 0, terminated: 0 }
      }
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
    expect(store.getJobRunHistory.length).toBe(10);
    expect(store.getJobRunHistory[0].jobRunId).toBe("11");
  });

  it("ignores a stale response that resolves after a newer request", async () => {
    const store = useJobStore();

    let resolveFirst: (value: any) => void = () => {};
    const firstResponse = new Promise((resolve) => { resolveFirst = resolve; });

    apiMock
      .mockImplementationOnce(() => firstResponse)
      .mockImplementationOnce(() => Promise.resolve({
        data: {
          jobRunList: [{ jobRunId: "2", jobName: "newer", startTime: 2, endTime: 3, hasError: "N" }],
          jobRunCount: 1,
          statusCounts: { total: 1, successful: 1, failed: 0, running: 0, terminated: 0 }
        }
      }));

    const firstCall = store.fetchJobRunHistory({ queryString: "old" });
    const secondCall = store.fetchJobRunHistory({ queryString: "new" });
    await secondCall;

    // The slower first response arrives after the newer one has already been applied
    resolveFirst({
      data: {
        jobRunList: [{ jobRunId: "1", jobName: "stale", startTime: 1, endTime: 2, hasError: "N" }],
        jobRunCount: 1,
        statusCounts: { total: 1, successful: 1, failed: 0, running: 0, terminated: 0 }
      }
    });
    await firstCall;

    expect(store.getJobRunHistory.map((run: any) => run.jobRunId)).toEqual(["2"]);
    expect(store.isLoading).toBe(false);
  });

  it("surfaces an error state instead of silently showing no runs when the request fails", async () => {
    const store = useJobStore();

    apiMock.mockRejectedValue(new Error("backend unavailable"));

    await store.fetchJobRunHistory({});

    expect(store.getJobRunHistory).toEqual([]);
    expect(store.getJobRunHistoryTotal).toBe(0);
    expect(store.getJobRunHistoryError).toBe("Failed to load job run history");

    // A later successful fetch clears the error state
    apiMock.mockResolvedValue({
      data: {
        jobRunList: [],
        jobRunCount: 0,
        statusCounts: { total: 0, successful: 0, failed: 0, running: 0, terminated: 0 }
      }
    });
    await store.fetchJobRunHistory({});
    expect(store.getJobRunHistoryError).toBe("");
  });
});
