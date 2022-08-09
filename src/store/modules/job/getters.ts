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
      return state.cached[id]
    },
    getEnumDescription: (state) => (id: string): any => {
      return state.enumIds[id]?.description;
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
  }

  export default getters;