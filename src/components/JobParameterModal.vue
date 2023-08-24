<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ $t('Custom Parameters') }}</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="closeModal">{{ $t('Close') }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item-group v-if="customRequiredParameters.length || customOptionalParameters.length">
        <ion-item-divider v-if="customRequiredParameters.length" color="light">
          <ion-label>{{ $t('Required Parameters') }}</ion-label>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customRequiredParameters">
          <ion-label>{{ parameter.name }}</ion-label>
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT'" :placeholder="parameter.name" v-model="parameter.value" slot="end" />
          <ion-label v-else>{{ parameter.value }}</ion-label>
          <ion-note slot="helper">{{ parameter.type }}</ion-note>
        </ion-item>

        <ion-item-divider v-if="customOptionalParameters.length" color="light">
          <ion-label>{{ $t('Optional Parameters') }}</ion-label>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customOptionalParameters">
          <ion-label>{{ parameter.name }}</ion-label>
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT'" :placeholder="parameter.name" v-model="parameter.value" slot="end" />
          <ion-label v-else>{{ parameter.value }}</ion-label>
          <ion-note slot="helper">{{ parameter.type }}</ion-note>
        </ion-item>
      </ion-item-group>
      <ion-item v-else lines="none">
        <ion-label class="ion-text-center" >There are no custom parameters for this job</ion-label>
      </ion-item>
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline } from 'ionicons/icons';
import { useStore } from 'vuex';

export default defineComponent({
  name: 'JobParameterModal',
  components: {
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonItemDivider,
    IonItemGroup,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
  },
  props: ['currentJob', 'customRequiredParameters', 'customOptionalParameters'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true })
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      store
    };
  },
});
</script>