<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ $t("More jobs") }}</ion-card-title>
    </ion-card-header>
    <ion-item v-for="job in moreJobs" :key="job.jobId" @click="viewJobConfiguration(job)" detail button>
      <ion-label class="ion-text-wrap">{{ job.jobName }}</ion-label>
      <ion-label slot="end">{{ getTemporalExpression(job.enumTypeId) }}</ion-label>
    </ion-item>
  </ion-card>
</template>

<script lang="ts">
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import emitter from '@/event-bus';
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'Inventory',
  components: {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
      title: '',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop')
    }
  },
  props: ["moreJobs"],
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr',
      getEnumName: 'job/getEnumName',
    })
  },
  methods: {
    async viewJobConfiguration(job: any) {
      job.enumName = job.enumName || this.getEnumName(job.systemJobEnumId)
      emitter.emit('showJobConfigurationForMoreJobs', {jobId: job.jobId, jobTitle: this.title, jobStatus: job.status, job: job});
      return;
    },
    getTemporalExpression(enumId: string) {
      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ?
        this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description :
        this.$t('Disabled')
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.jobEnums),
        "systemJobEnumId_op": "in"
      }
    });
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      store,
      router
    }  
  }
});
</script>
