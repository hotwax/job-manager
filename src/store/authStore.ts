import { defineStore } from "pinia";
import { UserService } from "@/services/UserService";
import { hasError, showToast } from "@/utils";
import { translate } from "@hotwax/dxp-components";
import { Settings } from "luxon";
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions,
} from "@/authorization";
import { logout, updateInstanceUrl, updateToken, resetConfig } from "@/adapter";
import logger from "@/logger";
import { useAuthStore } from "@hotwax/dxp-components";
import emitter from "@/event-bus";

export const useUserStore = defineStore("user", {
  state: () => ({
    token: "",
    permissions: [] as any[],
    current: {} as any,
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
    isAuthenticated: (state: any) => !!state.token,
    isUserAuthenticated: (state: any) => !!(state.token && state.current),
    getUserToken: (state: any) => state.token,
    getUserPermissions: (state: any) => state.permissions,
    getUserProfile: (state: any) => state.current,
    getInstanceUrl: (state: any) => {
      const baseUrl = import.meta.env.VITE_VUE_APP_BASE_URL;
      return baseUrl ? baseUrl : state.instanceUrl;
    },
    getBaseUrl: (state: any) => {
      let baseURL = import.meta.env.VITE_VUE_APP_BASE_URL;
      if (!baseURL) baseURL = state.instanceUrl;
      if (!baseURL) return "";
      return baseURL.startsWith("http")
        ? baseURL.includes("/api")
          ? baseURL
          : `${baseURL}/api/`
        : `https://${baseURL}.hotwax.io/api/`;
    },
    getCurrentShopifyConfig: (state: any) => state.currentShopifyConfig,
    getShopifyConfigs: (state: any) => state.shopifyConfigs,
    getProductStoreCategories: (state: any) => state.productStoreCategories,
    getPwaState: (state: any) => state.pwaState,
    getCurrentEComStore: (state: any) => state.currentEComStore,
    getPinnedJobs: (state: any) => state.current ? (state.current as any)["pinnedJobs"]?.jobs : [],
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
    async login(payload: any) {
      try {
        const { token, oms, omsRedirectionUrl } = payload;
        this.setUserInstanceUrl(oms);

        // Getting the permissions list from server
        const permissionId = import.meta.env.VITE_VUE_APP_PERMISSION_ID;
        // Prepare permissions list
        const serverPermissionsFromRules = getServerPermissionsFromRules();
        if (permissionId) serverPermissionsFromRules.push(permissionId);

        const serverPermissions = await UserService.getUserPermissions(
          {
            permissionIds: [...new Set(serverPermissionsFromRules)],
          },
          token
        );
        const appPermissions = prepareAppPermissions(serverPermissions);

        // Checking if the user has permission to access the app
        // If there is no configuration, the permission check is not enabled
        if (permissionId) {
          const hasPermission = appPermissions.some(
            (appPermission: any) => appPermission.action === permissionId
          );
          if (!hasPermission) {
            const permissionError = "You do not have permission to access the app.";
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
          storeName: "None",
        });
        let preferredStore = userProfile.stores[0];

        const preferredStoreId = await UserService.getPreferredStore(token);
        if (preferredStoreId) {
          const store = userProfile.stores.find(
            (store: any) => store.productStoreId === preferredStoreId
          );
          store && (preferredStore = store);
        }

        const shopifyConfigs = await UserService.getShopifyConfig(
          preferredStore.productStoreId,
          token
        );
        let currentShopifyConfig = {};
        shopifyConfigs.length > 0 && (currentShopifyConfig = shopifyConfigs[0]);

        const preferredShopifyShopId = await UserService.getPreferredShopifyShop(
          token
        );
        if (preferredShopifyShopId) {
          currentShopifyConfig = shopifyConfigs.find(
            (shopifyConfig: any) =>
              shopifyConfig.shopId === preferredShopifyShopId
          );
        }

        setPermissions(appPermissions);
        if (userProfile.userTimeZone) {
          Settings.defaultZone = userProfile.userTimeZone;
        }

        if (omsRedirectionUrl) {
          const api_key = await UserService.moquiLogin(omsRedirectionUrl, token);
          if (api_key) {
            this.setOmsRedirectionInfo({
              url: omsRedirectionUrl,
              token: api_key,
            });
          } else {
            showToast(
              translate(
                "Some of the app functionality will not work due to missing configuration."
              )
            );
            logger.error(
              "Some of the app functionality will not work due to missing configuration."
            );
          }
        } else {
          showToast(
            translate(
              "Some of the app functionality will not work due to missing configuration."
            )
          );
          logger.error(
            "Some of the app functionality will not work due to missing configuration."
          );
        }

        this.currentEComStore = preferredStore;
        this.current = userProfile;
        this.shopifyConfigs = shopifyConfigs;
        this.currentShopifyConfig = currentShopifyConfig;
        this.permissions = appPermissions;
        this.token = token;

        updateToken(token);
      } catch (err: any) {
        showToast(
          translate(
            "Something went wrong while login. Please contact administrator."
          )
        );
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

      const authStore = useAuthStore();

      this.$reset();
      resetConfig();
      resetPermissions();
      authStore.$reset();

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

    async getPreOrderBackorderCategory() {
      const productStoreId = (this.currentEComStore as any).productStoreId;
      if (!productStoreId) {
        logger.warn(
          "No productStoreId provided. Not fetching pre-order/backorder categories"
        );
        return;
      }
      if (this.productStoreCategories[productStoreId])
        return this.productStoreCategories[productStoreId];

      try {
        const ecommerceCatalog = await UserService.getEcommerceCatalog(
          productStoreId
        );
        const preOrderBackorderCategory =
          await UserService.getPreOrderBackorderCategory(
            ecommerceCatalog.prodCatalogId
          );
        const productStoreCategories = {} as any;
        const preOrderCategory = preOrderBackorderCategory.find(
          (category: any) =>
            category.prodCatalogCategoryTypeId === "PCCT_PREORDR"
        );
        preOrderCategory &&
          (productStoreCategories.preorder = preOrderCategory.productCategoryId);
        const backorderCategory = preOrderBackorderCategory.find(
          (category: any) =>
            category.prodCatalogCategoryTypeId === "PCCT_BACKORDER"
        );
        backorderCategory &&
          (productStoreCategories.backorder =
            backorderCategory.productCategoryId);
        this.productStoreCategories[productStoreId] = productStoreCategories;
      } catch (err) {
        logger.error(err);
      }
      return this.productStoreCategories[productStoreId];
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

    async getPinnedJobs() {
      let resp;
      const user = this.current as any;

      try {
        const params = {
          inputFields: {
            userLoginId: user?.userLoginId,
            userSearchPrefTypeId: "PINNED_JOB",
          },
          viewSize: 1,
          filterByDate: "Y",
          sortBy: "fromDate ASC",
          fieldList: ["searchPrefId", "searchPrefValue"],
          entityName: "UserAndSearchPreference",
          distinct: "Y",
          noConditionFind: "Y",
        };
        resp = await UserService.getPinnedJobs(params);
        if (resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
          let pinnedJobs = resp.data.docs[0];
          pinnedJobs = {
            id: pinnedJobs?.searchPrefId ? pinnedJobs?.searchPrefId : "",
            jobs: pinnedJobs?.searchPrefValue
              ? JSON.parse(pinnedJobs?.searchPrefValue)
              : [],
          };

          const enumIds = pinnedJobs?.jobs;
          // TODO move job actions to job store
          // await store.dispatch("job/fetchJobDescription", enumIds);

          user.pinnedJobs = pinnedJobs;
          this.current = user;

          return pinnedJobs;
        } else {
          user.pinnedJobs = [];
          this.current = user;
        }
      } catch (error) {
        logger.error(error);
      }
      return resp;
    },

    async updatePinnedJobs(payload: any) {
      let resp;
      const pinnedJobPrefId = (this.current as any)["pinnedJobs"]?.id;

      try {
        if (pinnedJobPrefId) {
          resp = await UserService.updatePinnedJobPref({
            searchPrefId: pinnedJobPrefId,
            searchPrefValue: JSON.stringify(payload?.pinnedJobs),
          });

          if (resp.status === 200 && !hasError(resp)) {
            await this.getPinnedJobs();
          }
        } else {
          resp = await UserService.createPinnedJobPref({
            searchPrefValue: JSON.stringify(payload?.pinnedJobs),
          });
          if (resp.status === 200 && !hasError(resp)) {
            if (resp.data?.searchPrefId) {
              const params = {
                searchPrefId: resp.data?.searchPrefId,
                userSearchPrefTypeId: "PINNED_JOB",
              };
              const pinnedJob = await UserService.associatePinnedJobPrefToUser(
                params
              );
              if (pinnedJob.status === 200 && !hasError(pinnedJob)) {
                await this.getPinnedJobs();
              }
            }
          }
        }
      } catch (error) {
        logger.error(error);
      }
      return resp;
    },
  },
  persist: true,
});
