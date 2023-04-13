<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button :default-href="'/' + jobCategory" slot="start" />
        <ion-title>{{ $t("Job details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <InitialJobConfiguration v-if="jobCategory === 'initial-load'" :type='type' :shopifyOrderId='lastShopifyOrderId' :key="currentJob" />
      <JobConfiguration v-else :status="currentJob?.status === 'SERVICE_DRAFT' ? currentJob?.status : currentJob?.tempExprId" :type="freqType" :key="currentJob"/>
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
import { useStore, mapGetters } from "vuex";
import { isFutureDate } from '@/utils';

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
    InitialJobConfiguration
  },
  data() {
    return {
      type: '' as any,
      freqType: '' as any,
      jobCategory: '' as any,
      lastShopifyOrderId: '' as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      jobTitles: {
        ...JSON.parse(process.env?.VUE_APP_JOB_TITLES as string) as any
      },
      jobEnums: {
        ...JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      },
      jobTypes: JSON.parse(process.env.VUE_APP_INITIAL_JOB_TYPES as string) as any,
    }
  },
  computed:{
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
      getEnumName: 'job/getEnumName'
    }),
  },
  methods: {
    async viewJobConfiguration(job: any) {
      this.jobCategory = this.$route.params.category;

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
  mounted() {
    this.store.dispatch('job/updateCurrentJob', { jobId: this.$route.params.jobId }).then((job: any) => {
      if(job?.jobId) {
        this.viewJobConfiguration(job);
      }
    })
  },
  setup() {
    const store = useStore();

    return {
      store
    }
  }
});
</script>