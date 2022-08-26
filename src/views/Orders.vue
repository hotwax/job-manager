<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Import") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration('IMP_NEW_ORDERS', 'New orders', getJobStatus(this.jobEnums['IMP_NEW_ORDERS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("New orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_NEW_ORDERS') }}</ion-label>
            </ion-item>
            <ion-item @click="viewJobConfiguration('IMP_CANCELLED_ORDERS', 'Cancelled orders', getJobStatus(this.jobEnums['IMP_CANCELLED_ORDERS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Cancelled orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_CANCELLED_ORDERS') }}</ion-label>
            </ion-item>
            <ion-item @click="viewJobConfiguration('IMP_CANCELLED_ITEMS', 'Cancelled items', getJobStatus(this.jobEnums['IMP_CANCELLED_ITEMS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Cancelled items") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_CANCELLED_ITEMS') }}</ion-label>
            </ion-item>
            <ion-item @click="viewJobConfiguration('IMP_PAYMENT_STATUS', 'Payment status', getJobStatus(this.jobEnums['IMP_PAYMENT_STATUS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Payment status") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_PAYMENT_STATUS') }}</ion-label>
            </ion-item>
            <ion-item @click="viewJobConfiguration('IMP_RETURNS', 'Returns', getJobStatus(this.jobEnums['IMP_RETURNS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Returns") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_RETURNS') }}</ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Webhooks") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("New orders") }}</ion-label>
              <ion-toggle :checked="isNewOrders" @ionChange="updateWebhook($event['detail'].checked, 'NEW_ORDERS')" slot="end" color="secondary" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Cancelled orders") }}</ion-label>
              <ion-toggle :checked="isCancelledOrders" @ionChange="updateWebhook($event['detail'].checked, 'CANCELLED_ORDERS')" slot="end" color="secondary" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Payment status") }}</ion-label>
              <ion-toggle :checked="isPaymentStatus" @ionChange="updateWebhook($event['detail'].checked, 'PAYMENT_STATUS')" slot="end" color="secondary" />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">{{ $t("Returns") }}</ion-label>
              <ion-toggle :checked="isReturns" @ionChange="updateWebhook($event['detail'].checked, 'RETURNS')" slot="end" color="secondary" />
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Upload") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration('UPLD_CMPLT_ORDRS', 'Completed orders', getJobStatus(this.jobEnums['UPLD_CMPLT_ORDRS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Completed orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('UPLD_CMPLT_ORDRS') }}</ion-label>
            </ion-item>
            <ion-item @click="viewJobConfiguration('UPLD_CNCLD_ORDRS', 'Cancelled orders', getJobStatus(this.jobEnums['UPLD_CNCLD_ORDRS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Cancelled orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('UPLD_CNCLD_ORDRS') }}</ion-label>
            </ion-item>
            <ion-item @click="viewJobConfiguration('UPLD_REFUNDS', 'Refunds', getJobStatus(this.jobEnums['UPLD_REFUNDS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Refunds") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('UPLD_REFUNDS') }}</ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto cancelations") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Days") }}</ion-label>
              <ion-input :placeholder="$t('before auto cancelation')" v-model.number="autoCancelDays" type="number" />
              <!-- The button is enabled when we hover over the button or ion input looses focus and not when the value is changed -->
              <!-- Todo: need to disable the button if value is unchanged -->
              <ion-button fill="clear" @click="updateAutoCancelDays()" slot="end">
                {{ $t("Save") }}
              </ion-button>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Check daily") }}</ion-label>
              <ion-toggle :checked="autoCancelCheckDaily" color="secondary" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_CNCL_DAL'], 'EVERYDAY')" />
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Unfulfilled orders that pass their auto cancelation date will be canceled automatically in HotWax Commerce. They will also be canceled in Shopify if upload for canceled orders is enabled.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Notes") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Promise date changes") }}</ion-label>
              <ion-toggle :checked="promiseDateChanges" color="secondary" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['NTS_PRMS_DT_CHNG'])"/>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Routing") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration('REJ_ORDR', 'Rejected orders', getJobStatus(this.jobEnums['REJ_ORDR']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Rejected orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('REJ_ORDR') }}</ion-label>
            </ion-item>
            <ion-item-divider>
              <ion-label class="ion-text-wrap">{{ $t("Batches") }}</ion-label>
              <ion-button fill="clear" @click="addBatch()" slot="end">
                {{ $t("Add") }}
                <ion-icon :icon="addCircleOutline" slot="end" />
              </ion-button>
            </ion-item-divider>

            <ion-list ref="slidingOptions">
              <ion-item-sliding v-for="batch in orderBatchJobs" :key="batch?.id" detail v-show="batch?.status === 'SERVICE_PENDING'">
                <ion-item @click="editBatch(batch.id, batch.systemJobEnumId)" button>
                  <ion-label class="ion-text-wrap">{{ batch?.jobName }}</ion-label>
                  <ion-note slot="end">{{ batch?.runTime ? getTime(batch.runTime) : '' }}</ion-note>
                </ion-item>
                <ion-item-options side="start">
                  <ion-item-option @click="skipBatch(batch)" color="secondary">
                    <ion-icon slot="icon-only" :icon="arrowRedoOutline" />
                  </ion-item-option>
                </ion-item-options>
                <ion-item-options side="end">
                  <ion-item-option @click="deleteBatch(batch)" color="danger">
                    <ion-icon slot="icon-only" :icon="trash" />
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </ion-list>
          </ion-card>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob">
          <JobConfiguration :title="title" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  alertController,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonItemSliding,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonItemOption,
  IonItemOptions,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  isPlatform,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { translate } from '@/i18n'
import { addCircleOutline, arrowRedoOutline, trash } from 'ionicons/icons';
import BatchModal from '@/components/BatchModal.vue';
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import { DateTime } from 'luxon';
import { hasError, isFutureDate, showToast, prepareRuntime } from '@/utils';
import emitter from '@/event-bus';
import { JobService } from '@/services/JobService'

export default defineComponent({
  name: 'Orders',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonItemSliding,
    IonItemDivider,
    IonLabel,
    IonList,
    IonMenuButton,
    IonNote,
    IonItemOption,
    IonItemOptions,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
    JobConfiguration
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
      batchJobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      webhookEnums: JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any,
      currentJob: '' as any,
      title: 'New orders',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      autoCancelDays: ''
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      orderBatchJobs: "job/getOrderBatchJobs",
      currentShopifyConfigId: 'user/getCurrentShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr',
      getCachedWebhook: 'webhook/getCachedWebhook'
    }),
    promiseDateChanges(): boolean {
      const status = this.getJobStatus(this.jobEnums['NTS_PRMS_DT_CHNG']);
      return status && status !== "SERVICE_DRAFT";
    },
    autoCancelCheckDaily(): boolean {
      const status = this.getJobStatus(this.jobEnums["AUTO_CNCL_DAL"]);
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
        await this.store.dispatch('webhook/unsubscribeWebhook', { webhookId: webhook?.id, shopifyConfigId: this.currentShopifyConfigId })
      }
    },
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
          console.error(err)
        }
      } else {
        showToast(translate('Unable to update auto cancel days. None product store selected.'));
      }
    },
    async addBatch() {
      const batchmodal = await modalController.create({
        component: BatchModal
      });
      return batchmodal.present();
    },
    async editBatch(id: string, enumId: string) {
      const batchmodal = await modalController.create({
        component: BatchModal,
        componentProps: {id, enumId}
      });
      return batchmodal.present();
    },
    async deleteBatch(batch: any) {
      const deleteBatchAlert = await alertController
        .create({
          header: this.$t('Cancel job'),
          message: this.$t("Canceling this job will cancel this occurrence and all following occurrences. This job will have to be re-enabled manually to run it again."),
          buttons: [
            {
              text: this.$t("Don't cancel"),
              role: 'cancel',
            },
            {
              text: this.$t("Cancel"),
              handler: async () => {
                await this.store.dispatch('job/cancelJob', batch);
              },
            },
          ],
        });
      return deleteBatchAlert.present();
    },
    async skipBatch (batch: any) {
      const skipJobAlert = await alertController
        .create({
          header: this.$t('Skip job'),
          message: this.$t('Skipping will run this job at the next occurrence based on the temporal expression.'),
          buttons: [
            {
              text: this.$t("Don't skip"),
              role: 'cancel',
            },
            {
              text: this.$t('Skip'),
              handler: async () => {
                this.store.dispatch('job/skipJob', batch).then((resp) => {
                  if (resp.status === 200 && !hasError(resp)) {
                    showToast(translate("This job has been skipped"));
                  } else {
                    showToast(translate("This job schedule cannot be skipped"));
                  }
                });
                (this as any).$refs.slidingOptions.$el.closeSlidingItems();
              },
            }
          ]
        });
      return skipJobAlert.present();
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
    async updateJob(checked: boolean, id: string, status = 'EVERY_15_MIN') {
      const job = this.getJob(id);

      // added check that if the job is not present, then display a toast and then return
      if (!job) {
        showToast(translate('Configuration missing'))
        return;
      }

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
        this.store.dispatch('job/scheduleService', job)
      } else if (job?.status === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job)
      }
    },
    async viewJobConfiguration(id: string, title: string, status: string) {
      this.currentJob = this.getJob(this.jobEnums[id])
      this.title = title
      this.currentJobStatus = status
      this.freqType = id && this.jobFrequencyType[id]

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isFutureDate(this.currentJob?.runTime)) {
        this.currentJob.runTime = ''
      }

      await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob });
      if(!this.isDesktop && this.currentJob) {
        this.router.push({name: 'JobDetails', params: { title: this.title, jobId: this.currentJob.jobId, category: "orders"}});
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
    async getAutoCancelDays(){
      const payload = {
        "inputFields": {
          'productStoreId': this.currentEComStore.productStoreId,
        },
        "fieldList": [ 'daysToCancelNonPay' ],
        "entityName": "ProductStore",
        "noConditionFind": "Y"
      }
      try {
        const resp = await JobService.getAutoCancelDays(payload);
        if (resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0 ) {
          this.autoCancelDays = resp.data.docs[0].daysToCancelNonPay;
        } else {
          console.error(resp)
          this.autoCancelDays = "";
        }
      } catch (err) {
        console.error(err)
        this.autoCancelDays = "";
      }
    }
  },
  mounted () {
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.jobEnums),
        "systemJobEnumId_op": "in"
      }
    });
    this.store.dispatch("job/fetchJobs", {
      "inputFields":{
        "systemJobEnumId": Object.values(this.batchJobEnums).map((jobEnum: any) => jobEnum.id),
        "systemJobEnumId_op": "in"
      }
    });
    this.store.dispatch('webhook/fetchWebhooks')
    if (this.currentEComStore.productStoreId) {
      this.getAutoCancelDays();
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      addCircleOutline,
      arrowRedoOutline,
      router,
      store,
      trash,
    };
  },
});
</script>
