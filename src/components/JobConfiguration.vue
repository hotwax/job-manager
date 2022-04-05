<template>
  <section>
    <ion-item lines="none">
      <h1>{{ $t(title) }}</h1>
      <ion-badge slot="end" color="dark" v-if="job?.runTime">{{ $t("running") }} {{ timeTillJob(job.runTime) }}</ion-badge>
    </ion-item>

    <ion-list>
      <ion-item>
        <ion-icon slot="start" :icon="calendarClearOutline" />
        <ion-label>{{ $t("Last run") }}</ion-label>
        <ion-label slot="end">{{ job?.lastUpdatedStamp ? getTime(job.lastUpdatedStamp) : $t('No previous occurrence') }}</ion-label>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label>{{ $t("Run time") }}</ion-label>
        <ion-label id="open-run-time-modal" slot="end">{{ job?.runTime ? getTime(job.runTime) : $t('Select run time') }}</ion-label>
        <!-- TODO: display a button when we are not having a runtime and open the datetime component
        on click of that button
        Currently, when mapping the same datetime component for label and button so it's not working so for
        now commented the button and added a fallback string -->
        <!-- <ion-button id="open-run-time-modal" size="small" fill="outline" color="medium" v-show="!job?.runTime">{{ $t("Select run time") }}</ion-button> -->
        <ion-modal trigger="open-run-time-modal">
          <ion-content force-overscroll="false">
            <ion-datetime
              :value="job?.runTime ? getDateTime(job.runTime) : ''"
              @ionChange="updateRunTime($event, job)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>

      <ion-item>
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label>{{ $t("Schedule") }}</ion-label>
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
        <ion-button size="small" fill="outline" color="medium" :disabled="status === 'SERVICE_DRAFT'" @click="skipJob(job)">{{ $t("Skip once") }}</ion-button>
        <ion-button size="small" fill="outline" color="danger" :disabled="status === 'SERVICE_DRAFT'" @click="cancelJob(job.jobId, job.systemJobEnumId)">{{ $t("Disable") }}</ion-button>
      </div>
      <div>
        <ion-button size="small" fill="outline" @click="saveChanges()">{{ $t("Save changes") }}</ion-button>
      </div>
    </div>

    <div class=" actions mobile-only">
      <ion-button expand="block" fill="outline" color="medium" @click="skipJob">{{ $t("Skip once") }}</ion-button>
      <ion-button expand="block" fill="outline" color="danger" @click="cancelJob">{{ $t("Disable") }}</ion-button>
      <ion-button expand="block" fill="outline" @click="saveChanges">{{ $t("Save changes") }}</ion-button>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  IonBadge,
  IonButton,
  IonContent,
  IonDatetime,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonList,
  alertController
} from "@ionic/vue";
import {
  calendarClearOutline,
  timeOutline,
  timerOutline,
  syncOutline,
  personCircleOutline
} from "ionicons/icons";
import { mapGetters, useStore } from "vuex";
import { translate } from "@/i18n";
import { DateTime } from 'luxon';

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
    IonSelectOption
  },
  data() {
    return {
      jobStatus: this.status
    }
  },
  props: ["job", "title", "status", "type"],
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore'
    }),
    generateFrequencyOptions(): any {
      const optionDefault = [{
          "value": "EVERY_5_MIN",
          "label": "Every 5 minutes"
        },{
          "value": "EVERY_15_MIN",
          "label": "Every 15 minutes"
        },{
          "value": "HOURLY",
          "label": "Hourly"
        },{
          "value": "DAILY",
          "label": "Daily"
        }
      ]

      const slow = [{
          "value": "HOURLY",
          "label": "Hourly"
        },{
          "value": "EVERY_6_HOUR",
          "label": "Every 6 hours"
        },{
          "value": "DAILY",
          "label": "Daily"
        }
      ]
      return (this as any).type === 'slow' ? slow : optionDefault;
    }
  },
  methods: {
    getDateTime(time: any) {
      return DateTime.fromMillis(time)
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
                this.store.dispatch('job/skipJob', job)
              }
            }
          }],
        });
      return alert.present();
    },
    async cancelJob(jobId: string, systemJobEnumId: string) {
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
              const cancelDateTime = DateTime.now().toMillis()
              this.store.dispatch('job/updateJob', {jobId, systemJobEnumId, cancelDateTime, statusId: "SERVICE_CANCELLED"});
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
      const job = this.job;

      // TODO: pass user time zone in the payload
      const payload = {
        'systemJobEnumId': job.systemJobEnumId,
        'statusId': "SERVICE_PENDING",
        'recurrenceTimeZone': DateTime.now().zoneName
      } as any
      if (job?.status === 'SERVICE_DRAFT') {
        payload['JOB_NAME'] = job.jobName
        payload['SERVICE_NAME'] = job.serviceName
        payload['SERVICE_TIME'] = job.runTime.toString()
        payload['SERVICE_COUNT'] = '0'
        payload['jobFields'] = {
          'productStoreId': this.currentEComStore.productStoreId,
          'systemJobEnumId': job.systemJobEnumId,
          'tempExprId': this.jobStatus,
          'maxRecurrenceCount': '-1',
          'parentJobId': job.parentJobId,
          'runAsUser': 'system', // default system, but empty in run now
          'recurrenceTimeZone': DateTime.now().zoneName
        }
        payload['shopifyConfigId'] = this.shopifyConfigId

        // checking if the runTimeData has productStoreId, and if present then adding it on root level
        job?.runTimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = this.currentEComStore.productStoreId)

        this.store.dispatch('job/scheduleService', {...job.runTimeData, ...payload})
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = this.jobStatus
        payload['jobId'] = job.id
        payload['runTime'] = job.runTime

        this.store.dispatch('job/updateJob', payload)
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
        job.runTime = DateTime.fromISO(ev['detail'].value).toMillis()
      }
    }
  },
  setup() {
    const customPopoverOptions: any = {
      header: translate('Schedule inventory hard sync'),
      showBackdrop: false
    }
    const store = useStore();
    return {
      calendarClearOutline,
      customPopoverOptions,
      timeOutline,
      timerOutline,
      store,
      syncOutline,
      personCircleOutline
    };
  }
});
</script>

<style scoped>
ion-list {
  margin: var(--spacer-base) 0;
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
}

ion-modal {
  --width: 290px;
  --height: 382px;
  --border-radius: 8px;
}
</style>