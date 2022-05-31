import api from '@/api'

const fetchShopifyWebhooks = async (payload?: any): Promise <any>  => {
  return api({
    url: "/service/getShopifyWebhooks",
    method: "post",
    data: payload
  });
}

const updateWebhook =async (payload?: any): Promise <any> => {
  // return api({
  //   url: 'updation url',
  //   methood: 'post',
  //   data: payload
  // })
}

const deleteWebhook = async (payload?: any): Promise <any> => {
  return api({
    url: '',
    method: '',
    data: payload
  })
}

export const WebhookService = {
  fetchShopifyWebhooks,
  updateWebhook,
  deleteWebhook
}