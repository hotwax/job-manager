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
    expect(buildJobRunHistoryParams({ status: "SUCCESSFUL" })).toMatchObject({ hasError: "Y", hasError_not: "Y" });
    expect(buildJobRunHistoryParams({ status: "SUCCESSFUL" })).toMatchObject({ startTime_op: "empty", startTime_not: "Y", endTime_op: "empty", endTime_not: "Y" });
    expect(buildJobRunHistoryParams({ status: "RUNNING" })).toMatchObject({ startTime_op: "empty", startTime_not: "Y", endTime_op: "empty" });
    expect(buildJobRunHistoryParams({ status: "RUNNING" })).not.toHaveProperty("endTime_not");
    expect(buildJobRunHistoryParams({ status: "TERMINATED" })).toMatchObject({ startTime_op: "empty" });
    expect(buildJobRunHistoryParams({ status: "TERMINATED" })).not.toHaveProperty("startTime_not");
  });
  it.each([undefined, "", " ", "not-a-number", "-1", "1.5"])("keeps invalid count %s unknown", value => {
    expect(readJobRunTotal({ "x-total-count": value })).toBeNull();
  });
  it("accepts zero and either header casing", () => {
    expect(readJobRunTotal({ "x-total-count": "0" })).toBe(0);
    expect(readJobRunTotal({ "X-Total-Count": "57" })).toBe(57);
  });
});
