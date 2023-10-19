<template>
  <!-- <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ currentBatch?.jobName ? currentBatch?.jobName : $t('New broker run') }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-label position="fixed">{{ $t('Batch name') }}</ion-label>
      <ion-input :placeholder="currentDateTime = getCurrentDateTime()" v-model="jobName" />
    </ion-item>
    <ion-item :disabled="currentBatch?.jobId">
      <ion-label>{{ $t('Order queue') }}</ion-label>
      <ion-select slot="end" interface="popover" :value="this.currentScheduledBatch?.facilityId || batchFacilityId" @ionChange="batchFacilityId = $event['detail'].value">
        <ion-select-option value="_NA_">{{ $t("Brokering queue") }}</ion-select-option>
        <ion-select-option value="PRE_ORDER_PARKING">{{ $t("Pre-order parking") }}</ion-select-option>
        <ion-select-option value="BACKORDER_PARKING">{{ $t("Back-order parking") }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-radio-group>
      <ion-item :disabled="currentBatch?.jobId">
        <ion-label>{{ $t('New orders') }}</ion-label>
        "this.currentScheduledBatch?.unfillable === false" - Did this because ion-radio is not considering boolean 
        <ion-radio :checked="this.currentScheduledBatch?.unfillable === false" slot="start" @click="unfillableOrder = false" color="secondary"/>
      </ion-item>
      <ion-item :disabled="currentBatch?.jobId">
        <ion-label>{{ $t('Unfillable orders') }}</ion-label>
        "this.currentScheduledBatch?.unfillable === false" - Did this because ion-radio is not considering boolean 
        <ion-radio :checked="this.currentScheduledBatch?.unfillable === true" slot="start" @click="unfillableOrder = true" color="secondary"/>
      </ion-item>
    </ion-radio-group>
    <ion-item>
      <ion-label position="fixed">{{ $t("Schedule") }}</ion-label>
      <ion-datetime hour-cycle="h12" :value="currentBatch?.runTime ? getDateTime(currentBatch.runTime) : getNowTimestamp()" @ionChange="updateRunTime($event)" presentation="time" size="cover" />
    </ion-item>    
    <ion-fab @click="updateJob()" vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="checkmarkDoneOutline" />  
      </ion-fab-button>
    </ion-fab>
  </ion-content> -->

  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ $t('New broker run') }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-label position="fixed">{{ $t('Name') }}</ion-label>
      <ion-input :placeholder="currentDateTime = getCurrentDateTime()" v-model="jobName" />
    </ion-item>
    <ion-item>
      <ion-icon slot="start" :icon="ticketOutline" />
      <ion-label>{{ $t('Order parking') }}</ion-label>
      <ion-select slot="end" interface="popover" :value="batchFacilityId" @ionChange="batchFacilityId = $event['detail'].value">
        <ion-select-option value="_NA_">{{ $t("Brokering queue") }}</ion-select-option>
        <ion-select-option value="PRE_ORDER_PARKING">{{ $t("Pre-order parking") }}</ion-select-option>
        <ion-select-option value="BACKORDER_PARKING">{{ $t("Back-order parking") }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
      <ion-icon slot="start" :icon="warningOutline" />
      <ion-label>{{ $t('Unfillable Orders') }}</ion-label>
      <ion-toggle slot="end" :checked="unfillableOrder" @ionChange="unfillableOrder = !unfillableOrder"></ion-toggle>
    </ion-item>

    <ion-list>
      <ion-list-header>
        {{ 'More parameters' }}
      </ion-list-header>
      <ion-item>
        <ion-label>{{ 'Placeholder 1' }}</ion-label>
        <ion-input placeholder="Placeholder"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label>{{ 'Placeholder 2' }}</ion-label>
        <ion-input placeholder="Placeholder"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label>{{ 'Placeholder 3' }}</ion-label>
        <ion-input placeholder="Placeholder"></ion-input>
      </ion-item>
    </ion-list>

    <ion-card>
      <ion-item lines="none">
        <ion-label>{{ 'Schedule' }}</ion-label>
      </ion-item>
      <ion-item :disabled="currentBatch?.jobId">
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label>{{ $t('Run time') }}</ion-label>
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
              :value="runTime ? (isCustomRunTime(runTime) ? getDateTime(runTime) : getDateTime(DateTime.now().toMillis() + runTime)) : getNowTimestamp()"
              @ionChange="updateCustomTime($event)"
            />
          </ion-content>
        </ion-modal>
      </ion-item>
      <ion-item lines="none" :disabled="currentBatch?.jobId">
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label>{{ $t('Frequency') }}</ion-label>
        <ion-select slot="end" interface="popover" value="Select" @ionChange="batchFacilityId = $event['detail'].value">
          <ion-select-option value="Select">{{ $t("Once in 15 minutes") }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card>
    
    <ion-item>
      <ion-label position="fixed">{{ $t("Schedule") }}</ion-label>
      <ion-datetime hour-cycle="h12" :value="getNowTimestamp()" @ionChange="updateRunTime($event)" presentation="time" size="cover" />
    </ion-item>    
    <ion-fab @click="updateJob()" vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button>
        <ion-icon :icon="checkmarkDoneOutline" />  
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, checkmarkDoneOutline, timeOutline, timerOutline, ticketOutline, warningOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { DateTime } from 'luxon';
import { handleDateTimeInput, generateAllowedRunTimes, generateJobCustomParameters, getNowTimestamp, isCustomRunTime, isFutureDate, showToast, hasJobDataError } from '@/utils';
import { translate } from '@/i18n'

export default defineComponent({
  name: 'BatchModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  },
  props: ["id", "enumId"],
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      currentBatch: {} as any,
      jobName: '' as string,
      unfillableOrder: false as boolean,
      batchFacilityId: '_NA_' as string,
      currentDateTime: '' as string,
      jobRunTime: '' as any,
      currentScheduledBatch: {} as any,
      orders: "",
      runTime: '' as any,
      runTimes: [] as any,
      isDateTimeModalOpen: false,
    }
  },
  computed: {
    ...mapGetters({
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      userProfile: "user/getUserProfile"
    }),
  },
  mounted() {
    // this.getCurrentBatch();
    this.generateRunTimes(this.runTime)
  },
  methods: {
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
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
    async updateJob() {
      let batchJobEnum = this.enumId;
      if (!batchJobEnum) {
        console.log('enter');
        const jobEnum: any = Object.values(this.jobEnums)?.find((job: any) => {
          return job.unfillable === this.unfillableOrder && job.facilityId === this.batchFacilityId
        });
        batchJobEnum = jobEnum.id
      }
      
      const job = this.getJob(batchJobEnum)?.find((job: any) => job.status === 'SERVICE_DRAFT');
      if (!job) {
        showToast(translate('Configuration missing'))
        return;
      }

      // return if job has missing data or error
      if (hasJobDataError(job)) return;

      console.log('run', this.runTime);
      
      if (this.runTime) {
        console.log('entered');
        
        job['runTime'] = this.runTime
      }

      job['jobStatus'] = 'EVERYDAY';
      job['jobName'] = this.jobName || this.currentDateTime;

      // if job runTime is not a valid date then making runTime as empty
      // if (job?.runTime && !isFutureDate(job?.runTime)) {
      //   job.runTime = ''
      // }
      console.log('end', job);
      
      // if (job?.status === 'SERVICE_DRAFT') {
      //   const jobCustomParameters = generateJobCustomParameters([], [], job.runtimeData)
      //   await this.store.dispatch('job/scheduleService', { job, jobCustomParameters })
      // } else if (job?.status === 'SERVICE_PENDING') {
      //   await this.store.dispatch('job/updateJob', job)
      // }
      this.closeModal()
    },
    updateCustomTime(event: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(event.detail.value);
      if (setTime > currTime) this.generateRunTimes(setTime)
      else showToast(translate("Provide a future date and time"))
    },
    // updateRunTime(ev: CustomEvent) {
    //   console.log('ev', ev)
    //   this.jobRunTime = handleDateTimeInput(ev['detail'].value)
    // },
    updateRunTime(event: CustomEvent) {
      console.log(event);
      const value = event.detail.value
      if (value != 'CUSTOM') this.generateRunTimes(value)
      else this.isDateTimeModalOpen = true
    },
    getCurrentDateTime() {
      return DateTime.now().setZone(this.userProfile.userTimeZone).toLocaleString(DateTime.DATETIME_MED);
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
  },
  setup() {
    const store = useStore();

    return {
      checkmarkDoneOutline,
      closeOutline,
      ticketOutline,
      timeOutline,
      timerOutline,
      warningOutline,
      store,
      DateTime,
      getNowTimestamp,
      isCustomRunTime
    };
  },
});
</script>