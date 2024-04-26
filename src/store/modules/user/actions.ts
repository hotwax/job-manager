import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@hotwax/dxp-components'
import { Settings } from 'luxon'
import { getServerPermissionsFromRules, prepareAppPermissions, resetPermissions, setPermissions } from '@/authorization'
import { logout, updateInstanceUrl, updateToken, resetConfig } from '@/adapter'
import logger from "@/logger";
import { useAuthStore } from '@hotwax/dxp-components'
import emitter from '@/event-bus'

const actions: ActionTree<UserState, RootState> = {

  /**
   *  Login user
   * @param param0 state context
   * @param param1 payload: token and oms
   * @returns Promise
   */
  async login({ commit, dispatch }, payload) {
    try {
      const { token, oms } = payload
      dispatch("setUserInstanceUrl", oms);

      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await UserService.getUserPermissions({
        permissionIds: [...new Set(serverPermissionsFromRules)]
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);

      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId );
        // If there are any errors or permission check fails do not allow user to login
        if (!hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          logger.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);
      userProfile.stores = await UserService.getEComStores(token);

      // In Job Manager application, we have jobs which may not be associated with any product store
      userProfile.stores.push({
        productStoreId: "",
        storeName: "None"
      })
      let preferredStore = userProfile.stores[0]

      const preferredStoreId =  await UserService.getPreferredStore(token);
      if (preferredStoreId) {
        const store = userProfile.stores.find((store: any) => store.productStoreId === preferredStoreId);
        store && (preferredStore = store)
      }

      const shopifyConfigs =  await UserService.getShopifyConfig(preferredStore.productStoreId, token);
      // TODO store and get preferred config
      let currentShopifyConfig =  {};
      shopifyConfigs.length > 0 && (currentShopifyConfig = shopifyConfigs[0])

      const preferredShopifyShopId =  await UserService.getPreferredShopifyShop(token);
      if (preferredShopifyShopId) {
        currentShopifyConfig = shopifyConfigs.find((shopifyConfig: any) => shopifyConfig.shopId === preferredShopifyShopId);
      }

      /*  ---- Guard clauses ends here --- */

      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }

      // TODO user single mutation
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, preferredStore);
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_SHOPIFY_CONFIGS_UPDATED, shopifyConfigs);
      commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, currentShopifyConfig);
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: token })
      updateToken(token)
      // Getting service status description
      // TODO check if we could move it to logic for fetching jobs
      this.dispatch('util/getServiceStatusDesc')
    } catch (err: any) {
      // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
      // TODO Check if handling of specific status codes is required.
      showToast(translate('Something went wrong while login. Please contact administrator.'));
      logger.error("error: ", err.toString());
      return Promise.reject(err instanceof Object ? err :new Error((err)));
    }
  },

  /**
   * Logout user
   */
  async logout ({ commit, dispatch }, payload) {
    // store the url on which we need to redirect the user after logout api completes in case of SSO enabled
    let redirectionUrl = ''

    emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })

    // Calling the logout api to flag the user as logged out, only when user is authorised
    // if the user is already unauthorised then not calling the logout api as it returns 401 again that results in a loop, thus there is no need to call logout api if the user is unauthorised
    if(!payload?.isUserUnauthorised) {
      let resp;

      // wrapping the parsing logic in try catch as in some case the logout api makes redirection, and then we are unable to parse the resp and thus the logout process halts
      try {
        resp = await logout();

        // Added logic to remove the `//` from the resp as in case of get request we are having the extra characters and in case of post we are having 403
        resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp)
      } catch(err) {
        logger.error('Error parsing data', err)
      }

      if(resp?.logoutAuthType == 'SAML2SSO') {
        redirectionUrl = resp.logoutUrl
      }
    }

    const authStore = useAuthStore()
    // TODO add any other tasks if need
    dispatch('job/clearJobState', null, { root: true });
    commit(types.USER_END_SESSION)
    resetConfig();
    resetPermissions();
    // reset plugin state on logout
    authStore.$reset()

    // If we get any url in logout api resp then we will redirect the user to the url
    if(redirectionUrl) {
      window.location.href = redirectionUrl
    }

    emitter.emit('dismissLoader')
    return redirectionUrl;
  },

  /**
   * update current eComStore information
   */
  async setEcomStore({ commit, dispatch }, payload) {
    dispatch('job/clearJobState', null, { root: true });
    let productStore = payload.productStore;
    if(!productStore) {
      productStore = this.state.user.current.stores.find((store: any) => store.productStoreId === payload.productStoreId);
    }
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, productStore);
    await dispatch('getShopifyConfig',  productStore.productStoreId);
  },
  /**
   * Update user timeZone
   */
  async setUserTimeZone ( { state, commit }, timeZoneId) {
    const current: any = state.current;
    current.userTimeZone = timeZoneId;
    commit(types.USER_INFO_UPDATED, current);
    Settings.defaultZone = current.userTimeZone;
  },
  /**
   * Set User Instance Url
   */
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
    updateInstanceUrl(payload)
  },


  async getShopifyConfig({ commit }, productStoreId) {
    if (!productStoreId) {
      commit(types.USER_SHOPIFY_CONFIGS_UPDATED, []);
      commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, {});
      logger.warn("No productStoreId provided for fetching shopify config. Setting initial values");
    }

    try {      
      const shopifyConfigs =  await UserService.getShopifyConfig(productStoreId);
        // TODO store and get preferred config
      let currentShopifyConfig =  {};
      shopifyConfigs.length > 0 && (currentShopifyConfig = shopifyConfigs[0])
      commit(types.USER_SHOPIFY_CONFIGS_UPDATED, shopifyConfigs);
      commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, currentShopifyConfig);
    } catch (err) {
      logger.error(err);
      commit(types.USER_SHOPIFY_CONFIGS_UPDATED, []);
      commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, {});
    }
  },

  async getPreOrderBackorderCategory({ state, commit }) {
    const productStoreId =  (state.currentEComStore as any).productStoreId
    if (!productStoreId) {
      logger.warn("No productStoreId provided. Not fetching pre-order/backorder categories");
      return;
    }
    if (state.productStoreCategories[productStoreId]) return state.productStoreCategories[productStoreId];

    try {
      const ecommerceCatalog =  await UserService.getEcommerceCatalog(productStoreId);
        // TODO store catalog if required for any other service
      const preOrderBackorderCategory =  await UserService.getPreOrderBackorderCategory(ecommerceCatalog.prodCatalogId);
      const productStoreCategories =  {} as any;
      const preOrderCategory = preOrderBackorderCategory.find((category: any) => category.prodCatalogCategoryTypeId === "PCCT_PREORDR")
      preOrderCategory && (productStoreCategories.preorder = preOrderCategory.productCategoryId)
      const backorderCategory = preOrderBackorderCategory.find((category: any) => category.prodCatalogCategoryTypeId === "PCCT_BACKORDER")
      backorderCategory && (productStoreCategories.backorder = backorderCategory.productCategoryId)
      state.productStoreCategories[productStoreId] = productStoreCategories;
      commit(types.USER_PRDCT_STR_CATGRS_UPDATED, state.productStoreCategories);
    } catch (err) {
      logger.error(err);
    }
    return state.productStoreCategories[productStoreId]
  },

  /**
   * update current shopify config id
   */
  async setCurrentShopifyConfig({ commit, dispatch, state }, payload) {
    const shopifyConfig = state.shopifyConfigs.find((configs: any) => configs.shopifyConfigId === payload.shopifyConfigId);
    commit(types.USER_CURRENT_SHOPIFY_CONFIG_UPDATED, shopifyConfig ? shopifyConfig : {});
    dispatch('job/clearJobState', null, { root: true });
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
      logger.error(error);
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
      logger.error(error);
    }
    return resp;
  },
}

export default actions;
