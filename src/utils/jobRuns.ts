// Shared job-run vocabulary. The global Run History page and a single job's history tab
// show the same runs through the same filters, so the status derivation and the filter
// predicates live here rather than being restated per view.

export type JobRunFilters = {
  queryString?: string;
  status?: string;
  userId?: string;
  hasError?: string;
  hasDataLogs?: string;
  hasMessages?: string;
};

const getRunStatus = (run: any) => {
  if (run.hasError === "Y") return "FAILED";
  if (run.startTime && !run.endTime) return "RUNNING";
  if (run.startTime && run.endTime) return "SUCCESSFUL";
  return "TERMINATED";
};

// Free-text search covers the fields an operator would recognise a run by.
const getRunSearchableText = (run: any) => [
  run.jobRunId,
  run.jobName,
  run.serviceName,
  run.userId,
  run.messages,
  run.results,
  run.errors
].filter(Boolean).join(" ").toLowerCase();

const filterJobRuns = (runs: Array<any>, filters: JobRunFilters = {}) => {
  const queryString = (filters.queryString || "").trim().toLowerCase().replace(/^#/, "");
  const { status, userId, hasError, hasDataLogs, hasMessages } = filters;

  return runs.filter((run: any) => {
    if (queryString && !getRunSearchableText(run).includes(queryString)) return false;
    if (status && (run.runStatus || getRunStatus(run)) !== status) return false;
    if (userId && !String(run.userId || "").toLowerCase().includes(userId.trim().toLowerCase())) return false;
    if (hasError === "Y" && run.hasError !== "Y") return false;
    if (hasError === "N" && run.hasError === "Y") return false;
    if (hasDataLogs === "Y" && !run.logs?.length) return false;
    if (hasDataLogs === "N" && run.logs?.length) return false;
    if (hasMessages === "Y" && !run.messages) return false;
    if (hasMessages === "N" && run.messages) return false;
    return true;
  });
};

export { filterJobRuns, getRunStatus };
