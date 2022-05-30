import { GetterTree } from "vuex";
import RootState from "@/store/RootState";
import WebhookState from "./WebhookState";

const getters: GetterTree<WebhookState, RootState> = {
  getCachedWebhook: (state) => state.cached
}

export default getters