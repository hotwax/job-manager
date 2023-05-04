<template>
  <section>
    <ion-item lines="none">
      <!-- Adding conditional check for currentJob.jobName as currentJob is undefined when i18n runs $t -->
      <h1>{{ getEnumName(currentJob.systemJobEnumId) ? $t(getEnumName(currentJob.systemJobEnumId)) : currentJob.jobName ? $t(currentJob.jobName) : '' }}</h1>
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
        <ion-select interface="popover" :placeholder="$t('Select')" :value="runTime.value" @ionChange="updateRunTime($event)">
          <ion-select-option v-for="runTime in runTimeOptions" :key="runTime.value" :value="runTime.value">{{ $t(runTime.label) }}</ion-select-option>
        </ion-select>
        <!-- TODO: display a button when we are not having a runtime and open the datetime component
        on click of that button
        Currently, when mapping the same datetime component for label and button so it's not working so for
        now commented the button and added a fallback string -->
        <!-- <ion-button id="open-run-time-modal" size="small" fill="outline" color="medium" v-show="!currentJob?.runTime">{{ $t("Select run time") }}</ion-button> -->
        <ion-modal class="date-time-modal" :is-open="isOpen" @didDismiss="() => isOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime          
              show-default-buttons
              hour-cycle="h23"
              :value="runTime.value ? (runTime.type === 'CUSTOM' ? getDateTime(runTime.value) : getDateTime(DateTime.now().toMillis() + parseInt(runTime.value))) : ''"
              @ionChange="updateCustomTime($event)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label class="ion-text-wrap">{{ $t("Schedule") }}</ion-label>
        <ion-select :interface-options="customPopoverOptions" interface="popover" :value="jobStatus" :placeholder="$t('Disabled')" @ionChange="($event) => jobStatus = $event['detail'].value">
          <ion-select-option v-for="freq in generateFrequencyOptions" :key="freq.value" :value="freq.value">{{ $t(freq.label) }}</ion-select-option>
        </ion-select>
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
        <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" size="small" fill="outline" @click="saveChanges()">{{ $t("Save changes") }}</ion-button>
      </div>
    </div>

    <div class=" actions mobile-only">
      <ion-button size="small" expand="block" fill="outline" color="medium" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || status === 'SERVICE_DRAFT'" @click="skipJob(currentJob)">{{ $t("Skip once") }}</ion-button>
      <ion-button size="small" expand="block" fill="outline" color="danger" :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || status === 'SERVICE_DRAFT'" @click="cancelJob(currentJob)">{{ $t("Disable") }}</ion-button>
      <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" expand="block" @click="saveChanges()">{{ $t("Save changes") }}</ion-button>
    </div>
  </section>
  <div class="more-actions">
    <ion-item @click="viewJobHistory(currentJob)" button>
      <ion-icon slot="start" :icon="timeOutline" />
      {{ $t("History") }}
    </ion-item>
    <ion-item :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" @click="runNow(title, currentJob)" button>
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
import { defineComponent } from "vue";
import {
  IonBadge,
  IonButton,
  IonCheckbox,
  IonContent,
  IonDatetime,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  alertController,
  modalController,
} from "@ionic/vue";
import {
  calendarClearOutline,
  flashOutline,
  copyOutline,
  timeOutline,
  timerOutline,
  syncOutline,
  personCircleOutline,
  pinOutline,
} from "ionicons/icons";
import JobHistoryModal from '@/components/JobHistoryModal.vue'
import { Plugins } from '@capacitor/core';
import { handleDateTimeInput, showToast } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';
import { translate } from '@/i18n'
import { useRouter } from "vue-router";
import emitter from '@/event-bus';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: "JobConfiguration",
  components: {
    IonBadge,
    IonButton,
    IonContent,
    IonDatetime,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonCheckbox
  },
  data() {
    return {
      isOpen: false,
      jobStatus: this.status,
      runTime: {
        value: '',
        type: 'CUSTOM' // as job's current time is 'custom'
      } as any,
    }
  },
  mounted() {
    // Appendng and setting the previous run time
    this.runTime.value = this.currentJob?.runTime
    this.runTime.value && this.runTimeOptions.push({
      value: this.runTime.value,
      label: this.runTime.value ? this.getTime(this.runTime.value) : ''
    })
  },
  updated() {
    // When updating the job, the job is fetched again with the latest values
    // Updated value should be set to instance variable jobStatus
    this.jobStatus = this.currentJob.statusId === "SERVICE_DRAFT" ? this.currentJob.statusId : this.currentJob.tempExprId;
    this.runTime.value = this.currentJob?.runTime ? this.currentJob?.runTime : ''
  },
  props: ["title", "status", "type"],
  computed: {
    ...mapGetters({
      getEnumDescription: 'job/getEnumDescription',
      getEnumName: 'job/getEnumName',
      pinnedJobs: 'user/getPinnedJobs',
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      currentJob: 'job/getCurrentJob',
    }),
    generateFrequencyOptions(): any {
      const optionDefault = [{
          "value": "EVERY_1_MIN",
          "label": "Every 1 minute"
        },{
          "value": "EVERY_5_MIN",
          "label": "Every 5 minutes"
        },{
          "value": "EVERY_15_MIN",
          "label": "Every 15 minutes"
        },{
          "value": "EVERY_30_MIN",
          "label": "Every 30 minutes"
        },{
          "value": "HOURLY",
          "label": "Hourly"
        },{
          "value": "EVERY_6_HOUR",
          "label": "Every 6 hours"
        },{
          "value": "EVERYDAY",
          "label": "Every day"
        }
      ]

      const slow = [{
          "value": "HOURLY",
          "label": "Hourly"
        },{
          "value": "EVERY_6_HOUR",
          "label": "Every 6 hours"
        },{
          "value": "EVERYDAY",
          "label": "Every day"
        }
      ]
      return (this as any).type === 'slow' ? slow : optionDefault;
    },
    customPopoverOptions() {
      return {
        header: (this as any).title,
        showBackdrop: false
      }
    },
    // value denotes the time in milliseconds for that label
    runTimeOptions: () => [{
      "value": 0,
      "label": "Now"
    }, {
      "value": 300000,
      "label": "In 5 minutes"
    }, {
      "value": 900000,
      "label": "In 15 minutes"
    }, {
      "value": 3600000,
      "label": "In an hour"
    }, {
      "value": 86400000,
      "label": "Tomorrow"
    }, {
      "value": "CUSTOM",
      "label": "Custom"
    }]
  },
  methods: {
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
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
                if(resp.data?.successMessage) {
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

      job.runTime = this.runTime.value
      if (this.runTime.type === 'PREDEFINED') {
        // Handling the case for 'Now'. Sending the now value will fail the API as by the time
        // the job is ran, the given 'now' time would have passed. Hence, passing empty 'run time'
        if (this.runTime.value == 0) job.runTime = ''
        else job.runTime += DateTime.now().toMillis()
      }

      if (job?.statusId === 'SERVICE_DRAFT') {
        this.store.dispatch('job/scheduleService', job).then((job: any) => {
          if(job?.jobId) {
            const category = this.$route.params.category;
            if (category) {
              this.router.push({ name: 'JobDetails', params: { jobId: job?.jobId, category: category }, replace: true });
            }
          }
        })
      } else if (job?.statusId === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job).then((resp) => {
          if (resp) {
            emitter.emit('jobUpdated');
          }
        })
      }
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    timeTillJob (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    updateRunTime(event: CustomEvent) {
      const value = event.detail.value
      if (value != 'CUSTOM') {
        // checking if a predefined option is selected i.e the first five options
        const isPredefinedValue = this.runTimeOptions.slice(0, 5).some((option: any) => option.value === value)

        // Update the option list iff - a predefined option is selected 
        // and a custom date time is already there in the list 
        if (this.runTime.type === 'CUSTOM'
          && this.runTimeOptions[this.runTimeOptions.length - 1].value != 'CUSTOM'
          && isPredefinedValue) {
          this.runTimeOptions.pop()
        }

        this.runTime = {
          value,
          type: isPredefinedValue ? 'PREDEFINED' : 'CUSTOM'
        }
      } else {
        this.isOpen = true
      }
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
    async runNow(header: string, job: any) {
      const jobAlert = await alertController
        .create({
          header,
          message: this.$t('This job will be scheduled to run as soon as possible. There may not be enough time to revert this action.', {space: '<br/><br/>'}),
          buttons: [
            {
              text: this.$t("Cancel"),
              role: 'cancel',
            },
            {
              text: this.$t('Run now'),
              handler: () => {
                if (job) {
                  this.store.dispatch('job/runServiceNow', job)
                }
              }
            }
          ]
        });

      return jobAlert.present();
    },
    async copyJobInformation(job: any) {
      const { Clipboard } = Plugins;
      const jobDetails = `jobId: ${job.jobId}, jobName: ${this.getEnumName(job.systemJobEnumId)}, jobDescription: ${this.getEnumDescription(job.systemJobEnumId)}`;

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
    updateCustomTime(event: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(event.detail.value);
      if (setTime > currTime) {
        if (this.runTimeOptions[this.runTimeOptions.length - 1].value != 'CUSTOM') this.runTimeOptions.pop()

        this.runTimeOptions.push({
          value: setTime,
          label: this.getTime(setTime)
        })

        this.runTime = {
          value: setTime,
          type: 'CUSTOM'
        }
      } else {
        showToast(translate("Provide a future date and time"))
      }
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      calendarClearOutline,
      copyOutline,
      DateTime,
      flashOutline,
      hasPermission,
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

ion-modal {
  --width: 290px;
  --height: 440px;
  --border-radius: 8px;
}
</style>