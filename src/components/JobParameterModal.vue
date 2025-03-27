<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('Run now') }}</ion-title>
      <ion-buttons slot="end">
        <ion-button v-if="runNow" @click="confirmRunNow()" color="primary">{{ translate('Save') }}</ion-button>
        <ion-button v-if="runNow" @click="closeModal">{{ translate('Close') }}</ion-button>
        <ion-button v-else color="primary" :disabled="currentJob.statusId !== 'SERVICE_DRAFT'" @click="save()">{{ translate('Save') }}</ion-button>
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

        <ion-item :key="index" v-for="(parameter, index) in customRequiredParametersValue" :lines="currentJob.statusId === 'SERVICE_DRAFT' ? 'none': ''">
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

        <ion-item :key="index" v-for="(parameter, index) in customOptionalParametersValue" :lines="currentJob.statusId === 'SERVICE_DRAFT' ? 'none': ''">
          <ion-input v-if="currentJob.statusId === 'SERVICE_DRAFT' || runNow" :label="parameter.name" :placeholder="parameter.name" v-model="parameter.value" :helper-text="parameter.type" />
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
  modalController,
  alertController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, copyOutline } from 'ionicons/icons';
import { useStore } from 'vuex';
import { copyToClipboard, generateJobCustomParameters, hasJobDataError } from "@/utils";
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
  props: ['currentJob', 'customRequiredParameters', 'customOptionalParameters', 'runNow'],
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
    },
    async confirmRunNow() {
      const jobAlert = await alertController.create({
        header: translate("Run now"),
        message: translate('Running this job now will not replace this job. A copy of this job will be created and run immediately. You may not be able to reverse this action.', { space: '<br/><br/>' }),
        buttons: [
          {
            text: translate("Cancel"),
            role: 'cancel',
          },
          {
            text: translate('Run now'),
            handler: () => {
              if (this.currentJob && !hasJobDataError(this.currentJob)) {
                // preparing the custom parameters those needs to passed with the job
                const jobCustomParameters = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, this.currentJob.runtimeData)
                this.store.dispatch('job/runServiceNow', { job: this.currentJob, jobCustomParameters })
              }
              this.closeModal()
            }
          }
        ]
      });
      return jobAlert.present();
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