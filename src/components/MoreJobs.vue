<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ translate("More jobs") }}</ion-card-title>
    </ion-card-header>
    <ion-list>
      <ion-item v-for="job in jobs" :key="job.jobId" @click="viewJobConfiguration(job)" detail button>
        <ion-label class="ion-text-wrap">
          {{ job.enumName || job.jobName }}
          <p>{{ temporalExpr(job.tempExprId)?.description }}</p>
        </ion-label>
        <ion-label slot="end">{{ job.statusId === "SERVICE_PENDING" ? translate("Enabled") : translate("Disabled") }}</ion-label>
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
import { translate } from '@hotwax/dxp-components';

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
      temporalExpr: 'job/getTemporalExpr',
    })
  },
  methods: {
    async viewJobConfiguration(job: any) {
      job.title = job.enumName
      job.status = job.statusId === 'SERVICE_DRAFT' ? 'SERVICE_DRAFT' : job.frequency;
      emitter.emit('viewJobConfiguration', { jobId: job.jobId, status: job.status, job });
    },
    getDate (runTime: any) {
      return DateTime.fromMillis(runTime).toLocaleString(DateTime.DATE_MED);
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    return {
      store,
      router,
      translate
    }  
  }
});
</script>
