import { api, client } from '@/adapter';
import logger from '@/logger';
import store from '@/store';
import { hasError } from '@/utils'

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

const moquiLogin = async (omsRedirectionUrl: string, token: string): Promise <any> => {
  const baseURL = omsRedirectionUrl.startsWith('http') ? omsRedirectionUrl.includes('/rest/s1/admin') ? omsRedirectionUrl : `${omsRedirectionUrl}/rest/s1/admin/` : `https://${omsRedirectionUrl}.hotwax.io/rest/s1/admin/`;
  let api_key = ""

  try {
    const resp = await client({
      url: "login",
      method: "post",
      baseURL,
      params: {
        token
      },
      headers: {
        "Content-Type": "application/json"
      }
    }) as any;

    if(!hasError(resp) && (resp.data.api_key || resp.data.token)) {
      api_key = resp.data.api_key || resp.data.token
    } else {
      throw "Sorry, login failed. Please try again";
    }
  } catch(err) {
    return Promise.resolve("");
  }
  return Promise.resolve(api_key)
}

const getShopifyConfig = async (productStoreId: any, token?: any): Promise <any>  => {
  try {
    const params = {
      "inputFields": {
        "productStoreId": productStoreId,
      },
      "entityName": "ShopifyShopAndConfig",
      "noConditionFind": "Y",
      "fieldList": ["shopifyConfigId", "name", "shopId"]
    }
    const payload = {
      url: "performFind",
      method: "get",
      params,
      cache: true
    } as any;

    // Handled the case when getting config during the login action
    // We haven't set the token in store till all the essential information is gathered during login
    if (token) {
      payload.headers = {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }
    payload.baseURL = store.getters['user/getBaseUrl'];
    const resp = await client(payload);
    if (!hasError(resp)) {
      return Promise.resolve(resp?.data.docs);
    } else {
      throw resp.data
    }
  } catch(error: any) {
    logger.error(error)
    return Promise.resolve([])
  }
}

const getEComStores = async (token: any): Promise<any> => {
  try {
    const params = {
      "inputFields": {
        "storeName_op": "not-empty"
      },
      "fieldList": ["productStoreId", "storeName"],
      "entityName": "ProductStore",
      "distinct": "Y",
      "noConditionFind": "Y"
    }
    const baseURL = store.getters['user/getBaseUrl'];
    const resp = await client({
      url: "performFind",
      method: "get",
      baseURL,
      params,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (hasError(resp)) {
      return Promise.reject(resp?.data);
    } else {
      return Promise.resolve(resp?.data.docs);
    }
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const getEcommerceCatalog = async (productStoreId: any): Promise<any> => {
  try {
    const params = {
      "inputFields": {
        productStoreId
      },
      "fieldList": ["productStoreId", "prodCatalogId"],
      "entityName": "ProductStoreCatalog",
      "distinct": "Y",
      "noConditionFind": "Y",
      "filterByDate": 'Y',
    }
    const resp = await api({
      url: "performFind",
      method: "get",
      params,
      cache: true
    });
    if (hasError(resp) || resp?.data.docs?.length == 0) {
      // if has error or not catalog found
      return Promise.reject(resp?.data);
    } else {
      return Promise.resolve(resp?.data.docs[0]);
    }
  } catch(error: any) {
    return Promise.reject(error)
  }
}


const getPreOrderBackorderCategory = async (prodCatalogId: any): Promise<any> => {
  try {
    const params = {
      "inputFields": {
        prodCatalogId,
        "prodCatalogCategoryTypeId": ["PCCT_PREORDR", "PCCT_BACKORDER"],
        "prodCatalogCategoryTypeId_op": "in"
      },
      "fieldList": ["prodCatalogId", "productCategoryId", "prodCatalogCategoryTypeId"],
      "entityName": "ProdCatalogCategory",
      "distinct": "Y",
      "noConditionFind": "Y",
      "filterByDate": 'Y',
    }
    const resp = await api({
      url: "performFind",
      method: "get",
      params,
      cache: true
    });
    if (hasError(resp) || resp?.data.docs?.length == 0) {
      return Promise.reject(resp?.data);
    } else {
      return Promise.resolve(resp?.data.docs);
    }
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const getPinnedJobs = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
}

const updatePinnedJobPref = async (payload: any): Promise<any> => {
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

const setUserPreference = async (payload: any): Promise<any> => {
  return api({
    url: "service/setUserPreference",
    method: "post",
    data: payload
  });
}

const getPreferredStore = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await client({
      url: "service/getUserPreference",
      //TODO Due to security reasons service model of OMS 1.0 does not support sending parameters in get request that's why we use post here
      method: "post",
      baseURL,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      data: {
        'userPrefTypeId': 'FAVORITE_PRODUCT_STORE'
      },
    });
    if (hasError(resp)) {
      return Promise.reject(resp?.data);
    } else {
      return Promise.resolve(resp?.data.userPrefValue);
    }
  } catch(error: any) {
    return Promise.reject(error)
  }
  
}

const getPreferredShopifyShop = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await client({
      url: "service/getUserPreference",
      //TODO Due to security reasons service model of OMS 1.0 does not support sending parameters in get request that's why we use post here
      method: "post",
      baseURL,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      data: {
        'userPrefTypeId': 'FAVORITE_SHOPIFY_SHOP'
      },
    });
    if (!hasError(resp)) {
      return Promise.resolve(resp?.data.userPrefValue);
    } else {
      throw resp.data
    }
  } catch(error: any) {
    logger.error(error)
    return Promise.resolve(null)
  }
  
}

const getUserPermissions = async (payload: any, token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  let serverPermissions = [] as any;

  // If the server specific permission list doesn't exist, getting server permissions will be of no use
  // It means there are no rules yet depending upon the server permissions.
  if (payload.permissionIds && payload.permissionIds.length == 0) return serverPermissions;
  // TODO pass specific permissionIds
  let resp;
    // TODO Make it configurable from the environment variables.
    // Though this might not be an server specific configuration, 
    // we will be adding it to environment variable for easy configuration at app level
    const viewSize = 200;

    try {
      const params = {
        "viewIndex": 0,
        viewSize,
        permissionIds: payload.permissionIds
      }
      resp = await client({
        url: "getPermissions",
        method: "post",
        baseURL,
        data: params,
        headers: {
          Authorization:  'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      })
      if(resp.status === 200 && resp?.data.docs?.length && !hasError(resp)) {
        serverPermissions = resp?.data.docs.map((permission: any) => permission.permissionId);
        const total = resp?.data.count;
        const remainingPermissions = total - serverPermissions.length;
        if (remainingPermissions > 0) {
          // We need to get all the remaining permissions
          const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + ( remainingPermissions % viewSize != 0 ? 1 : 0);
          const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
            const response = await client({
              url: "getPermissions",
              method: "post",
              baseURL,
              data: {
                "viewIndex": index + 1,
                viewSize,
                permissionIds: payload.permissionIds
              },
              headers: {
                Authorization:  'Bearer ' + token,
                'Content-Type': 'application/json'
              }
            })
            if(!hasError(response)){
              return Promise.resolve(response);
              } else {
              return Promise.reject(response);
              }
          }))
          const permissionResponses = {
            success: [],
            failed: []
          }
          responses.reduce((permissionResponses: any, permissionResponse: any) => {
            if (permissionResponse.status !== 200 || hasError(permissionResponse) || !permissionResponse.data?.docs) {
              permissionResponses.failed.push(permissionResponse);
            } else {
              permissionResponses.success.push(permissionResponse);
            }
            return permissionResponses;
          }, permissionResponses)

          serverPermissions = permissionResponses.success.reduce((serverPermissions: any, response: any) => {
            serverPermissions.push(...response.data.docs.map((permission: any) => permission.permissionId));
            return serverPermissions;
          }, serverPermissions)

          // If partial permissions are received and we still allow user to login, some of the functionality might not work related to the permissions missed.
          // Show toast to user intimiting about the failure
          // Allow user to login
          // TODO Implement Retry or improve experience with show in progress icon and allowing login only if all the data related to user profile is fetched.
          if (permissionResponses.failed.length > 0) Promise.reject("Something went wrong while getting complete user permissions.");
        }
      }
      return serverPermissions;
    } catch(error: any) {
      return Promise.reject(error);
    }
}
const getUserProfile = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await client({
      url: "user-profile",
      method: "get",
      baseURL,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if(hasError(resp)) return Promise.reject("Error getting user profile: " + JSON.stringify(resp?.data));
    return Promise.resolve(resp?.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}


export const UserService = {
    createPinnedJobPref,
    login,
    getEComStores,
    getEcommerceCatalog,
    getPreOrderBackorderCategory,
    getShopifyConfig,
    getPinnedJobs,
    getPreferredShopifyShop,
    getPreferredStore,
    getUserProfile,
    associatePinnedJobPrefToUser,
    updatePinnedJobPref,
    setUserPreference,
    getUserPermissions,
    moquiLogin
}