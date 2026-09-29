<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <Menu v-if="router && router.currentRoute.value.name !== 'Login'" />
      <ion-router-outlet id="main-content" />
    </IonSplitPane>
    <FastTravel current-app="job-manager" />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController } from '@ionic/vue';
import emitter from "@/event-bus"
import { Settings } from 'luxon'
import router from './router';
import { FastTravel, translate } from '@common';
import { useUserStore } from '@/store/user';
import { useGlobalNotifications } from '@/composables/useGlobalNotifications';

const loader = ref(null) as any

const userStore = useUserStore();
const userProfile = computed(() => userStore.getUserProfile)

const { connectGlobalNotifications, disconnectGlobalNotifications } = useGlobalNotifications();

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

onMounted(async () => {
  loader.value = await loadingController
    .create({
      message: translate("Click the backdrop to dismiss."),
      translucent: true,
      backdropDismiss: true
    });
  emitter.on('presentLoader', presentLoader);
  emitter.on('dismissLoader', dismissLoader);
  // Handles case when user resumes or reloads the app (page reload with existing session)
  if(userProfile.value?.userId) {
    userProfile.value.timeZone && (Settings.defaultZone = userProfile.value.timeZone);
    connectGlobalNotifications();
  }
})

// Watch userProfile reactively:
// - Connect the WebSocket the moment a userId appears (fresh login)
// - Disconnect it the moment userId clears (logout / store reset)
watch(
  () => userProfile.value?.userId,
  (newUserId, oldUserId) => {
    if (newUserId && !oldUserId) {
      connectGlobalNotifications();
    } else if (!newUserId && oldUserId) {
      disconnectGlobalNotifications();
    }
  }
)

onUnmounted(() => {
  emitter.off('presentLoader', presentLoader);
  emitter.off('dismissLoader', dismissLoader);
  disconnectGlobalNotifications();
})
</script>
