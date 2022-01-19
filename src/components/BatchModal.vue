<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>Batch 2</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-label position="fixed">Batch name</ion-label>
      <ion-input placeholder="Batch 2" />
    </ion-item>
    <ion-item>
      <ion-label position="fixed">{{ $t("Schedule") }}</ion-label>
      <ion-datetime display-format="MM/DD/YYYY" placeholder="date picker"></ion-datetime>
    </ion-item>    

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="checkmarkDoneOutline" />  
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script>
import {
  IonButtons,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, checkmarkDoneOutline } from 'ionicons/icons';
export default defineComponent({
  name: 'BatchModal',
  components: {
    IonButtons,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonTitle,
    IonToolbar,
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
  },
  setup() {
    return {
      closeOutline,
      checkmarkDoneOutline
    };
  },
});
</script>