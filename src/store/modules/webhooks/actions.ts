import { ActionTree } from "vuex";
import RootState from "@/store/RootState";
import WebhooksState from "./WebhooksState";
import { WebhooksService } from "@/services/WebhooksService";
import { hasError } from "@/utils";

const actions: ActionTree<WebhooksState, RootState> = {
  async fetchWebhooks({ commit }, payload){
    await WebhooksService.fetchShopifyWebhooks(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        const { webhooks } = JSON.parse(resp.data.webhooks);
        console.log(webhooks);
        
        const topics: any = {}
        webhooks.forEach((topic: any) => {
          topics[topic.topic] = topic
        })
        commit('setWebhooks', topics)
      } else {
        console.log('something went wrong');
      }
    }).catch(err => console.error(err))
  }
}

export default actions