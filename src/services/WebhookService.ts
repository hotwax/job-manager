import api from '@/api'
import { showToast } from '@/utils';
import { translate } from "@/i18n";
import store from '@/store';

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
    'endpointUrl': '' 
  },
  'CANCELLED_ORDERS': {
    'topic': 'orders/cancelled',
    'endpointUrl': ''
  },
  'PAYMENT_STATUS': {
    'topic': '',
    'endpointUrl': ''
  },
  'RETURNS': {
    'topic': '',
    'endpointUrl': ''
  },
  'NEW_PRODUCTS': {
    'topic': 'products/create',
    'endpointUrl': ''
  },
  'DELETE_PRODUCTS': {
    'topic': 'products/delete',
    'endpointUrl': 'deleteProductFromShopify'
  },
  'BULK_OPERATIONS_FINISH': {
    'topic': 'bulk_operations/finish',
    'endpointUrl': 'uploadedFileStatusUpdateFromShopify'
  },
  'INVENTORY_LEVEL_UPDATE': {
    'topic': 'inventory_levels/update',
    'endpointUrl': 'inventoryLevelUpdateFromShopify'
  },
  'ORDER_PAID': {
    'topic': 'orders/paid',
    'endpointUrl': 'orderPaidNotificationFromShopify'
  }
} as any

const subscribeWebhook = async (payload?: any, id?: string): Promise <any> => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;

  if(endpointUrl) {
    showToast(translate("Configuration missing"));
    return;
  }
  return api ({
    url: 'service/subscribeShopifyWebhook',
    method: 'post',
    baseURL: baseURL,
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