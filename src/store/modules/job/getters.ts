import { GetterTree } from 'vuex'
import JobState from './JobState'
import RootState from '../../RootState'

const getters: GetterTree <JobState, RootState> = {
    getJobStatus: (state) => (id: string): any  => {
      return state.cached[id] ? (state.cached[id].status === "SERVICE_DRAFT" ? state.cached[id].status : state.cached[id].frequency) : 'SERVICE_DRAFT';
    },
    getPendingJobs (state){
      return state.pending.list;
    },
    getOrderBatchJobs (state){
      const batchJobEnums = JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string)
      const batchJobEnumIds = Object.values(batchJobEnums)?.map((job: any) => job.id);

      return batchJobEnumIds.reduce((batches: any, batchJobEnumId: string) => {
        const jobs = state.cached[batchJobEnumId];
        if (jobs) {
          batches = [ ...batches, ...jobs];
        }
        return batches;
      }, [])
    },
    getTemporalExpr: (state) => (id: string): any  => {
      return state.temporalExp[id];
    },
    getJob: (state) => (id: string): any => {
      return state.cached[id];
    },
    getEnumName: (state) => (id: string): any => {
      return state.enumIds[id] ? state.enumIds[id]?.enumName : '';
    },
    isPendingJobsScrollable: (state) => {
      return state.pending.list?.length > 0 && state.pending.list?.length < state.pending.total
    },
    isRunningJobsScrollable: (state) => {
      return state.running.list?.length > 0 && state.running.list?.length < state.running.total
    },
    getRunningJobs (state){
      return state.running.list;
    },
    isHistoryJobsScrollable: (state) => {
      return state.history.list?.length > 0 && state.history.list?.length < state.history.total
    },
    getJobHistory (state){
      return state.history.list;
    },
    getCurrentJob (state) {
      return state.current;
    },
    getMiscellaneousJobs (state){
      return state.miscellaneous.list;
    },
    isMiscellaneousJobsScrollable: (state) => {
      return state.miscellaneous.list?.length > 0 && state.miscellaneous.list?.length < state.miscellaneous.total
    },
    getReportsJobs (state){
      return state.reports.list;
    },
    isReportsJobsScrollable: (state) => {
      return state.reports.list?.length > 0 && state.reports.list?.length < state.reports.total
    },
    getMoreJobs: (state) => (jobEnums: any, enumTypeId: string): any => {
      const orderJobEnumIds = Object.values(jobEnums) as any;

      return Object.keys(state.cached).reduce((jobs: any, enumId: string) => {
        if(state.cached[enumId]?.enumTypeId === enumTypeId && !orderJobEnumIds.includes(enumId)) {
          jobs.push(state.cached[enumId])
        }
        return jobs
      }, [])
    },
    getPipelineFilters: (state) => {
      return state.pipelineFilters;
    },
    getBulkJobs: (state) => {
      return state.bulk.jobs;
    },
    isJobAddedToBulkScheduler: (state) => (jobId: string) => {
      return state.bulk.jobs.some((job: any) => job.jobId === jobId);
    },
    getGlobalRuntime: (state) => {
      return state.bulk.runtime;
    },
    getGlobalFreq: (state) => {
      return state.bulk.frequency;
    },
    getDataLogs: (state) => {
      return state.logs.list
    },
    getDataResourceIds: (state) => (contentId: string) => {
      return state.logs.contentDataResource[contentId];
    }
  }

  export default getters;