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
                {{ userStore.instanceUrl }}
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


<script lang="ts">
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
  loadingController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/store/authStore";
import Logo from '@/components/Logo.vue';
import { arrowForwardOutline, gridOutline } from 'ionicons/icons'
import { UserService } from "@/services/UserService";
import { translate } from "@common";
import { appInfo, showToast } from "@/util";
import { hasError } from "@common";
import { Actions, hasPermission } from "@/authorization";

export default defineComponent({
  name: "Login",
  components: {
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
    Logo
  },
  data () {
    return {
      username: "",
      password: "",
      instanceUrl: "",
      baseURL: import.meta.env.VITE_VUE_APP_BASE_URL,
      alias: import.meta.env.VITE_VUE_APP_ALIAS ? JSON.parse(import.meta.env.VITE_VUE_APP_ALIAS) : {},
      defaultAlias: import.meta.env.VITE_VUE_APP_DEFAULT_ALIAS,
      showOmsInput: false,
      hideBackground: true,
      isConfirmingForActiveSession: false,
      loader: null as any,
      loginOption: {} as any,
      isCheckingOms: false,
      isLoggingIn: false
    };
  },
  ionViewWillEnter() {
    this.initialise()
  },
  methods: {
    async initialise() {
      const route = useRoute()
      this.hideBackground = true
      await this.presentLoader("Processing");

      // Run the basic login flow when oms and token both are found in query
      if (route.query?.oms && route.query?.token) {
        await this.basicLogin()
        this.dismissLoader();
        return;
      } else if (route.query?.token) {
        // SAML login handling as only token will be returned in the query when login through SAML
        await this.samlLogin()
        this.dismissLoader();
        return
      }

      // logout from Launchpad if logged out from the app
      if (route.query?.isLoggedOut === 'true') {
        // We will already mark the user as unuauthorised when log-out from the app
        // For the case of apps using maarg login, we will call the logout api from launchpad
        
        // TODO: the above comment becomes invalid after calling the logout always from the launchpad
        // With this change app will never call the logout api and launchpad is responsible for calling the logout api
        await this.userStore.logout()
      }

      // fetch login options only if OMS is there as API calls require OMS
      if (this.userStore.instanceUrl) {
        await this.fetchLoginOptions()
      }

      // show OMS input if SAML if configured or if query or state does not have OMS
      if (this.loginOption.loginAuthType !== 'BASIC' || route.query?.oms || !this.userStore.instanceUrl) {
        this.showOmsInput = true
      }

      // Update OMS input if found in query
      if (route.query?.oms) {
        this.instanceUrl = route.query.oms as string
      }

      // setting redirectUrl in the state
      if (route.query?.redirectUrl) {
        this.userStore.setRedirectUrl(route.query.redirectUrl as string)
      }

      // if a session is already active, login directly in the app
      if (this.userStore.isAuthenticated) {
        if(this.userStore.getRedirectUrl) {
          await this.userStore.getPermissions();
          this.generateRedirectionLink();
        } else {
          this.router.push('/')
        }
      }

      this.instanceUrl = this.userStore.instanceUrl;
      if (this.userStore.instanceUrl) {
        // If the current URL is available in alias show it for consistency
        const currentInstanceUrlAlias = Object.keys(this.alias).find((key) => this.alias[key] === this.userStore.instanceUrl);
        currentInstanceUrlAlias && (this.instanceUrl = currentInstanceUrlAlias);
      }
      // If there is no current preference set the default one
      if (!this.instanceUrl && this.defaultAlias) {
        this.instanceUrl = this.defaultAlias;
      }
      this.dismissLoader();
      this.hideBackground = false
    },
    async presentLoader(message: string) {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: translate(message),
            translucent: true,
            backdropDismiss: false
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      }
    },
    toggleOmsInput() {
      this.showOmsInput = !this.showOmsInput
      // clearing username and password if moved to OMS input
      if (this.showOmsInput) this.username = this.password = ''
    },
    // on pressing Enter after inputting OMS, the form is submitted through the login method
    // handleSubmit will handle the flow based on the input values for OMS, username and password  
    handleSubmit() {
      if (this.instanceUrl.trim() && this.showOmsInput && (!this.username && !this.password)) this.setOms()
      else if (this.instanceUrl) this.login()
    },
    async setOms() {
      if (!this.instanceUrl) {
        showToast(translate('Please fill in the OMS'));
        return
      }

      this.isCheckingOms = true

      const instanceURL = this.instanceUrl.trim().toLowerCase();
      if (!this.baseURL) this.userStore.setUserInstanceUrl(this.alias[instanceURL] ? this.alias[instanceURL] : instanceURL);

      // run SAML login flow if login options are configured for the OMS
      await this.fetchLoginOptions()

      // checking loginOption.length to know if fetchLoginOptions API returned data
      // as toggleOmsInput is called twice without this check, from fetchLoginOptions and
      // through setOms (here) again
      if (Object.keys(this.loginOption).length && this.loginOption.loginAuthType !== 'BASIC') {
        window.location.href = `${this.loginOption.loginAuthUrl}?relaystate=${window.location.origin}/login` // passing launchpad/login URL
      } else {
        this.toggleOmsInput()
      }
      this.isCheckingOms = false
    },
    async fetchLoginOptions() {
      this.loginOption = {}
      try {
        const resp = await UserService.checkLoginOptions()
        if (!hasError(resp)) {
          this.loginOption = resp.data
          await this.userStore.setOmsRedirectionInfo({ url: resp.data.maargInstanceUrl })
        }
      } catch (error) {
        console.error(error)
      }
    },
    async login() {
      const { username, password } = this;
      if (!username || !password) {
        showToast(translate('Please fill in the user details'));
        return
      }

      this.isLoggingIn = true;
      try {
        await this.userStore.login(username.trim(), password)
        if (this.userStore.getRedirectUrl) {
          this.generateRedirectionLink()
        } else {
          // All the failure cases are handled in action, if then block is executing, login is successful
          this.username = ''
          this.password = ''
          this.router.push('/')
        }
      } catch (error) {
        console.error(error)
      }
      this.isLoggingIn = false;
    },
    async samlLogin() {
      const route = useRoute()
      try {
        const { token, expirationTime } = route.query as any
        await this.userStore.samlLogin(token, expirationTime)
        if (this.userStore.getRedirectUrl) {
          this.generateRedirectionLink();
        } else {
          this.router.push('/')
        }
      } catch (error) {
        this.router.push('/')
        console.error(error)
      }
    },
    async basicLogin() {
      const route = useRoute()
      try {
        const { oms, token, expirationTime } = route.query as any
        // Clear the previously stored oms and token when having oms and token in the URL
        this.userStore.$patch({
          token: '',
          instanceUrl: ''
        })
        this.userStore.setUserInstanceUrl(oms);

        // checking for login options as we need to get maarg instance URL for accessing specific apps
        await this.fetchLoginOptions()

        // Setting token previous to getting user-profile, if not then the client method honors the state token
        this.userStore.$patch({
          token: token
        })

        const current = await UserService.getUserProfile(token);
        this.userStore.$patch({
          current: current
        })

        await this.userStore.getPermissions();
      } catch (error) {
        showToast(translate('Failed to fetch user-profile, please try again'));
        console.error("error: ", error);
      }
      this.router.replace('/')
    },
  generateRedirectionLink() {
      let omsUrl = this.userStore.instanceUrl
      let maarg = this.userStore.getOmsRedirectionInfo.url

      let url = this.userStore.getRedirectUrl
      const app = appInfo.find((app: any) => url.includes(app.handle))!

      // Replacing legacy from the url, so to easily handle the redirection
      url = url.replaceAll("-legacy", "")

      if(app && app.appLegacyPermission && Actions[app.appLegacyPermission] && hasPermission(Actions[app.appLegacyPermission]) || (app && app.appPermission && Actions[app.appPermission] && !hasPermission(Actions[app.appPermission]))) {
        if(url.includes("-uat.hotwax.io") || url.includes("-dev.hotwax.io")) {
          url = url.replace("-uat.hotwax.io", "-legacy-uat.hotwax.io").replace("-dev.hotwax.io", "-legacy-dev.hotwax.io")
        } else {
          url = url.replace(".hotwax.io", "-legacy.hotwax.io")
        }
      }

      window.location.replace(`${url}?oms=${omsUrl}&token=${this.userStore.token}&expirationTime=${maarg ? '&maarg=' + maarg : ''}`)
    }
  },
  setup () {
    const router = useRouter();
    const userStore = useUserStore();
    return {
      arrowForwardOutline,
      userStore,
      gridOutline,
      router,
      translate
    };
  }
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
