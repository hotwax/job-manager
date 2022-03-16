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
  async logout ({ commit }) {
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    
  },

  /**
   * Get User profile
   */
  async getProfile ({ commit, dispatch }) {
    const resp = await UserService.getProfile()
    if (resp.status === 200) {
      const localTimeZone = DateTime.local().zoneName;
      if (resp.data.userTimeZone !== localTimeZone) {
        emitter.emit('timeZoneDifferent', { profileTimeZone: resp.data.userTimeZone, localTimeZone});
      }

      const payload = {
        "fieldList": ["productStoreId", "storeName"],
        "entityName": "ProductStore",
        "distinct": "Y",
        "noConditionFind": "Y"
      }

      await dispatch('getEComStores', payload).then((stores: any) => { resp.data.stores = stores ? stores : [] })

      commit(types.USER_INFO_UPDATED, resp.data);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, resp.data.stores?.length > 0 ? resp.data.stores[0] : {});
      commit(types.USER_CURRENT_FACILITY_UPDATED, resp.data.facilities.length > 0 ? resp.data.facilities[0] : {});
    }
  },

  /**
   * update current facility information
   */
  async setFacility ({ commit }, payload) {
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
  },
  /**
   * update current eComStore information
   */
  async setEcomStore({ commit, dispatch }, payload) {
    dispatch("job/clearPendingJobs", null, { root: true })
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
  }
}

export default actions;