<template>
  <section>
    <ion-item lines="none">
      <!-- Adding conditional check for currentJob.jobName as currentJob is undefined when i18n runs $t -->
      <h1>{{ currentJob.enumName ? currentJob.enumName : currentJob.jobName ? currentJob.jobName : '' }}</h1>
      <ion-badge slot="end" color="dark" v-if="currentJob?.runTime && currentJob.statusId !== 'SERVICE_DRAFT'">{{ $t("running") }} {{ timeTillJob(currentJob.runTime) }}</ion-badge>
    </ion-item>

    <ion-list>

      <ion-item v-if="currentJob.description" lines="none">
        <ion-label class="ion-text-wrap">
          <p>{{ currentJob.description }}</p>
        </ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Run time") }}</ion-label>
        <ion-select interface="popover" :placeholder="$t('Select')" :value="runTime" @ionChange="updateRunTime($event)">
          <ion-select-option v-for="runTime in runTimes" :key="runTime.value" :value="runTime.value">{{ $t(runTime.label) }}</ion-select-option>
        </ion-select>
        <!-- TODO: display a button when we are not having a runtime and open the datetime component
        on click of that button
        Currently, when mapping the same datetime component for label and button so it's not working so for
        now commented the button and added a fallback string -->
        <!-- <ion-button id="open-run-time-modal" size="small" fill="outline" color="medium" v-show="!currentJob?.runTime">{{ $t("Select run time") }}</ion-button> -->
        <ion-modal class="date-time-modal" :is-open="isDateTimeModalOpen" @didDismiss="() => isDateTimeModalOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime          
              show-default-buttons
              hour-cycle="h23"
              :value="runTime ? (isCustomRunTime(runTime) ? getDateTime(runTime) : getDateTime(DateTime.now().toMillis() + runTime)) : ''"
              @ionChange="updateCustomTime($event)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Schedule") }}</ion-label>
        <ion-select :value="jobStatus" :interface-options="{ header: $t('Frequency') }" interface="popover" :placeholder="$t('Disabled')" @ionChange="jobStatus = $event.detail.value" @ionDismiss="jobStatus == 'CUSTOM' && setCustomFrequency()">
          <ion-select-option v-for="freq in frequencyOptions" :key="freq.id" :value="freq.id">{{ freq.description }}</ion-select-option>
        </ion-select>
      </ion-item>

      <ion-item lines="none">
        <ion-chip @click="openJobCustomParameterModal" outline v-if="!Object.keys(generateCustomParameters).length">
          <ion-icon :icon="addOutline" />
          <ion-label>{{ $t('Add custom parameters') }}</ion-label>
        </ion-chip>
        <ion-row v-else>
          <ion-chip @click="openJobCustomParameterModal" outline :key="name" v-for="(parameter, name) in generateCustomParameters">
            {{ name }} : {{ parameter }}
          </ion-chip>
        </ion-row>
        <ion-button @click="openJobCustomParameterModal" id="open-modal" slot="end" fill="clear">
          <ion-icon slot="icon-only" :icon="listCircleOutline"/>
        </ion-button>
      </ion-item>

      <!-- TODO: enable this feature of passing count when supported on backend -->
      <!-- <ion-item>
        <ion-icon slot="start" :icon="syncOutline" />
        <ion-label>{{ $t("Repeat untill disabled") }}</ion-label>
        <ion-checkbox slot="end" :checked="repeat" @ionChange="repeatUntillDisabled($event['detail'].checked)"/>
      </ion-item>

      <ion-item v-show="!repeat">
        <ion-label>{{ $t("Auto disable after") }}</ion-label>
        <ion-input :placeholder="$t('occurrences')" v-model="count"/>
      </ion-item> -->
    </ion-list>

    <div class="actions desktop-only">
      <div>
        <ion-button size="small" fill="outline" color="medium" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || currentJob.statusId === 'SERVICE_DRAFT'" @click="skipJob(currentJob)">{{ $t("Skip once") }}</ion-button>
        <ion-button size="small" fill="outline" color="danger" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || currentJob.statusId === 'SERVICE_DRAFT'" @click="cancelJob(currentJob)">{{ $t("Disable") }}</ion-button>
      </div>
      <div>
        <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRequiredParametersMissing" size="small" fill="outline" @click="saveChanges()">{{ $t("Save changes") }}</ion-button>
      </div>
    </div>

    <div class=" actions mobile-only">
      <ion-button size="small" expand="block" fill="outline" color="medium" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || status === 'SERVICE_DRAFT'" @click="skipJob(currentJob)">{{ $t("Skip once") }}</ion-button>
      <ion-button size="small" expand="block" fill="outline" color="danger" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || status === 'SERVICE_DRAFT'" @click="cancelJob(currentJob)">{{ $t("Disable") }}</ion-button>
      <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRequiredParametersMissing" expand="block" @click="saveChanges()">{{ $t("Save changes") }}</ion-button>
    </div>
  </section>
  <div class="more-actions">
    <ion-item @click="viewJobHistory(currentJob)" button>
      <ion-icon slot="start" :icon="timeOutline" />
      {{ $t("History") }}
    </ion-item>
    <ion-item :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" @click="runNow(currentJob)" button>
      <ion-icon slot="start" :icon="flashOutline" />
      {{ $t("Run now") }}
    </ion-item>
    <ion-item @click="copyJobInformation(currentJob)" button>
      <ion-icon slot="start"  :icon="copyOutline" />
      {{ $t("Copy details") }}
    </ion-item>
    <ion-item @click="updatePinnedJobs(currentJob?.systemJobEnumId)" button>
      <ion-icon slot="start" :icon="pinOutline" />
      {{ $t("Pin job") }}
      <ion-checkbox slot="end" :checked="pinnedJobs && pinnedJobs.includes(currentJob.systemJobEnumId)" />
    </ion-item>
  </div>

</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
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
} from "ionicons/icons";
import JobHistoryModal from '@/components/JobHistoryModal.vue'
import { Plugins } from '@capacitor/core';
import { isCustomRunTime, generateAllowedRunTimes, generateAllowedFrequencies, generateJobCustomParameters, handleDateTimeInput, showToast, hasError } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';
import { translate } from '@/i18n'
import { useRouter } from "vue-router";
import emitter from '@/event-bus';
import { Actions, hasPermission } from '@/authorization'
import CustomFrequencyModal from '@/components/CustomFrequencyModal.vue';
import JobParameterModal from '@/components/JobParameterModal.vue'

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
    IonRow,
    IonSelect,
    IonSelectOption,
    IonCheckbox
  },
  data() {
    return {
      isDateTimeModalOpen: false,
      runTime: '' as any,
      runTimes: [] as any,
      jobStatus: this.status,
      frequencyOptions: [] as any,
      customOptionalParameters: [] as any,
      customRequiredParameters: [] as any
    }
  },
  mounted() {
    this.runTime = this.currentJob?.runTime
    this.generateRunTimes(this.runTime)
    this.generateFrequencyOptions(this.jobStatus)
    this.generateCustomOptions();
  },
  updated() {
    // When updating the job, the job is fetched again with the latest values
    // Updated value should be set to instance variable jobStatus
    this.jobStatus = this.currentJob.statusId === "SERVICE_DRAFT" ? this.currentJob.statusId : this.currentJob.tempExprId;
    this.runTime = this.currentJob?.runTime ? this.currentJob?.runTime : ''
    this.generateRunTimes(this.runTime)
    this.generateFrequencyOptions(this.jobStatus)
  },
  props: ["status", "type"],
  computed: {
    ...mapGetters({
      pinnedJobs: 'user/getPinnedJobs',
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      currentJob: 'job/getCurrentJob',
    }),
    isRequiredParametersMissing() {
      return this.customRequiredParameters.some((parameter: any) => !parameter.value?.trim())
    },
    generateCustomParameters() {
      return generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters)
    }
  },
  methods: {
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
    async skipJob(job: any) {
      const alert = await alertController
        .create({
          header: this.$t('Skip job'),
          message: this.$t('Skipping will run this job at the next occurrence based on the temporal expression.'),
          buttons: [{
            text: this.$t("Don't skip"),
            role: 'cancel'
          }, {
            text: this.$t('Skip'),
            handler: () => {
              if (job) {
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
          header: this.$t('Cancel job'),
          message: this.$t('Canceling this job will cancel this occurrence and all following occurrences. This job will have to be re-enabled manually to run it again.'),
          buttons: [{
            text: this.$t("Don't cancel"),
            role: 'cancel'
          }, {
            text: this.$t('Cancel'),
            handler: () => {
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
          header: this.$t('Save changes'),
          message: this.$t('Are you sure you want to save these changes?'),
          buttons: [{
            text: this.$t('Cancel'),
            role: 'cancel'
          }, {
            text: this.$t('Save'),
            handler: () => {
              this.updateJob();
            }
          }]
        });
      return alert.present();
    },
    async discardChanges() {
      const alert = await alertController
        .create({
          header: this.$t('Discard changes'),
          message: this.$t('All unsaved changes will be lost. Are you sure you want to leave this page.'),
          buttons: [this.$t('Cancel'), this.$t('Save')],
        });
      return alert.present();
    },
    async updateJob() {
      const job = this.currentJob;
      job['jobStatus'] = this.jobStatus !== 'SERVICE_DRAFT' ? this.jobStatus : 'HOURLY';

      const jobCustomParameters = this.generateCustomParameters;

      // Handling the case for 'Now'. Sending the now value will fail the API as by the time
      // the job is ran, the given 'now' time would have passed. Hence, passing empty 'run time'
      job.runTime = !isCustomRunTime(this.runTime) ? DateTime.now().toMillis() + this.runTime : this.runTime

      if (job?.statusId === 'SERVICE_DRAFT') {
        this.store.dispatch('job/scheduleService', { job, jobCustomParameters }).then((job: any) => {
          if(job?.jobId) {
            emitter.emit('jobUpdated');
            const category = this.$route.params.category;
            if (category) {
              this.router.push({ name: 'JobDetails', params: { jobId: job?.jobId, category: category }, replace: true });
            }
          }
        })
      } else if (job?.statusId === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', { job, jobCustomParameters }).then((resp) => {
          if (resp) {
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
          header: this.$t("Run now"),
          message: this.$t('Running this job now will not replace this job. A copy of this job will be created and run immediately. You may not be able to reverse this action.', { space: '<br/><br/>' }),
          buttons: [
            {
              text: this.$t("Cancel"),
              role: 'cancel',
            },
            {
              text: this.$t('Run now'),
              handler: () => {
                if (job) {
                  // preparing the custom parameters those needs to passed with the job
                  const jobCustomParameters = {} as any;
                  this.customRequiredParameters.map((parameter: any) => {
                    jobCustomParameters[parameter.name] = parameter.value.trim();
                  })

                  this.customOptionalParameters.map((parameter: any) => {
                    if(parameter.value.trim()) {
                      jobCustomParameters[parameter.name] = parameter.value.trim();
                    }
                  })

                  this.store.dispatch('job/runServiceNow', { job, ...jobCustomParameters })
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
        showToast(this.$t("Copied job details to clipboard"));
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
    generateCustomOptions() {
      let inputParameters = this.currentJob?.serviceInParams ? JSON.parse(JSON.stringify(this.currentJob?.serviceInParams)) : []

      // removing some fields that we don't want user to edit, and for which the values will be added programatically
      const excludeParameters = ['productStoreId', 'shopId', 'shopifyConfigId']
      inputParameters = inputParameters.filter((parameter: any) =>!excludeParameters.includes(parameter.name))

      inputParameters.map((parameter: any) => {
        if(parameter.optional) {
          this.customOptionalParameters.push({
            name: parameter.name,
            value: this.currentJob?.runtimeData && this.currentJob?.runtimeData[parameter.name] ? '' + this.currentJob?.runtimeData[parameter.name] : ''
          })
        } else {
          this.customRequiredParameters.push({
            name: parameter.name,
            value: this.currentJob?.runtimeData && this.currentJob?.runtimeData[parameter.name] ? '' + this.currentJob?.runtimeData[parameter.name] : ''
          })
        }
      })
    },
    async openJobCustomParameterModal() {
      const jobParameterModal = await modalController.create({
        component: JobParameterModal,
        componentProps: { customOptionalParameters: this.customOptionalParameters, customRequiredParameters: this.customRequiredParameters, currentJob: this.currentJob },
        breakpoints: [0, 0.25, 0.5, 0.75, 1],
        initialBreakpoint: 0.75,
        backdropBreakpoint: 0.25
      });
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
      copyOutline,
      DateTime,
      listCircleOutline,
      flashOutline,
      hasPermission,
      isCustomRunTime,
      timeOutline,
      timerOutline,
      store,
      router,
      syncOutline,
      personCircleOutline,
      pinOutline
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