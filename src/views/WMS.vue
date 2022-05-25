<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("WMS") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Import") }}</ion-card-title>
            </ion-card-header>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Fulfillment updates") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Upload") }}</ion-card-title>
            </ion-card-header>
            <ion-item-divider>
              <ion-label class="ion-text-wrap">{{ $t("Export brokered orders") }}</ion-label>
              <ion-button fill="clear" slot="end">
                {{ $t("Add") }}
                <ion-icon :icon="addCircleOutline" slot="end" />
              </ion-button>
            </ion-item-divider>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Morning export") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Afternoon export") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
          </ion-card>
        </section>

        <!-- <aside class="desktop-only"></aside> -->
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
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { addCircleOutline } from 'ionicons/icons'

export default defineComponent({
  name: 'WMS',
  components: {
    IonButton,  
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
  },
  setup() {
    return {
      addCircleOutline
    }  
  }
});
</script>

<style scoped>
@media (min-width: 991px) {
  section {
    width: 444px;
  } 
}
</style>