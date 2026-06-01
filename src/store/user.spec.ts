import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock, isMoquiMock, showToastMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  isMoquiMock: vi.fn(),
  showToastMock: vi.fn()
}));

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: {
    getOmsURL: () => "http://localhost:8080/rest/s1/",
    hasError: () => false,
    isMoqui: isMoquiMock,
    showToast: showToastMock
  },
  translate: (value: string) => value
}));

vi.mock("@/utils", () => ({
  isAppCompatible: () => true,
  redirectToLegacyApp: vi.fn(),
  showToast: showToastMock
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock("@common/composables/useAuth", () => ({
  useAuth: () => ({
    updateUserId: vi.fn(),
    clearAuth: vi.fn()
  })
}));

import { useUserStore } from "@/store/user";

describe("user store permissions", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    isMoquiMock.mockReturnValue(true);
    showToastMock.mockReset();
  });

  it("loads permissions from the Moqui admin user permissions endpoint", async () => {
    apiMock
      .mockResolvedValueOnce({
        status: 200,
        data: {
          docs: [
            { permissionId: "JOB_MANAGER_APP_VIEW" },
            { permissionId: "SERVICE_JOB_VIEW" }
          ]
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          docs: []
        }
      });

    const store = useUserStore();
    await store.fetchPermissions();

    expect(apiMock).toHaveBeenNthCalledWith(1, {
      url: "admin/user/permissions",
      method: "GET",
      baseURL: "http://localhost:8080/rest/s1/",
      params: { viewIndex: 0, viewSize: 200 }
    });
    expect(store.permissions).toEqual(["JOB_MANAGER_APP_VIEW", "SERVICE_JOB_VIEW"]);
  });

  it("keeps the legacy permissions endpoint for non-Moqui deployments", async () => {
    isMoquiMock.mockReturnValue(false);
    apiMock.mockResolvedValueOnce({
      status: 200,
      data: {
        docs: []
      }
    });

    const store = useUserStore();
    await store.fetchPermissions();

    expect(apiMock).toHaveBeenCalledWith({
      url: "getPermissions",
      method: "POST",
      baseURL: "http://localhost:8080/rest/s1/",
      data: { viewIndex: 0, viewSize: 200 }
    });
  });
});
