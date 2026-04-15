import { resetPermissions } from "@/authorization";
import emitter from "@/event-bus";
import logger from "@/logger";
import { useJobStore } from "@/store/jobs";
import { useMdmConfigStore } from "@/store/mdmConfig";
import { useUserStore } from "@/store/user";
import { useUtilStore } from "@/store/util";
import { showToast } from "@/utils";
import { api, client, cookieHelper, commonUtil, translate } from "@common";
import { DateTime } from "luxon";
import { computed, ref } from "vue";

interface LoginOption {
  loginAuthType?: string,
  maargInstanceUrl?: string,
  loginAuthUrl?: string
}

export function useAuth() {
  const loginOption = ref<LoginOption>({})

  const clearAuth = () => {
    cookieHelper().remove('token');
    cookieHelper().remove('expirationTime');
    cookieHelper().remove('maarg');
    cookieHelper().remove('oms');
  }

  const isAuthenticated = computed(() => {
    let isTokenExpired = false;
    const token = cookieHelper().get("token");
    const expirationTime = Number(cookieHelper().get("expirationTime"));
    if (expirationTime) {
      const currTime = DateTime.now().toMillis();
      isTokenExpired = expirationTime < currTime;
    }
    return !!(token && !isTokenExpired);
  })

  const login = async (username: string, password: string) => {
    try {
      const resp = await client({
        url: "login",
        method: "post",
        data: {
          "USERNAME": username,
          "PASSWORD": password
        },
        baseURL: commonUtil.getOmsURL()
      });
      if (commonUtil.hasError(resp)) {
        showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

      cookieHelper().set("token", resp.data.token)
      cookieHelper().set("expirationTime", resp.data.expirationTime)
      await useUserStore().fetchPermissions()
      await useUserStore().fetchUserProfile()
      await useUserStore().fetchProductStores()
      await useUserStore().fetchProductStorePreference();
      await useUserStore().fetchShopifyShopPreference();
    } catch (err: any) {
      clearAuth()
      showToast(translate("Something went wrong while login. Please contact administrator."));
      logger.error("error: ", err.toString());
      return Promise.reject(err instanceof Object ? err : new Error(err));
    }
  }

  const logout = async (payload?: any) => {
    let redirectionUrl = "";
    
    if (!payload?.isUserUnauthorised) {
      emitter.emit("presentLoader", {
        message: "Logging out",
        backdropDismiss: false,
      });
      let resp;
      try {
        resp = await api({
          url: "logout",
          method: "GET",
          baseURL: commonUtil.getOmsURL()
        });
        resp = JSON.parse(
          resp.data.startsWith("//") ? resp.data.replace("//", "") : resp
        );
      } catch (err) {
        logger.error("Error logging out", err);
      }

      if (resp?.logoutAuthType == "SAML2SSO") {
        redirectionUrl = resp.logoutUrl;
      }
    }

    useUserStore().$reset();
    useUtilStore().$reset();
    useMdmConfigStore().$reset();
    useJobStore().$reset();
    resetPermissions();
    cookieHelper().remove('token');
    cookieHelper().remove('expirationTime');

    emitter.emit("dismissLoader");
    return redirectionUrl;
  }

  const fetchLoginOptions = async() => {
    loginOption.value = {}
    try {
      const resp = await client({
        url: "checkLoginOptions",
        method: "GET",
        baseURL: commonUtil.getOmsURL()
      });
      if (!commonUtil.hasError(resp)) {
        loginOption.value = resp.data
        cookieHelper().set("maarg", resp.data.maargInstanceUrl)
      }
    } catch (error) {
      console.error(error)
    }
  };

  return {
    // Variables
    loginOption,
    // Functions
    fetchLoginOptions,
    login,
    logout,
    clearAuth,
    // Getters
    isAuthenticated
  }
}