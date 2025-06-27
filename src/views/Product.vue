<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Product") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Sync") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'IMP_PRDTS', status: getJobStatus(jobEnums['IMP_PRDTS'])})" detail>
              <ion-label class="ion-text-wrap">
                {{ translate("Import products") }}
                <p>{{ getTemporalExpression("IMP_PRDTS", isMaargJobAvailable(jobEnums['IMP_PRDTS'])) }}</p>
              </ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("IMP_PRDTS", isMaargJobAvailable(jobEnums['IMP_PRDTS'])) }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item button @click="viewJobConfiguration({ id: 'SYNC_PRDTS', status: getJobStatus(jobEnums['SYNC_PRDTS'])})" detail>
              <ion-label class="ion-text-wrap">
                {{ translate("Sync products") }}
                <p>{{ getTemporalExpression("SYNC_PRDTS", isMaargJobAvailable(jobEnums['SYNC_PRDTS'])) }}</p>
              </ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("SYNC_PRDTS", isMaargJobAvailable(jobEnums['SYNC_PRDTS'])) }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item button @click="viewJobConfiguration({ id: 'ACT_PROD_SHPFY', status: getJobStatus(jobEnums['ACT_PROD_SHPFY'])})" detail>
              <ion-label class="ion-text-wrap">
                {{ translate("Activate products on Shopify") }}
                <p>{{ getTemporalExpression("ACT_PROD_SHPFY", isMaargJobAvailable(jobEnums['ACT_PROD_SHPFY'])) }}</p>
              </ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("ACT_PROD_SHPFY", isMaargJobAvailable(jobEnums['ACT_PROD_SHPFY'])) }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ translate("Sync products and category structures from Shopify into HotWax Commerce and keep them up to date.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <!-- <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Webhooks") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="newProductsWebhook" @ionChange="updateWebhook($event['detail'].checked, 'NEW_PRODUCTS')" color="secondary">
                <ion-label class="ion-text-wrap">{{ translate("New products") }}</ion-label>
              </ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="deleteProductsWebhook" @ionChange="updateWebhook($event['detail'].checked, 'DELETE_PRODUCTS')" color="secondary">
                <ion-label class="ion-text-wrap">{{ translate("Delete products") }}</ion-label>
              </ion-toggle>
            </ion-item>
          </ion-card> -->

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
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob || Object.keys(currentMaargJob).length">
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
  isPlatform
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import JobConfiguration from '@/components/JobConfiguration.vue'
import MaargJobConfiguration from '@/components/MaargJobConfiguration.vue';
import { getCronString, isFutureDate, showToast } from '@/utils';
import emitter from '@/event-bus';
import { useRouter } from 'vue-router'
import MoreJobs from '@/components/MoreJobs.vue'
import { Actions, hasPermission } from '@/authorization'
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'Product',
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
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getTemporalExpr: 'job/getTemporalExpr',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      getCachedWebhook: 'webhook/getCachedWebhook',
      getMoreJobs: 'job/getMoreJobs',
      getMaargJob: 'maargJob/getMaargJob',
      maargJobs: 'maargJob/getMaargJobsList',
      currentMaargJob: 'maargJob/getCurrentMaargJob',
      isMaargJobAvailable: 'maargJob/isMaargJobAvailable'
    }),
    newProductsWebhook(): boolean {
      const webhookTopic = this.webhookEnums['NEW_PRODUCTS']
      return this.getCachedWebhook[webhookTopic]
    },
    deleteProductsWebhook(): boolean {
      const webhookTopic = this.webhookEnums['DELETE_PRODUCTS']
      return this.getCachedWebhook[webhookTopic]
    }
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      webhookEnums: JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any,
      enumTypeId: 'PRODUCT_SYS_JOB',
      initialLoadJobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      isLoading: false,
    }
  },
  mounted () {
    this.fetchJobs();
    emitter.on("productStoreOrConfigChanged", this.fetchJobs);
    this.store.dispatch('webhook/fetchWebhooks')
    emitter.on('viewJobConfiguration', this.viewJobConfiguration)
  },
  unmounted() {
    emitter.off("productStoreOrConfigChanged", this.fetchJobs);
    emitter.off('viewJobConfiguration', this.viewJobConfiguration)
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
    async viewJobConfiguration(jobInformation: any) {
      if(this.isMaargJobAvailable(this.jobEnums[jobInformation.id])) {
        this.viewMaargJobConfiguration(this.jobEnums[jobInformation.id])
        return;
      }

      this.currentJob = jobInformation.job || this.getJob(this.jobEnums[jobInformation.id])
      this.currentJobStatus = jobInformation.status;
      this.freqType = jobInformation.id && this.jobFrequencyType[jobInformation.id]

      const job = await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob, jobId: this.jobEnums[jobInformation.id] });
      if(job) {
        this.currentJob = job
      } else {
        showToast(translate('Configuration missing'))
        return;
      }

      if(!this.isDesktop && this.currentJob) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentJob.jobId, category: "product" } });
        return;
      }

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isFutureDate(this.currentJob?.runTime)) {
        this.currentJob.runTime = ''
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
      await this.store.dispatch("job/fetchJobs", {
        "inputFields":{
          "enumTypeId": "PRODUCT_SYS_JOB"
        }
      });
      await this.store.dispatch("maargJob/fetchMaargJobs", "PRODUCT_SYS_JOB");
      this.store.dispatch('webhook/fetchWebhooks')
      this.isLoading = false
    },
    async viewMaargJobConfiguration(enumId: any) {
      const job = this.getMaargJob(enumId);
      await this.store.dispatch("maargJob/updateCurrentMaargJob", { job })
      this.currentJob = ""
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
  setup() {
    const customPopoverOptions: any = {
      header: 'Schedule product sync',
      showBackdrop: false
    }
    const store = useStore();
    const router = useRouter();
    return {
      Actions,
      getCronString,
      hasPermission,
      customPopoverOptions,
      store,
      router,
      translate
    }
  }
});
</script>
