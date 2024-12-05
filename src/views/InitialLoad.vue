<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Initial load") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Products") }}</ion-card-title>
            </ion-card-header>
            <ion-button expand="block" fill="outline" @click="viewInitialJobConfiguration('products', jobEnums['IMP_PRDTS_BLK'])">{{ translate("Import products in bulk") }}</ion-button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ translate("Import all products from Shopify. Make sure you run this before importing orders in bulk during intial setup.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Orders") }}</ion-card-title>
            </ion-card-header>
            <ion-button expand="block" fill="outline" @click="viewInitialJobConfiguration('orders', jobEnums['IMP_ORDERS_BLK'])">{{ translate("Import orders in bulk") }}</ion-button>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ translate("Before importing historical orders in bulk, make sure all products are set up or else order import will not run correctly.") }}</p>
                <br />
                <p>{{ translate("By default only open and unshipped orders will be imported.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Process Uploads") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'JOB_IMP_QUEUE', status: getJobStatus(jobEnums['JOB_IMP_QUEUE']) })" detail>
              <ion-label class="ion-text-wrap">{{ translate("Import queue") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('JOB_IMP_QUEUE') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item>
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="fileStatusUpdateWebhook" color="secondary" @ionChange="updateWebhook($event['detail'].checked, 'BULK_OPERATIONS_FINISH')">
                <ion-label>{{ translate("File upload status") }}</ion-label>
              </ion-toggle>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="processPendingUploadsOnShopify" @ionChange="updateJob($event['detail'].checked, jobEnums['UL_PRCS'])">
                <ion-label class="ion-text-wrap">{{ translate("Upload Pending Process") }}</ion-label>
              </ion-checkbox>
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentSelectedJobModal || Object.keys(currentJob)?.length">
          <InitialJobConfiguration v-if="currentSelectedJobModal" :type='currentSelectedJobModal' :shopifyOrderId='lastShopifyOrderId' :key="job" />
          <JobConfiguration v-else :status="currentJobStatus" :type="freqType" :key="currentJob"/>
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
  IonSkeletonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  isPlatform
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import { hasJobDataError, generateJobCustomParameters, isFutureDate, showToast } from '@/utils';
import emitter from '@/event-bus';
import InitialJobConfiguration from '@/components/InitialJobConfiguration.vue';
import JobConfiguration from '@/components/JobConfiguration.vue';
import { useRouter } from 'vue-router';
import { translate } from '@hotwax/dxp-components';
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'InitialLoad',
  components: {
    JobConfiguration,
    InitialJobConfiguration,
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
    IonSkeletonText,
    IonTitle,
    IonToggle,
    IonToolbar
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      webhookEnums: JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentSelectedJobModal: '',
      job: {} as any,
      lastShopifyOrderId: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      isLoading: false,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
    }
  },
  mounted() {
    this.fetchJobs();
    emitter.on("productStoreOrConfigChanged", this.fetchJobs);
  },
  unmounted() {
    emitter.off("productStoreOrConfigChanged", this.fetchJobs);
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      getCachedWebhook: 'webhook/getCachedWebhook',
      getTemporalExpr: 'job/getTemporalExpr',
    }),
    fileStatusUpdateWebhook(): boolean {
      const webhookTopic = this.webhookEnums['BULK_OPERATIONS_FINISH']
      return this.getCachedWebhook[webhookTopic]
    },
    processPendingUploadsOnShopify(): boolean {
      const status = this.getJobStatus(this.jobEnums["UL_PRCS"]);
      return status && status !== "SERVICE_DRAFT";
    }
  },
  methods: {
    async updateJob(checked: boolean, id: string, status = 'EVERY_15_MIN') {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if ((checked && job?.status === 'SERVICE_PENDING') || (!checked && job?.status === 'SERVICE_DRAFT')) {
        return;
      }

      // added check that if the job is not present, then display a toast and then return
      if (!job) {
        showToast(translate('Configuration missing'))
        return;
      }

      // return if job has missing data or error
      if (hasJobDataError(job)) return;

      job['jobStatus'] = status

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      if (!checked) {
        this.store.dispatch('job/cancelJob', job)
      } else if (job?.status === 'SERVICE_DRAFT') {
        const jobCustomParameters = generateJobCustomParameters([], [], job.runtimeData)
        this.store.dispatch('job/scheduleService', { job, jobCustomParameters })
      } else if (job?.status === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job)
      }
    },
    async viewInitialJobConfiguration(label: string, id: string) {
      this.currentSelectedJobModal = label;
      this.job = this.getJob(id);

      if(this.job?.runtimeData?.sinceId?.length >= 0) {
        this.lastShopifyOrderId = this.job.runtimeData.sinceId !== 'null' ? this.job.runtimeData.sinceId : ''
      }
      // if job runTime is not a valid date then assigning current date to the runTime
      if (this.job?.runTime && !isFutureDate(this.job?.runTime)) {
        this.job.runTime = ''
      }

      const job = await this.store.dispatch('job/updateCurrentJob', { job: this.job, jobId: id });
      if(job) {
        this.job = job
        this.currentJob = {}
      } else {
        showToast(translate('Configuration missing'))
        return;
      }

      if(!this.isDesktop && this.job) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.job.jobId, category: "initial-load" } });
        return;
      }

      if (this.job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
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
        this.job = {}
        this.currentSelectedJobModal = ""
        this.lastShopifyOrderId = ""
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
    async fetchJobs(isCurrentJobUpdateRequired = false){
      this.isLoading = true
      if(isCurrentJobUpdateRequired) {
        this.currentSelectedJobModal = "";
        await this.store.dispatch('job/updateCurrentJob', { });
        this.job = {};
        this.lastShopifyOrderId = "";
        this.isJobDetailAnimationCompleted = false;
      }
      await this.store.dispatch("job/fetchJobs", {
        "inputFields":{
          "systemJobEnumId": Object.values(this.jobEnums),
          "systemJobEnumId_op": "in"
        }
      })
      this.store.dispatch('webhook/fetchWebhooks')
      this.isLoading = false
    },
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
    getTemporalExpression(enumId: string) {
      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ?
        this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description :
        translate('Disabled')
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      hasPermission,
      store,
      router,
      translate
    }
  }
});
</script>

<style scoped>
ion-card > ion-button {
  margin: var(--spacer-sm);
}
</style>
