import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  cookieHelper: () => ({
    get: vi.fn()
  }),
  translate: (value: string) => value
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn()
  }
}));

import { getJobDetailWithFallback, useJobStore } from "@/store/jobs";

describe("job store detail fallback", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
  });

  it("normalizes fallback job data when the detail endpoint returns an empty object", () => {
    expect(
      getJobDetailWithFallback(
        {},
        {
          jobName: "generate_CreateOrderFeed",
          serviceName: "co.hotwax.netsuite.OrderServices.generate#CreateOrderFeed"
        }
      )
    ).toEqual(
      expect.objectContaining({
        jobName: "generate_CreateOrderFeed",
        serviceName: "co.hotwax.netsuite.OrderServices.generate#CreateOrderFeed",
        serviceInParameters: [],
        serviceJobParameters: []
      })
    );
  });

  it("falls back to the catalog job when the detail API has no jobDetail payload", async () => {
    const store = useJobStore();

    store.jobs = [
      {
        jobName: "generate_CreateOrderFeed",
        description: "Generate HotWax Create Order Feed for Netsuite",
        serviceName: "co.hotwax.netsuite.OrderServices.generate#CreateOrderFeed",
        cronExpression: "0 0/15 * * * ?",
        paused: "Y"
      }
    ];

    apiMock.mockResolvedValue({
      data: {}
    });

    const jobDetail = await store.fetchJobDetail("generate_CreateOrderFeed");

    expect(apiMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "admin/serviceJobs/generate_CreateOrderFeed"
      })
    );
    expect(jobDetail).toEqual(
      expect.objectContaining({
        jobName: "generate_CreateOrderFeed",
        description: "Generate HotWax Create Order Feed for Netsuite",
        serviceName: "co.hotwax.netsuite.OrderServices.generate#CreateOrderFeed",
        cronExpression: "0 0/15 * * * ?",
        paused: "Y",
        serviceInParameters: [],
        serviceJobParameters: []
      })
    );
  });

  it("loads the catalog list when the detail API is empty and the store cache is cold", async () => {
    const store = useJobStore();

    apiMock
      .mockResolvedValueOnce({
        data: {}
      })
      .mockResolvedValueOnce({
        data: [
          {
            jobName: "generate_CreateOrderFeed",
            description: "Generate HotWax Create Order Feed for Netsuite",
            serviceName: "co.hotwax.netsuite.OrderServices.generate#CreateOrderFeed"
          }
        ]
      });

    const jobDetail = await store.fetchJobDetail("generate_CreateOrderFeed");

    expect(apiMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: "admin/serviceJobs"
      })
    );
    expect(jobDetail).toEqual(
      expect.objectContaining({
        jobName: "generate_CreateOrderFeed",
        serviceInParameters: [],
        serviceJobParameters: []
      })
    );
  });
});
