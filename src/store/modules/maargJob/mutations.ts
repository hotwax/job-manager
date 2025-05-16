import { MutationTree } from 'vuex'
import MaargJobState from './MaargJobState'
import * as types from './mutation-types'

const mutations: MutationTree <MaargJobState> = {
  [types.MAARGJOB_UPDATED] (state, payload) {
    state.maargJobs = payload
  },
  [types.MAARGJOB_CURRENT_UPDATED] (state, payload) {
    state.currentMaargJob = payload
  },  
}
export default mutations;