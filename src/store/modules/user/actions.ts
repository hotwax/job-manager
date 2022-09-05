import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { Settings } from 'luxon'

const actions: ActionTree<UserState, RootState> = {

  /**
 * Login user and return token
 */
  async login ({ commit, dispatch }, { username, password }) {
    try {
      const resp = await UserService.login(username, password)
      if (resp.status === 200 && resp.data) {
        if (resp.data.token) {
          const permissionId = process.env.VUE_APP_PERMISSION_ID;
          if (permissionId) {
            const checkPermissionResponse = await UserService.checkPermission({
              data: {
                permissionId
              },
              headers: {
                Authorization:  'Bearer ' + resp.data.token,
                'Content-Type': 'application/json'
              }
            });

            if (checkPermissionResponse.status === 200 && !hasError(checkPermissionResponse) && checkPermissionResponse.data && checkPermissionResponse.data.hasPermission) {
              commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
              dispatch('getProfile')
              if (resp.data._EVENT_MESSAGE_ && resp.data._EVENT_MESSAGE_.startsWith("Alert:")) {
              // TODO Internationalise text
                showToast(translate(resp.data._EVENT_MESSAGE_));
              }
              return resp.data;
            } else {
              const permissionError = 'You do not have permission to access the app.';
              showToast(translate(permissionError));
              console.error("error", permissionError);
              return Promise.reject(new Error(permissionError));
            }
          } else {
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
            await dispatch('getProfile')
            return resp.data;
          }
        } else if (hasError(resp)) {
          showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
    } catch (err) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
    // return resp
  },

  /**
   * Logout user
   */
  async logout ({ commit, dispatch }) {
    // TODO add any other tasks if need
    dispatch('job/clearJobState', null, { root: true });
    commit(types.USER_END_SESSION)
  },

  /**
   * Get User profile
   */
  async getProfile ({ commit, dispatch }) {
    const resp = await UserService.getProfile()
    if (resp.status === 200) {
      const payload = {
        "inputFields": {
          "storeName_op": "not-empty"
        },
        "fieldList": ["productStoreId", "storeName"],
        "entityName": "ProductStore",
        "distinct": "Y",
        "noConditionFind": "Y"
      }

      const storeResp = await UserService.getEComStores(payload);
      if(storeResp.status === 200 && !hasError(storeResp) && storeResp.data.docs?.length > 0) {
        const stores = storeResp.data.docs;

        resp.data.stores = [
          ...(stores ? stores : []),
          {
            productStoreId: "",
            storeName: "None"
          }
        ]
      }
      const currentProductStoreId = resp.data?.stores[0].productStoreId;
      if (currentProductStoreId) {
        dispatch('getShopifyConfig', currentProductStoreId);
      }

      this.dispatch('util/getServiceStatusDesc')
      if (resp.data.userTimeZone) {
        Settings.defaultZone = resp.data.userTimeZone;
      }
      const stores = resp.data.stores
      const userPrefResponse =  await UserService.getUserPreference({
        'userPrefTypeId': 'SELECTED_BRAND'
      });
      if(userPrefResponse.status === 200 && !hasError(userPrefResponse)) {
        const userPrefStore = stores.find((store: any) => store.productStoreId === userPrefResponse.data.userPrefValue)
        commit(types.USER_CURRENT_ECOM_STORE_UPDATED, userPrefStore ? userPrefStore : stores ? stores[0]: {});
        commit(types.USER_INFO_UPDATED, resp.data);
      } else {
        commit(types.USER_CURRENT_ECOM_STORE_UPDATED, stores ? stores[0]: {});
        commit(types.USER_INFO_UPDATED, resp.data);
      }
    }
  },

  /**
   * update current eComStore information
   */
  async setEcomStore({ commit, dispatch }, payload) {
    dispatch('job/clearJobState', null, { root: true });
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.eComStore);
    dispatch('getShopifyConfig', payload.eComStore.productStoreId);
    await UserService.setUserPreference({
      'userPrefTypeId': 'SELECTED_BRAND',
      'userPrefValue': payload.eComStore.productStoreId
    });
  },
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, payload) {
    const resp = await UserService.setUserTimeZone(payload)
    if (resp.status === 200 && !hasError(resp)) {
      const current: any = state.current;
      current.userTimeZone = payload.tzId;
      commit(types.USER_INFO_UPDATED, current);
      Settings.defaultZone = current.userTimeZone;
      showToast(translate("Time zone updated successfully"));
    }
  },

  /**
   * Set User Instance Url
   */
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
  },

  async getShopifyConfig({ commit }, productStoreId) {
    if (productStoreId) { 
      let resp;
      const payload = {
        "inputFields": {
          "productStoreId": productStoreId,
        },
        "entityName": "ShopifyShopAndConfig",
        "noConditionFind": "Y",
        "fieldList": ["shopifyConfigId", "shopifyConfigName", "shopId"]
      }
      try {
        resp = await UserService.getShopifyConfig(payload);
        if (resp.status === 200 && !hasError(resp) && resp.data?.docs?.length > 0) {
          commit(types.USER_SHOPIFY_CONFIGS_UPDATED, resp.data.docs);
          commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, resp.data.docs[0]);
        } else {
          // TODO need to remove api call for fetching fetching shopifyConfig, currently kept it for backward compatibility.
          payload["entityName"] = 'ShopifyConfig';
          payload["fieldList"] = ["shopifyConfigId", "shopifyConfigName"]
          resp = await UserService.getShopifyConfig(payload);
          if (resp.status === 200 && !hasError(resp) && resp.data?.docs?.length > 0) {
            commit(types.USER_SHOPIFY_CONFIGS_UPDATED, resp.data.docs);
            commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, resp.data.docs[0]);
          } else {
            console.error(resp);
            commit(types.USER_SHOPIFY_CONFIGS_UPDATED, []);
            commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, {});
          }
        }
      } catch (err) {
        console.error(err);
        commit(types.USER_SHOPIFY_CONFIGS_UPDATED, []);
        commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, {});
      }
    } else {
      commit(types.USER_SHOPIFY_CONFIGS_UPDATED, []);
      commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, {});
    }
  },

  /**
   * update current shopify config id
   */
  async setCurrentShopifyConfig({ commit }, shopifyConfig) {
    commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, shopifyConfig);
  },

  async setEComStore({ commit }, payload) {
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.store);
  },

  /**
   * Get user pinned jobs
   */

  async getPinnedJobs({ commit, state }) {
    let resp;
    const user = state?.current as any

    try{
      const params = {
        "inputFields": {
          "userLoginId": user?.userLoginId,
          "userSearchPrefTypeId": "PINNED_JOB"
        },
        "viewSize": 1,
        "filterByDate": "Y",
        "sortBy": "fromDate ASC",
        "fieldList": ["searchPrefId", "searchPrefValue"],
        "entityName": "UserAndSearchPreference",
        "distinct": "Y",
        "noConditionFind": "Y"
      }
      resp = await UserService.getPinnedJobs(params);
      if(resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
        let pinnedJobs = resp.data.docs[0];
        pinnedJobs = {
          id: pinnedJobs?.searchPrefId ? pinnedJobs?.searchPrefId : '',
          jobs: pinnedJobs?.searchPrefValue ? JSON.parse(pinnedJobs?.searchPrefValue) : []
        }

        const enumIds = pinnedJobs?.jobs;
        await this.dispatch('job/fetchJobDescription', enumIds);

        user.pinnedJobs = pinnedJobs
        commit(types.USER_INFO_UPDATED, user);

        return pinnedJobs;
      } else {
        user.pinnedJobs = []
        commit(types.USER_INFO_UPDATED, user);
      }
    } catch(error) {
      console.error(error);
    }
    return resp;
  },

  /**
   * Update user's pinned jobs
   */
  async updatePinnedJobs({ dispatch, state }, payload) {
    let resp;
    const pinnedJobPrefId = (state.current as any)['pinnedJobs']?.id;

    try{
      if (pinnedJobPrefId) {
        resp = await UserService.updatePinnedJobPref({
          'searchPrefId': pinnedJobPrefId,
          'searchPrefValue': JSON.stringify(payload?.pinnedJobs)
        });

        if(resp.status === 200 && !hasError(resp)) {
          await dispatch('getPinnedJobs')
        }
      } else {
        resp = await UserService.createPinnedJobPref({
          'searchPrefValue': JSON.stringify(payload?.pinnedJobs)
        });
        if(resp.status === 200 && !hasError(resp)) {
          if(resp.data?.searchPrefId) {
            const params = {
              "searchPrefId": resp.data?.searchPrefId,
              "userSearchPrefTypeId": "PINNED_JOB",
            }
            const pinnedJob = await UserService.associatePinnedJobPrefToUser(params);
            if(pinnedJob.status === 200 && !hasError(pinnedJob)) {
              await dispatch('getPinnedJobs')
            }
          }
        }
      }
    } catch(error) {
      console.error(error);
    }
    return resp;
  }
}

export default actions;