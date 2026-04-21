import { DateTime, Settings } from "luxon";
import { defineStore } from "pinia";
import { showToast } from "@/utils";
import { api, commonUtil, translate } from "@common";
import logger from "@/logger";
import { useAuth } from "@common/composables/useAuth";

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
    oms: ""
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
    getAvailableTimeZones: (state: any) => state.timeZones,
    hasPermission: (state: any) => (permissionId: string): boolean => {
      const permissions = state.permissions;

      if(!permissionId) {
        return true;
      }

      // Handle OR/AND logic in permission string
      if (permissionId.includes(' OR ')) {
        const parts = permissionId.split(' OR ');
        return parts.some((part: string) => useUserStore().hasPermission(part.trim()));
      }

      if (permissionId.includes(' AND ')) {
        const parts = permissionId.split(' AND ');
        return parts.every((part: string) => useUserStore().hasPermission(part.trim()));
      }
      return permissions.includes(permissionId);
    }
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
        useAuth().updateUserId(this.current.userId)

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
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID;
      const serverPermissions = [] as any;
      const viewSize = 200;
      let viewIndex = 0;

      try {
        let resp;
        do {
          resp = await api({
            url: "getPermissions",
            method: "post",
            baseURL: commonUtil.getOmsURL(),
            data: { viewIndex, viewSize }
          }) as any

          if (resp.status === 200 && resp.data.docs?.length && !commonUtil.hasError(resp)) {
            serverPermissions.push(...resp.data.docs.map((permission: any) => permission.permissionId));
            viewIndex++;
          } else {
            resp = null;
          }
        } while (resp);

        // Checking if the user has permission to access the app
        // If there is no configuration, the permission check is not enabled
        if (permissionId) {
          const hasAppPermission = serverPermissions.includes(permissionId);
          if (!hasAppPermission) {
            const permissionError = "You do not have permission to access the app.";
            commonUtil.showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        // Update the state with the fetched permissions
        this.permissions = serverPermissions;
      } catch (error: any) {
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
    async postLogin() {
      try {
        await this.fetchUserProfile()
        await this.fetchPermissions()
      } catch(error: any) {
        return Promise.reject(new Error(error));
      }
    },
    async postLogout() {
      this.$reset();
    }
  },
  persist: true,
});
