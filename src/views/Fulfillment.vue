<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Fulfillment") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Shipping") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'SHIP_PKD_ODRS', status: getJobStatus(jobEnums['SHIP_PKD_ODRS']) })" detail>
              <ion-label class="ion-text-wrap">{{ translate("Ship packed orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('SHIP_PKD_ODRS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ translate("Automatically ship orders that are packed and have a tracking number if required.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("History") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'ODR_FLMNT_HST', status: getJobStatus(jobEnums['ODR_FLMNT_HST']) })" detail>
              <ion-label class="ion-text-wrap">{{ translate("Order fulfillment") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('ODR_FLMNT_HST') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ translate("Create or update order fulfillment history records from FTP.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Notification") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'OPN_BOPIS_ORD_NT', status: getJobStatus(jobEnums['OPN_BOPIS_ORD_NT']) })" detail>
              <ion-label class="ion-text-wrap">{{ translate("Open BOPIS order notification") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('OPN_BOPIS_ORD_NT') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item button @click="viewJobConfiguration({ id: 'READYPICK_BOPIS_ORD_NT', status: getJobStatus(jobEnums['READYPICK_BOPIS_ORD_NT']) })" detail>
              <ion-label class="ion-text-wrap">{{ translate("Ready to pick BOPIS order notification") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('READYPICK_BOPIS_ORD_NT') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item button @click="viewJobConfiguration({ id: 'OPEN_SHIPPING_ORD_NT', status: getJobStatus(jobEnums['OPEN_SHIPPING_ORD_NT']) })" detail>
              <ion-label class="ion-text-wrap">{{ translate("Open shipping order notification") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('OPEN_SHIPPING_ORD_NT') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ translate("Sends notifications for open orders and ready-to-pickup orders.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>
          
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Auto cancelations") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-input :readonly="!hasPermission(Actions.APP_JOB_UPDATE)" :placeholder="translate('before auto cancelation')" v-model.number="autoCancelDays" type="number">
                <div slot="label" class="ion-text-wrap">{{ translate("Days") }}</div>
              </ion-input>
              <!-- The button is enabled when we hover over the button or ion input looses focus and not when the value is changed -->
              <!-- Todo: need to disable the button if value is unchanged -->
              <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" fill="clear" @click="updateAutoCancelDays()" slot="end">
                {{ translate("Save") }}
              </ion-button>
            </ion-item>
            <ion-item>
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="autoCancelCheckDaily" color="secondary" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_CNCL_DAL'], 'EVERYDAY')">
                <ion-label class="ion-text-wrap">{{ translate("Check daily") }}</ion-label>
              </ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ translate("Unfulfilled orders that pass their auto cancelation date will be canceled automatically in HotWax Commerce. They will also be canceled in Shopify if upload for canceled orders is enabled.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Feed") }}</ion-card-title>
            </ion-card-header>
            <ion-item button detail :disabled="!isMaargJobFound('GNRT_FF_ORD_ITM_FEED')" @click="viewMaargJobConfiguration('GNRT_FF_ORD_ITM_FEED')">
              <ion-label class="ion-text-wrap">{{ translate("Generate order items feed") }}</ion-label>
              <ion-label slot="end" >{{ isMaargJobFound('GNRT_FF_ORD_ITM_FEED') ? getMaargJobStatus("GNRT_FF_ORD_ITM_FEED") : translate("Not found") }}</ion-label>
            </ion-item>
            <ion-item button detail :disabled="!isMaargJobFound('SND_FF_ACK_FEED')" @click="viewMaargJobConfiguration('SND_FF_ACK_FEED')">
              <ion-label class="ion-text-wrap">{{ translate("Send shopify acknowledge feed") }}</ion-label>
              <ion-label slot="end">{{ isMaargJobFound('SND_FF_ACK_FEED') ? getMaargJobStatus("SND_FF_ACK_FEED") : translate("Not found") }}</ion-label>
            </ion-item>
            <ion-item button detail :disabled="!isMaargJobFound('POL_OMS_FLFLMNT_FEED')" @click="viewMaargJobConfiguration('POL_OMS_FLFLMNT_FEED')">
              <ion-label class="ion-text-wrap">{{ translate("Poll OMS fulfillment feed") }}</ion-label>
              <ion-label slot="end">{{ isMaargJobFound('POL_OMS_FLFLMNT_FEED') ? getMaargJobStatus("POL_OMS_FLFLMNT_FEED") : translate("Not found") }}</ion-label>
            </ion-item>

            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ translate("Generated order items feed and send fulfillment acknowlegment feed to shopify.") }}</p>
              </ion-label>
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
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
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
import { translate } from '@hotwax/dxp-components'
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import MaargJobConfiguration from '@/components/MaargJobConfiguration.vue';
import { generateJobCustomParameters, getCronString, hasError, isFutureDate, showToast, prepareRuntime, hasJobDataError } from '@/utils';
import emitter from '@/event-bus';
import { JobService } from '@/services/JobService'
import MoreJobs from '@/components/MoreJobs.vue';
import { Actions, hasPermission } from '@/authorization'
import logger from '@/logger';

export default defineComponent({
  name: 'Fulfillment',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonSkeletonText,
    IonTitle,
    IonToggle,
    IonToolbar,
    JobConfiguration,
    MaargJobConfiguration,
    MoreJobs
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_FULFILLMENT_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      autoCancelDays: '',
      enumTypeId: 'FULFILLMENT_SYS_JOB',
      initialLoadJobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      maargJobEnums: JSON.parse(process.env.VUE_APP_FULFILLMENT_MAARG_JOB_NAMES as string) as any,
      isLoading: false
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr',
      getMoreJobs: 'job/getMoreJobs',
      getMaargJob: 'maargJob/getMaargJob',
      currentMaargJob: 'maargJob/getCurrentMaargJob'
    }),
    autoCancelCheckDaily(): boolean {
      const status = this.getJobStatus(this.jobEnums["AUTO_CNCL_DAL"]);
      return status && status !== "SERVICE_DRAFT";
    },
  },
  methods: {
    async updateAutoCancelDays() {
      if (this.currentEComStore.productStoreId) {
        const payload = {
          'productStoreId': this.currentEComStore.productStoreId,
          'daysToCancelNonPay': this.autoCancelDays
        }
        try {
          const resp = await JobService.updateAutoCancelDays(payload);
          if (resp.status === 200 && !hasError(resp)) {
            showToast(translate("Auto cancel days updated"));
          } else {
            showToast(translate("Unable to update auto cancel days"));
          }
        } catch (err) {
          showToast(translate('Something went wrong'))
          logger.error(err)
        }
      } else {
        showToast(translate('Unable to update auto cancel days. None product store selected.'));
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
    async fetchJobs(isCurrentJobUpdateRequired = false){
      this.isLoading = true;
      if(isCurrentJobUpdateRequired) {
        this.currentJob = "";
        await this.store.dispatch('job/updateCurrentJob', { });
        this.currentJobStatus = "";
        this.freqType = "";
        this.isJobDetailAnimationCompleted = false;
      }
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          "enumTypeId": "FULFILLMENT_SYS_JOB"
        }
      });
      await this.store.dispatch("maargJob/fetchMaargJobs", Object.values(this.maargJobEnums));
      if (this.currentEComStore.productStoreId) {
        this.getAutoCancelDays();
      }
      this.isLoading = false
    },
    async getAutoCancelDays(){
      const payload = {
        "inputFields": {
          'productStoreId': this.currentEComStore.productStoreId,
        },
        "fieldList": ["productStoreId", "daysToCancelNonPay"],
        "entityName": "ProductStore",
        "noConditionFind": "Y"
      }
      try {
        const resp = await JobService.getAutoCancelDays(payload);
        if (resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0 ) {
          this.autoCancelDays = resp.data.docs[0].daysToCancelNonPay;
        } else {
          logger.error(resp)
          this.autoCancelDays = "";
        }
      } catch (err) {
        logger.error(err)
        this.autoCancelDays = "";
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

    isMaargJobFound(id: string) {
      const job = this.getMaargJob(this.maargJobEnums[id])
      return job && Object.keys(job)?.length
    },

    getMaargJobStatus(id: string) {
      const job = this.getMaargJob(this.maargJobEnums[id])
      return (job?.paused === "N" && job?.cronExpression) ? this.getCronString(job.cronExpression) ? this.getCronString(job.cronExpression) : job.cronExpression : 'Disabled'
    },

    async viewMaargJobConfiguration(id: any) {
      const enumId = this.maargJobEnums[id];
      const job = this.getMaargJob(enumId);

      await this.store.dispatch("maargJob/updateCurrentMaargJob", { job })
      this.currentJob = ""
      if(!this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
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
      getCronString,
      hasPermission,
      router,
      store,
      translate
    };
  },
});
</script>
  