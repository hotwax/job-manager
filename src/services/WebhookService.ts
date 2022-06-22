import api from '@/api'

const fetchShopifyWebhooks = async (payload?:  any): Promise <any>  => {
  return api({
    url: "/service/getShopifyWebhooks",
    method: "post",
    data: payload
  });
}

// TODO: add the service endpoint for the new order webhook
const subscribeNewOrderWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

// TODO: add the service endpoint for the cancelled order webhook
const subscribeCancelledOrderWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

// TODO: add the service endpoint for the payment status webhook
const subscribePaymentStatusWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

// TODO: add the service endpoint for the order return webhook
const subscribeReturnWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

// TODO: add the service endpoint for the new product webhook
const subscribeNewProductsWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

const subscribeDeleteProductsWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: 'service/subscribeProductDeleteWebhook',
    method: 'post',
    data: payload
  })
}

const subscribeFileStatusUpdateWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: 'service/subscribeFileStatusUpdateWebhook',
    method: 'post',
    data: payload
  })
}

const webhookMethods = {
  'NEW_ORDERS': subscribeNewOrderWebhook,
  'CANCELLED_ORDERS': subscribeCancelledOrderWebhook,
  'PAYMENT_STATUS': subscribePaymentStatusWebhook,
  'RETURNS': subscribeReturnWebhook,
  'NEW_PRODUCTS': subscribeNewProductsWebhook,
  'DELETE_PRODUCTS': subscribeDeleteProductsWebhook,
  'BULK_OPERATIONS_FINISH': subscribeFileStatusUpdateWebhook
} as any

const subscribeWebhook = async (payload?: any, id?: string): Promise <any> => {
  const endpointUrl = webhookMethods[id as string];
  return api ({
    url: endpointUrl ? `service/ + ${endpointUrl}` : '',
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
  subscribeNewOrderWebhook,
  subscribeCancelledOrderWebhook,
  subscribeFileStatusUpdateWebhook,
  subscribePaymentStatusWebhook,
  subscribeReturnWebhook,
  subscribeNewProductsWebhook,
  subscribeDeleteProductsWebhook,
  unsubscribeWebhook,
  subscribeWebhook,
  webhookMethods
}