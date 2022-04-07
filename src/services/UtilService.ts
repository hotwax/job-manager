import api from '@/api'

const getServiceStatusDesc = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload,
    cache: true
  });
}

export const UtilService = {
  getServiceStatusDesc
}