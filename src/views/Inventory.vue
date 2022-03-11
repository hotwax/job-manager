<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ $t("Inventory") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-item>
            <ion-label>{{ $t("Realtime webhooks") }}</ion-label>
            <ion-toggle :checked="realTimeWebhooks" color="secondary" slot="end" @click="updateJob($event['detail'].value, this.jobEnums[''])"/>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Hard sync") }}</ion-label>
            <InventoryPopover :id="jobEnums['TEST_JOB']"/>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Performing a hard sync from Shopify to HotWax Commerce is useful for eliminating any discrepencies that may build up from unreliable webhooks.") }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("BOPIS corrections") }}</ion-label>
            <ion-toggle :checked="bopisCorrections" color="secondary" slot="end" @click="updateJob($event['detail'].value, this.jobEnums['BOPIS_CORRECTION'])" />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("When using HotWax BOPIS, Shopify isn't aware of the actual inventory consumed. HotWax will automatically restore inventory automatically reduced by Shopify and deduct inventory from the correct store to maintain inventory accuracy.") }}</p>
            </ion-label>
          </ion-item>
        </ion-card>

        <ion-card>
          <ion-item>
            <ion-label>{{ $t("Realtime adjustments") }}</ion-label>
            <ion-toggle :checked="realtimeAdjustments" color="secondary" slot="end" @click="updateJob($event['detail'].value, this.jobEnums['REALTIME_ADJUSTMENTS'])" />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Realtime adjustments allow HotWax Commerce to push new inventory to Shopify in realtime. These events include receiving , cycle counts, variances, and return.") }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>{{ $t("Hard sync") }}</ion-label>
            <InventoryPopover :id="jobEnums['HRD_SYC']"/>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Performing a hard sync from Shopify to HotWax Commerce is useful for eliminating any discrepencies.") }}</p>
            </ion-label>
          </ion-item>
           <ion-item>
            <ion-label>{{ $t("Realtime POS sales") }}</ion-label>
            <ion-toggle :checked="realtimePOSSales" color="secondary" slot="end" @click="updateJob($event['detail'].value, this.jobEnums['REAL_TIME_POS_SALES'])" />
          </ion-item>
           <ion-item>
            <ion-label>{{ $t("Reserve for completed orders") }}</ion-label>
            <ion-toggle :checked="reserveForCompletedOrders" color="secondary" slot="end" @click="updateJob($event['detail'].value, this.jobEnums['RSV_CMPLT_ORDRS'])" />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("Reserving inventory for completed orders allows POS sales to accurately deduct inventory in HotWax Commerce.") }}</p>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <p>{{ $t("When importing historical completed orders, reservation should be turned off.") }}</p>
            </ion-label>
          </ion-item>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonCard,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import InventoryPopover from '@/components/InventoryPopover.vue'

export default defineComponent({
  name: 'Inventory',
  components: {
    InventoryPopover,
    IonCard,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
    }
  },
  computed: {
    ...mapGetters({
      order: 'job/getOrderInformation',
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob'
    }),
    realTimeWebhooks(): boolean {
      const status = this.getJobStatus(this.jobEnums["TEST_JOB"]);
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
    async updateJob(status: string, id: string) {
      const job = this.getJob(id);

      // TODO: check for parentJobId and jobEnum and handle this values properly
      const payload = {
        ...job,
        'systemJobEnumId': id,
        'statusId': status ? "SERVICE_PENDING" : "SERVICE_DRAFT"
      } as any
      if (job?.status === 'SERVICE_DRAFT') {
        payload['SERVICE_FREQUENCY'] = 'HOURLY'
        payload['SERVICE_NAME'] = job.serviceName
        payload['count'] = -1
        payload['runAsSystem'] = true
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = 'HOURLY'
        payload['jobId'] = job.id
      }

      job?.status === 'SERVICE_PENDING' ? this.store.dispatch('job/updateJob', payload) : this.store.dispatch('job/scheduleService', payload);
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "serviceName": Object.values(this.jobEnums),
        "serviceName_op": "in"
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

<style scoped>
main {
  display: flex;  
  align-items: flex-start;
  justify-content: center;
  margin-top: 20px;
  margin-right: auto;
  margin-left: auto;
}

ion-card {
  max-width: 343px;
}
</style>
