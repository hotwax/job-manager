<template>
  <section>
    <ion-item lines="none">
      <h1>{{ currentMaargJob?.enumDescription ? currentMaargJob.enumDescription : currentMaargJob?.jobName }}</h1>
      <ion-button fill="outline" slot="end" v-if="isRefreshRequired" @click="refreshCurrentJob">
        <ion-icon :icon="refreshOutline" slot="icon-only" />
      </ion-button>
      <ion-badge slot="end" color="dark" v-if="currentMaargJob.paused === 'N' && currentMaargJob?.nextExecutionDateTime && !isRefreshRequired">{{ translate("running") }} {{ timeTillJob(currentMaargJob.nextExecutionDateTime) }}</ion-badge>
    </ion-item>

    <ion-list>
      <ion-item v-if="currentMaargJob.description" lines="none">
        <ion-label class="ion-text-wrap">
          <p>{{ currentMaargJob.description }}</p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline"/>
        <ion-label>{{ translate("Next run") }}</ion-label>
        <ion-label slot="end">{{ currentMaargJob.paused === 'N' ? getDateAndTime(currentMaargJob.nextExecutionDateTime) : "-" }}</ion-label>
      </ion-item>

      <ion-item detail button @click="openScheduleModal()">
        <ion-icon slot="start" :icon="timerOutline"/>
        <ion-label>{{ getCronString(selectedCronExpression) || selectedCronExpression }}</ion-label>
      </ion-item>

      <ion-item lines="none">
        <ion-chip @click="openJobCustomParameterModal" outline v-if="!Object.keys(generateCustomParameters).length">
          <ion-icon :icon="addOutline" />
          <ion-label>{{ translate('Add custom parameters') }}</ion-label>
        </ion-chip>
        <ion-row v-else>
          <ion-chip @click="openJobCustomParameterModal" outline :color="value ? undefined :'danger'" :key="name" v-for="(value, name) in generateCustomParameters">
            {{ name }}: {{ value }}
          </ion-chip>
        </ion-row>
        <ion-button @click="openJobCustomParameterModal" id="open-modal" slot="end" fill="clear">
          <ion-icon slot="icon-only" :icon="listCircleOutline"/>
        </ion-button>
      </ion-item>
    </ion-list>

    <div class="actions desktop-only">
      <div>
        <ion-button size="small" fill="outline" color="medium" disabled>{{ translate("Skip once") }}</ion-button>
        <ion-button size="small" fill="outline" color="danger" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || currentMaargJob.paused === 'Y' || isRefreshRequired" @click="cancelJob(currentMaargJob)">{{ translate("Disable") }}</ion-button>
      </div>
      <div>
        <ion-button v-if="currentMaargJob.paused === 'Y'" :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" size="small" fill="outline" @click="enableJob()">{{ translate("Enable") }}</ion-button>
        <ion-button v-else :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRefreshRequired" size="small" fill="outline" @click="saveChanges()">{{ translate("Save changes") }}</ion-button>
      </div>
    </div>
  </section>

  <div class="more-actions">
    <ion-item @click="viewJobHistory(currentMaargJob)" button>
      <ion-icon slot="start" :icon="timeOutline" />
      {{ translate("History") }}
    </ion-item>
    <ion-item :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" @click="runNow(currentMaargJob)" button>
      <ion-icon slot="start" :icon="flashOutline" />
      {{ translate("Run now") }}
    </ion-item>
    <ion-item @click="copyJobInformation(currentMaargJob)" button>
      <ion-icon slot="start"  :icon="copyOutline" />
      {{ translate("Copy details") }}
    </ion-item>
    <ion-item button>
      <ion-icon slot="start" :icon="pinOutline" />
      <ion-checkbox  disabled>
        <ion-label>{{ translate("Pin job") }}</ion-label>
      </ion-checkbox>
    </ion-item>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonBadge,
  IonButton,
  IonCheckbox,
  IonChip,
  IonContent,
  IonDatetime,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRow,
  IonSelect,
  IonSelectOption,
  alertController,
  modalController,
} from "@ionic/vue";
import {
  addOutline,
  calendarClearOutline,
  flashOutline,
  listCircleOutline,
  copyOutline,
  timeOutline,
  timerOutline,
  syncOutline,
  personCircleOutline,
  pinOutline,
  refreshOutline
} from "ionicons/icons";
import JobHistoryModal from '@/components/JobHistoryModal.vue'
import { Plugins } from '@capacitor/core';
import { getCronString, getDateAndTime, generateJobCustomParameters, generateMaargJobCustomOptions, hasError, showToast } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { useRouter } from "vue-router";
import { DateTime } from "luxon";
import { translate } from "@hotwax/dxp-components";
import logger from "@/logger";
import cronstrue from "cronstrue"
import { Actions, hasPermission } from '@/authorization'
import { MaargJobService } from "@/services/MaargJobService";
import ScheduleModal from "@/components/ScheduleModal.vue"
import MaargJobParameterModal from "@/components/MaargJobParameterModal.vue"
import emitter from '@/event-bus';

export default defineComponent({
  name: "MaargJobConfiguration",
  components: {
    IonBadge,
    IonButton,
    IonCheckbox,
    IonIcon,
    IonItem,
    IonLabel
  },
  data() {
    return {
      isRefreshRequired: false,
      selectedCronExpression: "",
      customOptionalParameters: [] as any,
      customRequiredParameters: [] as any
    }
  },
  computed: {
    ...mapGetters({
      currentMaargJob: 'maargJob/getCurrentMaargJob',
      getMaargJob: 'maargJob/getMaargJob'
    }),
    generateCustomParameters() {
      // passing runTimeData params as empty, as we don't need to show the runTimeData information on UI as all the options from runtimeData might not be available in serviceInParams
      return generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, {})
    }
  },
  mounted() {
    this.selectedCronExpression = this.currentMaargJob.cronExpression
    this.customOptionalParameters = generateMaargJobCustomOptions(this.currentMaargJob).optionalParameters;
    this.customRequiredParameters = generateMaargJobCustomOptions(this.currentMaargJob).requiredParameters;    
  },
  methods: {
    timeTillJob(time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    async copyJobInformation(job: any) {
      const { Clipboard } = Plugins;
      const jobDetails = `jobName: ${job.jobName}, jobDescription: ${job.description}`;

      await Clipboard.write({
        string: jobDetails
      }).then(() => {
        showToast(translate("Copied job details to clipboard"));
      })
    },
    async runNow(job: any) {
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
                  const resp = await MaargJobService.runNow(this.currentMaargJob.jobName)
                  if(!hasError(resp) && resp.data.jobRunId) {
                    showToast(translate("Service has been scheduled"))
                  } else {
                    throw resp.data
                  }
                } catch(err) {
                  showToast(translate("Failed to schedule service"))
                  logger.error(err)
                }
              }
            }
          ]
        });

      return jobAlert.present();
    },

    async cancelJob(job: any) {
      const alert = await alertController
        .create({
          header: translate('Cancel job'),
          message: translate('Canceling this job will cancel this occurrence and all following occurrences. This job will have to be re-enabled manually to run it again.'),
          buttons: [{
            text: translate("Don't cancel"),
            role: 'cancel'
          }, {
            text: translate('Cancel'),
            handler: async () => {
              if(this.isRuntimePassed()) {
                this.isRefreshRequired = true
                emitter.emit("productStoreOrConfigChanged")
                showToast(translate("Job runtime has passed. Please refresh to get the latest job data in order to perform any action."))
                return;
              }

              try {
                const resp = await MaargJobService.updateMaargJob({ ...job, paused: "Y" })
                if(!hasError(resp)) {
                  showToast(translate("Job has been cancelled succesfully."))
                  this.store.dispatch("maargJob/updateMaargJob", job.jobTypeEnumId)
                } else {
                  throw resp.data
                }
              } catch(err) {
                showToast(translate("Failed to cancel job"))
                logger.error(err)
              }
            }
          }],
        });
      return alert.present();
    },

    async enableJob() {
      const alert = await alertController.create({
        header: translate('Enable job'),
        message: translate('Are you sure you want to enable this job?'),
        buttons: [{
          text: translate('Cancel'),
          role: 'cancel'
        }, {
          text: translate('Confirm'),
          handler: () => {
            if(this.isRuntimePassed()) {
              this.isRefreshRequired = true
              emitter.emit("productStoreOrConfigChanged")
              showToast(translate("Job runtime has passed. Please refresh to get the latest job data in order to perform any action."))
              return;
            }

            this.updateJob();
          }
        }]
      });

      return alert.present();
    },

    async saveChanges() {
      const alert = await alertController
        .create({
          header: translate('Save changes'),
          message: translate('Are you sure you want to save these changes?'),
          buttons: [{
            text: translate('Cancel'),
            role: 'cancel'
          }, {
            text: translate('Save'),
            handler: () => {
              if(this.isRuntimePassed()) {
                this.isRefreshRequired = true
                emitter.emit("productStoreOrConfigChanged")
                showToast(translate("Job runtime has passed. Please refresh to get the latest job data in order to perform any action."))
                return;
              }

              this.updateJob();
            }
          }]
        });
      return alert.present();
    },

    async updateJob() {
      const job = this.currentMaargJob

      if(!job.cronExpression) {
        showToast(translate("Please select a scheduling for job"))
        logger.error("Please select a scheduling for job")
        return;
      }

      const paramValues = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, {});

      job.serviceJobParameters.map((parameter: any) => {
        if(paramValues[parameter.parameterName]) {
          parameter.parameterValue = paramValues[parameter.parameterName]
        }
      })

      const payload = {
        ...job,
        paused: "N",
        cronExpression: this.selectedCronExpression
      }

      try {
        const resp = await MaargJobService.updateMaargJob(payload)
        if(!hasError(resp)) {
          showToast(translate("Service updated successfully"))
          this.store.dispatch("maargJob/updateMaargJob", job.jobTypeEnumId)
        } else {
          throw resp.data
        }
      } catch(err) {
        showToast(translate("Failed to update service"))
        logger.error(err)
      }
    },

    async viewJobHistory(job: any) {
      const jobHistoryModal = await modalController.create({
        component: JobHistoryModal,
        componentProps: { currentJob: job, isMaargJob: true }
      });

      await jobHistoryModal.present();
    },

    async openScheduleModal() {
      const scheduleModal = await modalController.create({
        component: ScheduleModal,
        componentProps: { cronExpression: this.selectedCronExpression }
      })

      scheduleModal.onDidDismiss().then(async (result: any) => {
        if(result?.data?.expression) {
          this.selectedCronExpression = result.data.expression
        }
      })

      scheduleModal.present();
    },
    async openJobCustomParameterModal() {
      const jobParameterModal = await modalController.create({
      component: MaargJobParameterModal,
        componentProps: { customOptionalParameters: this.customOptionalParameters, customRequiredParameters: this.customRequiredParameters, currentJob: this.currentMaargJob },
        breakpoints: [0, 0.25, 0.5, 0.75, 1],
        initialBreakpoint: 0.75
      });

      jobParameterModal.onDidDismiss().then((result) => {
        if(result.data?.customOptionalParameters) {
          this.customOptionalParameters = result.data.customOptionalParameters
          this.customRequiredParameters = result.data.customRequiredParameters
        }
      })

      await jobParameterModal.present();
    },

    async refreshCurrentJob() {
      const job = this.getMaargJob(this.currentMaargJob.jobTypeEnumId)

      await this.store.dispatch("maargJob/updateCurrentMaargJob", { job })
      this.selectedCronExpression = this.currentMaargJob.cronExpression
      this.customOptionalParameters = generateMaargJobCustomOptions(this.currentMaargJob).optionalParameters;
      this.customRequiredParameters = generateMaargJobCustomOptions(this.currentMaargJob).requiredParameters;    
      this.isRefreshRequired = false
    },

    isRuntimePassed() {
      return this.currentMaargJob.nextExecutionDateTime <= DateTime.now().toMillis()
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      addOutline,
      copyOutline,
      flashOutline,
      getCronString,
      getDateAndTime,
      listCircleOutline,
      hasPermission,
      pinOutline,
      refreshOutline,
      store,
      timeOutline,
      timerOutline,
      translate
    };
  }
});
</script>

<style scoped>
ion-list {
  margin: 0 0 var(--spacer-base);
}

.actions > ion-button {
  margin: var(--spacer-sm);
}

@media (min-width: 991px) {  
  section {
    overflow: hidden;
    border: var(--border-medium);
    border-radius: 16px;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    margin: var(--spacer-base) var(--spacer-sm) var(--spacer-base);
  }

  /* .mobile-only {
    display: none;
  } */
  .more-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    row-gap: var(--spacer-sm);
    margin-top: var(--spacer-sm);
  }
  .more-actions > * {
    flex-basis: 50%;
  }
}

ion-label:nth-child(3) {
  cursor: pointer;
}

ion-modal.date-time-modal {
  --width: 290px;
  --height: 440px;
  --border-radius: 8px;
}
</style>