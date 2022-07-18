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
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
            await dispatch('getProfile')
            return resp.data;
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

      await dispatch('getEComStores', payload).then((stores: any) => {
        resp.data.stores = [
          ...(stores ? stores : []),
          {
            productStoreId: "",
            storeName: "None"
          }
        ]
      })
      if(resp.data?.stores[0]){
        dispatch('getShopifyConfig', resp.data?.stores[0].productStoreId);
      }

      this.dispatch('util/getServiceStatusDesc')
      if (resp.data.userTimeZone) {
        Settings.defaultZone = resp.data.userTimeZone;
      }
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, resp.data?.stores[0]);
      commit(types.USER_INFO_UPDATED, resp.data);
    }
  },

  /**
   * update current eComStore information
   */
  async setEcomStore({ commit, dispatch }, payload) {
    dispatch('job/clearJobState', null, { root: true });
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.eComStore);
    dispatch('getShopifyConfig', payload.eComStore.productStoreId);
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
    const resp = await UserService.getShopifyConfig({
      "inputFields": {
        "productStoreId": productStoreId,
      },
      "entityName": "ShopifyConfig",
      "noConditionFind": "Y",
      "fieldList": ["shopifyConfigId"]
    })

    if (resp.status === 200 && !hasError(resp)) {
      commit(types.USER_SHOPIFY_CONFIG_UPDATED, resp.data.docs?.length > 0 ? resp.data.docs[0].shopifyConfigId : {});
    }
  },

  async getEComStores(_context, payload) {
    let resp;

    try{
      resp = await UserService.getEComStores(payload);
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        const stores = resp.data.docs

        return stores
      }
    } catch(err) {
      console.error(err)
    }
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