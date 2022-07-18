<template>
  <ion-header>
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
        <!-- "this.currentScheduledBatch?.unfillable === false" - Did this because ion-radio is not considering boolean -->
        <ion-radio :checked="this.currentScheduledBatch?.unfillable === false" slot="start" @click="unfillableOrder = false" color="secondary"/>
      </ion-item>
      <ion-item :disabled="currentBatch?.jobId">
        <ion-label>{{ $t('Unfillable orders') }}</ion-label>
        <!-- "this.currentScheduledBatch?.unfillable === false" - Did this because ion-radio is not considering boolean -->
        <ion-radio :checked="this.currentScheduledBatch?.unfillable === true" slot="start" @click="unfillableOrder = true" color="secondary"/>
      </ion-item>
    </ion-radio-group>
    <ion-item>
      <ion-label position="fixed">{{ $t("Schedule") }}</ion-label>
      <ion-datetime hour-cycle="h12" :value="currentBatch?.runTime ? getDateTime(currentBatch.runTime) : ''" @ionChange="updateRunTime($event)" presentation="time" size="cover" />
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
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { DateTime } from 'luxon';
import { handleDateTimeInput, isFutureDate } from '@/utils';
export default defineComponent({
  name: 'BatchModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonDatetime,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonRadio,
    IonRadioGroup,
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
      orders: ""
    }
  },
  computed: {
    ...mapGetters({
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore',
      userProfile: "user/getUserProfile"
    }),
  },
  mounted() {
    this.getCurrentBatch();
  },
  methods: {
    getCurrentBatch() {
      this.currentBatch = this.getJob(this.enumId)?.find((job: any) => job.id === this.id)
      this.jobName = this.currentBatch?.jobName;
      this.currentScheduledBatch = (this as any).jobEnums[this.currentBatch?.enumId];
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time).toISO()
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async updateJob() {
      let batchJobEnum = this.enumId;
      if (!batchJobEnum) {
        const jobEnum: any = Object.values(this.jobEnums)?.find((job: any) => {
          return job.unfillable === this.unfillableOrder && job.facilityId === this.batchFacilityId
        });
        batchJobEnum = jobEnum.id
      }

      const job = this.currentBatch ? this.currentBatch : this.getJob(batchJobEnum)?.find((job: any) => job.status === 'SERVICE_DRAFT');

      if (!job) {
        return;
      }

      if (this.jobRunTime) {
        job['runTime'] = this.jobRunTime
      }

      job['jobStatus'] = 'EVERYDAY';
      job['jobName'] = this.jobName || this.currentDateTime;

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }
      if (job?.status === 'SERVICE_DRAFT') {
        await this.store.dispatch('job/scheduleService', job)
        this.closeModal()
      } else if (job?.status === 'SERVICE_PENDING') {
        await this.store.dispatch('job/updateJob', job)
        this.closeModal()
      }
    },
    updateRunTime(ev: CustomEvent) {
      this.jobRunTime = handleDateTimeInput(ev['detail'].value)
    },
    getCurrentDateTime() {
      return DateTime.now().setZone(this.userProfile.userTimeZone).toLocaleString(DateTime.DATETIME_MED);
    },
  },
  setup() {
    const store = useStore();

    return {
      checkmarkDoneOutline,
      closeOutline,
      store
    };
  },
});
</script>