import { MutationTree } from "vuex";
import WebhooksState from "./WebhooksState";

const mutations: MutationTree<WebhooksState> = {
  setWebhooks (state, payload: any) {
    state.cached = payload
  }
}

export default mutations