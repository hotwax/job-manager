<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Pre-order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Pre-orders") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Use POs to manage catalog") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Add tags in Shopify") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Remove tags in Shopify") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Add shipping dates in Shopify") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ $t("Transfer pre-order related information to Shopify as tags and meta fields.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Backorder") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Use POs to manage catalog") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Add tags in Shopify") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Remove tags in Shopify") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Add shipping dates in Shopify") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ $t("Transfer backorder related information to Shopify as tags and meta fields.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto releasing") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Run daily") }}</ion-label>
              <ion-checkbox :checked="autoReleaseRunDaily" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_RELSE_DAILY'])" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Release preorders")}}</ion-label>
              <ion-button fill="outline" @click="runJob('Release preorders', jobEnums['AUTO_RELSE_DAILY'])">{{ $t("Release") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Auto releasing pre-orders will find pre-orders that have promise dates that have passed and release them from fulfillment.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Re-allocate pre-orders") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Allocation") }}</ion-label>
              <ion-button fill="outline" color="danger" slot="end" @click="runJob('Re-allocate pre-orders', jobEnums['REALLOC_PRODR'])">{{ $t("Run reallocation") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Re-allocation will re-calculate promise dates on all pre-orders based on upcoming inventory from purchase orders. Promise dates that were manually adjusted will be overriden.") }}</p></ion-label>
            </ion-item>
          </ion-card> 
        </section>

        <aside class="desktop-only" v-show="currentJob">
          <JobConfiguration :title="title" :job="currentJob" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";
import { DateTime } from 'luxon';
import { alertController } from '@ionic/vue';
import JobConfiguration from '@/components/JobConfiguration.vue'
import { isValidDate } from '@/utils';
import emitter from '@/event-bus';

export default defineComponent({
  name: 'PreOrder',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    JobConfiguration
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr'
    }),
    addPreOrderTagInShopify(): boolean {
      const status = this.getJobStatus(this.jobEnums["ADD_PRODR_TG_SHPFY"]);
      return status && status !== "SERVICE_DRAFT";
    },
    removeTagInShopify(): boolean {
      const status = this.getJobStatus(this.jobEnums["REMV_ODR_TG_SHPFY"]);
      return status && status !== "SERVICE_DRAFT";
    },
    addShippingDateInShopify(): boolean {
      const status = this.getJobStatus(this.jobEnums["ADD_SHPG_DTE_SHPFY"]);
      return status && status !== "SERVICE_DRAFT";
    },
    autoReleaseRunDaily(): boolean {
      const status = this.getJobStatus(this.jobEnums["AUTO_RELSE_DAILY"]);
      return status && status !== "SERVICE_DRAFT";
    }
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      title: 'Automatically list pre-order',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false
    }
  },
  methods: {
    async updateJob(checked: boolean, id: string) {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (!job || checked && job?.status === 'SERVICE_PENDING') {
        return;
      }

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isValidDate(job?.runTime)) {
        job.runTime = ''
      }

      // TODO: check for parentJobId and jobEnum and handle this values properly
      const payload = {
        'jobId': job.jobId,
        'systemJobEnumId': id,
        'statusId': checked ? "SERVICE_PENDING" : "SERVICE_CANCELLED",
        'recurrenceTimeZone': DateTime.now().zoneName
      } as any
      if (!checked) {
        payload['cancelDateTime'] = DateTime.now().toMillis()
        this.store.dispatch('job/updateJob', payload)
      } else if (job?.status === 'SERVICE_DRAFT') {
        payload['JOB_NAME'] = job.jobName
        payload['SERVICE_NAME'] = job.serviceName
        payload['SERVICE_TIME'] = job.runTime ? job.runTime.toString() : ''
        payload['SERVICE_COUNT'] = '0'
        payload['SERVICE_PRIORITY'] = job.priority ? job.priority.toString() : ''
        payload['jobFields'] = {
          'productStoreId': this.currentEComStore.productStoreId,
          'systemJobEnumId': job.systemJobEnumId,
          'tempExprId': 'EVERY_15_MIN',
          'maxRecurrenceCount': '-1',
          'parentJobId': job.parentJobId,
          'runAsUser': 'system', // default system, but empty in run now
          'recurrenceTimeZone': DateTime.now().zoneName
        }
        payload['shopifyConfigId'] = this.shopifyConfigId

        // checking if the runtimeData has productStoreId, and if present then adding it on root level
        job?.runtimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = this.currentEComStore.productStoreId)

        this.store.dispatch('job/scheduleService', {...job.runtimeData, ...payload})
      } else if (job?.status === 'SERVICE_PENDING') {
        payload['tempExprId'] = 'EVERY_15_MIN'
        payload['jobId'] = job.id

        this.store.dispatch('job/updateJob', payload)
      }
    },
    async runJob(header: string, id: string) {
      const job = this.getJob(id)
      const jobAlert = await alertController
        .create({
          header,
          message: this.$t('This job will be scheduled to run as soon as possible. There may not be enough time to revert this action.', {space: '<br/><br/>'}),
          buttons: [
            {
              text: this.$t("Cancel"),
              role: 'cancel',
            },
            {
              text: this.$t('Run now'),
              handler: () => {
                if (job) {
                  this.store.dispatch('job/runServiceNow', job)
                }
              }
            }
          ]
        });

      return jobAlert.present();
    },
    viewJobConfiguration(id: string, title: string, status: string) {
      this.currentJob = this.getJob(this.jobEnums[id])
      this.title = title
      this.currentJobStatus = status
      this.freqType = this.jobFrequencyType[id]

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isValidDate(this.currentJob?.runTime)) {
        this.currentJob.runTime = ''
      }
      if (this.currentJob && !this.isJobDetailAnimationCompleted) {
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

    return {
      store
    };
  },
});
</script>
