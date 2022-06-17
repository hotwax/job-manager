import api from '@/api'

const fetchShopifyWebhooks = async (payload?:  any): Promise <any>  => {
  return api({
    url: "/service/getShopifyWebhooks",
    method: "post",
    data: payload
  });
}

const subscribeNewOrderWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

const subscribeCancelledOrderWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

const subscribePaymentStatusWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

const subscribeReturnWebhook = async (payload?: any): Promise <any> => {
  return api ({
    url: '',
    method: 'post',
    data: payload
  })
}

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