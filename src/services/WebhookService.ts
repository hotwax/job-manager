import { api } from '@/adapter';
import { showToast } from '@/utils';
import { translate } from "@hotwax/dxp-components";

const fetchShopifyWebhooks = async (payload?:  any): Promise <any>  => {
  return api({
    url: "/service/getShopifyWebhooks",
    method: "post",
    data: payload
  });
}

const webhookParameters = {
  'NEW_ORDERS': {
    'topic': 'orders/create',
    'endpoint': 'createOrderShopifyWebhook'
  },
  'CANCELLED_ORDERS': {
    'topic': 'orders/cancelled',
    'endpoint': 'cancelOrderShopifyWebhook'
  },
  'PAYMENT_STATUS': {
    'topic': 'order_transactions/create',
    'endpoint': 'getTransactionAndMarkOrderPaid'
  },
  'RETURNS': {
    'topic': 'refunds/create',
    'endpoint': 'returnOrderShopifyWebhook'
  },
  'BULK_OPERATIONS_FINISH': {
    'topic': 'bulk_operations/finish',
    'endpoint': 'uploadedFileStatusUpdateFromShopify'
  },
  'INVENTORY_LEVEL_UPDATE': {
    'topic': 'inventory_levels/update',
    'endpoint': 'inventoryLevelUpdateFromShopify'
  },
  'ORDER_PAID': {
    'topic': 'orders/paid',
    'endpoint': 'orderPaidNotificationFromShopify'
  }
} as any

const subscribeWebhook = async (payload: any, id: string): Promise <any> => {
  const webhookParameter = webhookParameters[id]
  const topic = webhookParameter.topic;
  const endpoint = webhookParameter.endpoint;
  if(!endpoint) {
    showToast(translate("Configuration missing"));
    return;
  }
  payload['topic'] = topic;
  payload['endpoint'] = endpoint;

  return api ({
    url: 'service/subscribeShopifyWebhook',
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