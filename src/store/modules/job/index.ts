import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import JobState from './JobState'
import RootState from '../../RootState'

const jobModule: Module<JobState, RootState> = {
    namespaced: true,
    state: {
      cached: {},
      pending: {
        list: [],
        total: 0
      },
      temporalExp: [],
      enumIds: {},
      total: 0
    },
    getters,
    actions,
    mutations,
}

export default jobModule;

// TODO
// store.registerModule('job', jobModule);
