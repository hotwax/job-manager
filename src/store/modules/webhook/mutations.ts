import { MutationTree } from "vuex";
import WebhookState from "./WebhookState";
import * as types from './mutations-types'

const mutations: MutationTree<WebhookState> = {
  [types.WEBHOOK_UPDATED] (state, payload: any) {
    state.cached = payload
  },
  [types.WEBHOOK_CURRENT_UPDATED] (state, payload: any) {
    // state.cached[payload[webhookEnum]] = payload.webhook
  }
}

export default mutations