<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Job details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <JobConfiguration :title="title" :job="currentJob" :status="currentJob?.status === 'SERVICE_DRAFT' ? currentJob?.status : currentJob?.tempExprId" :type="freqType" :key="currentJob"/>
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
import { mapGetters } from "vuex";
import { useStore } from '@/store';
export default defineComponent({
  name: 'JobDetails',
  components: {
    IonBackButton,
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    JobConfiguration
  },
  data() {
    return {
      title: '' as any,
      type: '' as any,
      freqType: '' as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      jobTitles: {
        ...JSON.parse(process.env?.VUE_APP_PRD_JOB_TITLES as string) as any,
        ...JSON.parse(process.env?.VUE_APP_ODR_JOB_TITLES as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INV_JOB_TITLES as string) as any
      },
      jobEnums: {
        ...JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      },
      jobIds: {
        ...JSON.parse(process.env?.VUE_APP_PRD_JOB_IDS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_ODR_JOB_IDS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INV_JOB_IDS as string) as any,
      }
    }
  },
  computed:{
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
      getEnumName: 'job/getEnumName'
    }),
  },
  methods: {
    viewJobConfiguration(job: any) {
      const jobCategory = this.$route.params.category;
      if(jobCategory !== 'pipeline') {
        this.title = this.jobTitles[job?.systemJobEnumId];
        const id = this.jobIds[job?.systemJobEnumId];
        this.freqType = id && this.jobFrequencyType[id];
      } else {
        this.title = this.getEnumName(job.systemJobEnumId);
        const id = Object.entries(this.jobEnums).find((enums) => enums[1] == job.systemJobEnumId) as any;
        this.freqType = id && (Object.entries(this.jobFrequencyType).find((freq) => freq[0] == id[0]) as any)[1];
      }
    }
  },
  mounted() {
    this.store.dispatch('job/getCurrentJob', { jobId: this.$route.params.jobId }).then((job: any) => {
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