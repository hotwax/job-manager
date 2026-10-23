import { describe, expect, it } from "vitest";
import { filterJobRuns, getRunStatus } from "@/utils/jobRuns";

describe("shared job history filters", () => {
  const runs = [
    { jobRunId: "M10", startTime: 100, hasError: "N", userId: "System", logs: [] },
    { jobRunId: "M11", startTime: 100, endTime: 200, hasError: "Y", userId: "Operator", logs: [{ logId: "L1" }], errors: "Import rejected" },
    { jobRunId: "M12", startTime: 100, endTime: 200, hasError: "N", userId: "Operator", messages: "Completed" },
    { jobRunId: "M13", hasError: "N", userId: "System" }
  ];

  it("uses the same status vocabulary for raw detail runs and global history", () => {
    expect(runs.map(getRunStatus)).toEqual(["RUNNING", "FAILED", "SUCCESSFUL", "TERMINATED"]);
    expect(filterJobRuns(runs, { status: "FAILED" }).map(run => run.jobRunId)).toEqual(["M11"]);
    expect(filterJobRuns(runs.map(run => ({ ...run, runStatus: getRunStatus(run) })), { status: "FAILED" }).map(run => run.jobRunId)).toEqual(["M11"]);
  });

  it("combines run-id, status, user and data-log filters", () => {
    expect(filterJobRuns(runs, { queryString: " #m11 ", status: "FAILED", userId: " OPERATOR ", hasDataLogs: "Y" })).toEqual([runs[1]]);
    expect(filterJobRuns(runs, { status: "FAILED", hasDataLogs: "N" })).toEqual([]);
  });

  it("searches error and message content case-insensitively", () => {
    expect(filterJobRuns(runs, { queryString: "REJECTED" })).toEqual([runs[1]]);
    expect(filterJobRuns(runs, { queryString: "completed", hasMessages: "Y", hasError: "N" })).toEqual([runs[2]]);
  });

  it("clears filters without losing runs or mutating source order", () => {
    filterJobRuns(runs, { hasError: "Y" });
    expect(filterJobRuns(runs)).toEqual(runs);
    expect(runs.map(run => run.jobRunId)).toEqual(["M10", "M11", "M12", "M13"]);
  });
});
