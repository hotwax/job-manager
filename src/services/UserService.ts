import api from '@/api'

const login = async (username: string, password: string): Promise <any> => {
  return api({
    url: "login", 
    method: "post",
    data: {
      'USERNAME': username, 
      'PASSWORD': password
    }
  });
}

const getProfile = async (): Promise <any>  => {
    return api({
      url: "user-profile", 
      method: "get",
    });
}
const getAvailableTimeZones = async (): Promise <any>  => {
  return api({
    url: "getAvailableTimeZones",
    method: "get",
    cache: true
  });
}
const setUserTimeZone = async (payload: any): Promise <any>  => {
  return api({
    url: "setUserTimeZone",
    method: "post",
    data: payload
  });
}

const getShopifyConfig = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const getEComStores = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const getPinnedJobs = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const updatePinnedJobsPref = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateSearchPreference",
    method: "post",
    data: payload
  });
}

const createPinnedJobPref = async (payload: any): Promise<any> => {
  return api({
    url: "service/createSearchPreference",
    method: "post",
    data: payload
  });
}

const associatePinnedJobPrefToUser = async (payload: any): Promise<any> => {
  return api({
    url: "service/createUserSearchPreference",
    method: "post",
    data: payload
  });
}

export const UserService = {
    createPinnedJobPref,
    login,
    getAvailableTimeZones,
    getEComStores,
    getProfile,
    getShopifyConfig,
    getPinnedJobs,
    associatePinnedJobPrefToUser,
    setUserTimeZone,
    updatePinnedJobsPref
}