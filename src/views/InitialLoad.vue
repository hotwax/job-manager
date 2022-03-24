<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Initial load") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Products") }}</ion-card-title>
            </ion-card-header>
            <ion-button expand="block" fill="outline">{{ $t("Import products in bulk") }}</ion-button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("All products from Shopify. Make sure you run this before importing orders in bulk during intial setup.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Orders") }}</ion-card-title>
            </ion-card-header>
            <ion-button expand="block" fill="outline">{{ $t("Import orders in bulk") }}</ion-button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Before importing historical orders in bulk, make sure all products are set up or else order import will not run correctly.") }}</p>
                <br />
                <p>{{ $t("By default only open and unshipped orders will be imported.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>
        </section>

        <aside>
          <section>
            <ion-item lines="none">
              <h1>{{ $t("Products") }}</h1>
              <ion-badge slot="end" color="warning">running</ion-badge>
            </ion-item>

            <ion-list>
              <ion-item>
                <ion-icon slot="start" :icon="calendarClearOutline" />
                <ion-label>{{ $t("Last run") }}</ion-label>
                <ion-label slot="end">2:00 PM EST</ion-label>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label>{{ $t("Run time") }}</ion-label>
                <ion-label slot="end">3:00 PM EST</ion-label>
              </ion-item>
            </ion-list>

            <ion-button size="small" fill="outline" expand="block">{{ $t("Run import") }}</ion-button>
          </section>

           <section>
            <ion-item lines="none">
              <h1>{{ $t("Orders") }}</h1>
              <ion-badge slot="end" color="medium">pending</ion-badge>
            </ion-item>

            <ion-list>
              <ion-item>
                <ion-icon slot="start" :icon="calendarClearOutline" />
                <ion-label>{{ $t("Last run") }}</ion-label>
                <ion-label slot="end">2:00 PM EST</ion-label>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label>{{ $t("Run time") }}</ion-label>
                <ion-label slot="end">3:00 PM EST</ion-label>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label>{{ $t("Order status") }}</ion-label>
                <ion-select value="open" :interface-options="customOrderOptions" interface="popover">
                  <ion-select-option value="open">Open</ion-select-option>
                  <ion-select-option value="archived">Archived</ion-select-option>
                  <ion-select-option value="canceled">Canceled</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label>{{ $t("Fulfillment status") }}</ion-label>
                <ion-select value="fulfilled" :interface-options="customFulfillmentOptions" interface="popover">
                  <ion-select-option value="unfulfilled">Unfulfilled</ion-select-option>
                  <ion-select-option value="partially-fulfilled">Partally fulfilled</ion-select-option>
                  <ion-select-option value="on-hold">On hold</ion-select-option>
                  <ion-select-option value="fulfilled">Fulfilled</ion-select-option>
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label>{{ $t("Last Shopify Order ID") }}</ion-label>
                <ion-input :placeholder="$t('Internal Shopify Order ID')" />
              </ion-item>
            </ion-list>

            <ion-button size="small" fill="outline" expand="block">{{ $t("Run import") }}</ion-button>
          </section>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import {
  calendarClearOutline,
  timeOutline,
} from "ionicons/icons";

export default defineComponent({
  name: 'InitialLoad',
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
  },
  setup() {
    const customOrderOptions: any = {
      header: 'Order status',
    };
    const customFulfillmentOptions: any = {
      header: 'Fulfillment status',
    };
    return {
      calendarClearOutline,
      timeOutline,
      customOrderOptions,
      customFulfillmentOptions
    }
  }
});
</script>
<style scoped>
ion-card > ion-button {
  margin: var(--spacer-sm);
}

aside > section {
  overflow: hidden;
  border: 1px solid var(--ion-color-medium);
  border-radius: 16px;
}

aside > section > ion-list {
  margin-top: var(--spacer-xs);
}

aside > section > ion-button {
  margin: var(--spacer-base) var(--spacer-sm) var(--spacer-base);
}
</style>
