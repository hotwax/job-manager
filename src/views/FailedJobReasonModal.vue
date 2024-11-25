<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Failed job reason") }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="copyToClipboard(job.jobResult, 'Copied to clipboard')">
          <ion-icon slot="icon-only" :icon="copyOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content>
    <ion-item lines="none">
      <p>{{ job.jobResult }}</p>
    </ion-item>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonTitle,
  IonToolbar,
  modalController,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, copyOutline } from 'ionicons/icons';
import { copyToClipboard } from "@/utils";
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: "FailedJobReasonModal",
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonTitle,
    IonToolbar
  },
  props: ["job"],
  methods: { 
    closeModal() {
      modalController.dismiss({ dismissed: true });
    }
  },
  setup() {
    return {
      closeOutline,
      copyOutline,
      copyToClipboard,
      translate
    };
  },
});
</script>