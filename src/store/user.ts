import { DateTime, Settings } from "luxon";
import { defineStore } from "pinia";
import { isAppCompatible, redirectToLegacyApp, showToast } from "@/utils";
import { api, commonUtil, translate } from "@common";
import logger from "@/logger";
import { useAuth } from "@common/composables/useAuth";
import { useUtilStore } from "./util";

export const useUserStore = defineStore("user", {
  state: () => ({
    current: {} as any,
    permissions: [] as any[],
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
    fetchStatus: {
      profile: 'none',
      permissions: 'none'
    } as any,
    selectedSystemMessageRemoteId: "",
    userFullNames: {} as Record<string, string>
  }),
  getters: {
    getPermissions: (state: any) => state.permissions,
    getUserProfile: (state: any) => state.current,
    getCurrentShopifyConfig: (state: any) => state.currentShopifyConfig,
    getProductStoreCategories: (state: any) => state.productStoreCategories,
    getPwaState: (state: any) => state.pwaState,
    getCurrentProductStore: (state: any) => state.currentProductStore,
    getUserTimeZone: (state: any) => state.current.timeZone,
    getAvailableTimeZones: (state: any) => state.timeZones,
    getFetchStatus: (state: any) => state.fetchStatus,
    getSelectedSystemMessageRemoteId: (state: any) => state.selectedSystemMessageRemoteId,
    getUserFullName: (state: any) => (userId: string) => state.userFullNames[userId],
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
      this.fetchStatus.profile = 'pending'
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
        this.fetchStatus.profile = 'success'
      } catch(error: any) {
        showToast(translate("Failed to fetch user profile information"));
        console.error("error", error);
        useAuth().clearAuth();
        this.fetchStatus.profile = 'error'
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
          baseUrl: commonUtil.getMaargURL(),
          params: {
            pageSize: 50
          }
        });
        this.current.stores = productStoresResp.data

        this.current.stores.push({
          productStoreId: "",
          storeName: "None",
        });

        this.setCurrentProductStore(this.current.stores[0])
        await this.fetchProductStorePreference()
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
    async fetchPermissions() {
      this.fetchStatus.permissions = 'pending'
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID;
      const serverPermissions = [] as any;
      const viewSize = 200;
      let viewIndex = 0;

      try {
        let resp;
        do {
          // Permissions are always sourced from the Moqui/Maarg instance, regardless of
          // the configured OMS mode (mirrors how fetchUserProfile reads admin/user/profile).
          resp = await api({
            url: "admin/user/permissions",
            method: "get",
            baseURL: commonUtil.getMaargURL(),
            params: { viewIndex, viewSize }
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
            this.fetchStatus.permissions = 'error'
            return Promise.reject(new Error(permissionError));
          }
        }

        // Update the state with the fetched permissions
        this.permissions = serverPermissions;
        this.fetchStatus.permissions = 'success'
      } catch (error: any) {
        this.fetchStatus.permissions = 'error'
        return Promise.reject(error);
      }
    },
    async resolveUserFullNames(userIds: Array<string>) {
      const unresolvedUserIds = [...new Set(userIds)].filter((userId: any) => userId && !(userId in this.userFullNames))
      if (!unresolvedUserIds.length) {
        return;
      }

      // Cache an empty entry up front so repeated or concurrent callers never
      // trigger another lookup for the same user id in this session.
      unresolvedUserIds.forEach((userId: string) => { this.userFullNames[userId] = "" })

      await Promise.allSettled(unresolvedUserIds.map(async (userId: string) => {
        try {
          const resp = await api({
            url: `admin/users/${encodeURIComponent(userId)}`,
            method: "get"
          })
          this.userFullNames[userId] = resp.data?.userFullName || resp.data?.username || ""
        } catch (err) {
          logger.error(`Failed to resolve full name for user ${userId}`, err)
        }
      }))
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
      this.currentShopifyConfig = {};
      this.selectedSystemMessageRemoteId = ""
      if (!productStoreId) {
        logger.warn("No productStoreId provided for fetching shopify config. Setting initial values");
        return;
      }

      try {
        const shopifyConfigResp = await api({
          url: "oms/shopifyShops/shops",
          method: "GET",
          params: {
            pageSize: 1,
            productStoreId
          },
        });
        const shopifyConfigs = shopifyConfigResp.data
        shopifyConfigs.length > 0 && (this.currentShopifyConfig = shopifyConfigs[0]);
        await this.fetchSystemMessageRemoteByShop();
      } catch (err) {
        logger.error(err);
      }
    },
    async fetchSystemMessageRemoteByShop() {
      if(!this.currentShopifyConfig.shopId) {
        return;
      }
      try {
        const response = await api({
          url: "oms/systemMessageRemotes",
          method: "GET",
          params: {
            internalId: this.currentShopifyConfig.shopId
          }
        });

        if(response?.data?.systemMessageRemoteList && response.data.systemMessageRemoteList[0]?.internalId) {
          this.selectedSystemMessageRemoteId = response.data.systemMessageRemoteList[0].internalId;
          return;
        }

        throw new Error("System message remote API did not return an entity payload.");
      } catch (err) {
        logger.error("Failed to fetch system message remote by shop", err);
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
    async postLogin() {
      try {
        await this.fetchUserProfile();
        await this.fetchPermissions();
        await useUtilStore().fetchSystemInformation()
        // If the oms version is not compatible with the app, redirecting the user to the legacy app
        if(!(isAppCompatible())) {
          commonUtil.showToast(translate("App is not compatible with oms version and will not work as expected, redirecting to legacy app"));
          redirectToLegacyApp();
          useAuth().clearAuth();
        }
        await this.fetchProductStores()
        await Promise.allSettled([
          useUtilStore().fetchEntities(),
          useUtilStore().fetchEnumerations(),
          useUtilStore().fetchStatuses(),
          useUtilStore().fetchStatusFlowTransitions()
        ]);
      } catch(error: any) {
        return Promise.reject(new Error(error));
      }
    },
    async postLogout() {
      this.$reset();
      useUtilStore().$reset();
    }
  },
  persist: true,
});
