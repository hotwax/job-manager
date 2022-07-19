import { Module } from 'vuex'
import WebhookState from './WebhookState'
import RootState from '@/store/RootState'
import getters from './getters'
import mutations from './mutations'
import actions from './actions'

const webhookModule: Module<WebhookState, RootState> = {
  namespaced: true,
  state: {
    cached: {}
  },
  getters,
  actions,
  mutations,
}

export default webhookModule