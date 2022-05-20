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
    <ion-item>
      <ion-label>{{ $t('Order queue') }}</ion-label>
      <ion-select slot="end" interface="popover" v-model="batchOrderId">
        <ion-select-option value="_NA_">{{ $t("Brokering queue") }}</ion-select-option>
        <ion-select-option value="PRE_ORDER_PARKING">{{ $t("Pre-order parking") }}</ion-select-option>
        <ion-select-option value="BACKORDER_PARKING">{{ $t("Back-order parking") }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-radio-group value="unfillableOrder">
      <ion-item>
        <ion-label>{{ $t('New orders') }}</ion-label>
        <ion-radio slot="start" @click="unfillableOrder = false" color="secondary" value="unfillableOrder" />
      </ion-item>
      <ion-item>
        <ion-label>{{ $t('Unfillable orders') }}</ion-label>
        <ion-radio slot="start" @click="unfillableOrder = true" color="secondary"/>
      </ion-item>
    </ion-radio-group>
    
    <ion-item>
      <ion-label position="fixed">{{ $t("Schedule") }}</ion-label>
      <ion-datetime :value="currentBatch?.runTime ? getDateTime(currentBatch.runTime) : ''" @ionChange="updateRunTime($event, currentBatch)" presentation="time" size="cover" />
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
import { isFutureDate } from '@/utils';
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
  props: ["id", "enum"],
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      currentBatch: {} as any,
      jobName: '' as string,
      unfillableOrder: false as boolean,
      batchOrderId: '_NA_' as string,
      currentDateTime: '' as string,
    }
  },
  computed: {
    ...mapGetters({
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore'
    })
  },
  mounted() {
    this.getCurrentBatch();
  },
  methods: {
    getCurrentBatch() {
      this.currentBatch = this.getJob(this.enum)?.find((job: any) => job.id === this.id)
      this.jobName = this.currentBatch?.jobName
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time)
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async updateJob() {
      let batchJobEnum = this.enum;
      
      if (!batchJobEnum) {
        const jobEnum: any = Object.values(this.jobEnums)?.find((job: any) => { 
          return job.unfillable === this.unfillableOrder && job.facilityId === this.batchOrderId
        });
        batchJobEnum = jobEnum.id
      }

      const job = this.currentBatch ? this.currentBatch : this.getJob(batchJobEnum)?.find((job: any) => job.status === 'SERVICE_DRAFT');

      if (!job) {
        return;
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
    updateRunTime(ev: CustomEvent, batch: any) {
      if(batch) {
        batch['runTime'] = DateTime.fromISO(ev['detail'].value).toMillis()
      }
    },
    getCurrentDateTime() {
      return DateTime.now().toLocaleString(DateTime.DATETIME_MED);
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