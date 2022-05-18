import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { DateTime } from 'luxon';
import emitter from '@/event-bus'

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
            dispatch('getProfile')
            dispatch('getShopifyConfig')
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

      this.dispatch('util/getServiceStatusDesc')
      await dispatch('getPinnedJobs', resp.data?.userLoginId).then((pinnedJobs: any) => {
        resp.data.pinnedJobs = pinnedJobs
      })

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
      showToast(translate("Time zone updated successfully"));
    }
  },

  /**
   * Set User Instance Url
   */
  setUserInstanceUrl ({ state, commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
  },

  async getShopifyConfig({ commit }) {
    const resp = await UserService.getShopifyConfig({
      "entityName": "ShopifyConfig",
      "noConditionFind": "Y"
    })

    if (resp.status === 200 && !hasError(resp)) {
      commit(types.USER_SHOPIFY_CONFIG_UPDATED, resp.data.docs?.length > 0 ? resp.data.docs[0].shopifyConfigId : {});
    }
  },

  async getEComStores({ commit }, payload) {
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

  async setEComStore({ commit, dispatch }, payload) {
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.store);
  },

  /**
   * Get user pinned jobs
   */

  async getPinnedJobs({ state }, payload) {
    let resp;
    const user = state?.current as any

    try{
      const params = {
        "inputFields": {
          "userLoginId": payload ? payload : user?.userLoginId,
          "userSearchPrefTypeId": "PINNED_JOB"
        },
        "fieldList": ["searchPrefId", "searchPrefValue"],
        "entityName": "UserAndSearchPreference",
        "distinct": "Y",
        "noConditionFind": "Y"
      }
      resp = await UserService.getPinnedJobs(params);
      if(resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
        let pinnedJob = resp.data.docs[0];
        if(pinnedJob?.searchPrefId) {
          pinnedJob = {
            searchPrefId: pinnedJob?.searchPrefId,
            searchPrefValue: pinnedJob?.searchPrefValue ? JSON.parse(pinnedJob?.searchPrefValue) : {}
          }
        }

        return pinnedJob;
      }
    } catch(error) {
      console.error(error);
    }
    return {}
  },

  /**
   * Update user's pinned jobs
   */
  async updatePinnedJobs({ commit, dispatch, state }, payload) {
    let resp;
    const user = state?.current as any

    try{
      resp = await UserService.updatePinnedJobs(payload);
      if(resp.status === 200 && !hasError(resp)) {
        await dispatch('getPinnedJobs').then((pinnedJobs: any) => {
          user.pinnedJobs = pinnedJobs
          commit(types.USER_INFO_UPDATED, user);
        })
      }
    } catch(error) {
      console.error(error);
    }

    return resp;
  },

  /**
   * Create pinned jobs
   */
  async createPinnedJob({ commit, dispatch, state }, payload) {
    let resp;
    const user = state?.current as any

    try{
      resp = await UserService.createPinnedJob(payload);
      if(resp.status === 200 && !hasError(resp)) {
        if(resp.data?.searchPrefId) {
          const params = {
            "searchPrefId": resp.data?.searchPrefId,
            "userSearchPrefTypeId": "PINNED_JOB",
          }
          
          const pinnedJob = await UserService.registerPinnedJob(params);

          if(pinnedJob.status === 200 && !hasError(pinnedJob)) {
            await dispatch('getPinnedJobs').then((pinnedJobs: any) => {
              user.pinnedJobs = pinnedJobs
              commit(types.USER_INFO_UPDATED, user);
            })
          }
        }
      }
    } catch(error) {
      console.error(error);
    }
  }
}

export default actions;