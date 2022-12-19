import api from '@/api'
import { showToast } from '@/utils';
import { translate } from "@/i18n";

const fetchShopifyWebhooks = async (payload?:  any): Promise <any>  => {
  return api({
    url: "/service/getShopifyWebhooks",
    method: "post",
    data: payload
  });
}

// TODO: add the service endpoint for the new order webhook, cancelled order webhook, payment status webhook, order return webhook & new product webhook.
const webhookEndpointUrls = {
  'NEW_ORDERS': 'service/subscribeOrderCreateWebhook',
  'CANCELLED_ORDERS': 'service/subscribeOrderCancelWebhook',
  'PAYMENT_STATUS': '',
  'RETURNS': 'service/subscribeOrderReturnWebhook',
  'NEW_PRODUCTS': 'service/subscribeProductCreateWebhook',
  'DELETE_PRODUCTS': 'service/subscribeProductDeleteWebhook',
  'BULK_OPERATIONS_FINISH': 'service/subscribeFileStatusUpdateWebhook'
} as any

const subscribeWebhook = async (payload?: any, id?: string): Promise <any> => {
  const endpointUrl = webhookEndpointUrls[id as string];
  if(!endpointUrl) {
    showToast(translate("Configuration missing"));
    return;
  }
  return api ({
    url: endpointUrl,
    method: 'post',
    data: payload
  })
}

const unsubscribeWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: 'service/removeShopifyWebhook',
    method: 'post',
    data: payload
  })
}

export const WebhookService = {
  fetchShopifyWebhooks,
  unsubscribeWebhook,
  subscribeWebhook,
}