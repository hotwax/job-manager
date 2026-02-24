import { defineStore } from "pinia";
import { hasError, showToast } from "@/utils";
import { api, client, cookieHelper, translate } from "@common";
import { DateTime, Settings } from "luxon";
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions,
} from "@/authorization";
import { logout, resetConfig } from "@/adapter";
import logger from "@/logger";
import emitter from "@/event-bus";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    current: {} as any,
    oms: "",
    token: {
      value: "",
      expiration: undefined
    },
    maargOms: '',
    maargUrl: '',
    permissions: [] as any[],
    shopifyConfigs: [] as any[],
    currentShopifyConfig: {} as any,
    currentEComStore: {
      productStoreId: "",
      storeName: "None",
    } as any,
    productStoreCategories: {} as any,
    pwaState: {
      updateExists: false,
      registration: null as any,
    },
  }),
  getters: {
    isAuthenticated: (state) => {
      let isTokenExpired = false;
      if (state.token.expiration) {
        const currTime = DateTime.now().toMillis();
        isTokenExpired = state.token.expiration < currTime;
      }
      return !!(state.token.value && !isTokenExpired);
    },
    getOMS: (state) => state.oms,
    getOmsUrl: (state) => {
      let baseURL = import.meta.env.VITE_VUE_APP_BASE_URL
      if (!baseURL) baseURL = state.oms
      return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`
    },
    getMaargOms: (state) => state.maargOms,
    getMaargUrl: (state) => state.maargUrl,
    isUserAuthenticated: (state: any) => !!(state.token && state.current),
    getUserToken: (state: any) => state.token,
    getPermissions: (state: any) => state.permissions,
    getUserProfile: (state: any) => state.current,
    getCurrentShopifyConfig: (state: any) => state.currentShopifyConfig,
    getShopifyConfigs: (state: any) => state.shopifyConfigs,
    getProductStoreCategories: (state: any) => state.productStoreCategories,
    getPwaState: (state: any) => state.pwaState,
    getCurrentEComStore: (state: any) => state.currentEComStore,
  },
  actions: {
    async login(username: string, password: string) {
      try {
        const resp = await client({
          url: "login",
          method: "post",
          data: {
            'USERNAME': username,
            'PASSWORD': password
          },
          baseURL: this.getOmsUrl
        });
        if (hasError(resp)) {
          showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }

        await this.setToken(resp.data.token, resp.data.expirationTime)
        await this.fetchPermissions()

        try {
          const userProfileResp = await api({
            url: "admin/user/profile",
            method: "get",
            baseUrl: this.maargUrl
          });
          this.current = userProfileResp.data
        } catch(error: any) {
          showToast(translate("Failed to fetch user profile information"));
          console.error("error", error);
          this.setToken("", undefined)
          return Promise.reject(new Error(error));
        }

        try {
          // "storeName_op": "not-empty"
          // "distinct": "Y"
          const productStoresResp = await api({
            url: "admin/productStores",
            method: "get",
            baseUrl: this.maargUrl
          });
          this.current.stores = productStoresResp.data
        } catch(error: any) {
          throw error;
        }

        // In Job Manager application, we have jobs which may not be associated with any product store
        this.current.stores.push({
          productStoreId: "",
          storeName: "None",
        });
        let preferredStore = this.current.stores[0];

        try {
          const preferredStoreResp = await api({
            url: "admin/user/preferences",
            method: "GET",
            params: {
              pageSize: 1,
              userId: this.current.userId,
              preferenceKey: "FAVORITE_PRODUCT_STORE"
            },
          });
          const preferredStoreId = preferredStoreResp.data
          if (preferredStoreId) {
            const store = this.current.stores.find((store: any) => store.productStoreId === preferredStoreId);
            store && (preferredStore = store);
          }
        } catch(err) {
          logger.error('Favourite product store not found', err)
        }

        await this.fetchShopifyConfig(preferredStore.productStoreId);

        try {
          const preferredShopifyShopResp = await api({
            url: "admin/user/preferences",
            method: "GET",
            params: {
              pageSize: 1,
              userId: this.current.userId,
              preferenceKey: "FAVORITE_SHOPIFY_SHOP"
            },
          });
          const preferredShopifyShopId = preferredShopifyShopResp.data
          if (preferredShopifyShopId) {
            this.currentShopifyConfig = this.shopifyConfigs.find((shopifyConfig: any) => shopifyConfig.shopId === preferredShopifyShopId);
          }
        } catch(err) {
          logger.error('Favourite shopify shop not found', err)
        }

        if (this.current.userTimeZone) {
          Settings.defaultZone = this.current.userTimeZone;
        }

        this.currentEComStore = preferredStore;
      } catch (err: any) {
        showToast(translate("Something went wrong while login. Please contact administrator."));
        logger.error("error: ", err.toString());
        return Promise.reject(err instanceof Object ? err : new Error(err));
      }
    },

    async logout(payload?: any) {
      let redirectionUrl = "";
      emitter.emit("presentLoader", {
        message: "Logging out",
        backdropDismiss: false,
      });

      if (!payload?.isUserUnauthorised) {
        let resp;
        try {
          resp = await logout();
          resp = JSON.parse(
            resp.startsWith("//") ? resp.replace("//", "") : resp
          );
        } catch (err) {
          logger.error("Error parsing data", err);
        }

        if (resp?.logoutAuthType == "SAML2SSO") {
          redirectionUrl = resp.logoutUrl;
        }
      }

      this.$reset();
      resetConfig();
      resetPermissions();

      if (redirectionUrl) {
        window.location.href = redirectionUrl;
      }

      emitter.emit("dismissLoader");
      return redirectionUrl;
    },

    async fetchPermissions() {
      const permissionId = import.meta.env.VITE_VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = [...new Set(getServerPermissionsFromRules())];
      if (permissionId) serverPermissionsFromRules.push(permissionId);
      let serverPermissions = [] as any;

      // If the server specific permission list doesn't exist, getting server permissions will be of no use
      // It means there are no rules yet depending upon the server permissions.
      if (serverPermissionsFromRules && serverPermissionsFromRules.length == 0) return serverPermissions;
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
          permissionIds: serverPermissionsFromRules
        }
        resp = await api({
          url: "getPermissions",
          method: "post",
          baseURL: this.getOmsUrl,
          data: params,
        })
        if(resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
          serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
          const total = resp.data.count;
          const remainingPermissions = total - serverPermissions.length;
          if (remainingPermissions > 0) {
            // We need to get all the remaining permissions
            const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + ( remainingPermissions % viewSize != 0 ? 1 : 0);
            const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
              const response = await api({
                url: "getPermissions",
                method: "post",
                baseURL: this.getOmsUrl,
                data: {
                  "viewIndex": index + 1,
                  viewSize,
                  permissionIds: serverPermissionsFromRules
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
        const appPermissions = prepareAppPermissions(serverPermissions);

        // Checking if the user has permission to access the app
        // If there is no configuration, the permission check is not enabled
        if (permissionId) {
          const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId);
          if (!hasPermission) {
            const permissionError = "You do not have permission to access the app.";
            showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        // Update the state with the fetched permissions
        this.permissions = appPermissions;
        // Set permissions in the authorization module
        setPermissions(appPermissions);
      } catch(error: any) {
        return Promise.reject(error);
      }
    },

    async setEcomStore(payload: any) {
      let productStore = payload.productStore;
      if (!productStore) {
        productStore = this.current.stores.find(
          (store: any) => store.productStoreId === payload.productStoreId
        );
      }
      this.currentEComStore = productStore;
      await this.fetchShopifyConfig(productStore.productStoreId);
    },

    setUserTimeZone(timeZoneId: string) {
      const current: any = this.current;
      current.userTimeZone = timeZoneId;
      this.current = current;
      Settings.defaultZone = current.userTimeZone;
    },

    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration;
      this.pwaState.updateExists = payload.updateExists;
    },

    async fetchShopifyConfig(productStoreId: string) {
      if (!productStoreId) {
        this.shopifyConfigs = [];
        this.currentShopifyConfig = {};
        logger.warn("No productStoreId provided for fetching shopify config. Setting initial values");
        return;
      }

      try {
        let currentShopifyConfig = {};
        const shopifyConfigResp = await api({
          url: "admin/shopifyShops",
          method: "GET",
          params: {
            pageSize: 50,
            productStoreId
          },
        });
        const shopifyConfigs = shopifyConfigResp.data
        shopifyConfigs.length > 0 && (currentShopifyConfig = shopifyConfigs[0]);
        this.shopifyConfigs = shopifyConfigs;
        this.currentShopifyConfig = currentShopifyConfig;
      } catch (err) {
        logger.error(err);
        this.shopifyConfigs = [];
        this.currentShopifyConfig = {};
      }
    },

    async setCurrentShopifyConfig(payload: any) {
      let shopifyConfig = {} as any;

      if (payload.shopifyConfigId) {
        shopifyConfig = this.shopifyConfigs.find(
          (configs: any) => configs.shopifyConfigId === payload.shopifyConfigId
        );
      }
      this.currentShopifyConfig = shopifyConfig ? shopifyConfig : {};
    },
    async samlLogin(token: string, expirationTime: string) {
      try {
        this.setToken(token, expirationTime)

        try {
          const userProfileResp = await api({
            url: "admin/user/profile",
            method: "get",
            baseUrl: this.maargUrl
          });
          this.current = userProfileResp.data
        } catch(error: any) {
          this.setToken("", undefined)
          showToast(translate("Failed to fetch user profile information"));
          console.error("error", error);
          return Promise.reject(new Error(error));
        }

        await this.fetchPermissions();
      } catch (error: any) {
        // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
        // TODO Check if handling of specific status codes is required.
        showToast(translate('Something went wrong while login. Please contact administrator.'));
        console.error("error: ", error);
        return Promise.reject(new Error(error))
      }
    },
    setMaargInstance(oms: string) {
      this.maargOms = oms
      this.maargUrl = oms.startsWith('http') ? oms.includes('/rest/s1') ? oms : `${oms}/rest/s1/` : `https://${oms}.hotwax.io/rest/s1/`;
      cookieHelper().set("maarg", this.maargOms)
    },
    setOMS(oms: string) {
      cookieHelper().set("oms", oms)
      this.oms = oms;
    },
    setToken(token: any, expirationTime: any) {
      cookieHelper().set("token", token, expirationTime)
      this.token = {
        value: token,
        expiration: expirationTime
      }
    },
  },
  persist: true,
});
