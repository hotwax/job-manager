<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button :default-href="'/' + jobCategory" slot="start" />
        <ion-title>{{ translate("Job details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <InitialJobConfiguration v-if="jobCategory === 'initial-load'" :type='type' :shopifyOrderId='lastShopifyOrderId' :key="currentJob" />
      <MaargJobConfiguration v-else-if="isMaargJob && Object.keys(currentMaargJob).length" :key="currentMaargJob" />
      <JobConfiguration v-else :status="currentJob?.status === 'SERVICE_DRAFT' ? currentJob?.status : currentJob?.tempExprId" :type="freqType" :key="currentJob" :historyJobConfig="checkJobStatus(currentJob?.statusId)"/>

    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonBackButton,  
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import JobConfiguration from '@/components/JobConfiguration.vue';
import InitialJobConfiguration from '@/components/InitialJobConfiguration.vue';
import MaargJobConfiguration from '@/components/MaargJobConfiguration.vue';
import { useStore, mapGetters } from "vuex";
import { isFutureDate } from '@/utils';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'JobDetails',
  components: {
    IonBackButton,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    JobConfiguration,
    InitialJobConfiguration,
    MaargJobConfiguration
  },
  data() {
    return {
      type: '' as any,
      freqType: '' as any,
      jobCategory: '' as any,
      lastShopifyOrderId: '' as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      jobEnums: {
        ...JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      },
      jobTypes: JSON.parse(process.env.VUE_APP_INITIAL_JOB_TYPES as string) as any,
      isMaargJob: false
    }
  },
  computed:{
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
      currentMaargJob: 'maargJob/getCurrentMaargJob'
    }),
  },
  methods: {
    async viewJobConfiguration(job: any) {
      const category = this.$route.params.category as any
      this.jobCategory = this.isMaargJob ? category?.replace("-maarg","") : this.$route.params.category;

      if(!this.isMaargJob) {
        if(this.jobCategory === 'initial-load') {
          this.type = this.jobTypes[this.currentJob?.systemJobEnumId];
          if(job?.runtimeData?.sinceId?.length >= 0) {
            this.lastShopifyOrderId = job.runtimeData.sinceId !== 'null' ? job.runtimeData.sinceId : ''
          }
  
          // if job runTime is not a valid date then assigning current date to the runTime
          if (job?.runTime && !isFutureDate(job?.runTime)) {
            job.runTime = ''
            this.store.dispatch('job/updateCurrentJob', { job });
          }
        } else if(this.jobCategory !== 'pipeline') {
          const id = Object.keys(this.jobEnums).find((id: any) => this.jobEnums[id] === job.systemJobEnumId)
          this.freqType = id && this.jobFrequencyType[id];
        } else {
          const id = Object.keys(this.jobEnums).find((id: any) => this.jobEnums[id] === job.systemJobEnumId)
          const jobFreqTypeId = (Object.keys(this.jobFrequencyType).find((enumId: any) => enumId === id)) as any;
          this.freqType = (id && jobFreqTypeId) && this.jobFrequencyType[jobFreqTypeId];
        }
      }
    },
    checkJobStatus(statusId: string) {
      const statuses = ["SERVICE_CANCELLED", "SERVICE_CRASHED", "SERVICE_FAILED", "SERVICE_FINISHED", "SERVICE_RUNNING", "SERVICE_QUEUED"];
      return statuses.includes(statusId);
    }
  },
  mounted() {
    this.isMaargJob = this.$route.params.category.includes("maarg")
    this.store.dispatch(this.isMaargJob ? 'maargJob/updateCurrentMaargJob' : 'job/updateCurrentJob', { jobId: this.$route.params.jobId }).then((job: any) => {
      if(job?.jobId || job?.jobName) {
        this.viewJobConfiguration(job);
      }
    })
  },
  async ionViewWillLeave() {
    await this.store.dispatch("maargJob/clearCurrentMaargJob");
  },
  setup() {
    const store = useStore();

    return {
      store,
      translate
    }
  }
});
</script>