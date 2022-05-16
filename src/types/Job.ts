export interface Job {
  jobId: String
  jobName: String
  systemJobEnumId: String
  parentJobId: String
  runTime: String
  serviceName: String
  statusId: String
  tempExpr: {
    tempExprId: String
    description: String
  }
  currentRetryCount: number
}