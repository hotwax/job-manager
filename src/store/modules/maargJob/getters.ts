import { GetterTree } from 'vuex'
import MaargJobState from './MaargJobState'
import RootState from '../../RootState'

const getters: GetterTree <MaargJobState, RootState> = {
  getMaargJob: (state) => (jobTypeEnumId: string): any => {
    return state.maargJobs[jobTypeEnumId] ? state.maargJobs[jobTypeEnumId] : {}
  },
  getMaargJobsList: (state) => {
    return state.maargJobs ? Object.values(state.maargJobs) : []
  },
  getCurrentMaargJob: (state) => {
    return state.currentMaargJob
  },
  getMaargJobEnums (state) {
    return state.maargJobEnums
  },
  isMaargJobAvailable: (state) => (enumId: string): any => {
    return Object.keys(state.maargJobs).includes(enumId);
  }
}

export default getters;