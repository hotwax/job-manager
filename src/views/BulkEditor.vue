<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Schedule in bulk") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <section>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>{{ $t("Product Store") }}</ion-card-subtitle>
            <ion-card-title>{{ $t("Stores") }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Store 1</ion-label>
              <ion-checkbox />
            </ion-item>
            <ion-item>
              <ion-label>Store 2</ion-label>
              <ion-checkbox />
            </ion-item>
            <ion-item>
              <ion-label>Store 3</ion-label>
              <ion-checkbox />
            </ion-item>
            <ion-item lines="none">
              <ion-label color="medium" class="ion-text-wrap">{{ $t("A store repesents a company or a unique catalog of products. If your OMS is connected to multiple eCommerce stores sellling different collections of products, you may have multiple Product Stores set up in HotWax Commerce.") }}</ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>  
            
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>{{ $t("Shop Config") }}</ion-card-subtitle>
            <ion-card-title>{{ $t("eCommerce") }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>eCommerce 1</ion-label>
              <ion-checkbox />
            </ion-item>
            <ion-item>
              <ion-label>eCommerce 2</ion-label>
              <ion-checkbox />
            </ion-item>
            <ion-item>
              <ion-label>eCommerce 3</ion-label>
              <ion-checkbox />
            </ion-item>
            <ion-item lines="none">
              <ion-label color="medium" class="ion-text-wrap">{{ $t("eCommerce stores are directly connected to one Shop Configs. If your OMS is connected to multiple eCommerce stores selling the same catalog operating as one Company, you may have multiple Shop Configs for the selected Product Store.") }}</ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>   
           
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>{{ $t("Shop Config") }}</ion-card-subtitle>
            <ion-card-title>{{ $t("Scheduler") }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-icon slot="start" :icon="timeOutline" />
              <ion-label>{{ $t("Run time") }}</ion-label>
              <ion-label slot="end">3:00 PM EST</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="timerOutline" />
              <ion-label>{{ $t("Schedule") }}</ion-label>
              <ion-select interface="popover"></ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-label color="medium">description</ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>
      </section>
        
      <ion-button fill="outline">
        <ion-icon :icon="addOutline" />
        {{ $t("select jobs") }}
      </ion-button>
      <section>
        <ion-card>
          <ion-item lines="none">
            <ion-label>
              Job enum name
              <p>enum description</p>
            </ion-label>  
          </ion-item>
          <ion-item-divider>
            {{ $t("parameter") }}
          </ion-item-divider>
          <ion-item>
              <ion-label>{{ $t("Store") }}</ion-label>
              <ion-note slot="end">2 {{ $t("stores selected") }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("eCommerce") }}</ion-label>
            <ion-badge color="danger">{{ $t("no eCommerce selected") }}</ion-badge>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Run time") }}</ion-label>
            <ion-label slot="end">3:00 PM EST</ion-label>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Schedule") }}</ion-label>
            <ion-select interface="popover" :placeholder='$t("Bulk schedule")'></ion-select>
          </ion-item>
        </ion-card>
      </section>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="iceCreamOutline" />
        </ion-fab-button>
      </ion-fab>

    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from 'vuex';
import { addOutline, iceCreamOutline, timeOutline, timerOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'InitialLoad',
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCheckbox,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSelect,
    IonTitle,
    IonToolbar
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      addOutline,
      iceCreamOutline,
      store,
      router,
      timeOutline,
      timerOutline
    }
  }
});
</script>

<style scoped>
section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-items: start;
}

ion-button {
  margin: var(--spacer-xs);
}
</style>
