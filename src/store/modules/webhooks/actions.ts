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
        const webhooksEnums = JSON.parse(process.env?.VUE_APP_WEBHOOKS_ENUMS as string) as any
        const topics: any = {}
        webhooks.forEach((webhook: any) => {
          if (webhooksEnums['NEW_PRODUCTS'] === webhook.topic) topics['NEW_PRODUCTS'] = webhook
          if (webhooksEnums['DELETE_PRODUCTS'] === webhook.topic) topics['DELETE_PRODUCTS'] = webhook
          if (webhooksEnums['NEW_ORDERS'] === webhook.topic) topics['NEW_ORDERS'] = webhook
          if (webhooksEnums['CANCELLED_ORDERS'] === webhook.topic) topics['CANCELLED_ORDERS'] = webhook
          if (webhooksEnums['PAYMENT_STATUS'] === webhook.topic) topics['PAYMENT_STATUS'] = webhook
          if (webhooksEnums['RETURNS'] === webhook.topic) topics['RETURNS'] = webhook
        })
        commit('setWebhooks', topics)
      } else {
        console.log('something went wrong');
      }
    }).catch(err => console.error(err))
  }
}

export default actions