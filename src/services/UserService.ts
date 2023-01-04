import api, {client} from '@/api'
import store from '@/store';
import { prepareAppPermissions } from '@/authorization'
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

const checkPermission = async (payload: any): Promise <any>  => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: "checkPermission",
    method: "post",
    baseURL: baseURL,
    ...payload
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
    method: "get",
    params: payload
  });
}

const getEComStores = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
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

const getUserPreference = async (payload: any): Promise<any> => {
  return api({
    url: "service/getUserPreference",
    //TODO Due to security reasons service model of OMS 1.0 does not support sending parameters in get request that's why we use post here
    method: "post",
    data: payload,
  });
}
const getUserPermissions = async (payload: any, token: any): Promise<any> => {
  let appPermissions = [] as any;

  // If the server specific permission list doesn't exist, getting server permissions will be of no use
  // It means there are no rules yet depending upon the server permissions.
  if (payload.permissionIds && payload.permissionIds.length == 0) return appPermissions;
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
      resp = await getPermissions({
        data: params,
        headers: {
          Authorization:  'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });
      if(resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
        let serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
        const total = resp.data.count;
        const remainingPermissions = total - serverPermissions.length;
        if (remainingPermissions > 0) {
          // We need to get all the remaining permissions
          const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + ( remainingPermissions % viewSize != 0 ? 1 : 0);
          const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
            const response = await getPermissions({
              data: {
              "viewIndex": index + 1,
              viewSize,
              permissionIds: payload.permissionIds
            },
            headers: {
              Authorization:  'Bearer ' + token,
              'Content-Type': 'application/json'
            }});
            if(response.status === 200 && !hasError(response)){
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
          // if (permissionResponses.failed.length > 0) showToast(translate("Something went wrong while getting complete user profile. Try login again for smoother experience."));
        }
        appPermissions = prepareAppPermissions(serverPermissions);
      }
      return appPermissions;
    } catch(error: any) {
      console.error(error);
    }
}
const getPermissions = async (payload: any): Promise<any> => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: "getPermissions",
    method: "post",
    baseURL: baseURL,
    ...payload
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
    updatePinnedJobPref,
    setUserPreference,
    getUserPreference,
    checkPermission,
    getUserPermissions
}