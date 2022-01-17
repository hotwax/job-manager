<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Import") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("New orders") }}</ion-label>
            <DurationPopover />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Cancelled orders") }}</ion-label>
            <DurationPopover />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Payment status") }}</ion-label>
            <DurationPopover />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Returns") }}</ion-label>
            <DurationPopover />
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Upload") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Completed orders") }}</ion-label>
            <DurationPopover />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Cancelled orders") }}</ion-label>
            <DurationPopover />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Refunds") }}</ion-label>
           <DurationPopover />
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Notes") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Promise date changes") }}</ion-label>
            <ion-toggle color="secondary" />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Reroutes") }}</ion-label>
            <ion-toggle color="secondary" />
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Routing") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Batch broker orders") }}</ion-label>
            <ion-toggle color="secondary" />
          </ion-item>
          <ion-item-divider>
            <ion-label>{{ $t("Batches") }}</ion-label>
            <ion-button fill="clear" slot="end">
              Add
              <ion-icon :icon="addCircleOutline" slot="end" />
            </ion-button>
          </ion-item-divider>
          <ion-item detail>
            <ion-label>{{ $t("Batch 1") }}</ion-label>
            <ion-note slot="end">9:30 am</ion-note>
          </ion-item>
          <ion-item detail>
            <ion-label>{{ $t("Batch 2") }}</ion-label>
            <ion-note slot="end">12:00 pm</ion-note>
          </ion-item>
          <ion-item detail>
            <ion-label>{{ $t("Batch 3") }}</ion-label>
            <ion-note slot="end">3:00 pm</ion-note>
          </ion-item>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonTitle,
  IonToolbar,
  popoverController,
} from "@ionic/vue";
import { defineComponent } from "vue";
import Popover from "@/views/Orders.vue";
import { addCircleOutline } from "ionicons/icons";
import DurationPopover from '@/components/DurationPopover.vue'

export default defineComponent({
  name: "Orders",
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonPage,
    IonTitle,
    IonToolbar,
    DurationPopover
  },
  methods: {
    async openPopover(ev: Event) {
      const popover = await popoverController.create({
        component: Popover,
        event: ev,
        translucent: true,
        showBackdrop: false,
      });
      return popover.present();
    },
  },
  setup() {
    return {
      addCircleOutline,
    };
  },
});
</script>

<style scoped>
main {
  max-width: 343px;
  margin-top: 20px;
  margin-right: auto;
  margin-left: auto;
}
</style>
