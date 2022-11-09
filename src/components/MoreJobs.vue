<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ $t("More jobs") }}</ion-card-title>
    </ion-card-header>
    <ion-list>
      <ion-item v-for="job in jobs" :key="job.jobId" @click="viewJobConfiguration(job)" detail button>
        <ion-label class="ion-text-wrap">{{ job.jobName }}</ion-label>
        <ion-label slot="end">{{ job.statusId === "SERVICE_PENDING" ? getDate(job.runTime) : getTemporalExpression(job.tempExprId) }}</ion-label>
      </ion-item>
    </ion-list>
  </ion-card>
</template>

<script lang="ts">
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import emitter from '@/event-bus';
import { useRouter } from 'vue-router'
import { DateTime } from 'luxon';

export default defineComponent({
  name: 'MoreJobs',
  components: {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonList
  },
  props: ["jobs", "jobEnums"],
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      temporalExpr: 'job/getTemporalExpr',
      getEnumName: 'job/getEnumName',
    })
  },
  methods: {
    async viewJobConfiguration(job: any) {
      job.jobTitle = this.getEnumName(job.systemJobEnumId)
      emitter.emit('viewJobConfiguration', {jobId: job.jobId, jobTitle: job.jobTitle, statusId: job.statusId, job});
    },
    getTemporalExpression(tempExprId: string) {
      return this.temporalExpr(tempExprId)?.description ? this.temporalExpr(tempExprId)?.description : this.$t('Disabled')
    },
    getDate (runTime: any) {
      return DateTime.fromMillis(runTime).toLocaleString(DateTime.DATE_MED);
    },
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
