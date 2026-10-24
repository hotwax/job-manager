import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "@/router";
import { useUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";

vi.mock("@common/composables/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: { value: true }, checkAppVersionRedirect: () => false })
}));
vi.mock("@/utils", async (original) => ({
  ...await original<typeof import("@/utils")>(),
  showToast: vi.fn()
}));


describe("System tasks uses the shared route permission check", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push("/settings");
  });

  it("rejects a direct URL without task permission", async () => {
    useUserStore().permissions = ["COMMON_ADMIN"];
    await router.push("/system-tasks");
    expect(router.currentRoute.value.path).toBe("/settings");
  });

  it("allows the task permission regardless of backend version and makes no capability request", async () => {
    useUserStore().permissions = ["WORKEFFORT_TASK_ADMIN"];
    const utilStore = useUtilStore();
    utilStore.systemInformation = { instanceInfo: { componentRelease: "6.4.0" } };
    utilStore.fetchSystemInformation = vi.fn();
    await router.push("/system-tasks");
    expect(router.currentRoute.value.path).toBe("/system-tasks");
    expect(utilStore.fetchSystemInformation).not.toHaveBeenCalled();
  });
});
