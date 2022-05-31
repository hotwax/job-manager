import { ActionTree } from "vuex";
import RootState from "@/store/RootState";
import WebhookState from "./WebhookState";
import { WebhookService } from "@/services/WebhookService";
import { hasError, showToast } from "@/utils";
import * as types from './mutations-types'
import { translate } from '@/i18n'

const actions: ActionTree<WebhookState, RootState> = {
  async fetchWebhooks({ commit }, payload){
    await WebhookService.fetchShopifyWebhooks(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        const { webhooks } = JSON.parse(resp.data.webhooks);
        const topics: any = {}
        webhooks.forEach((topic: any) => {
          topics[topic.topic] = topic
        })
        commit(types.WEBHOOK_UPDATED, topics)
        console.log(topics);
      }
    }).catch(err => console.error(err))
  },
  async unsubscribeWebhook({ commit, state }, payload: any) {
    console.log(payload);
    
    await WebhookService.unsubscribe(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        return true
      }
    }).catch(() => {
      showToast(translate("Something went wrong"));
      console.log(state.cached);
      return false
    })  
  },
  // Webhook Subscription Actions
  async updateNewOrder({ commit }, payload: any) {
    console.log('New Order');

    await WebhookService.subscribeNewOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateCancelledOrder({ commit }, payload: any) {
    console.log('Cancel Order');

    await WebhookService.subscribeCancelledOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updatePaymentStatus({ commit }, payload: any) {
    console.log('Payment Status');

    await WebhookService.subscribeNewOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateReturns({ commit }, payload: any) {
    console.log('Returns');

    await WebhookService.subscribeCancelledOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateDeleteProducts({ commit }, payload: any) {
    console.log('New Products');

    await WebhookService.subscribeDeleteProductsWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateNewProducts({ commit }, payload: any) {
    console.log('Delete Products');

    await WebhookService.subscribeNewProductsWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  }
}

export default actions