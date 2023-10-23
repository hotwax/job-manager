<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Brokering") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-button expand="block" :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" @click="addBatch()" >{{ 'Create new brokering job' }}</ion-button>

          <ion-item lines="none">
            <ion-label>
              <h1>{{ 'Scheduled Job' }}</h1>
            </ion-label>
          </ion-item>

          <ion-card>
            <ion-item @click="viewJobConfiguration({ id: 'REJ_ORDR', status: getJobStatus(jobEnums['REJ_ORDR'])})" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Rejected orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('REJ_ORDR') }}</ion-label>
            </ion-item>
          </ion-card>

          <ion-card :button="isDesktop" v-for="batch in orderBatchJobs" :key="batch?.id" detail v-show="batch?.status === 'SERVICE_PENDING'" @click="hasPermission(Actions.APP_JOB_UPDATE) && viewJobConfiguration({ id: batch.enumId, job: batch })">
            <ion-card-header>
              <div>
                <ion-card-subtitle>{{ getBrokerQueue(batch) }}</ion-card-subtitle>
                <ion-card-title>{{ batch?.jobName }}</ion-card-title>
              </div>
              <ion-badge class="ion-margin-start" color="dark" >{{ timeFromNow(batch?.runTime) }}</ion-badge>
            </ion-card-header>

            <ion-list>
              <ion-item lines="none">
                <ion-label class="ion-text-wrap">{{ batch?.temporalExpression?.description }}</ion-label>
                <ion-label slot="end">{{  batch?.runTime ? getTime(batch.runTime) : "-" }}</ion-label>
              </ion-item>
  
              <ion-item lines="none">
                <ion-text class="ion-text-wrap">{{ $t("Unfillable orders") }}</ion-text>
                <ion-toggle disabled :checked="batchJobEnums[batch?.enumId].unfillable" slot="end"/>
              </ion-item>
  
              <ion-item lines="none" v-if="generateCustomParameters(batch).length">
                <ion-row>
                  <ion-chip outline :key="name" v-for="(value, name) in generateCustomParameters(batch)">
                    {{ name }}: {{ value }}
                  </ion-chip>
                </ion-row>
              </ion-item>
            </ion-list>
          </ion-card>
          <MoreJobs v-if="getMoreJobs({...jobEnums, ...initialLoadJobEnums}, enumTypeId).length" :jobs="getMoreJobs({...jobEnums, ...initialLoadJobEnums}, enumTypeId)" />
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob">
          <JobConfiguration :type="freqType" :key="currentJob" isBrokerJob="true"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonRow,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  isPlatform,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { addCircleOutline, arrowRedoOutline, trashOutline } from 'ionicons/icons';
import BatchModal from '@/components/BatchModal.vue';
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import { DateTime } from 'luxon';
import { generateJobCustomOptions, generateJobCustomParameters, isFutureDate } from '@/utils';
import emitter from '@/event-bus';
import MoreJobs from '@/components/MoreJobs.vue';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'Brokering',
  components: {
    IonBadge,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonChip,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonMenuButton,
    IonPage,
    IonRow,
    IonText,
    IonTitle,
    IonToggle,
    IonToolbar,
    JobConfiguration,
    MoreJobs
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_BROKER_JOB_ENUMS as string) as any,
      batchJobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      enumTypeId: 'BROKER_SYS_JOB',
      initialLoadJobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      orderBatchJobs: "job/getOrderBatchJobs",
      getTemporalExpr: 'job/getTemporalExpr',
      getMoreJobs: 'job/getMoreJobs'
    }),
  },
  methods: {
    async addBatch() {
      const batchmodal = await modalController.create({
        component: BatchModal,
        breakpoints: [0, 0.25, 0.5, 0.75, 1],
        initialBreakpoint: 1
      });
      return batchmodal.present();
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toFormat('hh:mm a');
    },
    getBrokerQueue(job: any){
      if(job.status === 'SERVICE_PENDING'){
        const brokerQueueId = this.batchJobEnums[job?.enumId].id
        
        if(brokerQueueId === "_NA_"){
          return "Brokering queue"
        }else if(brokerQueueId === "PRE_ORDER_PARKING"){
          return "Pre-order parking"
        }else{
          return "Back-order parking"
        }
      }
    },
    async viewJobConfiguration(jobInformation: any) {
      this.currentJob = jobInformation.job || this.getJob(this.jobEnums[jobInformation.id])
      this.currentJobStatus = jobInformation.status
      this.freqType = jobInformation.id && this.jobFrequencyType[jobInformation.id]

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isFutureDate(this.currentJob?.runTime)) {
        this.currentJob.runTime = ''
      }

      await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob });
      if(!this.isDesktop && this.currentJob) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentJob.jobId, category: "orders" } });
        return;
      }
      if (this.currentJob && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    getTemporalExpression(enumId: string) {
      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ?
        this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description :
        this.$t('Disabled')
    },
    async fetchJobs(){
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          // If we fetch broker sys job by not passing systemJobEnumId filter then this api
          // call will fetch all the broker jobs which includes batch jobs also and will cause an error (jobs is not iterable) 
          // in getBatchJobs getters as jobs will be stored as objects in state
          "systemJobEnumId": Object.values(this.batchJobEnums).map((jobEnum: any) => jobEnum.id),
          "systemJobEnumId_op": "not-in",
          "enumTypeId": "BROKER_SYS_JOB"
        }
      });
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          "systemJobEnumId": Object.values(this.batchJobEnums).map((jobEnum: any) => jobEnum.id),
          "systemJobEnumId_op": "in"
        }
      });
    },
    timeFromNow (time: any) {
      if(time){
        const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
        return DateTime.local().plus(timeDiff).toRelative();
      }
    },
    generateCustomParameters(job: any) {
      let customOptionalParameters = generateJobCustomOptions(job).optionalParameters;
      let customRequiredParameters = generateJobCustomOptions(job).requiredParameters;
      
      // passing runTimeData params as empty, as we don't need to show the runTimeData information on UI
      return generateJobCustomParameters(customRequiredParameters, customOptionalParameters, {})
    }
  },
  mounted () {
    this.fetchJobs();
    emitter.on("productStoreOrConfigChanged", this.fetchJobs);
    emitter.on('viewJobConfiguration', this.viewJobConfiguration)
  },
  unmounted() {
    emitter.off("productStoreOrConfigChanged", this.fetchJobs);
    emitter.off('viewJobConfiguration', this.viewJobConfiguration)
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      hasPermission,
      addCircleOutline,
      arrowRedoOutline,
      router,
      store,
      trashOutline,
    };
  },
});
</script>

<style scoped>
ion-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>