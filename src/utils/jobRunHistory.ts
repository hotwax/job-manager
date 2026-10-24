// Moqui entity-list filters. Only fields on ServiceJobRun are accepted here.
export const buildJobRunHistoryParams = (filters: Record<string, any> = {}) => {
  const params: Record<string, any> = {
    pageIndex: filters.pageIndex ?? 0,
    pageSize: filters.pageSize ?? 25,
    orderByField: "-lastUpdatedStamp,-jobRunId"
  };
  const fields = ["jobRunId", "messages", "results", "errors"];
  const field = fields.includes(filters.searchField) ? filters.searchField : "jobRunId";
  let query = String(filters.queryString || "").trim();
  if(field === "jobRunId") {
    query = query.replace(/^#/, "");
  }
  if(query) {
    params[field] = query;
    params[`${field}_op`] = field === "jobRunId" ? "equals" : "contains";
    if(field !== "jobRunId") {
      params[`${field}_ic`] = "Y";
    }
  }
  if(filters.jobName?.trim()) {
    params.jobName = filters.jobName.trim();
  }
  if(filters.userId?.trim()) {
    params.userId = filters.userId.trim();
  }
  if(filters.status === "FAILED") {
    params.hasError = "Y";
  }
  if(["RUNNING", "SUCCESSFUL", "TERMINATED"].includes(filters.status)) {
    // Requires type-aware empty predicates in Moqui; negated equals includes NULL error flags.
    params.hasError = "Y";
    params.hasError_not = "Y";
    params.startTime_op = "empty";
    if(filters.status !== "TERMINATED") {
      params.startTime_not = "Y";
      params.endTime_op = "empty";
      if(filters.status === "SUCCESSFUL") {
        params.endTime_not = "Y";
      }
    }
  }

  return params;
};

export const readJobRunTotal = (headers: Record<string, any> = {}): number | null => {
  const value = headers["x-total-count"] ?? headers["X-Total-Count"];
  if(value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const count = Number(value);

  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};
