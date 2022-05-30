import api from '@/api'

const fetchShopifyWebhooks = async (payload?: any): Promise <any>  => {
  return api({
    url: "/service/getShopifyWebhooks",
    method: "post",
    data: payload
  });
}

export const WebhookService = {
  fetchShopifyWebhooks
}