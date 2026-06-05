import { beforeEach, describe, expect, it, vi } from "vitest";

const { systemInformation } = vi.hoisted(() => ({
  systemInformation: {
    instanceInfo: {
      componentRelease: ""
    }
  }
}));

vi.mock("file-saver", () => ({
  default: vi.fn()
}));

vi.mock("@ionic/vue", () => ({
  toastController: {
    create: vi.fn()
  }
}));

vi.mock("@capacitor/clipboard", () => ({
  Clipboard: {
    write: vi.fn()
  }
}));

vi.mock("@common", () => ({
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

vi.mock("@/store/util", () => ({
  useUtilStore: () => ({
    systemInformation
  })
}));

vi.mock("@/store/user", () => ({
  useUserStore: () => ({
    oms: "http://localhost:8080"
  })
}));

import { isAppCompatible } from "@/utils";

describe("app compatibility", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_MAARG_COMPATIBLE_VERSION", "5.2.0");
  });

  it("treats the local Moqui UpcomingRelease label as compatible", () => {
    systemInformation.instanceInfo.componentRelease = "UpcomingRelease";

    expect(isAppCompatible()).toBe(true);
  });

  it("does not block login when no required compatible version is configured", () => {
    vi.stubEnv("VITE_MAARG_COMPATIBLE_VERSION", "");
    systemInformation.instanceInfo.componentRelease = "UpcomingRelease";

    expect(isAppCompatible()).toBe(true);
  });
});
