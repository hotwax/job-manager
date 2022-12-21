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

const webhookParameters = {
  'NEW_ORDERS': {
    'topic': 'orders/create',
    'endpoint': ''
  },
  'CANCELLED_ORDERS': {
    'topic': 'orders/cancelled',
    'endpoint': ''
  },
  'PAYMENT_STATUS': {
    'topic': '',
    'endpoint': ''
  },
  'RETURNS': {
    'topic': '',
    'endpoint': ''
  },
  'NEW_PRODUCTS': {
    'topic': 'products/create',
    'endpoint': ''
  },
  'DELETE_PRODUCTS': {
    'topic': 'products/delete',
    'endpoint': 'deleteProductFromShopify'
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

const subscribeWebhook = async (payload?: any, id?: string): Promise <any> => {
  const topic = webhookParameters[id as string].topic;
  const endpoint = webhookParameters[id as string].endpoint;
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