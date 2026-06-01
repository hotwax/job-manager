import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const { apiMock, getMaargURLMock, getOmsURLMock, hasErrorMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  getMaargURLMock: vi.fn(() => "http://localhost:8080/rest/s1"),
  getOmsURLMock: vi.fn(() => "http://localhost:8080/rest/s1/admin"),
  hasErrorMock: vi.fn(() => false)
}));

vi.mock("@common", () => ({
  api: apiMock,
  commonUtil: {
    getMaargURL: getMaargURLMock,
    getOmsURL: getOmsURLMock,
    hasError: hasErrorMock,
    showToast: vi.fn()
  },
  translate: (value: string) => value
}));

vi.mock("@common/composables/useAuth", () => ({
  useAuth: () => ({
    clearAuth: vi.fn(),
    updateUserId: vi.fn()
  })
}));

vi.mock("@/utils", () => ({
  isAppCompatible: vi.fn(() => true),
  redirectToLegacyApp: vi.fn(),
  showToast: vi.fn()
}));

vi.mock("@/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock("./util", () => ({
  useUtilStore: () => ({
    fetchSystemInformation: vi.fn()
  })
}));

import { useUserStore } from "@/store/user";

describe("user store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiMock.mockReset();
    getMaargURLMock.mockClear();
    getOmsURLMock.mockClear();
    hasErrorMock.mockClear();
  });

  it("fetches permissions from the Moqui user permissions endpoint", async () => {
    apiMock
      .mockResolvedValueOnce({
        status: 200,
        data: {
          docs: [
            { permissionId: "JOB_MANAGER_VIEW" },
            { permissionId: "SERVICE_JOB_ADMIN" }
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
      method: "get",
      baseURL: "http://localhost:8080/rest/s1",
      params: { viewIndex: 0, viewSize: 200 }
    });
    expect(apiMock).toHaveBeenNthCalledWith(2, {
      url: "admin/user/permissions",
      method: "get",
      baseURL: "http://localhost:8080/rest/s1",
      params: { viewIndex: 1, viewSize: 200 }
    });
    expect(getOmsURLMock).not.toHaveBeenCalled();
    expect(store.permissions).toEqual(["JOB_MANAGER_VIEW", "SERVICE_JOB_ADMIN"]);
  });
});
