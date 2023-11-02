<template>
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
      <ion-select slot="end" interface="popover" :value="batchFacilityId" @ionChange="batchFacilityId = $event['detail'].value; updateCustomParameters()">
        <ion-select-option value="_NA_">{{ $t("Brokering queue") }}</ion-select-option>
        <ion-select-option value="PRE_ORDER_PARKING">{{ $t("Pre-order parking") }}</ion-select-option>
        <ion-select-option value="BACKORDER_PARKING">{{ $t("Back-order parking") }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item>
      <ion-icon slot="start" :icon="warningOutline" />
      <ion-label>{{ $t('Unfillable orders') }}</ion-label>
      <ion-toggle slot="end" :checked="unfillableOrder" @ionChange="unfillableOrder = !unfillableOrder; updateCustomParameters()" />
    </ion-item>

    <ion-list v-if="customOptionalParameters.length || customRequiredParameters.length">
      <ion-item lines="none">
        <ion-label>{{ $t('More parameters') }}</ion-label>
      </ion-item>

      <ion-item-divider v-if="customRequiredParameters.length" color="light">
        <ion-label>{{ $t('Required Parameters') }}</ion-label>
      </ion-item-divider>

      <ion-item :key="index" v-for="(parameter, index) in customRequiredParameters">
        <ion-label>{{ parameter.name }}</ion-label>
        <ion-input :placeholder="parameter.value ? parameter.value : parameter.name" v-model="parameter.value" />
        <ion-note slot="helper">{{ parameter.type }}</ion-note>
      </ion-item>

      <ion-item-divider v-if="customOptionalParameters.length" color="light">
        <ion-label>{{ $t('Optional Parameters') }}</ion-label>
      </ion-item-divider>

      <ion-item :key="index" v-for="(parameter, index) in customOptionalParameters">
        <ion-label>{{ parameter.name }}</ion-label>
        <ion-input :placeholder="parameter.value ? parameter.value : parameter.name" v-model="parameter.value"/>
        <ion-note slot="helper">{{ parameter.type }}</ion-note>
      </ion-item>
    </ion-list>
    <ion-list v-else>
      <ion-item>
        <ion-label>{{ $t('No parameters available') }}</ion-label>
      </ion-item>
    </ion-list>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ $t('Schedule') }}</ion-card-title>
      </ion-card-header>

      <ion-item>
        <ion-icon slot="start" :icon="timeOutline" />
        <ion-label>{{ $t('Run time') }}</ion-label>
        <ion-select interface="popover" :placeholder="$t('Select')" :value="runTime" @ionChange="updateRunTime($event)">
          <ion-select-option v-for="runTime in runTimes" :key="runTime.value" :value="runTime.value">{{ $t(runTime.label) }}</ion-select-option>
        </ion-select>

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
      <ion-item lines="none">
        <ion-icon slot="start" :icon="timerOutline" />
        <ion-label>{{ $t('Frequency') }}</ion-label>
        <ion-select :value="jobStatus" :interface-options="{ header: $t('Frequency') }" interface="popover" :placeholder="$t('Disabled')" @ionChange="jobStatus = $event.detail.value" @ionDismiss="jobStatus == 'CUSTOM' && setCustomFrequency()">
          <ion-select-option v-for="freq in frequencyOptions" :key="freq.id" :value="freq.id">{{ freq.description }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card>
  </ion-content>
  <ion-fab :disabled="!hasPermission(Actions.APP_JOB_UPDATE) || isRequiredParametersMissing"  @click="updateJob()" vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button>
      <ion-icon :icon="checkmarkDoneOutline" />  
    </ion-fab-button>
  </ion-fab>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonDatetime,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, checkmarkDoneOutline, ticketOutline, timeOutline, timerOutline, warningOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { DateTime } from 'luxon';
import { handleDateTimeInput, generateAllowedFrequencies, generateAllowedRunTimes, generateJobCustomParameters, generateJobCustomOptions, getNowTimestamp, hasJobDataError, isCustomRunTime, isFutureDate, showToast } from '@/utils';
import { translate } from '@/i18n'
import CustomFrequencyModal from '@/components/CustomFrequencyModal.vue';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'BatchModal',
  components: {
    IonButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonDatetime,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonList,
    IonModal,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      currentBatch: {} as any,
      jobName: '' as string,
      unfillableOrder: false as boolean,
      batchFacilityId: '_NA_' as string,
      currentDateTime: '' as string,
      runTime: '' as any,
      runTimes: [] as any,
      isDateTimeModalOpen: false,
      jobStatus: null,
      frequencyOptions: [] as any,
      customOptionalParameters: [] as any,
      customRequiredParameters: [] as any
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
    this.generateRunTimes(this.runTime)
    this.generateFrequencyOptions(this.jobStatus)
    this.updateCustomParameters()
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
      if(currentRunTime || currentRunTime === 0 ) {
        selectedRunTime = runTimes.some((runTime: any) => runTime.value === currentRunTime)
        if(!selectedRunTime) runTimes.push({ label: this.getTime(currentRunTime), value: currentRunTime })
      }
      this.runTime = currentRunTime
      this.runTimes = runTimes
    },
    async generateFrequencyOptions(currentFrequency?: any) {
      const frequencyOptions = JSON.parse(JSON.stringify(generateAllowedFrequencies()));
      if(hasPermission(Actions.APP_CUSTOM_FREQ_VIEW)) frequencyOptions.push({ "id": "CUSTOM", "description": "Custom" })
      if(currentFrequency) {
        const selectedFrequency = frequencyOptions.find((frequency: any) => frequency.id === currentFrequency);
        if(!selectedFrequency ) {
          const frequencies = await this.store.dispatch("job/fetchTemporalExpression", [ currentFrequency ]);
          const frequency = frequencies[currentFrequency];
          frequency && (frequencyOptions.push({ "id": frequency.tempExprId,  "description": frequency.description }))
        }
      }
      this.frequencyOptions = frequencyOptions;
      this.jobStatus = currentFrequency;
    },
    async updateJob() {
      const jobEnum: any = Object.values(this.jobEnums)?.find((job: any) => job.unfillable === this.unfillableOrder && job.facilityId === this.batchFacilityId);

      const job = this.getJob(jobEnum.id)?.find((job: any) => job.status === 'SERVICE_DRAFT');
      if(!job) {
        showToast(translate('Configuration missing'))
        return;
      }

      // return if job has missing data or error
      if(hasJobDataError(job)) return;

      job.runTime = this.runTime != 0 ? (!isCustomRunTime(this.runTime) ? DateTime.now().toMillis() + this.runTime : this.runTime) : ''

      // if job runTime is not a valid date then making runTime as empty
      if(job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      job['jobStatus'] = this.jobStatus ? this.jobStatus : 'HOURLY';
      job['jobName'] = this.jobName || this.currentDateTime;

      const jobCustomParameters = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, job.runtimeData)

      await this.store.dispatch('job/scheduleService', { job, jobCustomParameters })
      this.closeModal()
    },
    async setCustomFrequency() {
      const customFrequencyModal = await modalController.create({
        component: CustomFrequencyModal,
      });
      customFrequencyModal.onDidDismiss()
        .then((result) => {
          let jobStatus = result.data.frequencyId;
          this.generateFrequencyOptions(jobStatus);
        });
      return customFrequencyModal.present();
    },
    updateCustomTime(event: CustomEvent) {
      const currTime = DateTime.now().toMillis();
      const setTime = handleDateTimeInput(event.detail.value);
      if(setTime > currTime) this.generateRunTimes(setTime)
      else showToast(translate("Provide a future date and time"))
    },
    updateCustomParameters() {
      const jobEnum: any = Object.values(this.jobEnums)?.find((job: any) => job.unfillable === this.unfillableOrder && job.facilityId === this.batchFacilityId);

      const job = this.getJob(jobEnum.id)?.find((job: any) => job.status === 'SERVICE_DRAFT');
      this.customOptionalParameters = generateJobCustomOptions(job).optionalParameters;
      this.customRequiredParameters = generateJobCustomOptions(job).requiredParameters;
    },
    updateRunTime(event: CustomEvent) {
      const value = event.detail.value
      if(value != 'CUSTOM') this.generateRunTimes(value)
      else this.isDateTimeModalOpen = true
    },
    getCurrentDateTime() {
      return DateTime.now().setZone(this.userProfile.userTimeZone).toLocaleString(DateTime.DATETIME_MED);
    },
    getTime(time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    isRequiredParametersMissing() {
      return this.customRequiredParameters.some((parameter: any) => !parameter.value?.trim())
    }
  },
  setup() {
    const store = useStore();

    return {
      checkmarkDoneOutline,
      closeOutline,
      getNowTimestamp,
      hasPermission,
      isCustomRunTime,
      store,
      ticketOutline,
      timeOutline,
      timerOutline,
      warningOutline,
      Actions,
      DateTime
    };
  },
});
</script>

<style>
ion-modal.date-time-modal {
  --width: 290px;
  --height: 440px;
  --border-radius: 8px;
}
</style>