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
    getDataManagerLogs: (state) => {
      return state.dataManagerLogs
    }
  }

  export default getters;