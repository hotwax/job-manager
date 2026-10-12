import { describe, it, expect } from "vitest";
import { getShopDefaultAppRemoteId } from "@/utils";

describe("getShopDefaultAppRemoteId", () => {
  it("picks the default-app mapping out of the nested shopRemotes detail", () => {
    const shop = {
      shopId: "SHOP_PAR2",
      shopRemotes: [
        { purposeTypeId: "SsctShopifyOmsApp", systemMessageRemoteId: "SHOP_CONFIG_PAR2_OMS" },
        { purposeTypeId: "SsctShopifyDefaultApp", systemMessageRemoteId: "SHOP_CONFIG_PAR2" }
      ]
    };

    // The default-app row is second, so a first-row shortcut would resolve the wrong remote.
    expect(getShopDefaultAppRemoteId(shop)).toBe("SHOP_CONFIG_PAR2");
  });

  it("returns an empty id when the shop has no default-app mapping", () => {
    expect(getShopDefaultAppRemoteId({
      shopId: "SHOP_NO_APP",
      shopRemotes: [{ purposeTypeId: "SsctShopifyOmsApp", systemMessageRemoteId: "SHOP_CONFIG_OMS" }]
    })).toBe("");
  });

  it("returns an empty id when the detail is absent or the shop is missing", () => {
    expect(getShopDefaultAppRemoteId({ shopId: "SHOP_NO_DETAIL" })).toBe("");
    expect(getShopDefaultAppRemoteId(undefined)).toBe("");
  });
});
