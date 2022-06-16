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
        console.log(topics);
      }
    }).catch(err => console.error(err))
  },
  async unsubscribeWebhook({ dispatch, state }, payload: any) {
    delete state.cached['bulk_operations/finish']
    console.log(payload);
    const status = await WebhookService.unsubscribe(payload).then(resp => {
      if (resp.status === 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        console.log(resp);
        return true
      }
    }).catch(() => {
      showToast(translate("Something went wrong"));
      return false
    }).finally(() => {
      dispatch('fetchWebhooks')
    })
    return status
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
  },
  async subscribeFileStatusUpdateWebhook({ dispatch }) {

    let resp;

    try {
      resp = await WebhookService.subscribeNewProductsWebhook({ shopifyConfigId: this.state.user.shopifyConfig })

      if (resp.status == 200 && !hasError(resp) && resp.data.webhooks?.length > 0) {  
        showToast(translate('Webhook subscribed succesfully'))
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