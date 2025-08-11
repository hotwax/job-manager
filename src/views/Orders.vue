<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main class="independent-scroll-main">
        <section class="independent-scroll-child">
          <div>
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Import") }}</ion-card-title>
              </ion-card-header>
              <ion-item @click="viewJobConfiguration({ id: 'IMP_NEW_ORDERS', status: getJobStatus(jobEnums['IMP_NEW_ORDERS'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("New orders") }}
                  <p>{{ getTemporalExpression("IMP_NEW_ORDERS", isMaargJobAvailable(jobEnums['IMP_NEW_ORDERS'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("IMP_NEW_ORDERS", isMaargJobAvailable(jobEnums['IMP_NEW_ORDERS'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
              <ion-item @click="viewJobConfiguration({ id: 'APR_ORD', status: getJobStatus(jobEnums['APR_ORD'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("Approve orders") }}
                  <p>{{ getTemporalExpression("APR_ORD", isMaargJobAvailable(jobEnums['APR_ORD'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("APR_ORD", isMaargJobAvailable(jobEnums['APR_ORD'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
              <ion-item @click="viewJobConfiguration({ id: 'UPDT_ORDS', status: getJobStatus(jobEnums['UPDT_ORDS'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("Update orders") }}
                  <p>{{ getTemporalExpression("UPDT_ORDS", isMaargJobAvailable(jobEnums['UPDT_ORDS'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("UPDT_ORDS", isMaargJobAvailable(jobEnums['UPDT_ORDS'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
              <ion-item @click="viewJobConfiguration({ id: 'IMP_CANCELLED_ORDERS', status: getJobStatus(jobEnums['IMP_CANCELLED_ORDERS'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("Cancelled orders") }}
                  <p>{{ getTemporalExpression("IMP_CANCELLED_ORDERS", isMaargJobAvailable(jobEnums['IMP_CANCELLED_ORDERS'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("IMP_CANCELLED_ORDERS", isMaargJobAvailable(jobEnums['IMP_CANCELLED_ORDERS'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
              <ion-item @click="viewJobConfiguration({ id: 'IMP_CANCELLED_ITEMS', status: getJobStatus(jobEnums['IMP_CANCELLED_ITEMS'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("Cancelled items") }}
                  <p>{{ getTemporalExpression("IMP_CANCELLED_ITEMS", isMaargJobAvailable(jobEnums['IMP_CANCELLED_ITEMS'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("IMP_CANCELLED_ITEMS", isMaargJobAvailable(jobEnums['IMP_CANCELLED_ITEMS'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
              <ion-item @click="viewJobConfiguration({ id: 'IMP_MISS_ORD', status: getJobStatus(jobEnums['IMP_MISS_ORD'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("Import last day orders from Shopify") }}
                  <p>{{ getTemporalExpression("IMP_MISS_ORD", isMaargJobAvailable(jobEnums['IMP_MISS_ORD'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("IMP_MISS_ORD", isMaargJobAvailable(jobEnums['IMP_MISS_ORD'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
              <ion-item @click="viewJobConfiguration({ id: 'IMP_RETURNS', status: getJobStatus(jobEnums['IMP_RETURNS'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("Returns") }}
                  <p>{{ getTemporalExpression("IMP_RETURNS", isMaargJobAvailable(jobEnums['IMP_RETURNS'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("IMP_RETURNS", isMaargJobAvailable(jobEnums['IMP_RETURNS'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
            </ion-card>

            <!-- <ion-card>
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
            </ion-card> -->

            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Upload") }}</ion-card-title>
              </ion-card-header>
              <ion-item @click="viewJobConfiguration({ id: 'UPLD_CNCLD_ORDRS', status: getJobStatus(jobEnums['UPLD_CNCLD_ORDRS'])})" detail button>
                <ion-label class="ion-text-wrap">
                  {{ translate("Cancelled orders") }}
                  <p>{{ getTemporalExpression("UPLD_CNCLD_ORDRS", isMaargJobAvailable(jobEnums['UPLD_CNCLD_ORDRS'])) }}</p>
                </ion-label>
                <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("UPLD_CNCLD_ORDRS", isMaargJobAvailable(jobEnums['UPLD_CNCLD_ORDRS'])) }}</ion-label>
                <ion-skeleton-text v-else style="width: 30%;" animated />
              </ion-item>
            </ion-card>

            <ion-card v-if="getFilteredMaargJobs()?.length">
              <ion-card-header>
                <ion-card-title>{{ translate("Feed") }}</ion-card-title>
              </ion-card-header>
              <ion-item v-for="(job, index) in getFilteredMaargJobs()" :key="index" button detail @click="viewMaargJobConfiguration(job.jobTypeEnumId)">
                <ion-label class="ion-text-wrap">
                  {{ job.enumName ? job.enumName : job.jobName }}
                  <p>{{ getTemporalExpression(job.jobTypeEnumId, true) }}</p>
                </ion-label>
                <ion-label slot="end">{{ getJobScheduleStatus(job.jobTypeEnumId, true) }}</ion-label>
              </ion-item>
            </ion-card>

            <ion-card v-if="getFilteredMaargJobs(true)?.length">
              <ion-card-header>
                <ion-card-title>{{ translate("NetSuite") }}</ion-card-title>
              </ion-card-header>
              <ion-item v-for="(job, index) in getFilteredMaargJobs(true)" :key="index" button detail @click="viewMaargJobConfiguration(job.jobTypeEnumId)">
                <ion-label class="ion-text-wrap">
                  {{ job.enumName ? job.enumName : job.jobName }}
                  <p>{{ getTemporalExpression(job.jobTypeEnumId, true) }}</p>
                </ion-label>
                <ion-label slot="end">{{ getJobScheduleStatus(job.jobTypeEnumId, true) }}</ion-label>
              </ion-item>
            </ion-card>
            <MoreJobs v-if="getMoreJobs({...jobEnums, ...initialLoadJobEnums}, enumTypeId).length" :jobs="getMoreJobs({...jobEnums, ...initialLoadJobEnums}, enumTypeId)" />
          </div>

        </section>

        <aside class="desktop-only independent-scroll-child" v-if="isDesktop" v-show="currentJob || Object.keys(currentMaargJob).length">
          <JobConfiguration v-if="currentJob" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
          <MaargJobConfiguration v-else-if="Object.keys(currentMaargJob).length" :key="currentMaargJob" />
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
  IonToolbar,
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { translate } from '@hotwax/dxp-components'
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import { generateJobCustomParameters, getCronString, isFutureDate, showToast, prepareRuntime, hasJobDataError } from '@/utils';
import emitter from '@/event-bus';
import MoreJobs from '@/components/MoreJobs.vue';
import { Actions, hasPermission } from '@/authorization'
import MaargJobConfiguration from '@/components/MaargJobConfiguration.vue';

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
    IonToolbar,
    JobConfiguration,
    MaargJobConfiguration,
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
      isLoading: false
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
      getMoreJobs: 'job/getMoreJobs',
      getMaargJob: 'maargJob/getMaargJob',
      maargJobs: 'maargJob/getMaargJobsList',
      currentMaargJob: 'maargJob/getCurrentMaargJob',
      isMaargJobAvailable: 'maargJob/isMaargJobAvailable'
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
      if(this.isMaargJobAvailable(this.jobEnums[jobInformation.id])) {
        this.viewMaargJobConfiguration(this.jobEnums[jobInformation.id])
        return;
      }

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
    getTemporalExpression(enumId: string, isMaargJob = false) {
      if(isMaargJob || this.isMaargJobAvailable(this.jobEnums[enumId])) {
        const job = this.getMaargJob(enumId)
        return job?.cronExpression ? this.getCronString(job.cronExpression) ? this.getCronString(job.cronExpression) : job.cronExpression : ""
      }

      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ? this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description : ""
    },
    async fetchJobs(isCurrentJobUpdateRequired = false){
      this.isLoading = true;
      if(isCurrentJobUpdateRequired) {
        this.currentJob = ""
        await this.store.dispatch('job/updateCurrentJob', { });
        await this.store.dispatch("maargJob/clearCurrentMaargJob")
        this.currentJobStatus = ""
        this.freqType = ""
        this.isJobDetailAnimationCompleted = false
      }
      this.store.dispatch('webhook/fetchWebhooks')
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          "enumTypeId": "ORDER_SYS_JOB"
        }
      });
      await this.store.dispatch("maargJob/fetchMaargJobs", "ORDER_SYS_JOB");
      this.isLoading = false
    },
    async viewMaargJobConfiguration(enumId: any) {
      const job = this.getMaargJob(enumId);
      await this.store.dispatch("maargJob/updateCurrentMaargJob", { job })
      this.currentJob = ""
      if(!this.isDesktop && this.currentMaargJob?.jobName) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentMaargJob.jobTypeEnumId, category: "orders-maarg" } });
        return;
      }
      if(!this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    getFilteredMaargJobs(isNetSuiteJob = false) {
      return isNetSuiteJob ? this.maargJobs?.filter((job: any) => !Object.values(this.jobEnums).includes(job.jobTypeEnumId) && job.permissionGroupId === "NETSUITE") : this.maargJobs?.filter((job: any) => !Object.values(this.jobEnums).includes(job.jobTypeEnumId) && job.permissionGroupId !== "NETSUITE")
    },
    getJobScheduleStatus(enumId: string, isMaargJob = false) {
      if(isMaargJob || this.isMaargJobAvailable(this.jobEnums[enumId])) {
        const job = this.getMaargJob(enumId)
        return job?.paused === "Y" ? "Disabled" : "Enabled"
      }

      const job = this.getJob(this.jobEnums[enumId])
      return job?.status === "SERVICE_DRAFT" ? "Disabled" : "Enabled"
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
  async ionViewWillLeave() {
    await this.store.dispatch("maargJob/clearCurrentMaargJob");
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      getCronString,
      hasPermission,
      router,
      store,
      translate
    };
  },
});
</script>
