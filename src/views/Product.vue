<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Product") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ $t("Sync") }}</ion-card-title>
          </ion-card-header>
          <ion-item>
            <ion-label>{{ $t("Import products") }}</ion-label>
            <ProductDurationPopover :id="jobEnums['IMP_PRDTS']"/>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Sync products") }}</ion-label>
            <ProductDurationPopover :id="jobEnums['SYNC_PRDTS']"/>
          </ion-item>
           <ion-item>
            <ion-label>{{ $t("Sync collections") }}</ion-label>
            <ProductDurationPopover :id="jobEnums['SYNC_COLLECTIONS']"/>
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
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import ProductDurationPopover from '@/components/ProductDurationPopover.vue'
import { useStore } from 'vuex';

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
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    ProductDurationPopover
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "serviceName": Object.values(this.jobEnums),
        "serviceName_op": "in"
      }
    });
  },
  setup() {
    const customPopoverOptions: any = {
    header: 'Schedule product sync',
    showBackdrop: false
    }
    const store = useStore();
    return {
      customPopoverOptions,
      store
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
