import { ActionTree } from "vuex";
import RootState from "@/store/RootState";
import WebhooksState from "./WebhooksState";
import { WebhookService } from "@/services/WebhookService";
import { hasError } from "@/utils";
import * as types from './mutations-types'

const actions: ActionTree<WebhooksState, RootState> = {
  async fetchWebhooks({ commit }, payload){
    await WebhookService.fetchShopifyWebhooks(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        const { webhooks } = JSON.parse(resp.data.webhooks);
        const webhooksEnums = JSON.parse(process.env?.VUE_APP_WEBHOOKS_ENUMS as string) as any
        const topics: any = {}
        webhooks.map((webhook: any) => {
          if (webhooksEnums['NEW_PRODUCTS'] === webhook.topic) topics['NEW_PRODUCTS'] = webhook
          if (webhooksEnums['DELETE_PRODUCTS'] === webhook.topic) topics['DELETE_PRODUCTS'] = webhook
          if (webhooksEnums['NEW_ORDERS'] === webhook.topic) topics['NEW_ORDERS'] = webhook
          if (webhooksEnums['CANCELLED_ORDERS'] === webhook.topic) topics['CANCELLED_ORDERS'] = webhook
          if (webhooksEnums['PAYMENT_STATUS'] === webhook.topic) topics['PAYMENT_STATUS'] = webhook
          if (webhooksEnums['RETURNS'] === webhook.topic) topics['RETURNS'] = webhook
        })
        commit(types.WEBHOOK_UPDATED, topics)
      }
    }).catch(err => console.error(err))
  }
}

export default actions