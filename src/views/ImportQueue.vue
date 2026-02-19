<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/import-monitor"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate("Import queue") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>{{ translate("pending queue") }}</h1>
            <p>Waiting in Queue 1 - High priority</p>
          </div>
          <ion-button fill="outline" color="danger">
            <ion-icon slot="start" :icon="trashOutline" />
            {{ translate("Clear queue") }}
          </ion-button>
        </div>

        <ion-list>
          <div class="list-item table-header log">
            <ion-label>{{ translate("Log Id") }}</ion-label>
            <ion-label class="file-name">{{ translate("File name") }}</ion-label>
            <ion-label>{{ translate("Status") }}</ion-label>
            <ion-label>{{ translate("Origin") }}</ion-label>
            <ion-label>{{ translate("Uploaded") }}</ion-label>
          </div>
          <div class="list-item log">
            <ion-label>123456789</ion-label>
            <ion-item lines="none" class="file-name">
              <ion-icon slot="start" :icon="documentOutline" />
              <ion-label>
                <code>File_1.csv</code>
                <p>1.2mb</p>
              </ion-label>
            </ion-item>
            <ion-label>{{ translate("System") }}</ion-label>
            <ion-label>{{ translate("Pending") }}</ion-label>
            <ion-label>2 hours ago</ion-label>
          </div>
        </ion-list>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon
} from '@ionic/vue';
import { translate } from '@common'; 
import { documentOutline, trashOutline } from 'ionicons/icons';
</script>

<style scoped>

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.list-item.log {
    --columns-desktop: 7;
    padding: var(--spacer-sm) var(--spacer-base);
}

.file-name {
    grid-column: span 2;
    justify-self: start;
}

</style>