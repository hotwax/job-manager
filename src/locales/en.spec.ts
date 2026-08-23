import { describe, expect, it } from "vitest";

import messages from "./en.json";

describe("English locale menu labels", () => {
  it.each([
    "Data documents",
    "Manual uploads",
    "MDM",
    "System messages"
  ])("registers the exact static menu key %s", (key) => {
    expect(messages).toHaveProperty(key);
  });
});
