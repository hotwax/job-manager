<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Pre-order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Pre-sell catalog") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['REL_PREODR_CAT'])" @ionChange="updateJob($event['detail'].checked, jobEnums['REL_PREODR_CAT'])">
                <ion-label class="ion-text-wrap">{{ translate("Auto refresh pre-sell catalog") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ translate("Automatically add and remove products from the pre-order and backorder catalogs based on inventory, purchase orders, and order queues.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item-divider color="light">
              <ion-label color="medium">{{ translate("View catalog") }}</ion-label>
            </ion-item-divider>
            <div class="actions">
              <ion-button :disabled="!preOrderBackorderCategory.preorder" @click.stop="goToOmsCategoryPage('/commerce/control/ViewCategory?productCategoryId=' + preOrderBackorderCategory.preorder)" fill="clear">
                {{ translate('Pre-Order') }}
                <ion-icon slot="end" :icon="openOutline" />
              </ion-button>
              <ion-button :disabled="!preOrderBackorderCategory.backorder" @click.stop="goToOmsCategoryPage('/commerce/control/ViewCategory?productCategoryId=' + preOrderBackorderCategory.backorder)" fill="clear">
                {{ translate('Backorder') }}
                <ion-icon slot="end" :icon="openOutline" />
              </ion-button>
            </div>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Pre-sell on Shopify") }}</ion-card-title>
            </ion-card-header>
            <ion-item-divider color="light">
              <ion-label color="medium">{{ translate("Catalog") }}</ion-label>
            </ion-item-divider>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['PREORDER_CAT_SYC'])" @ionChange="updateJob($event['detail'].checked, jobEnums['PREORDER_CAT_SYC'])">
                <ion-label class="ion-text-wrap">{{ translate("Sync variant details") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['ADD_PRODR_TG_SHPFY'])" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_PRODR_TG_SHPFY'])">
                <ion-label class="ion-text-wrap">{{ translate("Add pre-order tags") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['REMV_PRODR_TG_SHPFY'])" @ionChange="updateJob($event['detail'].checked, jobEnums['REMV_PRODR_TG_SHPFY'])">
                <ion-label class="ion-text-wrap">{{ translate("Remove pre-order tags") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['ADD_BACKODR_TG_SHPFY'])" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_BACKODR_TG_SHPFY'])">
                <ion-label class="ion-text-wrap">{{ translate("Add backorder tags") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['REMV_BACKODR_TG_SHPFY'])" @ionChange="updateJob($event['detail'].checked, jobEnums['REMV_BACKODR_TG_SHPFY'])">
                <ion-label class="ion-text-wrap">{{ translate("Remove backorder tags") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ translate("Sync pre-selling related information to Shopify as tags and meta fields.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item-divider color="light">
              <ion-label color="medium">{{ translate("Orders") }}</ion-label>
            </ion-item-divider>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['ADD_TAG_PREORD'])" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_TAG_PREORD'])">
                <ion-label class="ion-text-wrap">{{ translate("Add pre-order tags") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['ADD_TAG_BACKORD'])" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_TAG_BACKORD'])">
                <ion-label class="ion-text-wrap">{{ translate("Add backorder tags") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ translate("Add pre-order/backorder tags on orders with pre-selling items in them.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['UL_PRMS_DTE'])" @ionChange="updateJob($event['detail'].checked, jobEnums['UL_PRMS_DTE'])">
                <ion-label class="ion-text-wrap">{{ translate("Add promise date") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ translate("Add a note with the promise date given to the customer at the time of placing the order.") }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['UL_PRMS_DTE_UPD'])" @ionChange="updateJob($event['detail'].checked, jobEnums['UL_PRMS_DTE_UPD'])">
                <ion-label class="ion-text-wrap">{{ translate("Update promise date") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ translate("Add notes to the impacted order items on Shopify for changes promise dates.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>



          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Promise date change") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['AUTO_SYNC_DT_ODRS'])" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_SYNC_DT_ODRS'])">
                <ion-label class="ion-text-wrap">{{ translate("Auto sync date to orders") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['SD_PRMSDDTE_CNG_NOTI'])" @ionChange="updateJob($event['detail'].checked, jobEnums['SD_PRMSDDTE_CNG_NOTI'])">
                <ion-label class="ion-text-wrap">{{ translate("Email customers") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item lines="none">
              <ion-label>
                <p class="ion-text-wrap">{{ translate("Notify customers of any changed promise dates for their orders.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Auto releasing") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-checkbox :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="getStatus(jobEnums['AUTO_RELSE_DAILY'])" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_RELSE_DAILY'], 'EVERYDAY')" >
                <ion-label class="ion-text-wrap">{{ translate("Run daily") }}</ion-label>
              </ion-checkbox>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ translate("Release preorders")}}</ion-label>
              <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" fill="outline" @click="runJob(jobEnums['AUTO_RELSE_DAILY'])">{{ translate("Release") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ translate("Auto releasing pre-orders will find pre-orders that have promise dates that have passed and release them for fulfillment.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card v-if="maargJobs?.length">
            <ion-card-header>
              <ion-card-title>{{ translate("Feed") }}</ion-card-title>
            </ion-card-header>
            <ion-item v-for="(job, index) in maargJobs" :key="index" button detail @click="viewMaargJobConfiguration(job.jobTypeEnumId)">
              <ion-label class="ion-text-wrap">{{ job.enumDescription ? job.enumDescription : job.jobName }}</ion-label>
              <ion-label slot="end" >{{ getMaargJobStatus(job.jobTypeEnumId) }}</ion-label>
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
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonItemDivider,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  isPlatform
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";
import { useRouter } from 'vue-router'
import { alertController } from '@ionic/vue';
import JobConfiguration from '@/components/JobConfiguration.vue'
import { generateJobCustomParameters, getCronString, isFutureDate, showToast, prepareRuntime, hasJobDataError } from '@/utils';
import emitter from '@/event-bus';
import { translate } from '@hotwax/dxp-components';
import MoreJobs from '@/components/MoreJobs.vue';
import { Actions, hasPermission } from '@/authorization'
import { openOutline } from 'ionicons/icons'
import MaargJobConfiguration from '@/components/MaargJobConfiguration.vue';

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
    IonIcon,
    IonItemDivider,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    JobConfiguration,
    MaargJobConfiguration,
    MoreJobs
},
  computed: {
    ...mapGetters({
      instanceUrl: 'user/getInstanceUrl',
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentShopifyConfig: 'user/getCurrentShopifyConfig',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr',
      getMoreJobs: 'job/getMoreJobs',
      getMaargJob: 'maargJob/getMaargJob',
      maargJobs: 'maargJob/getMaargJobsList',
      currentMaargJob: 'maargJob/getCurrentMaargJob'
    })
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      enumTypeId: 'PRE_ORD_SYS_JOB',
      preOrderBackorderCategory: {} as any,
    }
  },
  methods: {
    async getPreOrderBackorderCategory() {
      const preOrderBackorderCategory = await this.store.dispatch("user/getPreOrderBackorderCategory");
      preOrderBackorderCategory && (this.preOrderBackorderCategory = preOrderBackorderCategory);
    },
    goToOmsCategoryPage(path: any) {
      window.open((this.instanceUrl.startsWith('http') ? this.instanceUrl.replace('api/', "") : `https://${this.instanceUrl}.hotwax.io/`) + path, '_blank', 'noopener, noreferrer');
    },
    getStatus(enumId: any): boolean {
      const status = this.getJobStatus(enumId);
      return status && status !== "SERVICE_DRAFT";
    },
    async updateJob(checked: boolean, id: string, status = 'EVERY_15_MIN') {
      const job = this.getJob(id);

      // This handles programmatic change on page load. Skips 'Configuration missing' error
      if (!job && !checked) {
        return;
      }

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

      job['jobStatus'] = status

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
    async runJob(id: string) {
      const job = this.getJob(id)
      const jobAlert = await alertController
        .create({
          header: translate("Run now"),
          message: translate('Running this job now will not replace this job. A copy of this job will be created and run immediately. You may not be able to reverse this action.', { space: '<br/><br/>' }),
          buttons: [
            {
              text: translate("Cancel"),
              role: 'cancel',
            },
            {
              text: translate('Run now'),
              handler: () => {
                if (job && !hasJobDataError(job)) {
                  const jobCustomParameters = generateJobCustomParameters([], [], job.runtimeData)
                  this.store.dispatch('job/runServiceNow', { job, jobCustomParameters })
                }
              }
            }
          ]
        });

      return jobAlert.present();
    },
    async viewJobConfiguration(jobInformation: any) {
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

      if(!this.isDesktop) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentJob.jobId, category: "pre-order" } });
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
    getTemporalExpression(enumId: string) {
      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ?
        this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description :
        translate('Disabled')
    },
    async fetchJobs(){
      await this.store.dispatch("job/fetchJobs", {
        "inputFields":{
          "enumTypeId": "PRE_ORD_SYS_JOB"
        }
      });
      await this.store.dispatch("maargJob/fetchMaargJobs", "PRE_ORD_SYS_JOB");
    },
    async fetchInitialData(isCurrentJobUpdateRequired = false) {
      if(isCurrentJobUpdateRequired) {
        this.currentJob = "";
        await this.store.dispatch('job/updateCurrentJob', { });
        await this.store.dispatch("maargJob/updateCurrentMaargJob", { job: {} })
        this.currentJobStatus = ""
        this.freqType = '';
        this.isJobDetailAnimationCompleted = false;
      }
      await this.fetchJobs();
      await this.getPreOrderBackorderCategory();
    },
    getMaargJobStatus(id: string) {
      const job = this.getMaargJob(id)
      return (job?.paused === "N" && job?.cronExpression) ? this.getCronString(job.cronExpression) ? this.getCronString(job.cronExpression) : job.cronExpression : 'Disabled'
    },
    async viewMaargJobConfiguration(enumId: any) {
      const job = this.getMaargJob(enumId);
      await this.store.dispatch("maargJob/updateCurrentMaargJob", { job })
      this.currentJob = ""
      if(!this.isDesktop && this.currentMaargJob?.jobName) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentMaargJob.jobTypeEnumId, category: "pre-order-maarg" } });
        return;
      }

      if(!this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
  },
  mounted () {
    this.fetchInitialData();
    emitter.on("productStoreOrConfigChanged", this.fetchInitialData);
    emitter.on('viewJobConfiguration', this.viewJobConfiguration)
  },
  unmounted() {
    emitter.on('viewJobConfiguration', this.viewJobConfiguration)
    emitter.off("productStoreOrConfigChanged", this.fetchJobs);
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
      openOutline,
      store,
      router,
      translate
    };
  },
});
</script>
