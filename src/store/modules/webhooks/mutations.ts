import { MutationTree } from "vuex";
import WebhooksState from "./WebhooksState";
import * as types from './mutations-types'

const mutations: MutationTree<WebhooksState> = {
  [types.WEBHOOK_UPDATED] (state, payload: any) {
    state.cached = payload
  }
}

export default mutations