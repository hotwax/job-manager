<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('Custom Parameters') }}</ion-title>
      <ion-buttons slot="end">
        <ion-button color="primary" :disabled="currentJob.statusId === 'SERVICE_PENDING'" @click="save()">{{ translate('Save') }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="customRequiredParameters.length || customOptionalParameters.length">
      <ion-item-group>
        <ion-item-divider v-if="customRequiredParameters.length" color="light">
          <ion-label>{{ translate('Required Parameters') }}</ion-label>
          <ion-button slot="end" fill="clear" color="medium" @click="copyToClipboard(getParameters('required'), 'Copied to clipboard')">
            <ion-icon slot="icon-only" :icon="copyOutline" />
          </ion-button>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customRequiredParametersValue">
          <ion-input :label="parameter.name" v-if="currentJob.statusId === 'SERVICE_DRAFT'" :placeholder="parameter.name" v-model="parameter.value" :helper-text="parameter.type" />
          <template v-else>
            <ion-label>{{ parameter.name }}</ion-label>
            <ion-label>{{ parameter.value }}</ion-label>
          </template>
        </ion-item>

        <ion-item-divider v-if="customOptionalParameters.length" color="light">
          <ion-label>{{ translate('Optional Parameters') }}</ion-label>
          <ion-button slot="end" fill="clear" color="medium" @click="copyToClipboard(getParameters('optional'), 'Copied to clipboard')">
            <ion-icon slot="icon-only" :icon="copyOutline" />
          </ion-button>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customOptionalParametersValue">
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
  data() {
    return {
      customOptionalParametersValue: {} as any,
      customRequiredParametersValue: {} as any
    }
  },
  mounted() {
    this.customOptionalParametersValue = JSON.parse(JSON.stringify(this.customOptionalParameters))
    this.customRequiredParametersValue = JSON.parse(JSON.stringify(this.customRequiredParameters))
  },
  methods: {
    closeModal() {
      modalController.dismiss({ dismissed: true })
    },
    getParameters(parameterType: string) {
      let res = {} as any;

      if(parameterType === 'required') {
        this.customRequiredParametersValue.map((param: any) => res[param.name] = param.value)
      } else {
        this.customOptionalParametersValue.map((param: any) => res[param.name] = param.value)
      }

      return JSON.stringify(res);
    },
    save() {
      modalController.dismiss({ dismissed: true, customOptionalParameters: this.customOptionalParametersValue, customRequiredParameters: this.customRequiredParametersValue })
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