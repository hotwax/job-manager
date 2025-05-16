export default interface JobState {
    cached: any;
    pending: {
      list: any,
      total: 0
    }
    running: {
      list: any,
      total: 0
    }
    history: {
      list: any,
      total: 0
    }
    miscellaneous: {
      list: any,
      total: 0
    }
    current: any;
    temporalExp: any;
    enumIds: any;
    pipelineFilters: {
      status: any,
      category: any,
      enum: any
    },
    dataManagerLogs: any
}