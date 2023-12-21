<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Fulfillment") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Shipping") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'SHIP_PKD_ODRS', status: getJobStatus(jobEnums['SHIP_PKD_ODRS']) })" detail>
              <ion-label class="ion-text-wrap">{{ $t("Ship packed orders") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('SHIP_PKD_ODRS') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Automatically ship orders that are packed and have a tracking number if required.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("History") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration({ id: 'ODR_FLMNT_HST', status: getJobStatus(jobEnums['ODR_FLMNT_HST']) })" detail>
              <ion-label class="ion-text-wrap">{{ $t("Order fulfillment") }}</ion-label>
              <ion-label v-if="!isLoading" slot="end">{{ getTemporalExpression('ODR_FLMNT_HST') }}</ion-label>
              <ion-skeleton-text v-else style="width: 30%;" animated />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Create or update order fulfillment history records from FTP.") }}</p>
              </ion-label>
            </ion-item>
          </ion-card>
          
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto cancelations") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Days") }}</ion-label>
              <ion-input :readonly="!hasPermission(Actions.APP_JOB_UPDATE)" :placeholder="$t('before auto cancelation')" v-model.number="autoCancelDays" type="number" />
              <!-- The button is enabled when we hover over the button or ion input looses focus and not when the value is changed -->
              <!-- Todo: need to disable the button if value is unchanged -->
              <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" fill="clear" @click="updateAutoCancelDays()" slot="end">
                {{ $t("Save") }}
              </ion-button>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Check daily") }}</ion-label>
              <ion-toggle :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" :checked="autoCancelCheckDaily" color="secondary" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_CNCL_DAL'], 'EVERYDAY')" />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Unfulfilled orders that pass their auto cancelation date will be canceled automatically in HotWax Commerce. They will also be canceled in Shopify if upload for canceled orders is enabled.") }}</p></ion-label>
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
import { translate } from '@/i18n'
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import { generateJobCustomParameters, hasError, isFutureDate, showToast, prepareRuntime, hasJobDataError } from '@/utils';
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
      isLoading: true
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr',
      getMoreJobs: 'job/getMoreJobs'
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
    async fetchJobs(){
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          "enumTypeId": "FULFILLMENT_SYS_JOB"
        }
      });
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
        this.$t('Disabled')
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
      store
    };
  },
});
</script>
  