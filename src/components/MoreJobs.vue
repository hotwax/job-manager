<template>
  <section>
    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ $t("More jobs") }}</ion-card-title>
      </ion-card-header>
      <ion-item v-for="job in moreJobs" :key="job" button @click="viewJobConfiguration(job)" detail>
        <ion-label class="ion-text-wrap">{{ job.jobName }}</ion-label>
        <ion-label slot="end">{{ getTemporalExpression('INVENTORY_SYS_JOB') }}</ion-label>
      </ion-item>
    </ion-card>
  </section>

  <aside class="desktop-only" v-if="isDesktop" v-show="currentJob">
    <JobConfiguration :title="title" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
  </aside>
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
import JobConfiguration from '@/components/JobConfiguration.vue'
import { isFutureDate, showToast, prepareRuntime } from '@/utils';
import emitter from '@/event-bus';
import { useRouter } from 'vue-router'
import { translate } from '@/i18n';

export default defineComponent({
  name: 'Inventory',
  components: {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    JobConfiguration
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      title: 'Hard sync',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
    }
  },
  props: ["moreJobs"],
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr'
    })
  },
  methods: {
    async viewJobConfiguration(job: any) {
      this.title = job.jobName
      this.currentJobStatus = job.tempExprId
      const id = Object.entries(this.jobEnums).find((enums) => enums[1] == job.systemJobEnumId) as any
      const appFreqType =  id && (Object.entries(this.jobFrequencyType).find((freq) => freq[0] == id[0]) as any)
      this.freqType = appFreqType ? appFreqType[1] : "default"
      await this.store.dispatch('job/updateCurrentJob', { job });
      if(!this.isDesktop && job?.jobId) {
        this.router.push({name: 'JobDetails', params: { title: this.title, jobId: job?.jobId, category: "inventory"}});
        return;
      }

      if (job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
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
