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
  unsubscribeWebhook
}