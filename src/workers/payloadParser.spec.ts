import { describe, expect, it } from "vitest";
import { createPayloadParser } from "@/workers/payloadParser";

const largePayloadTest = process.env.RUN_LARGE_PAYLOAD_TEST === "true" ? it : it.skip;

describe("payloadParser", () => {
  it("keeps CSV caches isolated by payload and honors the requested page size", async () => {
    const parser = createPayloadParser();
    const original = [
      "id,name,status",
      "1,Original 1,SUCCESS",
      "2,Original 2,FAILED",
      "3,Original 3,SUCCESS"
    ].join("\n");
    const errors = [
      "id,error",
      "9,Invalid product",
      "10,Missing facility"
    ].join("\n");

    const originalResult = await parser.parsePayload("original", original, "original.csv", 2);
    await parser.parsePayload("errors", errors, "errors.csv", 2);
    const originalPage = await parser.getCsvPage("original", "", 1, 2, 1);

    expect(originalResult.csvPage?.rows).toHaveLength(2);
    expect(originalPage.columns).toEqual(["id", "name", "status"]);
    expect(originalPage.rows.map((row) => row.name)).toEqual(["Original 1", "Original 2"]);
    expect(originalPage.totalRows).toBe(3);
    expect(await parser.getRawText("original")).toBe(original);
  });

  it("falls back to text when Papa reports a malformed non-CSV payload", async () => {
    const parser = createPayloadParser();
    const stackTrace = [
      "Error: import failed",
      "  at row 12",
      "  at row 30"
    ].join("\n");

    const result = await parser.parsePayload("original", stackTrace, "failure.txt", 50);

    expect(result.contentType).toBe("text");
    expect(result.textPreview).toBe(stackTrace);
  });

  it("parses JSON off the view path and returns a bounded preview", async () => {
    const parser = createPayloadParser();
    const data = Array.from({ length: 1000 }, (_, index) => ({
      id: index,
      name: `Order ${index}`
    }));

    const result = await parser.parsePayload("original", JSON.stringify(data), "orders.json", 50);

    expect(result.contentType).toBe("json");
    expect(result.previewTruncated).toBe(true);
    expect(result.previewNodeCount).toBeLessThanOrEqual(500);
  });

  it("finds deeply nested JSON values without a depth cutoff", async () => {
    const parser = createPayloadParser();
    let data: Record<string, unknown> = { orderId: "ORDER-1056" };
    for(let depth = 0; depth < 15; depth += 1) {
      data = { child: data };
    }
    await parser.parsePayload("original", JSON.stringify(data), "deep.json", 50);

    const result = await parser.searchJson("original", "ORDER-1056", 1);

    expect(result.cancelled).toBe(false);
    expect(result.totalMatches).toBe(1);
    expect(result.results[0].path.split(".child")).toHaveLength(16);
  });

  it("cancels superseded full-dataset CSV searches", async () => {
    const parser = createPayloadParser();
    const rows = ["id,name"];
    for(let index = 0; index < 5000; index += 1) {
      rows.push(`${index},Order ${index}`);
    }
    await parser.parsePayload("original", rows.join("\n"), "orders.csv", 50);

    const search = parser.getCsvPage("original", "Order", 1, 50, 7);
    await parser.cancelSearch("original", 7);
    const result = await search;

    expect(result.cancelled).toBe(true);
  });

  largePayloadTest("keeps multi-tens-of-megabyte CSV previews bounded", async () => {
    const parser = createPayloadParser();
    const rows = ["id,orderId,facility,status,description"];
    for(let index = 0; index < 350000; index += 1) {
      const marker = index === 349999 ? "TARGET-LAST-ROW" : "standard";
      rows.push(`${index},ORDER-${String(index).padStart(8, "0")},FACILITY-${index % 25},SUCCESS,${marker}-payload-description`);
    }
    const raw = rows.join("\n");
    const startedAt = performance.now();

    const parsed = await parser.parsePayload("original", raw, "large.csv", 50);
    const search = await parser.getCsvPage("original", "TARGET-LAST-ROW", 1, 50, 1);
    const elapsed = performance.now() - startedAt;

    expect(raw.length).toBeGreaterThan(20000000);
    expect(parsed.csvPage?.rows).toHaveLength(50);
    expect(parsed.csvPage?.totalRows).toBe(350000);
    expect(search.rows).toHaveLength(1);
    expect(await parser.getRawText("original")).toBe("");
    expect(elapsed).toBeLessThan(10000);
  });
});
