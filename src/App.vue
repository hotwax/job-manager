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
import { translate } from '@common';
import { useUserStore } from '@/store/user';

const loader = ref(null) as any

const userStore = useUserStore();
const userProfile = computed(() => userStore.getUserProfile)

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
  // Handles case when user resumes or reloads the app
  if(userProfile.value) {
    // Luxon timezone should be set with the user's selected timezone
    userProfile.value.userTimeZone && (Settings.defaultZone = userProfile.value.userTimeZone);
  }
})

onUnmounted(() => {
  emitter.off('presentLoader', presentLoader);
  emitter.off('dismissLoader', dismissLoader);
})
</script>
