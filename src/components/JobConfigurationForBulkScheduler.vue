<template>
  <div v-for="job in bulkJobs" :key="job.jobId">
    <ion-card>
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          {{ job.jobName }}
          <p>{{ job.description }}</p>
        </ion-label>
      </ion-item>
      <ion-item-divider>
        {{ $t("Parameters") }}
      </ion-item-divider>
      <ion-item>
        <ion-label>{{ $t("Store") }}</ion-label>
        <ion-note slot="end">2 {{ $t("stores selected") }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-label>{{ $t("eCommerce") }}</ion-label>
        <ion-badge color="danger">{{ $t("no eCommerce selected") }}</ion-badge>
      </ion-item>
      <ion-item>
        <ion-label>{{ $t("Run time") }}</ion-label>
        <ion-label class="ion-text-wrap" @click="() => isOpen = true" slot="end">{{ $t('Select run time') }}</ion-label>
        <ion-modal class="date-time-modal" :is-open="isOpen" @didDismiss="() => isOpen = false">
          <ion-content force-overscroll="false">
            <ion-datetime show-default-buttons hour-cycle="h12" />
          </ion-content>
        </ion-modal>
      </ion-item>
      <ion-item>
        <ion-label>{{ $t("Schedule") }}</ion-label>
        <ion-select interface="popover" :placeholder='$t("Bulk schedule")'>
          <ion-select-option value="Every 5 minutes">Every 5 minutes</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonContent,
  IonDatetime,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  alertController,
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
import { handleDateTimeInput, showToast } from "@/utils";
import { mapGetters, useStore } from "vuex";
import { DateTime } from 'luxon';
import { translate } from '@/i18n'
import { useRouter } from "vue-router";
import emitter from '@/event-bus';

export default defineComponent({
  name: "JobConfigurationForBulkScheduler",
  components: {
    IonContent,
    IonDatetime,
    IonItem,
    IonLabel,
    IonModal,
    IonSelect,
    IonSelectOption,
  },
  data() {
    return {
      isOpenGlobal: false,
      isOpen: false,
      jobStatus: this.status,
      runTime: '' as any,
    }
  },
  mounted() {
    this.runTime = this.currentJob?.runTime 
  },
  updated() {
    // When updating the job, the job is fetched again with the latest values
    // Updated value should be set to instance variable jobStatus
    this.jobStatus = this.currentJob.statusId === "SERVICE_DRAFT" ? this.currentJob.statusId : this.currentJob.tempExprId;
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
      bulkJobs: 'job/getBulkJobs'
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
    }
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
      job.runTime = this.runTime;

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
    updateRunTime(ev: CustomEvent, job: any) {
      if (job) {
        const currTime = DateTime.now().toMillis();
        const setTime = handleDateTimeInput(ev['detail'].value);
        
        if(setTime > currTime) {
          this.runTime = setTime;
        } else {
          showToast(translate("Provide a future date and time"))
        }
      }
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
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      calendarClearOutline,
      copyOutline,
      flashOutline,
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