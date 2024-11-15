import { MutationTree } from 'vuex'
import MaargJobState from './MaargJobState'
import * as types from './mutation-types'

const mutations: MutationTree <MaargJobState> = {
  [types.MAARGJOB_MAARG_JOBS_UPDATED] (state, payload) {
    state.maargJobs = payload
  },
  [types.MAARGJOB_CURRENT_JOB_UPDATED] (state, payload) {
    state.currentMaargJob = payload
  },
  [types.MAARGJOB_JOB_ENUMS_UPDATED] (state, payload) {
    state.maargJobEnums = payload
  },
}
export default mutations;