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
      <ion-label position="fixed">{{ $t('Batch name') }}</ion-label>
      <ion-input :placeholder="$t('New Batch')" v-model="jobName" />
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
import { isFutureDate } from '@/utils';
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
      currentBatch: {} as any,
      jobName: '' as string
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
      const job = this.currentBatch ? this.currentBatch : this.getJob(this.enum)?.find((job: any) => job.status === 'SERVICE_DRAFT');

      if (!job) {
        return;
      }

      job['jobStatus'] = 'EVERYDAY';
      job['jobName'] = this.jobName

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