import { Module } from 'vuex'
import WebhooksState from './WebhooksState'
import RootState from '@/store/RootState'
import getters from './getters'
import mutations from './mutations'
import actions from './actions'

const webhooksModule: Module<WebhooksState, RootState> = {
  namespaced: true,
  state: {
    cached: {},
    key: {
      topic: "",
      list: []
    },
  },
  getters,
  actions,
  mutations,
}

export default webhooksModule