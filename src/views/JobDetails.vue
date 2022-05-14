<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/" slot="start" />
        <ion-title>{{ $t("Job details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <InitialLoadJobModal v-if="jobCategory === 'initial-load'" :job="currentJob" :type='jobType' :shopifyOrderId='lastShopifyOrderId' :key="currentJob" />
      <JobConfiguration v-else />
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
import InitialLoadJobModal from '@/components/InitialLoadJobModal.vue';
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
    InitialLoadJobModal
  },
  data() {
    return {
      jobType: '' as any,
      jobCategory: '' as any,
      lastShopifyOrderId: '' as any,
      jobTypes: JSON.parse(process.env.VUE_APP_INITIAL_JOB_TYPES as string) as any,
      jobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any
    }
  },
  computed:{
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
    }),
  },
  methods: {
    viewJobConfiguration(job: any) {
      this.jobCategory = this.$route.params.category;
      if(this.jobCategory === 'initial-load') {
        this.jobType = this.jobTypes[this.currentJob?.systemJobEnumId];
        
        if(job?.runtimeData?.sinceId?.length >= 0) {
          this.lastShopifyOrderId = job.runtimeData.sinceId !== 'null' ? job.runtimeData.sinceId : ''
        }
        // if job runTime is not a valid date then assigning current date to the runTime
        if (job?.runTime && !isFutureDate(job?.runTime)) {
          job.runTime = ''
        }
      }
    }
  },
  mounted() {
    this.store.dispatch('job/getCurrentJob', { jobId: this.$route.params.jobId }).then((job: any) => {
      if(job?.jobId) {
        this.viewJobConfiguration(job);
      }
    });
  },
  setup() {
    const store = useStore();
    return {
      store
    }
  }
});
</script>