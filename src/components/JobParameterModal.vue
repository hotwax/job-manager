<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ $t('Custom Parameters') }}</ion-title>
      <ion-buttons slot="end">
        <ion-button color="primary" @click="closeModal">{{ $t('Save') }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="customRequiredParameters.length || customOptionalParameters.length">
      <ion-item-group>
        <ion-item-divider v-if="customRequiredParameters.length" color="light">
          <ion-label>{{ $t('Required Parameters') }}</ion-label>
          <ion-button slot="end" fill="clear" color="medium" @click="copyToClipboard(getParameters('required'), 'Copied to clipboard')">
            <ion-icon slot="icon-only" :icon="copyOutline" />
          </ion-button>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customRequiredParameters">
          <ion-label>{{ parameter.name }}</ion-label>
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT'" :placeholder="parameter.name" v-model="parameter.value" slot="end" />
          <ion-label v-else>{{ parameter.value }}</ion-label>
          <ion-note slot="helper">{{ parameter.type }}</ion-note>
        </ion-item>

        <ion-item-divider v-if="customOptionalParameters.length" color="light">
          <ion-label>{{ $t('Optional Parameters') }}</ion-label>
          <ion-button slot="end" fill="clear" color="medium" @click="copyToClipboard(getParameters('optional'), 'Copied to clipboard')">
            <ion-icon slot="icon-only" :icon="copyOutline" />
          </ion-button>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customOptionalParameters">
          <ion-label>{{ parameter.name }}</ion-label>
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT'" :placeholder="parameter.name" v-model="parameter.value" slot="end" />
          <ion-label v-else>{{ parameter.value }}</ion-label>
          <ion-note slot="helper">{{ parameter.type }}</ion-note>
        </ion-item>
      </ion-item-group>
    </ion-list>
    <ion-item v-else lines="none">
      <ion-label class="ion-text-center" >{{ $t('This job does not have any custom parameters.') }}</ion-label>
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
  IonNote,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, copyOutline } from 'ionicons/icons';
import { useStore } from 'vuex';
import { copyToClipboard } from "@/utils";

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
    IonNote,
    IonTitle,
    IonToolbar,
  },
  props: ['currentJob', 'customRequiredParameters', 'customOptionalParameters'],
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true })
    },
    getParameters(parameterType: string) {
      let res = {} as any;

      if(parameterType === 'required') {
        this.customRequiredParameters.map((param: any) => {
          res[param.name] = param.value
        })
      } else {
        this.customOptionalParameters.map((param: any) => {
          res[param.name] = param.value
        })
      }

      return JSON.stringify(res);
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      copyOutline,
      copyToClipboard,
      store
    };
  },
});
</script>