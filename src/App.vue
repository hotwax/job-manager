<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <Menu v-if="router && router.currentRoute.value.name !== 'Login'" />
      <ion-router-outlet id="main-content" />
    </IonSplitPane>
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { Settings } from 'luxon'
import router from './router';
import { initialise, resetConfig, translate } from '@common';
import { useUserStore } from '@/store/user';
import { useAuth } from './composables/auth';

const loader = ref(null) as any
const maxAge = import.meta.env.VUE_APP_CACHE_MAX_AGE ? parseInt(import.meta.env.VUE_APP_CACHE_MAX_AGE) : 0

const userStore = useUserStore();
const userProfile = computed(() => userStore.getUserProfile)

initialise({
  cacheMaxAge: maxAge,
  events: {
    unauthorised: unauthorized,
    responseError: () => {
      setTimeout(() => dismissLoader(), 100);
    },
    queueTask: (payload: any) => {
      emitter.emit("queueTask", payload);
    }
  }
})

async function presentLoader(options = { message: '', backdropDismiss: true }) {
  // When having a custom message remove already existing loader
  if(options.message && loader.value) dismissLoader();

  if (!loader.value) {
    loader.value = await loadingController
      .create({
        message: options.message ? translate(options.message) : translate("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: options.backdropDismiss
      });
  }
  loader.value.present();
}

function dismissLoader() {
  if (loader.value) {
    loader.value.dismiss();
    loader.value = null as any;
  }
}

async function unauthorized() {
  // Mark the user as unauthorised, this will help in not making the logout api call in actions
  const redirectionUrl = await useAuth().logout({ isUserUnauthorised: true });
  if(redirectionUrl) {
    window.location.href = redirectionUrl
  } else {
    router.replace("/login");
  }
}

onMounted(async () => {
  loader.value = await loadingController
    .create({
      message: translate("Click the backdrop to dismiss."),
      translucent: true,
      backdropDismiss: true
    });
  emitter.on('presentLoader', presentLoader);
  emitter.on('dismissLoader', dismissLoader);
  // Handles case when user resumes or reloads the app
  if(userProfile.value) {
    // Luxon timezone should be set with the user's selected timezone
    userProfile.value.userTimeZone && (Settings.defaultZone = userProfile.value.userTimeZone);
  }
})

onUnmounted(() => {
  emitter.off('presentLoader', presentLoader);
  emitter.off('dismissLoader', dismissLoader);
  resetConfig();
})
</script>

<style scoped>
ion-split-pane {
  --side-width: 304px;
}
</style>
