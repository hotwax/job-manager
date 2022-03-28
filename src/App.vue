<template>
  <ion-app>
    <IonSplitPane content-id="main-content" when="lg">
      <Menu />
      <ion-router-outlet id="main-content" />
    </IonSplitPane>
  </ion-app>
</template>

<script lang="ts">
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue';
import { defineComponent } from 'vue';
import Menu from '@/components/Menu.vue';
import { loadingController, alertController } from '@ionic/vue';
import { useStore } from "./store";
import emitter from "@/event-bus"
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
      loader: null as any
    }
  },
  methods: {
    async timeZoneDifferentAlert(payload: any) {
      const alert = await alertController.create({
                header: this.$t("Change time zone"),
        message: this.$t('Would you like to update your time zone to . Your profile is currently set to . This setting can always be changed from the settings menu.', { localTimeZone: payload.localTimeZone, profileTimeZone: payload.profileTimeZone }),
        buttons: [
            {
              text: this.$t("Dismiss"),
              role: 'cancel',
              cssClass: 'secondary'
            },
            {
              text: this.$t("Update time zone"),
              handler: () => {
                this.store.dispatch("user/setUserTimeZone", {
                    "tzId": payload.localTimeZone
                });
              },
            },
          ],
      });
      return alert.present();
    },
    async presentLoader() {
      if (!this.loader) {
        this.loader = await loadingController
          .create({
            message: this.$t("Click the backdrop to dismiss."),
            translucent: true,
            backdropDismiss: true
          });
      }
      this.loader.present();
    },
    dismissLoader() {
      if (this.loader) {
        this.loader.dismiss();
        this.loader = null as any;
      }
    }
  },
  async mounted() {
    this.loader = await loadingController
      .create({
        message: this.$t("Click the backdrop to dismiss."),
        translucent: true,
        backdropDismiss: true
      });
    emitter.on('timeZoneDifferent', this.timeZoneDifferentAlert);
    emitter.on('presentLoader', this.presentLoader);
    emitter.on('dismissLoader', this.dismissLoader);
  },
  unmounted() {
    emitter.off('timeZoneDifferent', this.timeZoneDifferentAlert);
    emitter.off('presentLoader', this.presentLoader);
    emitter.off('dismissLoader', this.dismissLoader);
  },
  setup(){
    const store = useStore();
    return {
      store,
    }
  },
});
</script>

<style scoped>
ion-split-pane {
  --side-width: 304px;
}
</style>