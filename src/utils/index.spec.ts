import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

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
    error: vi.fn(),
    warn: vi.fn()
  }
}));

import { useUtilStore } from "@/store/util";
import { isAppCompatible } from "@/utils";

describe("app compatibility utilities", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    import.meta.env.VITE_MAARG_COMPATIBLE_VERSION = undefined;
  });

  it("treats a missing required maarg version as compatibility check disabled", () => {
    useUtilStore().systemInformation = {
      instanceInfo: {
        componentRelease: "5.1.0"
      }
    };

    expect(isAppCompatible()).toBe(true);
  });

  it("rejects versions below the configured required maarg version", () => {
    import.meta.env.VITE_MAARG_COMPATIBLE_VERSION = "5.2.0";
    useUtilStore().systemInformation = {
      instanceInfo: {
        componentRelease: "5.1.0"
      }
    };

    expect(isAppCompatible()).toBe(false);
  });

  it("treats the local Moqui UpcomingRelease label as compatible", () => {
    import.meta.env.VITE_MAARG_COMPATIBLE_VERSION = "5.2.0";
    useUtilStore().systemInformation = {
      instanceInfo: {
        componentRelease: "UpcomingRelease"
      }
    };

    expect(isAppCompatible()).toBe(true);
  });

  it("does not block login when no required compatible version is configured", () => {
    import.meta.env.VITE_MAARG_COMPATIBLE_VERSION = "";
    useUtilStore().systemInformation = {
      instanceInfo: {
        componentRelease: "UpcomingRelease"
      }
    };

    expect(isAppCompatible()).toBe(true);
  });
});
