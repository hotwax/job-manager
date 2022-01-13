<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Pre-order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main class="content">
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Auto listing") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Automatically list pre-order") }}</ion-label>
            <ion-toggle color="secondary" slot="end" />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap"><p>{{ $t("This will automatically list items from purchase orders for preorder when stock runs out.") }}</p></ion-label>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Re-allocate pre-orders") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Allocation") }}</ion-label>
            <ion-button fill="outline" color="danger" slot="end">{{ $t("Run reallocation") }}</ion-button>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap"><p>{{ $t("Re-allocation will re-allocate promise dates on all pre-orders based on upcoming inventory from purchase orders. Promise dates that were manually adjusted will be overriden.") }}</p></ion-label>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Auto releasing") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Run daily") }}</ion-label>
            <ion-checkbox slot="end" />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Release preorders")}}</ion-label>
            <ion-button fill="outline">{{ $t("Release") }}</ion-button>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap"><p>{{ $t("Auto releasing pre-orders will find pre-orders that have promise dates that have passed and release them from fulfillment.") }}</p></ion-label>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Sync") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Add pre-order tag in Shopify") }}</ion-label>
            <ion-checkbox slot="end" />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Add shipping dates in Shopify") }}</ion-label>
            <ion-checkbox slot="end" />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Manual update") }}</ion-label>
            <ion-button fill="outline">{{ $t("Run sync now") }}</ion-button>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap"><p>{{ $t("Transfer pre-order related information to Shopify as tags and meta fields.") }}</p></ion-label>
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
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PreOrder',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar
  },
});
</script>

<style scoped>
.content {
  max-width: 343px;
  margin-top: 20px;
  margin-right: auto;
  margin-left: auto;
}
</style>
