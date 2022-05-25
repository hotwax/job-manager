<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("ERP") }}</ion-title>
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
              <ion-label class="ion-text-wrap">{{ $t("Inventory") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Inventory cost") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Landed inventory cost") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("New purchase orders") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Closed purchase orders") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Upload") }}</ion-card-title>
            </ion-card-header>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Sales") }}</ion-label>
              <ion-label slot="end"></ion-label>
            </ion-item>
            <ion-item detail button>
              <ion-label class="ion-text-wrap">{{ $t("Inventory") }}</ion-label>
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
} from '@ionic/vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ERP',
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
  }
});
</script>
