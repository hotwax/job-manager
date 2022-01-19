<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Product") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Sync") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Sync products") }}</ion-label>
            <ProductDurationPopover />
          </ion-item>
           <ion-item>
            <ion-label>{{ $t("Sync collections") }}</ion-label>
            <ProductDurationPopover />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap"><p>{{ $t("Sync products and category structures from Shopify into HotWax Commerce and keep them up to date.") }}</p></ion-label>
          </ion-item>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import ProductDurationPopover from '@/components/ProductDurationPopover.vue'

export default defineComponent({
  name: 'Product',
  components: {
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
    ProductDurationPopover
  },
  setup() {
    const customPopoverOptions: any = {
    header: 'Schedule product sync',
    showBackdrop: false
    }
    return {
      customPopoverOptions  
    }
  }
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
