import { GetterTree } from 'vuex'
import JobState from './JobState'
import RootState from '../../RootState'
import { JobService } from '@/services/JobService';
import { State } from '@ionic/core/dist/types/stencil-public-runtime';

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
      return state.cached[id]
    },
    getDescription: (state) => (id: string): any => {
      return state.enumIds[id];
    },
    isPendingJobsScrollable: (state) => {
      return state.pending.list.length > 0 && state.pending.list.length < state.pending.total
    },
    isHistoryJobsScrollable: (state) => {
      return state.history.list.length > 0 && state.history.list.length < state.history.total
    },
    getJobHistory (state){
      return state.history.list;
    },
    getShowAlertBoolean (state) {
      return state.showAlert
    }
  }

  export default getters;