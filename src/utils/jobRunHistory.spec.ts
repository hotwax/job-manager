import { describe, expect, it } from "vitest";
import { buildJobRunHistoryParams, readJobRunTotal } from "./jobRunHistory";

describe("entity-list run filters", () => {
  it("normalizes copied IDs and exact job and user filters", () => {
    expect(buildJobRunHistoryParams({ queryString: " #M12 ", jobName: " sync ", userId: " u1 " })).toMatchObject({
      jobRunId: "M12", jobRunId_op: "equals", jobName: "sync", userId: "u1"
    });
  });
  it.each(["messages", "results", "errors"])("searches %s without changing its text", searchField => {
    expect(buildJobRunHistoryParams({ queryString: " #ABC ", searchField })).toMatchObject({
      [searchField]: "#ABC", [`${searchField}_op`]: "contains", [`${searchField}_ic`]: "Y"
    });
  });
  it("uses the same error predicate as row status and includes null error flags", () => {
    expect(buildJobRunHistoryParams({ status: "FAILED" })).toMatchObject({ hasError: "Y" });
    expect(buildJobRunHistoryParams({ status: "NO_ERROR" })).toMatchObject({ hasError: "Y", hasError_not: "Y" });
    expect(buildJobRunHistoryParams({ status: "NO_ERROR" })).not.toHaveProperty("startTime_op");
  });
  it.each([undefined, "", " ", "not-a-number", "-1", "1.5"])("keeps invalid count %s unknown", value => {
    expect(readJobRunTotal({ "x-total-count": value })).toBeNull();
  });
  it("accepts zero and either header casing", () => {
    expect(readJobRunTotal({ "x-total-count": "0" })).toBe(0);
    expect(readJobRunTotal({ "X-Total-Count": "57" })).toBe(57);
  });
});
