<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ $t("More jobs") }}</ion-card-title>
    </ion-card-header>
    <ion-list>
      <ion-item v-for="job in jobs" :key="job.jobId" @click="hasPermission(Actions.APP_JOB_UPDATE) && viewJobConfiguration(job)" detail button>
        <ion-label class="ion-text-wrap">{{ job.enumName || job.jobName }}</ion-label>
        <ion-label slot="end">{{ job.statusId === "SERVICE_PENDING" ? temporalExpr(job.tempExprId)?.description : $t('Disabled') }}</ion-label>
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
import { Actions, hasPermission } from '@/authorization'

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
  props: ["jobs"],
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
      job.status = job.statusId === 'SERVICE_DRAFT' ? 'SERVICE_DRAFT' : job.frequency;
      emitter.emit('viewJobConfiguration', {jobId: job.jobId, jobTitle: job.jobTitle, status: job.status, job});
    },
    getDate (runTime: any) {
      return DateTime.fromMillis(runTime).toLocaleString(DateTime.DATE_MED);
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      Actions,
      hasPermission,
      store,
      router
    }  
  }
});
</script>
