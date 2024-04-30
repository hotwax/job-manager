import { ActionTree } from "vuex";
import RootState from "@/store/RootState";
import WebhookState from "./WebhookState";
import { WebhookService } from "@/services/WebhookService";
import { hasError, showToast } from "@/utils";
import * as types from './mutations-types'
import { translate } from '@hotwax/dxp-components'
import logger from "@/logger";

const actions: ActionTree<WebhookState, RootState> = {
  async fetchWebhooks({ commit }) {
    await WebhookService.fetchShopifyWebhooks({ shopifyConfigId: this.state.user.currentShopifyConfig.shopifyConfigId }).then(resp => {
      if (resp.status == 200 && resp.data.webhooks?.length > 0 && !hasError(resp)) {
        const webhooks = resp.data.webhooks;
        const topics: any = {}
        webhooks.map((webhook: any) => {
          topics[webhook.topic] = webhook
        })
        commit(types.WEBHOOK_UPDATED, topics)
      } else {
        commit(types.WEBHOOK_UPDATED, []);
      }
    }).catch (err => {
      logger.error(err);
      commit(types.WEBHOOK_UPDATED, []);
    })
  },
  async unsubscribeWebhook({ dispatch }, payload: any) {

    let resp;

    try {
      resp = await WebhookService.unsubscribeWebhook(payload)
      if (resp.status === 200 && !hasError(resp)) {
        showToast(translate("Webhook unsubscribed successfully"));
      }
    } catch(err) {
      logger.error(err)
      showToast(translate("Something went wrong"));
    } finally {
      dispatch('fetchWebhooks')
    }
  },
  async subscribeWebhook({ dispatch }, id: string) {
    let resp;

    try {
      resp = await WebhookService.subscribeWebhook({ shopifyConfigId: this.state.user.currentShopifyConfig.shopifyConfigId }, id)

      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate('Webhook subscribed successfully'))
      } else {
        showToast(translate('Something went wrong'))
        logger.error(resp)
      }
    } catch (err) {
      showToast(translate('Something went wrong. Unable to subscribe webhook'))
      logger.error(err);
    } finally {
      await dispatch('fetchWebhooks')
    }
  }
}

export default actions
