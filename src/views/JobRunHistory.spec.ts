import { IonButton } from "@ionic/vue";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JobRunFilters from "@/components/JobRunFilters.vue";
import { useJobStore } from "@/store/jobs";
import JobRunHistory from "./JobRunHistory.vue";

const { apiMock, lifecycle, resolveNames, getName } = vi.hoisted(() => ({ apiMock: vi.fn(), lifecycle: {} as any, resolveNames: vi.fn(), getName: vi.fn() }));
vi.mock("@ionic/vue", async () => ({
  ...await vi.importActual<any>("@ionic/vue"),
  onIonViewWillEnter: (callback: any) => { lifecycle.enter = callback; },
  onIonViewDidLeave: (callback: any) => { lifecycle.leave = callback; }
}));
vi.mock("@common", () => ({
  api: apiMock,
  translate: (key: string) => key,
  commonUtil: { hasError: () => false, getStatusColor: () => "medium" }
}));
vi.mock("@/store/user", () => ({ useUserStore: () => ({ getCurrentProductStore: { productStoreId: "STORE" }, resolveUserFullNames: resolveNames, getUserFullName: getName }) }));
vi.mock("@/utils", () => ({ getCronString: vi.fn(), getDateAndTime: () => "date", getTimeInMillis: () => 0 }));
vi.mock("@/router", () => ({ default: { currentRoute: { value: { query: {} } }, push: vi.fn() } }));
vi.mock("@/logger", () => ({ default: { error: vi.fn() } }));
enableAutoUnmount(afterEach);

const openHistory = async () => {
  const store = useJobStore();
  const wrapper = mount(JobRunHistory, {
    global: { stubs: { AnimatedNumber: { props: ["value"], template: "<span>{{ value }}</span>" } } }
  });
  await lifecycle.enter();
  await flushPromises();

  return { store, wrapper };
};

describe("run history failure presentation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    resolveNames.mockReset().mockResolvedValue(undefined);
    getName.mockReset();
  });

  it("shows an actionable unavailable error without empty history or zero counts, then retries", async () => {
    apiMock.mockRejectedValueOnce({ response: { status: 404 } });
    const { wrapper } = await openHistory();
    expect(wrapper.get("[data-testid=\"run-history-error\"]").text()).toContain("unavailable on this server");
    expect(wrapper.text()).not.toContain("No service job runs found");
    expect(wrapper.findAll("ion-card-title").map(title => title.text())).toEqual(["—", "—", "—", "—", "—"]);
    expect(apiMock).toHaveBeenCalledTimes(1);
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "0" } });
    wrapper.findAllComponents(IonButton).find(button => button.text() === "Retry")!.vm.$emit("click");
    await flushPromises();
    expect(wrapper.find("[data-testid=\"run-history-error\"]").exists()).toBe(false);
    expect(wrapper.text()).toContain("No service job runs found");
  });

  it("keeps loaded rows visible and marks failed status counts as unavailable", async () => {
    apiMock.mockImplementation(({ params }: any) => params.pageSize === 1
      ? Promise.reject(new Error("count unavailable"))
      : Promise.resolve({ data: [{ jobRunId: "501", jobName: "sync", hasError: "Y" }], headers: { "x-total-count": "1" } }));
    const { wrapper } = await openHistory();
    expect(wrapper.text()).toContain("#501");
    expect(wrapper.get("[data-testid=\"run-history-counts-error\"]").text()).toContain("Unable to load run counts");
    expect(wrapper.findAll("ion-card-title").map(title => title.text())).toEqual(["1", "—", "—", "—", "—"]);
  });

  it("fetches each page from the server and resets filters without duplicate page requests", async () => {
    apiMock.mockResolvedValue({ data: [], headers: { "x-total-count": "57" } });
    const { wrapper } = await openHistory();
    apiMock.mockClear();
    wrapper.findAllComponents(IonButton).find(button => button.text() === "Next")!.vm.$emit("click");
    await flushPromises();
    expect(apiMock).toHaveBeenCalledTimes(1);
    expect(apiMock.mock.calls[0][0].params).toMatchObject({ pageIndex: 1, pageSize: 25 });
    apiMock.mockClear();
    wrapper.findComponent(JobRunFilters).vm.$emit("update:status", "FAILED");
    await flushPromises();
    const pageCalls = apiMock.mock.calls.filter(([arg]) => arg.params.pageSize === 25);
    expect(pageCalls).toHaveLength(1);
    expect(pageCalls[0][0].params).toMatchObject({ pageIndex: 0, hasError: "Y" });
    expect(wrapper.text()).toContain("Page 1 / 3");
  });

  it("shows resolved user names and cached job metadata without loading another job catalog", async () => {
    const store = useJobStore();
    store.jobs = [{ jobName: "cached", serviceName: "example.Sync", instanceOfProductId: "SYNC" }];
    store.products = { SYNC: { productName: "Sync catalog" } };
    getName.mockImplementation((id: string) => id === "u1" ? "Release Tester" : "");
    apiMock.mockResolvedValue({ data: [
      { jobRunId: "1", jobName: "cached", userId: "u1", startTime: 1, endTime: 2 },
      { jobRunId: "2", jobName: "uncached", userId: "u2", hasError: "Y" }
    ], headers: { "x-total-count": "2" } });
    const { wrapper } = await openHistory();
    expect(resolveNames).toHaveBeenCalledWith(["u1", "u2"]);
    expect(wrapper.text()).toContain("Release Tester");
    expect(wrapper.text()).toContain("u2");
    expect(wrapper.text()).toContain("example.Sync");
    expect(wrapper.text()).toContain("Sync catalog");
    expect(wrapper.text()).toContain("uncached");
    expect(apiMock.mock.calls.every(([request]) => request.url === "admin/serviceJobs/runs")).toBe(true);
  });

  it("keeps all statuses and data-log filters available for job detail", () => {
    const wrapper = mount(JobRunFilters);
    expect(wrapper.text()).toContain("Has data logs");
    for(const status of ["Running", "Successful", "Failed", "Terminated"]) {
      expect(wrapper.text()).toContain(status);
    }
  });
});
