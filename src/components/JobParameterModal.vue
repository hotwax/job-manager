<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('Custom Parameters') }}</ion-title>
      <ion-buttons slot="end" v-if="customRequiredParameters.length || customOptionalParameters.length">
        <ion-button fill="clear" @click="copyToClipboard(getParameters(), 'Copied to clipboard')">
          <ion-icon slot="icon-only" :icon="copyOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="customRequiredParameters.length || customOptionalParameters.length">
      <ion-item-group>
        <ion-item-divider v-if="customRequiredParameters.length" color="light">
          <ion-label>{{ translate('Required Parameters') }}</ion-label>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customRequiredParameters" lines="none">
          <ion-input :label="parameter.name" v-if="currentJob.statusId === 'SERVICE_DRAFT'" :placeholder="parameter.name" v-model="parameter.value" :helper-text="parameter.type" />
          <template v-else>
            <ion-label>{{ parameter.name }}</ion-label>
            <ion-label>{{ parameter.value }}</ion-label>
          </template>
        </ion-item>

        <ion-item-divider v-if="customOptionalParameters.length" color="light">
          <ion-label>{{ translate('Optional Parameters') }}</ion-label>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customOptionalParameters" lines="none">
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT'" :label="parameter.name" :placeholder="parameter.name" v-model="parameter.value" :helper-text="parameter.type" />
          <template v-else>
            <ion-label>{{ parameter.name }}</ion-label>
            <ion-label>{{ parameter.value }}</ion-label>
          </template>
        </ion-item>
      </ion-item-group>
    </ion-list>
    <ion-item v-else lines="none">
      <ion-label class="ion-text-center" >{{ translate('This job does not have any custom parameters.') }}</ion-label>
    </ion-item>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, copyOutline } from 'ionicons/icons';
import { useStore } from 'vuex';
import { copyToClipboard } from "@/utils";
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'JobParameterModal',
  components: {
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonItemDivider,
    IonItemGroup,
    IonLabel,
    IonList,
    IonTitle,
    IonToolbar,
  },
  props: ['currentJob', 'customRequiredParameters', 'customOptionalParameters'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true })
    },
    getParameters() {
      let res = {} as any;

      this.customRequiredParameters.map((param: any) => {
        res[param.name] = {
          value: param.value,
          optional: false
        }
      })

      this.customOptionalParameters.map((param: any) => {
        res[param.name] = {
          value: param.value,
          optional: true
        }
      })

      return JSON.stringify(res);
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      copyOutline,
      copyToClipboard,
      store,
      translate
    };
  },
});
</script>