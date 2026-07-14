import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import Catalog from "./Catalog.vue";
import { useJobStore } from "@/store/jobs";

// Mock router
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useRoute: () => ({
    params: {},
    query: {}
  })
}));

vi.mock("@/router", () => ({
  default: {
    currentRoute: {
      value: {
        params: {},
        query: {}
      }
    }
  }
}));

// Mock translation and emitter
vi.mock("@common", () => ({
  api: vi.fn(),
  translate: (key: string) => key,
  emitter: {
    on: vi.fn(),
    off: vi.fn()
  },
  cookieHelper: () => ({
    get: vi.fn().mockReturnValue(""),
    set: vi.fn(),
    remove: vi.fn()
  })
}));

describe("Catalog.vue status filtering", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("filters jobs correctly based on status and isDraftJob", async () => {
    const jobStore = useJobStore();

    // Mock fetch functions to prevent API calls
    jobStore.fetchJobs = vi.fn().mockResolvedValue([]);
    jobStore.fetchCategories = vi.fn().mockResolvedValue([]);
    jobStore.fetchCategoryRollup = vi.fn().mockResolvedValue([]);

    // Populate jobs in store
    jobStore.jobs = [
      {
        jobName: "Job 1 (Paused)",
        instanceOfProductId: "PROD1",
        serviceName: "service1",
        paused: "Y",
        cronExpression: "0 0 * * *",
        isDraftJob: false
      },
      {
        jobName: "Job 2 (Scheduled)",
        instanceOfProductId: "PROD2",
        serviceName: "service2",
        paused: "N",
        cronExpression: "0 0 * * *",
        isDraftJob: false
      },
      {
        jobName: "Job 3 (No Schedule)",
        instanceOfProductId: "PROD3",
        serviceName: "service3",
        paused: "N",
        cronExpression: "",
        isDraftJob: false
      },
      {
        jobName: "Job 4 (Draft Paused)",
        instanceOfProductId: "PROD4",
        serviceName: "service4",
        paused: "Y",
        cronExpression: "",
        isDraftJob: true
      },
      {
        jobName: "Job 5 (Draft No Schedule)",
        instanceOfProductId: "PROD5",
        serviceName: "service5",
        paused: "N",
        cronExpression: "",
        isDraftJob: true
      }
    ];

    const wrapper = mount(Catalog, {
      global: {
        stubs: {
          IonPage: { template: "<div><slot /></div>" },
          IonHeader: { template: "<div><slot /></div>" },
          IonToolbar: { template: "<div><slot /></div>" },
          IonTitle: { template: "<div><slot /></div>" },
          IonContent: { template: "<div><slot /></div>" },
          IonCard: { template: "<div class='ion-card'><slot /></div>" },
          IonCardHeader: { template: "<div><slot /></div>" },
          IonCardTitle: { template: "<div><slot /></div>" },
          IonItem: { template: "<div><slot /></div>" },
          IonLabel: { template: "<div><slot /></div>" },
          IonIcon: { template: "<div><slot /></div>" },
          IonSearchbar: { template: "<div><slot /></div>" },
          IonChip: { template: "<div class='ion-chip' @click=\"$emit('click')\"><slot /></div>" },
          IonMenuButton: { template: "<div><slot /></div>" }
        }
      }
    });

    // 1. By default or under ALL filter, all jobs are shown (except if filtered by categories, which are empty)
    // Wait, let's find the ion-cards that render inside the '.jobs' container.
    // The wrapper stubs IonCard as class='ion-card'
    let jobCards = wrapper.findAll(".jobs .ion-card");
    expect(jobCards.length).toBe(5);

    // Get status filter chips
    const statusChips = wrapper.findAll(".status-filters .ion-chip");
    expect(statusChips.length).toBe(5); // All, Scheduled, Paused, No schedule, Draft

    // 2. Click Scheduled filter chip
    await statusChips[1].trigger("click");
    jobCards = wrapper.findAll(".jobs .ion-card");
    expect(jobCards.length).toBe(1);
    expect(jobCards[0].text()).toContain("Job 2");

    // 3. Click Paused filter chip
    await statusChips[2].trigger("click");
    jobCards = wrapper.findAll(".jobs .ion-card");
    expect(jobCards.length).toBe(1);
    expect(jobCards[0].text()).toContain("Job 1"); // Job 4 is draft, should NOT appear here

    // 4. Click No Schedule filter chip
    await statusChips[3].trigger("click");
    jobCards = wrapper.findAll(".jobs .ion-card");
    expect(jobCards.length).toBe(1);
    expect(jobCards[0].text()).toContain("Job 3"); // Job 4 & Job 5 are drafts, should NOT appear here

    // 5. Click Draft filter chip
    await statusChips[4].trigger("click");
    jobCards = wrapper.findAll(".jobs .ion-card");
    expect(jobCards.length).toBe(2);
    expect(jobCards[0].text()).toContain("Job 4");
    expect(jobCards[1].text()).toContain("Job 5");
  });
});
