import { ActionTree } from "vuex";
import RootState from "@/store/RootState";
import WebhookState from "./WebhookState";
import { WebhookService } from "@/services/WebhookService";
import { hasError, showToast } from "@/utils";
import * as types from './mutations-types'
import { translate } from '@/i18n'

const actions: ActionTree<WebhookState, RootState> = {
  async fetchWebhooks({ commit }) {
    await WebhookService.fetchShopifyWebhooks({ shopifyConfigId: this.state.user.currentShopifyConfigId }).then(resp => {
      if (resp.status == 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        const webhooks = resp.data.webhooks;
        const topics: any = {}
        webhooks.map((webhook: any) => {
          topics[webhook.topic] = webhook
        })
        commit(types.WEBHOOK_UPDATED, topics)
      }
    }).catch(err => console.error(err))
  },
  async unsubscribeWebhook({ dispatch }, payload: any) {

    let resp;

    try {
      resp = await WebhookService.unsubscribeWebhook(payload)
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate("Webhook unsubscribed successfully"));
      }
    } catch(err) {
      console.log(err)
      showToast(translate("Something went wrong"));
    } finally {
      dispatch('fetchWebhooks')
    }
  },
  async subscribeWebhook({ dispatch }, id: string) {
    let resp;

    try {
      resp = await WebhookService.subscribeWebhook({ shopifyConfigId: this.state.user.currentShopifyConfigId }, id)

      if (resp.status == 200 && !hasError(resp)) {
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