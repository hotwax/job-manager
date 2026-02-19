<template>
  <ion-page>
    <ion-content>
      <div class="flex" v-if="!hideBackground && !isConfirmingForActiveSession">
        <form class="login-container" @keyup.enter="handleSubmit()" @submit.prevent>
          <Logo />
          <section v-if="showOmsInput">
            <ion-item lines="full">
              <ion-input :label="translate('OMS')" label-placement="fixed" name="instanceUrl" v-model="instanceUrl" id="instanceUrl" type="text" required />
            </ion-item>

            <div class="ion-padding">
              <!-- @keyup.enter.stop to stop the form from submitting on enter press as keyup.enter is already bound
              through the form above, causing both the form and the button to submit. -->
              <ion-button color="primary" expand="block" @click.prevent="isCheckingOms ? '' : setOms()" @keyup.enter.stop>
                {{ translate("Next") }}
                <ion-spinner v-if="isCheckingOms" name="crescent" slot="end" />
                <ion-icon v-else slot="end" :icon="arrowForwardOutline" />
              </ion-button>
            </div>
          </section>

          <section v-else>
            <div class="ion-text-center ion-margin-bottom">
              <ion-chip :outline="true" @click="toggleOmsInput()">
                {{ authStore.instanceUrl }}
              </ion-chip>
            </div>

            <ion-item lines="full">
              <ion-input :label="translate('Username')" label-placement="fixed" name="username" v-model="username" id="username"  type="text" required />
            </ion-item>
            <ion-item lines="none">
              <ion-input :label="translate('Password')" label-placement="fixed" name="password" v-model="password" id="password" type="password" required />
            </ion-item>

            <div class="ion-padding">
              <ion-button color="primary" expand="block" @click="isLoggingIn ? '' : login()">
                {{ translate("Login") }}
                <ion-spinner v-if="isLoggingIn" slot="end" name="crescent" />
                <ion-icon v-else slot="end" :icon="arrowForwardOutline" />
              </ion-button>
            </div>
          </section>
        </form>
      </div>
    
      <ion-fab @click="router.push('/')" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="medium">
          <ion-icon :icon="gridOutline" /> 
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonChip,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonSpinner,
  loadingController,
  onIonViewWillEnter
} from "@ionic/vue";
import { ref } from "vue";
import router from "../router";
import { useAuthStore } from "@/store/auth";
import Logo from '@/components/Logo.vue';
import { arrowForwardOutline, gridOutline } from 'ionicons/icons'
import { UserService } from "@/services/UserService";
import { translate, hasError, cookieHelper, api } from "@common";
import { showToast } from "@/utils";

let route = null as any;
const authStore = useAuthStore();
const cookieHandler = cookieHelper();

const username = ref("");
const password = ref("");
const instanceUrl = ref("");
const baseURL = import.meta.env.VITE_VUE_APP_BASE_URL;
const alias = import.meta.env.VITE_VUE_APP_ALIAS ? JSON.parse(import.meta.env.VITE_VUE_APP_ALIAS) : {};
const defaultAlias = import.meta.env.VITE_VUE_APP_DEFAULT_ALIAS;
const showOmsInput = ref(false);
const hideBackground = ref(true);
const isConfirmingForActiveSession = ref(false);
const loader = ref<any>(null);
const loginOption = ref<any>({});
const isCheckingOms = ref(false);
const isLoggingIn = ref(false);

const presentLoader = async (message: string) => {
  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: translate(message),
        translucent: true,
        backdropDismiss: false
      });
  }
  loader.value.present();
};

const dismissLoader = () => {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null;
  }
};

const fetchLoginOptions = async () => {
  loginOption.value = {}
  try {
    const resp = await api({
      url: "checkLoginOptions",
      method: "GET",
      baseURL: authStore.getOmsUrl
    });
    if (!hasError(resp)) {
      loginOption.value = resp.data
      await authStore.setMaargInstance(resp.data.maargInstanceUrl)
    }
  } catch (error) {
    console.error(error)
  }
};

const toggleOmsInput = () => {
  showOmsInput.value = !showOmsInput.value;
  // clearing username and password if moved to OMS input
  if (showOmsInput.value) {
    username.value = "";
    password.value = "";
  }
};

const login = async () => {
  if (!username.value || !password.value) {
    showToast(translate('Please fill in the user details'));
    return;
  }

  isLoggingIn.value = true;
  try {
    await authStore.login(username.value.trim(), password.value);
    // All the failure cases are handled in action, if then block is executing, login is successful
    username.value = "";
    password.value = "";
    cookieHandler.set('hc_token', authStore.token);
    router.push('/');
  } catch (error) {
    console.error(error);
  }
  isLoggingIn.value = false;
};

const setOms = async () => {
  if (!instanceUrl.value) {
    showToast(translate('Please fill in the OMS'));
    return;
  }

  isCheckingOms.value = true;

  const instanceURL = instanceUrl.value.trim().toLowerCase();
  if (!baseURL) authStore.setOMS(alias[instanceURL] ? alias[instanceURL] : instanceURL);

  // run SAML login flow if login options are configured for the OMS
  await fetchLoginOptions();

  // checking loginOption.length to know if fetchLoginOptions API returned data
  // as toggleOmsInput is called twice without this check, from fetchLoginOptions and
  // through setOms (here) again
  if (Object.keys(loginOption.value).length && loginOption.value.loginAuthType !== 'BASIC') {
    window.location.href = `${loginOption.value.loginAuthUrl}?relaystate=${window.location.origin}/login`;
  } else {
    toggleOmsInput();
  }
  isCheckingOms.value = false;
};

const samlLogin = async () => {
  try {
    const { token, expirationTime } = route.query as any;
    await authStore.samlLogin(token, expirationTime);
    cookieHandler.set('hc_token', token, expirationTime);
    router.push('/');
  } catch (error) {
    router.push('/');
    console.error(error);
  }
};

const basicLogin = async () => {
  try {
    const { oms, token, expirationTime } = route.query as any;
    // Clear the previously stored oms and token when having oms and token in the URL
    authStore.$patch({
      token: '',
      instanceUrl: ''
    });
    authStore.setUserInstanceUrl(oms);

    // checking for login options as we need to get maarg instance URL for accessing specific apps
    await fetchLoginOptions();

    // Setting token previous to getting user-profile, if not then the client method honors the state token
    authStore.$patch({
      token: token
    });
    cookieHandler.set('hc_token', token, expirationTime);

    const current = await UserService.getUserProfile(token);
    authStore.$patch({
      current: current
    });

    await authStore.getPermissions();
  } catch (error) {
    showToast(translate('Failed to fetch user-profile, please try again'));
    console.error("error: ", error);
  }
  router.replace('/');
};

const initialise = async () => {
  hideBackground.value = true;
  await presentLoader("Processing");

  // Run the basic login flow when oms and token both are found in query
  if (route.query?.oms && route.query?.token) {
    await basicLogin();
    dismissLoader();
    return;
  } else if (route.query?.token) {
    // SAML login handling as only token will be returned in the query when login through SAML
    await samlLogin();
    dismissLoader();
    return;
  }

  // logout from Launchpad if logged out from the app
  if (route.query?.isLoggedOut === 'true') {
    await authStore.logout();
    cookieHandler.remove('hc_token');
  }

  // fetch login options only if OMS is there as API calls require OMS
  if (authStore.instanceUrl) {
    await fetchLoginOptions();
  }

  // show OMS input if SAML if configured or if query or state does not have OMS
  if (loginOption.value.loginAuthType !== 'BASIC' || route.query?.oms || !authStore.instanceUrl) {
    showOmsInput.value = true;
  }

  // Update OMS input if found in query
  if (route.query?.oms) {
    instanceUrl.value = route.query.oms as string;
  }

  // if a session is already active, login directly in the app
  if (authStore.isAuthenticated) {
    router.push('/');
  }

  const hcToken = cookieHandler.get('hc_token');
  if (authStore.token && !hcToken) {
    cookieHandler.set('hc_token', authStore.token);
  }

  instanceUrl.value = authStore.instanceUrl;
  if (authStore.instanceUrl) {
    // If the current URL is available in alias show it for consistency
    const currentInstanceUrlAlias = Object.keys(alias).find((key) => alias[key] === authStore.instanceUrl);
    currentInstanceUrlAlias && (instanceUrl.value = currentInstanceUrlAlias);
  }
  // If there is no current preference set the default one
  if (!instanceUrl.value && defaultAlias) {
    instanceUrl.value = defaultAlias;
  }
  dismissLoader();
  hideBackground.value = false;
};

const handleSubmit = () => {
  if (instanceUrl.value.trim() && showOmsInput.value && (!username.value && !password.value)) setOms();
  else if (instanceUrl.value) login();
};

onIonViewWillEnter(() => {
  // TODO: check why useRoute and useRouter are not working
  route = router.currentRoute.value;
  initialise();
});
</script>

<style scoped>
.login-container {
  width: 375px;
}

.flex {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>
