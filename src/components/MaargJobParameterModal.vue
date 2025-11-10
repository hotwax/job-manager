<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate(runNow ? "Run Now" : 'Custom Parameters') }}</ion-title>
      <ion-buttons slot="end">
        <template v-if="runNow">
          <ion-button @click="confirmRunNow()" color="primary">{{ translate('Save') }}</ion-button>
          <ion-button @click="closeModal">{{ translate('Close') }}</ion-button>
        </template>
        <ion-button v-else color="primary" :disabled="currentJob.paused === 'N'" @click="save()">{{ translate('Save') }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="customRequiredParameters.length || customOptionalParameters.length">
      <ion-item-group>
        <ion-item-divider v-if="customRequiredParameters.length" color="light">
          <ion-label>{{ translate('Required Parameters') }}</ion-label>
          <ion-button size="default" slot="end" fill="clear" color="medium" @click="copyToClipboard(getParameters('required'), 'Copied to clipboard')">
            <ion-icon slot="icon-only" :icon="copyOutline" />
          </ion-button>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customRequiredParametersValue" :lines="currentJob.paused === 'Y' || runNow ? 'none': ''">
          <ion-input :label="parameter.name" v-if="currentJob.paused === 'Y' || runNow" :placeholder="parameter.name" v-model="parameter.value" :helper-text="parameter.type" />
          <template v-else>
            <ion-label>{{ parameter.name }}</ion-label>
            <ion-label>{{ parameter.value }}</ion-label>
          </template>
        </ion-item>

        <ion-item-divider v-if="customOptionalParameters.length" color="light">
          <ion-label>{{ translate('Optional Parameters') }}</ion-label>
          <ion-button size="default" slot="end" fill="clear" color="medium" @click="copyToClipboard(getParameters('optional'), 'Copied to clipboard')">
            <ion-icon slot="icon-only" :icon="copyOutline" />
          </ion-button>
        </ion-item-divider>

        <ion-item :key="index" v-for="(parameter, index) in customOptionalParametersValue" :lines="currentJob.paused === 'Y' || runNow ? 'none': ''">
          <ion-input v-if="currentJob.paused === 'Y' || runNow" :label="parameter.name" :placeholder="parameter.name" v-model="parameter.value" :helper-text="parameter.type" />
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
import { mapGetters, useStore } from 'vuex';
import { copyToClipboard, generateJobCustomParameters, hasError, showToast } from "@/utils";
import { translate } from '@hotwax/dxp-components';
import { MaargJobService } from '@/services/MaargJobService';
import logger from '@/logger';

export default defineComponent({
  name: 'MaargJobParameterModal',
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
  computed: {
    ...mapGetters({
      currentEComStore: 'user/getCurrentEComStore',
      currentMaargJob: 'maargJob/getCurrentMaargJob',
    })
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
    async cloneJob() {
      const newJobName = `${this.currentJob.jobName.startsWith("template_") ? this.currentJob.jobName.replace("template_", "") : this.currentJob.jobName}_${this.currentEComStore.productStoreId}`
      try {
        const resp = await MaargJobService.cloneMaargJob({
          jobName: this.currentJob.jobName,
          newJobName,
          copyParameters: true
        })

        if(!hasError(resp)) {
          const job = JSON.parse(JSON.stringify(this.currentJob));
          job["jobName"] = newJobName;
          job["paused"] = "Y"
          job["isDraftJob"] = false
          job.serviceJobParameters.map((parameter: any) => {
            parameter.jobName = newJobName
          })
          return job
        } else {
          throw resp.data;
        }
      } catch(error) {
        logger.error(error);
        return {};
      }
    },
    async confirmRunNow() {
      const jobAlert = await alertController
        .create({
          header: translate("Run now"),
          message: translate('Running this job now will not replace this job. A copy of this job will be created and run immediately. You may not be able to reverse this action.', { space: '<br/><br/>' }),
          buttons: [
            {
              text: translate("Cancel"),
              role: 'cancel',
            },
            {
              text: translate('Run now'),
              handler: async () => {
                try {
                  let job = JSON.parse(JSON.stringify(this.currentJob)) as any
                  let resp;

                  if(this.currentJob.isDraftJob) {
                    const clonedJob = await this.cloneJob();
                    if(!clonedJob.jobName) {
                      showToast(translate("Failed to schedule service"));
                      return;
                    }
                    clonedJob.serviceJobParameters.find((parameter: any) => {
                      if(parameter.parameterName === "productStoreIds") {
                        parameter.parameterValue = this.currentEComStore.productStoreId
                        return true;
                      }
                      return false;
                    })
                    job = clonedJob
                  }

                  const paramValues = generateJobCustomParameters(this.customRequiredParametersValue, this.customOptionalParametersValue, {});

                  Object.keys(paramValues).map((paramName: any) => {
                    const existingParameter = job.serviceJobParameters.find((parameter: any) => parameter.parameterName === paramName);

                    if(existingParameter) {
                      existingParameter.parameterValue = paramValues[paramName]
                    } else {
                      job.serviceJobParameters.push({
                        parameterName: paramName,
                        parameterValue: paramValues[paramName],
                        jobName: job.jobName
                      })
                    }
                  })

                  // Updating job on backend, as maarg run now api does not support passing custom params
                  // so we need to first update the job and then run that job using the jobName
                  resp = await MaargJobService.updateMaargJob({
                    jobName: job.jobName,
                    serviceJobParameters: job.serviceJobParameters
                  })
                  if(!hasError(resp)) {
                    await this.store.dispatch("maargJob/updateMaargJob", { jobEnumId: job.jobTypeEnumId, job })
                  } else {
                    throw resp.data;
                  }

                  resp = await MaargJobService.runNow(job.jobName)
                  if(!hasError(resp) && resp.data.jobRunId) {
                    showToast(translate("Service has been scheduled"))
                  } else {
                    throw resp.data
                  }
                } catch(err) {
                  showToast(translate("Failed to schedule service"))
                  logger.error(err)
                }

                this.closeModal()
              }
            }
          ]
        });

      return jobAlert.present();
    },
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