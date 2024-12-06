import { GetterTree } from 'vuex'
import MaargJobState from './MaargJobState'
import RootState from '../../RootState'

const getters: GetterTree <MaargJobState, RootState> = {
  getMaargJob: (state) => (jobTypeEnumId: string): any => {
    return state.maargJobs[jobTypeEnumId] ? state.maargJobs[jobTypeEnumId] : {}
  },
  getCurrentMaargJob: (state) => {
    return state.currentMaargJob
  },
  getMaargJobEnums (state) {
    return state.maargJobEnums
  }
}

export default getters;