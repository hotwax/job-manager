<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ currentBatch?.jobName ? currentBatch?.jobName : $t('New Batch') }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-item>
      <ion-label position="fixed">Batch name</ion-label>
      <ion-input placeholder="Batch 2" />
    </ion-item>
    <ion-item>
      <ion-label position="fixed">{{ $t("Schedule") }}</ion-label>
      <ion-datetime :value="currentBatch?.runTime ? getDateTime(currentBatch.runTime) : ''" @ionChange="updateRunTime($event, currentBatch)" display-format="MM/DD/YYYY" placeholder="date picker" />
    </ion-item>    

    <ion-fab vertical="bottom" horizontal="end" slot="fixed" @click="updateJob()">
      <ion-fab-button>
        <ion-icon :icon="checkmarkDoneOutline" />  
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script lang="ts">
import {
  IonButtons,
  IonButton,
  IonContent,
  IonDatetime,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { closeOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { mapGetters, useStore } from 'vuex';
import { DateTime } from 'luxon';
export default defineComponent({
  name: 'BatchModal',
  components: {
    IonButtons,
    IonButton,
    IonContent,
    IonDatetime,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonTitle,
    IonToolbar,
  },
  props: ["id", "enum"],
  data() {
    return {
      currentBatch: {} as any
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
    this.getCurrentBatchInfo();
  },
  methods: {
    getCurrentBatchInfo() {
      this.currentBatch = this.getJob(this.enum)?.find((job: any) => job.id === this.id)
    },
    getDateTime(time: any) {
      return DateTime.fromMillis(time)
    },
    closeModal() {
      modalController.dismiss({ dismissed: true });
    },
    async updateJob() {
      const job = this.currentBatch ? this.currentBatch : this.getJob(this.enum)?.find((job: any) => job.status === 'SERVICE_DRAFT');

      if (!job) {
        return;
      }

      // TODO: check for parentJobId and jobEnum and handle this values properly
      const payload = {
        'systemJobEnumId': job.systemJobEnumId,
        'statusId': "SERVICE_PENDING",
        'recurrenceTimeZone': DateTime.now().zoneName
      } as any
      if (job?.status === 'SERVICE_DRAFT') {
        payload['JOB_NAME'] = job.jobName
        payload['SERVICE_NAME'] = job.serviceName
        payload['SERVICE_TIME'] = job.runTime ? job.runTime.toString() : ''
        payload['SERVICE_PRIORITY'] = job.priority ? job.priority.toString() : ''
        payload['SERVICE_COUNT'] = '0'
        payload['jobFields'] = {
          'productStoreId': this.currentEComStore.productStoreId,
          'systemJobEnumId': job.systemJobEnumId,
          'tempExprId': 'MIDNIGHT_DAILY',
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
        payload['tempExprId'] = 'MIDNIGHT_DAILY'
        payload['jobId'] = job.id
        payload['runTime'] = job.runTime

        this.store.dispatch('job/updateJob', payload)
      }
    },
    updateRunTime(ev: CustomEvent, batch: any) {
      batch['runTime'] = DateTime.fromISO(ev['detail'].value).toMillis()
    }
  },
  setup() {
    const store = useStore();

    return {
      closeOutline,
      checkmarkDoneOutline,
      store
    };
  },
});
</script>