import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.mock("@common", () => ({ api: vi.fn() }));
vi.mock("@/utils", () => ({ getTimeInMillis: (value: number) => value }));
vi.mock("@/logger", () => ({ default: { error: vi.fn() } }));

import { useMdmConfigStore } from "@/store/mdmConfig";

describe("data manager master projection", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps the log identity and separates original and error content regardless of order", () => {
    const master = {
      logId: "L1", statusId: "DmlsFinished", configId: "C1",
      "co.hotwax.datamanager.DataManagerConfig": { configId: "C1", statusId: "ConfigActive", scriptTitle: "Product import" },
      "co.hotwax.datamanager.DataManagerContent": [
        { logContentId: "E1", logContentTypeEnumId: "DmcntError", fileName: "errors.json", fileSize: 20, contentLocation: "/errors" },
        { logContentId: "I1", logContentTypeEnumId: "DmcntImported", fileName: "products.json", fileSize: 100, contentLocation: "/original" }
      ],
      "co.hotwax.datamanager.DataManagerParameter": [{ parameterName: "storeId", parameterValue: "STORE" }]
    };
    const before = JSON.stringify(master);
    const result = useMdmConfigStore().flattenDataManagerLogMaster(master);
    expect(result).toMatchObject({ logId: "L1", statusId: "DmlsFinished", scriptTitle: "Product import", logContentId: "I1", fileName: "products.json", errorLogContentId: "E1", errorFileName: "errors.json", errorFileContentLocation: "/errors", parameters: master["co.hotwax.datamanager.DataManagerParameter"] });
    expect(result).not.toHaveProperty("co.hotwax.datamanager.DataManagerConfig");
    expect(JSON.stringify(master)).toBe(before);
  });

  it("preserves a stored payload location when no imported-content row exists", () => {
    expect(useMdmConfigStore().flattenDataManagerLogMaster({ logId: "L2", contentLocation: "/payload.json" })).toEqual({ logId: "L2", contentLocation: "/payload.json", parameters: [] });
  });
});
