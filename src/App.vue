<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <Menu v-if="router && router.currentRoute.value.name !== 'Login'" />
      <ion-router-outlet id="main-content" />
    </IonSplitPane>
  </ion-app>
</template>

<script lang="ts">
import { createAnimation, IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { defineComponent } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { Settings } from 'luxon'
import { initialise, resetConfig } from '@/adapter'
import router from './router';
import { translate } from '@common';
import { useAuthStore } from '@/store/auth';

export default defineComponent({
  name: 'App',
  components: {
    IonApp,  
    IonRouterOutlet, 
    IonSplitPane,
    Menu
  },
  data() {
    return {
      loader: null as any,
      maxAge: import.meta.env.VUE_APP_CACHE_MAX_AGE ? parseInt(import.meta.env.VUE_APP_CACHE_MAX_AGE) : 0
    }
  },
  computed: {
    userProfile(): any {
      return this.authStore.getUserProfile
    },
    userToken(): any {
      return this.authStore.getUserToken
    },
    instanceUrl(): any {
      return this.authStore.getInstanceUrl
    }
  },
  methods: {
    async presentLoader(options = { message: '', backdropDismiss: true }) {
      // When having a custom message remove already existing loader
      if(options.message && this.loader) this.dismissLoader();

      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: options.message ? translate(options.message) : translate("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: options.backdropDismiss
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
    playAnimation() {
      const aside = document.querySelector('aside') as Element
      const main = document.querySelector('main') as Element

      const revealAnimation = createAnimation()
        .addElement(aside)
        .duration(1500)
        .easing('ease')
        .keyframes([
          { offset: 0, flex: '0', opacity: '0' },
          { offset: 0.5, flex: '1', opacity: '0' },
          { offset: 1, flex: '1', opacity: '1' }
        ])

      const gapAnimation = createAnimation()
        .addElement(main)
        .duration(500)
        .fromTo('gap', '0', 'var(--spacer-2xl)');

      createAnimation()
        .addAnimation([gapAnimation, revealAnimation])
        .play();
    },
    async unauthorized() {
      // Mark the user as unauthorised, this will help in not making the logout api call in actions
      this.authStore.logout({ isUserUnauthorised: true });
      const redirectUrl = window.location.origin + '/login'
      window.location.href = `${import.meta.env.VUE_APP_LOGIN_URL}?redirectUrl=${redirectUrl}`
    }
  },
  created() {
    initialise({
      token: this.userToken,
      instanceUrl: this.instanceUrl,
      cacheMaxAge: this.maxAge,
      events: {
        unauthorised: this.unauthorized,
        responseError: () => {
          setTimeout(() => this.dismissLoader(), 100);
        },
        queueTask: (payload: any) => {
          emitter.emit("queueTask", payload);
        }
      }
    })
  },
  async mounted() {
    this.loader = await loadingController
      .create({
        message: translate("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
    emitter.on('playAnimation', this.playAnimation);
    // Handles case when user resumes or reloads the app
    if (this.userProfile) {
      // Luxon timezone should be set with the user's selected timezone
      this.userProfile.userTimeZone && (Settings.defaultZone = this.userProfile.userTimeZone);
    }
  },
  unmounted() {
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
    emitter.off('playAnimation', this.playAnimation);
    resetConfig()
  },
  setup(){
    const authStore = useAuthStore();
    return {
      authStore,
      router
    }
  },
});
</script>

<style scoped>
ion-split-pane {
  --side-width: 304px;
}
</style>
