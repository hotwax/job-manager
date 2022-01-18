<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Inventory") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main>
        <ion-card>
          <ion-radio-group>
            <ion-item lines="none">
              <ion-label>{{ $t("Shopify source") }}</ion-label>
              <ion-radio slot="start"></ion-radio>
            </ion-item>
          </ion-radio-group>
          <ion-item>
            <ion-label>{{ $t("Realtime webhooks") }}</ion-label>
            <ion-toggle color="secondary" slot="end" checked />
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Hard sync") }}</ion-label>
            <ion-select :interface-options="customPopoverOptions" interface="popover">
              <ion-select-option>Hourly</ion-select-option>
              <ion-select-option>Every 6 hours</ion-select-option>
              <ion-select-option>Nightly</ion-select-option>
              <ion-select-option>Daily</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Performing a hard sync from Shopify to HotWax Commerce is useful for eliminating any discrepencies that may build up from unreliable webhooks.") }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("BOPIS corrections") }}</ion-label>
            <ion-toggle color="secondary" slot="end" checked />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("When using HotWax BOPIS, Shopify isn't aware of the actual inventory consumed. HotWax will automatically restore inventory automatically reduced by Shopify and deduct inventory from the correct store to maintain inventory accuracy.") }}</p>
            </ion-label>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-radio-group>
            <ion-item lines="none">
              <ion-label>{{ $t("HotWax source") }}</ion-label>
              <ion-radio slot="start"></ion-radio>
            </ion-item>
          </ion-radio-group>
          <ion-item>
            <ion-label>{{ $t("Realtime adjustments") }}</ion-label>
            <ion-toggle disabled color="secondary" slot="end" checked />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Realtime adjustments allow HotWax Commerce to push new inventory to Shopify in realtime. These events include receiving , cycle counts, variances, and return.") }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Hard sync") }}</ion-label>
            <ion-select :interface-options="customPopoverOptions" interface="popover">
              <ion-select-option>Hourly</ion-select-option>
              <ion-select-option>Every 6 hours</ion-select-option>
              <ion-select-option>Nightly</ion-select-option>
              <ion-select-option>Daily</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Performing a hard sync from Shopify to HotWax Commerce is useful for eliminating any discrepencies.") }}</p>
            </ion-label>
          </ion-item>
           <ion-item>
            <ion-label>{{ $t("Realtime POS sales") }}</ion-label>
            <ion-toggle disabled color="secondary" slot="end" checked />
          </ion-item>
           <ion-item>
            <ion-label>{{ $t("Reserve for completed orders") }}</ion-label>
            <ion-toggle disabled color="secondary" slot="end" checked />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Reserving inventory for completed orders allows POS sales to accurately deduct inventory in HotWax Commerce.") }}</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("When importing historical completed orders, reservation should be turned off.") }}</p>
            </ion-label>
          </ion-item>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonCard,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonRadioGroup,
  IonRadio,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from "@ionic/vue";
import { defineComponent } from "vue";

export default defineComponent({
  name: "Inventory",
  components: {
    IonCard,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonPage,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
  },
  setup() {
    const customPopoverOptions: any = {
    header: 'Title',
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
  display: flex;  
  align-items: flex-start;
  max-width: 742px;
  margin-top: 20px;
  margin-right: auto;
  margin-left: auto;
}

ion-card {
  max-width: 343px;
}
</style>
