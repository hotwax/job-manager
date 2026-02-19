import { defineStore } from "pinia";
import { UserService } from "@/services/UserService";
import { hasError, showToast } from "@/utils";
import { api, cookieHelper, translate } from "@common";
import { DateTime, Settings } from "luxon";
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions,
} from "@/authorization";
import { logout, updateInstanceUrl, updateToken, resetConfig } from "@/adapter";
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
    instanceUrl: "",
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
    omsRedirectionInfo: {
      url: "",
      token: "",
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
    getInstanceUrl: (state: any) => {
      const baseUrl = import.meta.env.VITE_VUE_APP_BASE_URL;
      return baseUrl ? baseUrl : state.instanceUrl;
    },
    getCurrentShopifyConfig: (state: any) => state.currentShopifyConfig,
    getShopifyConfigs: (state: any) => state.shopifyConfigs,
    getProductStoreCategories: (state: any) => state.productStoreCategories,
    getPwaState: (state: any) => state.pwaState,
    getCurrentEComStore: (state: any) => state.currentEComStore,
    getMaargBaseUrl: (state: any) => {
      const url = state.omsRedirectionInfo.url;
      if (!url) return "";
      return url.startsWith("http")
        ? url.includes("/rest/s1/admin")
          ? url
          : `${url}/rest/s1/admin/`
        : `https://${url}.hotwax.io/rest/s1/admin/`;
    },
    getOmsRedirectionInfo: (state: any) => state.omsRedirectionInfo,
  },
  actions: {
    async login(username: string, password: string) {
      try {
        const resp = await api({
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

        // Getting the permissions list from server
        const permissionId = import.meta.env.VITE_VUE_APP_PERMISSION_ID;
        // Prepare permissions list
        const serverPermissionsFromRules = getServerPermissionsFromRules();
        if (permissionId) serverPermissionsFromRules.push(permissionId);

        const serverPermissions = await UserService.getUserPermissions(
          {
            permissionIds: [...new Set(serverPermissionsFromRules)],
          },
          this.token.value
        );
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

        const userProfile = await UserService.getUserProfile(this.token.value);
        userProfile.stores = await UserService.getEComStores(this.token.value);

        // In Job Manager application, we have jobs which may not be associated with any product store
        userProfile.stores.push({
          productStoreId: "",
          storeName: "None",
        });
        let preferredStore = userProfile.stores[0];

        const preferredStoreId = await UserService.getPreferredStore(this.token.value);
        if (preferredStoreId) {
          const store = userProfile.stores.find((store: any) => store.productStoreId === preferredStoreId);
          store && (preferredStore = store);
        }

        const shopifyConfigs = await UserService.getShopifyConfig(
          preferredStore.productStoreId,
          this.token.value
        );
        let currentShopifyConfig = {};
        shopifyConfigs.length > 0 && (currentShopifyConfig = shopifyConfigs[0]);

        const preferredShopifyShopId = await UserService.getPreferredShopifyShop(this.token.value);
        if (preferredShopifyShopId) {
          currentShopifyConfig = shopifyConfigs.find((shopifyConfig: any) => shopifyConfig.shopId === preferredShopifyShopId);
        }

        setPermissions(appPermissions);
        if (userProfile.userTimeZone) {
          Settings.defaultZone = userProfile.userTimeZone;
        }

        this.currentEComStore = preferredStore;
        this.current = userProfile;
        this.shopifyConfigs = shopifyConfigs;
        this.currentShopifyConfig = currentShopifyConfig;
        this.permissions = appPermissions;

        updateToken(this.token.value);
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

    async setEcomStore(payload: any) {
      let productStore = payload.productStore;
      if (!productStore) {
        productStore = this.current.stores.find(
          (store: any) => store.productStoreId === payload.productStoreId
        );
      }
      this.currentEComStore = productStore;
      await this.getShopifyConfig(productStore.productStoreId);
    },

    async setUserTimeZone(timeZoneId: string) {
      const current: any = this.current;
      current.userTimeZone = timeZoneId;
      this.current = current;
      Settings.defaultZone = current.userTimeZone;
    },

    setUserInstanceUrl(payload: string) {
      this.instanceUrl = payload;
      updateInstanceUrl(payload);
    },

    setOmsRedirectionInfo(payload: any) {
      this.omsRedirectionInfo = payload;
    },

    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration;
      this.pwaState.updateExists = payload.updateExists;
    },

    async getShopifyConfig(productStoreId: string) {
      if (!productStoreId) {
        this.shopifyConfigs = [];
        this.currentShopifyConfig = {};
        logger.warn(
          "No productStoreId provided for fetching shopify config. Setting initial values"
        );
        return;
      }

      try {
        const shopifyConfigs = await UserService.getShopifyConfig(
          productStoreId,
          this.token
        );
        let currentShopifyConfig = {};
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
    async setMaargInstance(oms: string) {
      this.maargOms = oms
      this.maargUrl = oms.startsWith('http') ? oms.includes('/rest/s1') ? oms : `${oms}/rest/s1/` : `https://${oms}.hotwax.io/rest/s1/`;
      cookieHelper().set("maarg", this.maargOms)
    },
    setOMS(oms: string) {
      cookieHelper().set("oms", oms)
      this.oms = oms;
    },
    async setToken(token: any, expirationTime: any) {
      cookieHelper().set("token", token, expirationTime)
      this.token = {
        value: token,
        expiration: expirationTime
      }
    },
  },
  persist: true,
});
