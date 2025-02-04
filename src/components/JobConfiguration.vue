<template>
  <section>
    <ion-item lines="none">
      <!-- Adding conditional check for currentJob.jobName as currentJob is undefined when i18n runs translate -->
      <h1>{{ isBrokerJob ? currentJob.jobName : currentJob.enumName ? currentJob.enumName : currentJob.jobName ? currentJob.jobName : '' }}</h1>
      <ion-button fill="outline" slot="end" v-if="isRefreshRequired" @click="refreshCurrentJob">
        <ion-icon :icon="refreshOutline" slot="icon-only" />
      </ion-button>
      <ion-badge slot="end" color="dark" v-if="currentJob.cancelDateTime || currentJob.finishDateTime">{{ currentJob.statusId == "SERVICE_CANCELLED" || currentJob.statusId == "SERVICE_CRASHED" ?  timeTillJob(currentJob.cancelDateTime) : timeTillJob(currentJob.finishDateTime) }}</ion-badge>
      <ion-badge slot="end" color="dark" v-else-if="currentJob?.runTime && currentJob.statusId !== 'SERVICE_DRAFT' && !isRefreshRequired">{{ translate("running") }} {{ timeTillJob(currentJob.runTime) }}</ion-badge>
    </ion-item>

    <ion-list>

      <ion-item v-if="currentJob.description" lines="none">
        <ion-label class="ion-text-wrap">
          <p>{{ currentJob.description }}
            <ion-text class="learn-more-text" color="primary" @click="openLearnMoreModal()">{{ translate("Learn more") }}</ion-text>
          </p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <template v-if="historyJobConfig">
          <ion-label class="ion-text-wrap">{{ translate("Run time") }}</ion-label>
          <ion-label slot="end">{{ currentJob.runTime ? getTime(currentJob.runTime) : '' }}</ion-label>
        </template>
        <template v-else>
          <ion-select interface="popover" :placeholder="translate('Select')" :value="runTime" @ionChange="updateRunTime($event)">
            <div slot="label" class="ion-text-wrap">{{ translate("Run time") }}</div>
            <ion-select-option v-for="runTime in runTimes" :key="runTime.value" :value="runTime.value">{{ translate(runTime.label) }}</ion-select-option>
          </ion-select>
          <!-- TODO: display a button when we are not having a runtime and open the datetime component
          on click of that button
          Currently, when mapping the same datetime component for label and button so it's not working so for
          now commented the button and added a fallback string -->
          <!-- <ion-button id="open-run-time-modal" size="small" fill="outline" color="medium" v-show="!currentJob?.runTime">{{ translate("Select run time") }}</ion-button> -->
          <ion-modal class="date-time-modal" :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
            <ion-content force-overscroll="false">
              <ion-datetime          
                show-default-buttons
                hour-cycle="h23"
                :value="runTime ? (isCustomRunTime(runTime) ? getDateTime(runTime) : getDateTime(DateTime.now().toMillis() + runTime)) : getNowTimestamp()"
                @ionChange="updateCustomTime($event)"
              />
            </ion-content>
          </ion-modal>
        </template>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timerOutline" />
        <template v-if="historyJobConfig">
          <ion-label class="ion-text-wrap">{{ translate("Schedule") }}</ion-label>
          <ion-label slot="end">{{ currentJob.tempExprId ? temporalExpr(currentJob.tempExprId)?.description : "🙃" }}</ion-label>
        </template>
        <template v-else>
          <ion-select :value="jobStatus" :interface-options="{ header: translate('Frequency') }" interface="popover" :placeholder="translate('Disabled')" @ionChange="jobStatus = $event.detail.value" @ionDismiss="jobStatus == 'CUSTOM' && setCustomFrequency()">
            <div slot="label" class="ion-text-wrap">{{ translate("Schedule") }}</div>
            <ion-select-option v-for="freq in frequencyOptions" :key="freq.id" :value="freq.id">{{ freq.description }}</ion-select-option>
          </ion-select>
        </template>
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

      <!-- TODO: enable this feature of passing count when supported on backend -->
      <!-- <ion-item>
        <ion-icon slot="start" :icon="syncOutline" />
        <ion-label>{{ translate("Repeat untill disabled") }}</ion-label>
        <ion-checkbox slot="end" :checked="repeat" @ionChange="repeatUntillDisabled($event['detail'].checked)"/>
      </ion-item>

      <ion-item v-show="!repeat">
        <ion-label>{{ translate("Auto disable after") }}</ion-label>
        <ion-input :placeholder="translate('occurrences')" v-model="count"/>
      </ion-item> -->
    </ion-list>

    <div class="actions desktop-only" :disabled="historyJobConfig">
      <div>
        <ion-button size="small" fill="outline" color="medium" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || currentJob.statusId === 'SERVICE_DRAFT' || isRefreshRequired || historyJobConfig" @click="skipJob(currentJob)">{{ translate("Skip once") }}</ion-button>
        <ion-button size="small" fill="outline" color="danger" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || currentJob.statusId === 'SERVICE_DRAFT' || isRefreshRequired || historyJobConfig" @click="cancelJob(currentJob)">{{ translate("Disable") }}</ion-button>
      </div>
      <div>
        <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRequiredParametersMissing || isRefreshRequired || historyJobConfig" size="small" fill="outline" @click="saveChanges()">{{ translate("Save changes") }}</ion-button>
      </div>
    </div>

    <div class=" actions mobile-only">
      <ion-button size="small" expand="block" fill="outline" color="medium" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || status === 'SERVICE_DRAFT' || isRefreshRequired || historyJobConfig" @click="skipJob(currentJob)">{{ translate("Skip once") }}</ion-button>
      <ion-button size="small" expand="block" fill="outline" color="danger" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || status === 'SERVICE_DRAFT' || isRefreshRequired || historyJobConfig" @click="cancelJob(currentJob)">{{ translate("Disable") }}</ion-button>
      <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRequiredParametersMissing || isRefreshRequired || historyJobConfig" expand="block" @click="saveChanges()">{{ translate("Save changes") }}</ion-button>
    </div>
  </section>
  <div class="more-actions">
    <ion-item @click="viewJobHistory(currentJob)" button>
      <ion-icon slot="start" :icon="timeOutline" />
      {{ translate("History") }}
    </ion-item>
    <ion-item :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || historyJobConfig" @click="runNow(currentJob)" button>
      <ion-icon slot="start" :icon="flashOutline" />
      {{ translate("Run now") }}
    </ion-item>
    <ion-item @click="copyJobInformation(currentJob)" button>
      <ion-icon slot="start"  :icon="copyOutline" />
      {{ translate("Copy details") }}
    </ion-item>
    <ion-item @click="updatePinnedJobs(currentJob?.systemJobEnumId)" button>
      <ion-icon slot="start" :icon="pinOutline" />
      <ion-checkbox :checked="pinnedJobs && pinnedJobs.includes(currentJob.systemJobEnumId)">
        <ion-label>{{ translate("Pin job") }}</ion-label>
      </ion-checkbox>
    </ion-item>
  </div>
  <!-- Import logs -->
  <section v-if="historyJobConfig && currentJob.runtimeData?.configId && getDataManagerLogs?.length">
    <ion-item lines="none">
      <h1>{{ translate('Import logs') }}</h1>
      <ion-button slot="end" fill="clear" @click="openImportLogsDetails()">{{ translate('View details') }}</ion-button>
    </ion-item>
    <ion-progress-bar :value="(getProcessedFileCount() - getErrorFileCount()) / getDataManagerLogs.length"></ion-progress-bar>
    <ion-list>
      <ion-item>
        <ion-icon slot="start" :icon="fileTrayFullOutline" />
        {{ translate('Files received') }}
        <ion-label slot="end">{{ getDataManagerLogs.length }}</ion-label>
      </ion-item>
      <ion-item>
        <ion-icon slot="start" :icon="codeWorkingOutline" />
        {{ translate('Files processed') }}
        <ion-label slot="end">{{ getProcessedFileCount() }}</ion-label>
      </ion-item>
      <ion-item lines="none">
        <ion-icon slot="start" :icon="warningOutline" />
        {{ translate('Files with errors') }}
        <ion-label slot="end">{{ getErrorFileCount() }}</ion-label>
      </ion-item>
    </ion-list>
  </section>
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
  IonProgressBar,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonText,
  alertController,
  modalController,
} from "@ionic/vue";
import {
  addOutline,
  calendarClearOutline,
  codeWorkingOutline,
  flashOutline,
  fileTrayFullOutline,
  listCircleOutline,
  copyOutline,
  timeOutline,
  timerOutline,
  syncOutline,
  personCircleOutline,
  pinOutline,
  refreshOutline,
  warningOutline
} from "ionicons/icons";
import JobHistoryModal from '@/components/JobHistoryModal.vue'
import { Plugins } from '@capacitor/core';
import { isCustomRunTime, generateAllowedRunTimes, generateAllowedFrequencies, generateJobCustomParameters, generateJobCustomOptions, getNowTimestamp, handleDateTimeInput, showToast, hasError, hasJobDataError } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';
import { translate } from '@hotwax/dxp-components'
import { useRouter } from "vue-router";
import emitter from '@/event-bus';
import { Actions, hasPermission } from '@/authorization'
import CustomFrequencyModal from '@/components/CustomFrequencyModal.vue';
import JobParameterModal from '@/components/JobParameterModal.vue'
import LearnMoreModal from "@/components/LearnMoreModal.vue";

export default defineComponent({
  name: "JobConfiguration",
  components: {
    IonBadge,
    IonButton,
    IonChip,
    IonContent,
    IonDatetime,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonProgressBar,
    IonRow,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
    IonText
  },
  data() {
    return {
      isDateTimeModalOpen: false,
      runTime: '' as any,
      runTimes: [] as any,
      jobStatus: this.status,
      frequencyOptions: [] as any,
      customOptionalParameters: [] as any,
      customRequiredParameters: [] as any,
      isRefreshRequired: false
    }
  },
  mounted() {
    this.runTime = this.currentJob?.runTime
    this.generateRunTimes(this.runTime)
    this.generateFrequencyOptions(this.jobStatus)
    this.customOptionalParameters = generateJobCustomOptions(this.currentJob).optionalParameters;
    this.customRequiredParameters = generateJobCustomOptions(this.currentJob).requiredParameters;
  },
  updated() {
    // When updating the job, the job is fetched again with the latest values
    // Updated value should be set to instance variable jobStatus
    this.jobStatus = this.currentJob.statusId === "SERVICE_DRAFT" ? this.currentJob.statusId : this.currentJob.tempExprId;
    this.runTime = this.currentJob?.runTime ? this.currentJob?.runTime : ''
    this.generateRunTimes(this.runTime)
    this.generateFrequencyOptions(this.jobStatus)
  },
  props: ["isBrokerJob", "status", "type", "historyJobConfig"],
  computed: {
    ...mapGetters({
      pinnedJobs: 'user/getPinnedJobs',
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentJob: 'job/getCurrentJob',
      pendingJobs: 'job/getPendingJobs',
      getDataManagerLogs: 'job/getDataManagerLogs',
      temporalExpr: 'job/getTemporalExpr'
    }),
    isRequiredParametersMissing() {
      return this.customRequiredParameters.some((parameter: any) => !parameter.value?.trim())
    },
    generateCustomParameters() {
      // passing runTimeData params as empty, as we don't need to show the runTimeData information on UI as all the options from runtimeData might not be available in serviceInParams
      return generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, {})
    }
  },
  methods: {
    getProcessedFileCount() {
      return this.getDataManagerLogs?.filter((log: any) => log.statusId === "SERVICE_FINISHED").length
    },
    getErrorFileCount() {
      return this.getDataManagerLogs?.filter((log: any) => log.errorRecordContentId !== null).length
    },
    openImportLogsDetails() {
      const jobId = this.currentJob.jobId
      this.router.push({ name: 'DataManagerLogDetails', params: { jobId } })
    },
    async openLearnMoreModal() {
      const learnMoreModal = await modalController.create({
        component: LearnMoreModal,
        componentProps: {currentJob: this.currentJob}
      })
      return learnMoreModal.present()
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
    },
    async generateFrequencyOptions(currentFrequency?: any) {
      const frequencyOptions = JSON.parse(JSON.stringify(generateAllowedFrequencies(this.type)));
      if (hasPermission(Actions.APP_CUSTOM_FREQ_VIEW)) frequencyOptions.push({ "id": "CUSTOM", "description": "Custom"})
      if (currentFrequency) {
        const selectedFrequency = frequencyOptions.find((frequency: any) => frequency.id === currentFrequency);
        if (!selectedFrequency ) {
          const frequencies = await this.store.dispatch("job/fetchTemporalExpression", [ currentFrequency ]);
          const frequency = frequencies[currentFrequency];
          frequency && (frequencyOptions.push({ "id": frequency.tempExprId,  "description": frequency.description }))
        }
      }
      this.frequencyOptions = frequencyOptions;
      this.jobStatus = currentFrequency;
    },
    async generateRunTimes(currentRunTime?: any) {
      const runTimes = JSON.parse(JSON.stringify(generateAllowedRunTimes()))
      let selectedRunTime
      // 0 check for the 'Now' value and '' check for initial render
      if (currentRunTime || currentRunTime === 0 ) {
        selectedRunTime = runTimes.some((runTime: any) => runTime.value === currentRunTime)
        if (!selectedRunTime) runTimes.push({ label: this.getTime(currentRunTime), value: currentRunTime })
      }
      this.runTime = currentRunTime
      this.runTimes = runTimes
    },
    isRuntimePassed() {
      return this.currentJob.runTime <= DateTime.now().toMillis()
    },
    async refreshCurrentJob() {
      let job;

      if(this.$route.path === '/pipeline') {
        job = this.pendingJobs.find((job: any) => job.systemJobEnumId === this.currentJob.systemJobEnumId)
      } else if(this.$route.path === '/brokering') {
        // In brokering page, we may have multiple batch jobs for a single systemJobEnumId.
        // Hence uniquely identifying current job using parentJobId.
        job = this.getJob(this.currentJob.systemJobEnumId)?.find((job: any) => job.parentJobId === this.currentJob.parentJobId)
      } else {
        job = this.getJob(this.currentJob.systemJobEnumId)
      }

      await this.store.dispatch('job/updateCurrentJob', { job });
      this.jobStatus = this.currentJob.statusId === "SERVICE_DRAFT" ? this.currentJob.statusId : this.currentJob.tempExprId;
      this.runTime = this.currentJob?.runTime ? this.currentJob?.runTime : ''
      this.generateRunTimes(this.runTime)
      this.generateFrequencyOptions(this.jobStatus)
      this.isRefreshRequired = false
    },
    async skipJob(job: any) {
      const alert = await alertController
        .create({
          header: translate('Skip job'),
          message: translate('Skipping will run this job at the next occurrence based on the temporal expression.'),
          buttons: [{
            text: translate("Don't skip"),
            role: 'cancel'
          }, {
            text: translate('Skip'),
            handler: () => {
              if (job) {

                if(this.isRuntimePassed()) {
                  this.isRefreshRequired = true
                  emitter.emit("productStoreOrConfigChanged")
                  showToast(translate("Job runtime has passed. Please refresh to get the latest job data in order to perform any action."))
                  return;
                }

                this.store.dispatch('job/skipJob', job).then((resp) => {
                  if (resp) {
                    emitter.emit('jobUpdated');
                    showToast(translate("This job has been skipped!"))
                  }
                })
              }
            }
          }],
        });
      return alert.present();
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
            handler: () => {
              if(this.isRuntimePassed()) {
                this.isRefreshRequired = true
                emitter.emit("productStoreOrConfigChanged")
                showToast(translate("Job runtime has passed. Please refresh to get the latest job data in order to perform any action."))
                return;
              }

              this.store.dispatch('job/cancelJob', job).then((resp) => {
                if(!hasError(resp)) {
                  emitter.emit('jobUpdated');
                  const category = this.$route.params?.category;
                  if (category) {
                    this.router.push({ name: 'JobDetails', params: { jobId: job?.systemJobEnumId, category: category }, replace: true });
                  }
                }
              })
            }
          }],
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
    async discardChanges() {
      const alert = await alertController
        .create({
          header: translate('Discard changes'),
          message: translate('All unsaved changes will be lost. Are you sure you want to leave this page.'),
          buttons: [translate('Cancel'), translate('Save')],
        });
      return alert.present();
    },
    async updateJob() {
      const job = this.currentJob;

      // return if job has missing data or error
      if(hasJobDataError(job)) return;

      job['jobStatus'] = this.jobStatus !== 'SERVICE_DRAFT' ? this.jobStatus : 'HOURLY';

      // Handling the case for 'Now'. Sending the now value will fail the API as by the time
      // the job is ran, the given 'now' time would have passed. Hence, passing empty 'run time'
      job.runTime = this.runTime != 0 ? (!isCustomRunTime(this.runTime) ? DateTime.now().toMillis() + this.runTime : this.runTime) : ''

      if (job?.statusId === 'SERVICE_DRAFT') {
        const jobCustomParameters = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, job.runtimeData)

        this.store.dispatch('job/scheduleService', { job, jobCustomParameters }).then((job: any) => {
          if(job?.jobId) {
            emitter.emit('jobUpdated');
            const category = this.$route.params.category;
            this.customOptionalParameters = generateJobCustomOptions(this.currentJob).optionalParameters;
            this.customRequiredParameters = generateJobCustomOptions(this.currentJob).requiredParameters;
            if (category) {
              this.router.push({ name: 'JobDetails', params: { jobId: job?.jobId, category: category }, replace: true });
            }
          }
        })
      } else if (job?.statusId === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job).then((resp) => {
          if (resp) {
            this.customOptionalParameters = generateJobCustomOptions(this.currentJob).optionalParameters;
            this.customRequiredParameters = generateJobCustomOptions(this.currentJob).requiredParameters;
            emitter.emit('jobUpdated');
          }
        })
      }
    },
    async setCustomFrequency() {
      const customFrequencyModal = await modalController.create({
        component: CustomFrequencyModal,
      });
      customFrequencyModal.onDidDismiss()
        .then((result) => {
          let jobStatus = this.currentJob.statusId === "SERVICE_DRAFT" ? this.currentJob.statusId : this.currentJob.tempExprId;
          if (result.data && result.data.frequencyId) {
            jobStatus = result.data.frequencyId;
          }
          this.generateFrequencyOptions(jobStatus);
        });
      return customFrequencyModal.present();
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    timeTillJob (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    async viewJobHistory(job: any) {
      const jobHistoryModal = await modalController.create({
        component: JobHistoryModal,
        componentProps: { currentJob: job }
      });
      await jobHistoryModal.present();
      jobHistoryModal.onDidDismiss().then(() => {
        jobHistoryModal.dismiss({ dismissed: true });
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
              handler: () => {
                if (job && !hasJobDataError(job)) {

                  // preparing the custom parameters those needs to passed with the job
                  const jobCustomParameters = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, job.runtimeData)

                  this.store.dispatch('job/runServiceNow', { job, jobCustomParameters })
                }
              }
            }
          ]
        });

      return jobAlert.present();
    },
    async copyJobInformation(job: any) {
      const { Clipboard } = Plugins;
      const jobDetails = `jobId: ${job.jobId}, jobName: ${job.enumName}, jobDescription: ${job.description} ${job.runtimeData ? (", runtimeData: " + JSON.stringify(job.runtimeData)) : ""}`;

      await Clipboard.write({
        string: jobDetails
      }).then(() => {
        showToast(translate("Copied job details to clipboard"));
      })
    },
    async updatePinnedJobs(enumId: any) {
      const pinnedJobs = new Set(this.pinnedJobs);
      if(pinnedJobs.has(enumId)) {
        pinnedJobs.delete(enumId);
        await this.store.dispatch('user/updatePinnedJobs', { pinnedJobs: [...pinnedJobs] });
        emitter.emit("pinnedJobsUpdated", enumId);
      } else {
        pinnedJobs.add(enumId);
        await this.store.dispatch('user/updatePinnedJobs', { pinnedJobs: [...pinnedJobs] });
      }
    },
    updateRunTime(event: CustomEvent) {
      const value = event.detail.value
      if (value != 'CUSTOM') this.generateRunTimes(value)
      else this.isDateTimeModalOpen = true
    },
    updateCustomTime(event: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(event.detail.value);
      if (setTime > currTime) this.generateRunTimes(setTime)
      else showToast(translate("Provide a future date and time"))
    },
    async openJobCustomParameterModal() {
      const jobParameterModal = await modalController.create({
      component: JobParameterModal,
        componentProps: { customOptionalParameters: this.customOptionalParameters, customRequiredParameters: this.customRequiredParameters, currentJob: this.currentJob },
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
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      addOutline,
      calendarClearOutline,
      codeWorkingOutline,
      copyOutline,
      DateTime,
      listCircleOutline,
      flashOutline,
      fileTrayFullOutline,
      hasPermission,
      isCustomRunTime,
      getNowTimestamp,
      timeOutline,
      timerOutline,
      store,
      router,
      syncOutline,
      personCircleOutline,
      pinOutline,
      refreshOutline,
      translate,
      warningOutline
    };
  }
});
</script>

<style scoped>
.learn-more-text {
  font-size: 14px;
  cursor: pointer;
}
section {
  margin-top: var(--spacer-sm);
  margin-bottom: var(--spacer-sm);
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

  .mobile-only {
    display: none;
  }
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