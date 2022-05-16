export interface Job {
  id: String
  name: String
  systemJobEnum: {
    id: any
    name: String
    description: String
  }
  parentJobId: String
  runTime: String
  cancelDateTime?: String
  finishDateTime?: String
  serviceName: String
  status: {
    id: String
    description: any
  }
  tempExpr: {
    id: any
    integer1: number
    integer2: number
    description: String
  }
  currentRetryCount?: number
}