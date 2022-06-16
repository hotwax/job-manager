import { ActionTree } from "vuex";
import RootState from "@/store/RootState";
import WebhookState from "./WebhookState";
import { WebhookService } from "@/services/WebhookService";
import { hasError, showToast } from "@/utils";
import * as types from './mutations-types'
import { translate } from '@/i18n'

const actions: ActionTree<WebhookState, RootState> = {
  async fetchWebhooks({ commit }) {
    await WebhookService.fetchShopifyWebhooks({ shopifyConfigId: this.state.user.shopifyConfig }).then(resp => {
      if (resp.status == 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        const webhooks = resp.data.webhooks;
        const topics: any = {}
        webhooks.map((topic: any) => {
          topics[topic.topic] = topic
        })
        commit(types.WEBHOOK_UPDATED, topics)
      }
    }).catch(err => console.error(err))
  },
  async unsubscribeWebhook({ dispatch, state }, payload: any) {
    await WebhookService.unsubscribe(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        showToast(translate("Webhook unsubscribed successfully"));
      }
    }).catch(() => {
      showToast(translate("Something went wrong"));
    }).finally(() => dispatch('fetchWebhooks'))
  },
  // Webhook Subscription Actions
  async updateNewOrder({ commit }, payload: any) {
    await WebhookService.subscribeNewOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateCancelledOrder({ commit }, payload: any) {
    await WebhookService.subscribeCancelledOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updatePaymentStatus({ commit }, payload: any) {
    await WebhookService.subscribeNewOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateReturns({ commit }, payload: any) {
    await WebhookService.subscribeCancelledOrderWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateDeleteProducts({ commit }, payload: any) {
    await WebhookService.subscribeDeleteProductsWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async updateNewProducts({ commit }, payload: any) {
    await WebhookService.subscribeNewProductsWebhook(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        commit(types.WEBHOOK_CURRENT_UPDATED, resp)
      }
    })
  },
  async subscribeFileStatusUpdateWebhook({ dispatch }) {

    let resp;

    try {
      resp = await WebhookService.subscribeNewProductsWebhook({ shopifyConfigId: this.state.user.shopifyConfig })

      if (resp.status == 200 && !hasError(resp) && resp.data.webhooks?.length > 0) {  
        showToast(translate('Webhook subscribed successfully'))
      } else {
        showToast(translate('Something went wrong'))
        console.error(resp)
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      console.error(err);
    } finally {
      await dispatch('fetchWebhooks')
    }
  }
}

export default actions