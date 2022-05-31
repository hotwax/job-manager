import { ActionTree } from "vuex";
import RootState from "@/store/RootState";
import WebhookState from "./WebhookState";
import { WebhookService } from "@/services/WebhookService";
import { hasError } from "@/utils";
import * as types from './mutations-types'

const actions: ActionTree<WebhookState, RootState> = {
  async fetchWebhooks({ commit }, payload){
    await WebhookService.fetchShopifyWebhooks(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        const { webhooks } = JSON.parse(resp.data.webhooks);
        const webhookEnums = JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any
        const topics: any = {}
        webhooks.map((webhook: any) => {
          if (webhookEnums['NEW_PRODUCTS'] === webhook.topic) topics['NEW_PRODUCTS'] = webhook
          if (webhookEnums['DELETE_PRODUCTS'] === webhook.topic) topics['DELETE_PRODUCTS'] = webhook
          if (webhookEnums['NEW_ORDERS'] === webhook.topic) topics['NEW_ORDERS'] = webhook
          if (webhookEnums['CANCELLED_ORDERS'] === webhook.topic) topics['CANCELLED_ORDERS'] = webhook
          if (webhookEnums['PAYMENT_STATUS'] === webhook.topic) topics['PAYMENT_STATUS'] = webhook
          if (webhookEnums['RETURNS'] === webhook.topic) topics['RETURNS'] = webhook
        })
        commit(types.WEBHOOK_UPDATED, topics)
      }
    }).catch(err => console.error(err))
  },
  async updateWebhook({ commit }, payload: any) {
    await WebhookService.updateWebhook(payload).then(resp => {
      console.log(resp);
      commit(types.WEBHOOK_CURRENT_UPDATED, resp)
    })  
  },
  async deleteWebhook({ commit }, payload: any) {
    await WebhookService.deleteWebhook(payload).then(resp => {
      console.log(resp);
      commit(types.WEBHOOK_CURRENT_UPDATED, resp)
    })  
  }
}

export default actions