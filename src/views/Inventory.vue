<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Inventory") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Adjustments") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Dynamic inventory") }}</ion-label>
              <ion-toggle :checked="realTimeWebhooks" color="secondary" slot="end" @ionChange="updateJob($event['detail'].checked, this.jobEnums['DYN_INV'])"/>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Realtime adjustments allow HotWax Commerce to push new inventory to Shopify in realtime. These events include receiving , cycle counts, variances, and return.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("BOPIS corrections") }}</ion-label>
              <ion-toggle :checked="bopisCorrections" color="secondary" slot="end" @ionChange="updateJob($event['detail'].checked, this.jobEnums['BOPIS_CORRECTION'])" />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("When using HotWax BOPIS, Shopify isn't aware of the actual inventory consumed. HotWax will automatically restore inventory automatically reduced by Shopify and deduct inventory from the correct store to maintain inventory accuracy.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item button @click="viewJobConfiguration(jobEnums['HARD_SYNC'], 'Hard sync', getJobStatus(this.jobEnums['HARD_SYNC']))" detail>
              <ion-label>{{ $t("Hard sync") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('HARD_SYNC') }}</ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Performing a hard sync from HotWax Commerce to Shopify is useful for eliminating any discrepencies.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only" v-show="currentJob">
          <JobDetail :title="title" :job="currentJob" :status="currentJobStatus" type="slow" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import JobDetail from '@/components/JobDetail.vue'
import { DateTime } from 'luxon';

export default defineComponent({
  name: 'Inventory',
  components: {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
    JobDetail
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
      currentJob: '',
      title: '',
      currentJobStatus: ''
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr'
    }),
    realTimeWebhooks(): boolean {
      const status = this.getJobStatus(this.jobEnums["REAL_WBHKS"]);
      return status && status !== "SERVICE_DRAFT";
    },
    bopisCorrections(): boolean {
      const status = this.getJobStatus(this.jobEnums["BOPIS_CORRECTION"]);
      return status && status !== "SERVICE_DRAFT";
    },
    realtimeAdjustments(): boolean {
      const status = this.getJobStatus(this.jobEnums["REALTIME_ADJUSTMENTS"]);
      return status && status !== "SERVICE_DRAFT";
    },
    realtimePOSSales(): boolean {
      const status = this.getJobStatus(this.jobEnums["REAL_TIME_POS_SALES"]);
      return status && status !== "SERVICE_DRAFT";
    },
    reserveForCompletedOrders(): boolean {
      const status = this.getJobStatus(this.jobEnums["RSV_CMPLT_ORDRS"]);
      return status && status !== "SERVICE_DRAFT";
    }
  },
  methods: {
    async updateJob(checked: boolean, id: string) {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (checked && job?.status === 'SERVICE_PENDING') {
        return;
      }

      // TODO: check for parentJobId and jobEnum and handle this values properly
      const payload = {
        'jobId': job.jobId,
        'systemJobEnumId': id,
        'statusId': checked ? "SERVICE_PENDING" : "SERVICE_CANCELLED",
        'timeZone': DateTime.now().zoneName
      } as any
      if (!checked) {
        this.store.dispatch('job/updateJob', payload)
      } else if (job?.status === 'SERVICE_DRAFT') {
        payload['JOB_NAME'] = job.jobName
        payload['SERVICE_NAME'] = job.serviceName
        payload['SERVICE_TIME'] = job.runTime.toString()
        payload['SERVICE_COUNT'] = '0'
        payload['jobFields'] = {
          'productStoreId': this.currentEComStore.productStoreId,
          'systemJobEnumId': job.systemJobEnumId,
          'tempExprId': 'DAILY',
          'maxRecurrenceCount': '-1',
          'parentJobId': job.parentJobId,
          'runAsUser': 'system', // default system, but empty in run now
          'recurrenceTimeZone': ''
        }
        payload['shopifyConfigId'] = this.shopifyConfigId

        // checking if the runTimeData has productStoreId, and if present then adding it on root level
        job?.runTimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = this.currentEComStore.productStoreId)

        this.store.dispatch('job/scheduleService', {...job.runTimeData, ...payload})
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = 'DAILY'
        payload['jobId'] = job.id

        this.store.dispatch('job/updateJob', payload)
      }
    },
    viewJobConfiguration(enumId: string, title: string, status: string) {
      this.currentJob = this.getJob(enumId)
      this.title = title
      this.currentJobStatus = status
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
    return {
      store
    }  
  }
});
</script>
