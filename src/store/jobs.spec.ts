import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
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

  it("aggregates service job run history across configured jobs", async () => {
    const store = useJobStore();
    store.jobs = [
      { jobName: "syncOrders", serviceName: "co.hotwax.SyncOrders" },
      { jobName: "indexProducts", serviceName: "co.hotwax.IndexProducts" }
    ];

    apiMock.mockImplementation(({ url }) => {
      if (url === "admin/serviceJobs/syncOrders/runs") {
        return Promise.resolve({
          data: [
            {
              jobRunId: "100",
              startTime: 1710000000000,
              endTime: 1710000060000,
              hasError: "N",
              userId: "system"
            },
            {
              jobRunId: "101",
              startTime: 1710000100000,
              endTime: 1710000120000,
              hasError: "Y",
              userId: "system",
              errors: "Failed to process order"
            }
          ]
        });
      }

      return Promise.resolve({
        data: [
          {
            jobRunId: "200",
            startTime: 1710000200000,
            hasError: "N",
            userId: "admin",
            messages: "Running rebuild"
          }
        ]
      });
    });

    await store.fetchJobRunHistory({ pageSize: 2, pageIndex: 0 });

    expect(apiMock).toHaveBeenCalledTimes(2);
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
  });

  it("filters service job run history by selected job, errors, data logs, user, and query", async () => {
    const store = useJobStore();
    store.jobs = [
      { jobName: "syncOrders", serviceName: "co.hotwax.SyncOrders" },
      { jobName: "indexProducts", serviceName: "co.hotwax.IndexProducts" }
    ];

    apiMock.mockResolvedValue({
      data: [
        {
          jobRunId: "300",
          startTime: 1710000300000,
          endTime: 1710000310000,
          hasError: "Y",
          userId: "system",
          logs: [{ logId: "M100" }],
          messages: "Order sync failed"
        },
        {
          jobRunId: "301",
          startTime: 1710000200000,
          endTime: 1710000210000,
          hasError: "N",
          userId: "system",
          logs: [{ logId: "M101" }],
          messages: "Order sync succeeded"
        }
      ]
    });

    await store.fetchJobRunHistory({
      jobName: "syncOrders",
      hasError: "Y",
      hasDataLogs: "Y",
      userId: "system",
      queryString: "failed"
    });

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobs/syncOrders/runs",
        params: expect.objectContaining({
          hasError: "Y"
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
});
