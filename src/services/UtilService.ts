import { api, client } from '@/adapter';
import store from '@/store';

const getServiceStatusDesc = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: payload,
    cache: true
  });
}

const getSystemInformation = async (): Promise<any> => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "admin/maarg",
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

export const UtilService = {
  getSystemInformation,
  getServiceStatusDesc
}