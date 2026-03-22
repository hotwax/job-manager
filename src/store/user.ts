import { defineStore } from "pinia";
import { showToast } from "@/utils";
import { api, cookieHelper, commonUtil, translate } from "@common";
import { DateTime, Settings } from "luxon";
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  setPermissions,
} from "@/authorization";
import logger from "@/logger";
import { useAuth } from "@/composables/auth";

export const useUserStore = defineStore("user", {
  state: () => ({
    current: {} as any,
    permissions: [] as any[],
    shopifyConfigs: [] as any[],
    currentShopifyConfig: {} as any,
    currentProductStore: {
      productStoreId: "",
      storeName: "None",
    } as any,
    productStoreCategories: {} as any,
    pwaState: {
      updateExists: false,
      registration: null as any,
    },
    timeZones: [] as any,
    oms: "",
    token: {
      value: "",
      expiration: undefined
    }
  }),
  getters: {
    getPermissions: (state: any) => state.permissions,
    getUserProfile: (state: any) => state.current,
    getCurrentShopifyConfig: (state: any) => state.currentShopifyConfig,
    getShopifyConfigs: (state: any) => state.shopifyConfigs,
    getProductStoreCategories: (state: any) => state.productStoreCategories,
    getPwaState: (state: any) => state.pwaState,
    getCurrentProductStore: (state: any) => state.currentProductStore,
    getUserTimeZone: (state: any) => state.current.timeZone,
    getAvailableTimeZones: (state: any) => state.timeZones
  },
  actions: {
    async fetchUserProfile() {
      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
          baseUrl: commonUtil.getMaargURL()
        });
        this.current = userProfileResp.data

        if (this.current.timeZone) {
          Settings.defaultZone = this.current.timeZone;
        }
      } catch(error: any) {
        showToast(translate("Failed to fetch user profile information"));
        console.error("error", error);
        useAuth().clearAuth();
        return Promise.reject(new Error(error));
      }
    },
    async fetchProductStores() {
      try {
        // "storeName_op": "not-empty"
        // "distinct": "Y"
        const productStoresResp = await api({
          url: "admin/productStores",
          method: "get",
          baseUrl: commonUtil.getMaargURL()
        });
        this.current.stores = productStoresResp.data

        this.current.stores.push({
          productStoreId: "",
          storeName: "None",
        });

        this.setCurrentProductStore(this.current.stores[0])
      } catch(error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },
    async fetchProductStorePreference() {
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
          store && this.setCurrentProductStore(store)
        }
      } catch(err) {
        logger.error('Favourite product store not found', err)
      }
    },
    async fetchShopifyShopPreference() {
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
          baseURL: commonUtil.getOmsURL(),
          data: params,
        })
        if(resp.status === 200 && resp.data.docs?.length && !commonUtil.hasError(resp)) {
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
                baseURL: commonUtil.getOmsURL(),
                data: {
                  "viewIndex": index + 1,
                  viewSize,
                  permissionIds: serverPermissionsFromRules
                }
              })
              if(!commonUtil.hasError(response)){
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
              if (permissionResponse.status !== 200 || commonUtil.hasError(permissionResponse) || !permissionResponse.data?.docs) {
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

    async setCurrentProductStore(productStoreInfo: any) {
      let productStore = productStoreInfo
      if (!productStoreInfo.storeName) {
        productStore = this.current.stores.find((store: any) => store.productStoreId === productStoreInfo.productStoreId);
      }
      this.currentProductStore = productStore;
      await this.fetchShopifyConfig(productStore.productStoreId);
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
        cookieHelper().set("token", token)
        cookieHelper().set("expirationTime", expirationTime)

        try {
          const userProfileResp = await api({
            url: "admin/user/profile",
            method: "get",
            baseUrl: commonUtil.getMaargURL()
          });
          this.current = userProfileResp.data
        } catch(error: any) {
          useAuth().clearAuth();
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
    async setUserTimeZone(tzId: string) {
      // Do not make any api call if the user clicks the same timeZone again that is already selected
      if(this.current.timeZone === tzId) {
        return;
      }
      
      try {
        const resp = await api({
          url: "admin/user/profile",
          method: "POST",
          data: {
            userId: this.current.userId,
            tzId
          },
        }) as any;

        if (resp?.status === 200) {
          this.current.timeZone = tzId;
          Settings.defaultZone = tzId;
        } else {
          throw resp;
        }
        showToast(translate("Time zone updated successfully"));
        return Promise.resolve(tzId)
      } catch(err) {
        console.error('Error', err)
        showToast(translate("Failed to update time zone"));
        return Promise.reject('')
      }
    },
    async fetchAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if(this.timeZones.length) {
        return;
      }

      try {
        const resp: any = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get"
        });

        this.timeZones = resp.data.timeZones.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
      } catch(error) {
        logger.error("Failed to fetch time zones")
      }
    },
  },
  persist: true,
});
