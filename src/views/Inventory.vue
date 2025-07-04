<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Inventory") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Adjustments") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'HARD_SYNC', status: getJobStatus(jobEnums['HARD_SYNC'])})" detail>
              <ion-label class="ion-text-wrap">
                {{ translate("Hard sync") }}
                <p>{{ getTemporalExpression("HARD_SYNC", isMaargJobAvailable(jobEnums['HARD_SYNC'])) }}</p>
              </ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("HARD_SYNC", isMaargJobAvailable(jobEnums['HARD_SYNC'])) }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item button @click="viewJobConfiguration({ id: 'IMP_PROD_FACILITY', status: getJobStatus(jobEnums['IMP_PROD_FACILITY'])})" detail>
              <ion-label class="ion-text-wrap">
                {{ translate("Import product facility") }}
                <p>{{ getTemporalExpression("IMP_PROD_FACILITY", isMaargJobAvailable(jobEnums['IMP_PROD_FACILITY'])) }}</p>
              </ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getJobScheduleStatus("IMP_PROD_FACILITY", isMaargJobAvailable(jobEnums['IMP_PROD_FACILITY'])) }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ translate("Performing a hard sync from HotWax Commerce to Shopify is useful for eliminating any discrepencies.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>
          <!-- <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Webhooks") }}</ion-card-title>
            </ion-card-header>
            <ion-item lines="none">
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="isInventoryLevelUpdated" @ionChange="updateWebhook($event['detail'].checked, 'INVENTORY_LEVEL_UPDATE')" color="secondary">
                <ion-label class="ion-text-wrap">{{ translate("Inventory level update") }}</ion-label>
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

          <MoreJobs v-if="getMoreJobs(jobEnums, enumTypeId).length" :jobs="getMoreJobs(jobEnums, enumTypeId)" />
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
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters, useStore } from 'vuex';
import JobConfiguration from '@/components/JobConfiguration.vue'
import { getCronString, isFutureDate, showToast } from '@/utils';
import emitter from '@/event-bus';
import { useRouter } from 'vue-router'
import { translate } from '@hotwax/dxp-components';
import MoreJobs from '@/components/MoreJobs.vue';
import { Actions, hasPermission } from '@/authorization'
import MaargJobConfiguration from '@/components/MaargJobConfiguration.vue';

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
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    JobConfiguration,
    MaargJobConfiguration,
    MoreJobs
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      enumTypeId: 'INVENTORY_SYS_JOB',
      webhookEnums: JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any,
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
      getMoreJobs: 'job/getMoreJobs',
      getCachedWebhook: 'webhook/getCachedWebhook',
      getMaargJob: 'maargJob/getMaargJob',
      maargJobs: 'maargJob/getMaargJobsList',
      currentMaargJob: 'maargJob/getCurrentMaargJob',
      isMaargJobAvailable: 'maargJob/isMaargJobAvailable'
    }),
    isInventoryLevelUpdated (): boolean {
      const webhookTopic = this.webhookEnums['INVENTORY_LEVEL_UPDATE']
      return this.getCachedWebhook[webhookTopic]
    }
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
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentJob.jobId, category: "inventory" } });
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
    async fetchJobs(){
      this.isLoading = true
      await this.store.dispatch("job/fetchJobs", {
        "inputFields":{
          "enumTypeId": "INVENTORY_SYS_JOB"
        }
      });
      await this.store.dispatch("maargJob/fetchMaargJobs", "INVENTORY_SYS_JOB");
      this.isLoading = false
    },
    async fetchData(isCurrentJobUpdateRequired = false) {
      if(isCurrentJobUpdateRequired) {
        this.currentJob = "";
        await this.store.dispatch('job/updateCurrentJob', { });
        await this.store.dispatch("maargJob/clearCurrentMaargJob")
        this.currentJobStatus = "";
        this.freqType = "";
        this.isJobDetailAnimationCompleted = false;
      }
      this.store.dispatch('webhook/fetchWebhooks')
      await this.fetchJobs()
    },
    async viewMaargJobConfiguration(enumId: any) {
      const job = this.getMaargJob(enumId);
      await this.store.dispatch("maargJob/updateCurrentMaargJob", { job })
      this.currentJob = ""
      if(!this.isDesktop && this.currentMaargJob?.jobName) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentMaargJob.jobTypeEnumId, category: "inventory-maarg" } });
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
    this.fetchData();
    emitter.on("productStoreOrConfigChanged", this.fetchData);
    emitter.on('viewJobConfiguration', this.viewJobConfiguration)
  },
  unmounted() {
    emitter.off("productStoreOrConfigChanged", this.fetchData);
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
      store,
      router,
      translate
    }  
  }
});
</script>
