import { describe, expect, it } from "vitest";
import {
  defaultEdiMapping,
  optionalEdiFields,
  previewEdiOrder,
  readPath,
} from "@/utils/ediOrderMapping";

const sample = () => ({
  purchaseOrder: {
    number: "PO-001",
    date: "2026-11-13T09:00:00-05:00",
    currency: "usd",
  },
  customer: { firstName: "Alex", lastName: "Rivera" },
  shipTo: {
    address1: "120 Example Avenue",
    city: "New York",
    state: "NY",
    postalCode: "00123",
    country: "USA",
  },
  lines: [
    { sku: "A", quantity: "2", unitPrice: "3.50" },
    { sku: "B", quantity: "1", unitPrice: "0" },
  ],
});
describe("EDI preview mapping", () => {
  it("maps each line independently and preserves postal leading zeros", () => {
    const r = previewEdiOrder(sample(), defaultEdiMapping("TEST_STORE"), "lines");
    expect(r.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(r.payload).toMatchObject({
      externalId: "PO-001",
      currencyUom: "USD",
      shipGroups: [
        {
          shipTo: { postalAddress: { postalCode: "00123" } },
          items: [
            { sku: "A", quantity: 2, unitPrice: 3.5 },
            { sku: "B", quantity: 1, unitPrice: 0 },
          ],
        },
      ],
    });
  });
  it("reports a missing value on the exact line", () => {
    const s = sample();
    delete (s.lines[1] as Partial<(typeof s.lines)[1]>).quantity;
    const r = previewEdiOrder(s, defaultEdiMapping("TEST_STORE"), "lines");
    expect(r.issues.some((i) => i.field === "Line 2: Quantity" && i.level === "error")).toBe(true);
  });
  it("rejects zero, negative and nonnumeric quantities", () => {
    for(const quantity of ["0", "-1", "two"]) {
      const s = sample();
      s.lines[0].quantity = quantity;
      expect(previewEdiOrder(s, defaultEdiMapping("TEST_STORE"), "lines").issues.some((i) => i.level === "error")).toBe(true);
    }
  });
  it("does not pass empty or non-array line sources", () => {
    for(const lines of [[], {}, null]) {
      expect(previewEdiOrder(
        { ...sample(), lines },
        defaultEdiMapping("TEST_STORE"),
        "lines"
      ).issues.some((i) => i.field === "Order lines" && i.level === "error")).toBe(true);
    }
  });
  it("does not traverse inherited/prototype properties", () => {
    expect(readPath({}, "constructor.name")).toBeUndefined();
    expect(readPath({}, "__proto__.polluted")).toBeUndefined();
    expect(readPath(Object.create({ secret: "hidden" }), "secret")).toBeUndefined();
  });
});

describe("EDI partner code and attribute mapping", () => {
  it("maps partner values and reports unknown values without inventing a default", () => {
    const rows = defaultEdiMapping("TEST_STORE");
    const currency = rows.find((r) => r.id === "currencyUom")!;
    currency.transform = "lookup";
    currency.lookup = { usd: "USD" };
    expect(previewEdiOrder(sample(), rows, "lines").payload.currencyUom).toBe("USD");
    const changed = sample();
    changed.purchaseOrder.currency = "cad";
    const result = previewEdiOrder(changed, rows, "lines");
    expect(result.issues).toContainEqual({
      level: "error",
      field: "Currency",
      message: "No value-map entry matches this source value.",
    });
    expect(result.payload.currencyUom).toBeUndefined();
  });
  it("does not use inherited value-map entries", () => {
    const rows = defaultEdiMapping("TEST_STORE");
    const currency = rows.find((r) => r.id === "currencyUom")!;
    currency.transform = "lookup";
    currency.lookup = Object.create({ usd: "USD" });
    expect(previewEdiOrder(sample(), rows, "lines").issues.some((i) => i.field === "Currency" && i.level === "error")).toBe(true);
  });
  it("emits personalization as an item attribute for each line", () => {
    const s = sample();
    const lines = s.lines.map((line, index) => ({
      ...line,
      personalizationType: index ? "Foil" : "Engraving",
    }));
    const rows = [
      ...defaultEdiMapping("TEST_STORE"),
      optionalEdiFields().find((r) => r.id === "personalization")!,
    ];
    expect(previewEdiOrder({ ...s, lines }, rows, "lines").payload).toMatchObject({
      shipGroups: [
        {
          items: [
            {
              attributes: [
                { attrName: "personalizationType", attrValue: "Engraving" },
              ],
            },
            {
              attributes: [
                { attrName: "personalizationType", attrValue: "Foil" },
              ],
            },
          ],
        },
      ],
    });
  });
  it("reports one actionable quantity error per invalid line", () => {
    const s = sample();
    s.lines[0].quantity = "";
    const result = previewEdiOrder(s, defaultEdiMapping("TEST_STORE"), "lines");
    expect(result.issues.filter((i) => i.field === "Line 1: Quantity" && i.level === "error")).toHaveLength(1);
  });
  it("rejects ambiguous dates without a timezone", () => {
    const s = sample();
    s.purchaseOrder.date = "2026-11-13T09:00:00";
    expect(previewEdiOrder(s, defaultEdiMapping("TEST_STORE"), "lines").issues.some((i) => i.field === "Order date" && i.level === "error")).toBe(true);
  });
});

describe("EDI sample type validation", () => {
  it("does not silently roll an impossible date into the next month", () => {
    const value = sample();
    value.purchaseOrder.date = "2026-02-30T10:00:00-05:00";
    expect(previewEdiOrder(value, defaultEdiMapping("TEST_STORE"), "lines").issues).toContainEqual({
      level: "error",
      field: "Order date",
      message: "Use an ISO date and time with a time-zone offset.",
    });
  });
  it("does not turn boolean quantity or price values into numbers", () => {
    const value = {
      ...sample(),
      lines: [{ sku: "A", quantity: true, unitPrice: false }],
    };
    const result = previewEdiOrder(value, defaultEdiMapping("TEST_STORE"), "lines");
    expect(result.issues.filter((i) => i.level === "error").map((i) => i.field)).toEqual(["Line 1: Quantity", "Line 1: Unit price"]);
  });
});
