import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import MaargJobState from './MaargJobState'
import RootState from '../../RootState'

const maargJobModule: Module<MaargJobState, RootState> = {
    namespaced: true,
    state: {
      maargJobs: {},
      currentMaargJob: {},
      maargJobEnums: {}
    },
    getters,
    actions,
    mutations,
}

export default maargJobModule;