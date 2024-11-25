<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Import") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration({ id: 'IMP_NEW_ORDERS', status: getJobStatus(jobEnums['IMP_NEW_ORDERS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("New orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('IMP_NEW_ORDERS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item @click="viewJobConfiguration({ id: 'APR_ORD', status: getJobStatus(jobEnums['APR_ORD'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Approve orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('APR_ORD') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item @click="viewJobConfiguration({ id: 'UPDT_ORDS', status: getJobStatus(jobEnums['UPDT_ORDS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Update orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('UPDT_ORDS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item @click="viewJobConfiguration({ id: 'IMP_CANCELLED_ORDERS', status: getJobStatus(jobEnums['IMP_CANCELLED_ORDERS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Cancelled orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('IMP_CANCELLED_ORDERS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item @click="viewJobConfiguration({ id: 'IMP_CANCELLED_ITEMS', status: getJobStatus(jobEnums['IMP_CANCELLED_ITEMS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Cancelled items") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('IMP_CANCELLED_ITEMS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item @click="viewJobConfiguration({ id: 'IMP_RETURNS', status: getJobStatus(jobEnums['IMP_RETURNS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Returns") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('IMP_RETURNS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Webhooks") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="isNewOrders" @ionChange="updateWebhook($event['detail'].checked, 'NEW_ORDERS')" color="secondary">
                <ion-label class="ion-text-wrap">{{ translate("New orders") }}</ion-label>
              </ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="isCancelledOrders" @ionChange="updateWebhook($event['detail'].checked, 'CANCELLED_ORDERS')" color="secondary">
                <ion-label class="ion-text-wrap">{{ translate("Cancelled orders") }}</ion-label>
              </ion-toggle>
            </ion-item>
            <ion-item>
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="isPaymentStatus" @ionChange="updateWebhook($event['detail'].checked, 'PAYMENT_STATUS')" color="secondary">
                <ion-label class="ion-text-wrap">{{ translate("Get Paid Transactions") }}</ion-label>
              </ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="isReturns" @ionChange="updateWebhook($event['detail'].checked, 'RETURNS')" color="secondary">
                <ion-label class="ion-text-wrap">{{ translate("Returns") }}</ion-label>
              </ion-toggle>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Upload") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration({ id: 'UPLD_CMPLT_ORDRS', status: getJobStatus(jobEnums['UPLD_CMPLT_ORDRS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Completed orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('UPLD_CMPLT_ORDRS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item @click="viewJobConfiguration({ id: 'UPLD_CNCLD_ORDRS', status: getJobStatus(jobEnums['UPLD_CNCLD_ORDRS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Cancelled orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('UPLD_CNCLD_ORDRS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item @click="viewJobConfiguration({ id: 'UPLD_REFUNDS', status: getJobStatus(jobEnums['UPLD_REFUNDS'])})" detail button>
              <ion-label class="ion-text-wrap">{{ translate("Refunds") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('UPLD_REFUNDS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
          </ion-card>
          <MoreJobs v-if="getMoreJobs({...jobEnums, ...initialLoadJobEnums}, enumTypeId).length" :jobs="getMoreJobs({...jobEnums, ...initialLoadJobEnums}, enumTypeId)" />
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob">
          <JobConfiguration :status="currentJobStatus" :type="freqType" :key="currentJob"/>
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
  IonSkeletonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { translate } from '@hotwax/dxp-components'
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import { generateJobCustomParameters, isFutureDate, showToast, prepareRuntime, hasJobDataError } from '@/utils';
import emitter from '@/event-bus';
import MoreJobs from '@/components/MoreJobs.vue';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'Orders',
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
    IonSkeletonText,
    IonTitle,
    IonToggle,
    IonToolbar,
    JobConfiguration,
    MoreJobs
},
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      webhookEnums: JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      enumTypeId: 'ORDER_SYS_JOB',
      initialLoadJobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      isLoading: true
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr',
      getCachedWebhook: 'webhook/getCachedWebhook',
      getMoreJobs: 'job/getMoreJobs'
    }),
    promiseDateChanges(): boolean {
      const status = this.getJobStatus(this.jobEnums['NTS_PRMS_DT_CHNG']);
      return status && status !== "SERVICE_DRAFT";
    },
    isNewOrders(): boolean {
      const webhookTopic = this.webhookEnums['NEW_ORDERS']
      return this.getCachedWebhook[webhookTopic]
    },
    isCancelledOrders(): boolean {
      const webhookTopic = this.webhookEnums['CANCELLED_ORDERS']
      return this.getCachedWebhook[webhookTopic]
    },
    isPaymentStatus(): boolean {
      const webhookTopic = this.webhookEnums['PAYMENT_STATUS']
      return this.getCachedWebhook[webhookTopic]
    },
    isReturns(): boolean {
      const webhookTopic = this.webhookEnums['RETURNS']
      return this.getCachedWebhook[webhookTopic]
    },
  },
  methods: {
    async updateWebhook(checked: boolean, enumId: string) {
      const webhook = this.getCachedWebhook[this.webhookEnums[enumId]]

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if ((checked && webhook) || (!checked && !webhook)) {
        return;
      }

      if (checked) {
        await this.store.dispatch('webhook/subscribeWebhook', enumId)
      } else {
        await this.store.dispatch('webhook/unsubscribeWebhook', { webhookId: webhook?.id, shopifyConfigId: this.currentShopifyConfig.shopifyConfigId })
      }
    },
    async updateJob(checked: boolean, id: string, status = 'EVERY_15_MIN') {
      const job = this.getJob(id);

      // added check that if the job is not present, then display a toast and then return
      if (!job) {
        showToast(translate('Configuration missing'))
        return;
      }

      // return if job has missing data or error
      if (hasJobDataError(job)) return;

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if ((checked && job?.status === 'SERVICE_PENDING') || (!checked && job?.status === 'SERVICE_DRAFT')) {
        return;
      }

      job['jobStatus'] = status;

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      if (!checked) {
        this.store.dispatch('job/cancelJob', job)
      } else if (job?.status === 'SERVICE_DRAFT') {
        job.runTime = prepareRuntime(job)
        const jobCustomParameters = generateJobCustomParameters([], [], job.runtimeData)
        this.store.dispatch('job/scheduleService', { job, jobCustomParameters })
      } else if (job?.status === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job)
      }
    },
    async viewJobConfiguration(jobInformation: any) {
      this.currentJob = jobInformation.job || this.getJob(this.jobEnums[jobInformation.id])
      this.currentJobStatus = jobInformation.status
      this.freqType = jobInformation.id && this.jobFrequencyType[jobInformation.id]

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isFutureDate(this.currentJob?.runTime)) {
        this.currentJob.runTime = ''
      }

      const job = await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob, jobId: this.jobEnums[jobInformation.id] });
      if(job) {
        this.currentJob = job
      } else {
        showToast(translate('Configuration missing'))
        return;
      }

      if(!this.isDesktop && this.currentJob) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentJob.jobId, category: "orders" } });
        return;
      }
      if (this.currentJob && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    getTemporalExpression(enumId: string) {
      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ?
        this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description :
        translate('Disabled')
    },
    async fetchJobs(){
      this.store.dispatch('webhook/fetchWebhooks')
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          "enumTypeId": "ORDER_SYS_JOB"
        }
      });
      this.isLoading = false
    }
  },
  mounted () {
    this.fetchJobs();
    emitter.on("productStoreOrConfigChanged", this.fetchJobs);
    emitter.on('viewJobConfiguration', this.viewJobConfiguration)
  },
  unmounted() {
    emitter.off("productStoreOrConfigChanged", this.fetchJobs);
    emitter.off('viewJobConfiguration', this.viewJobConfiguration)
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      hasPermission,
      router,
      store,
      translate
    };
  },
});
</script>
