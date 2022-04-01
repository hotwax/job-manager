<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Orders") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main ref="main">
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
              <ion-input :placeholder="$t('before auto cancelation')" />
            </ion-item>
            <!-- TODO: run at 12 am daily -->
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Check daily") }}</ion-label>
              <ion-toggle color="secondary" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_CNCL_DAL'])" />
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
              <ion-toggle color="secondary" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Reroutes") }}</ion-label>
              <ion-toggle color="secondary" />
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
            <ion-item @click="viewJobConfiguration('UNFIL_ORDERS', 'Unfillable orders', getJobStatus(this.jobEnums['UNFIL_ORDERS']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Unfillable orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('UNFIL_ORDERS') }} </ion-label>
            </ion-item>
            <ion-item-divider>
              <ion-label class="ion-text-wrap">{{ $t("Batches") }}</ion-label>
              <ion-button fill="clear" @click="editBatch()" slot="end">
                {{ $t("Add") }}
                <ion-icon :icon="addCircleOutline" slot="end" />
              </ion-button>
            </ion-item-divider>
            <ion-item detail>
              <ion-label class="ion-text-wrap">Batch 1</ion-label>
              <ion-note slot="end">9:30 am</ion-note>
            </ion-item>
            <ion-item detail>
              <ion-label class="ion-text-wrap">Batch 2</ion-label>
              <ion-note slot="end">12:00 pm</ion-note>
            </ion-item>
            <ion-item detail>
              <ion-label class="ion-text-wrap">Batch 3</ion-label>
              <ion-note slot="end">3:00 pm</ion-note>
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only" v-show="currentJob" ref="aside">
          <JobDetail :title="title" :job="currentJob" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  createAnimation,
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
  IonLabel,
  IonMenuButton,
  IonNote,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { addCircleOutline } from 'ionicons/icons';
import BatchModal from '@/components/BatchModal.vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";
import JobDetail from '@/components/JobDetail.vue';
import { DateTime } from 'luxon';

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
    IonItemDivider,
    IonLabel,
    IonMenuButton,
    IonNote,
    IonPage,
    IonTitle,
    IonToggle,
    IonToolbar,
    JobDetail
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '',
      title: 'New orders',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr'
    })
  },
  methods: {  
    async editBatch() {
      const batchmodal = await modalController.create({
        component: BatchModal
      });
      return batchmodal.present();
    },
    async updateJob(checked: boolean, id: string) {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (checked && job?.status === 'SERVICE_PENDING') {
        return;
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
        payload['SERVICE_TIME'] = job.runTime.toString()
        payload['SERVICE_COUNT'] = '0'
        payload['jobFields'] = {
          'productStoreId': this.currentEComStore.productStoreId,
          'systemJobEnumId': job.systemJobEnumId,
          'tempExprId': 'DAILY',
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
        payload['tempExprId'] = 'DAILY'
        payload['jobId'] = job.id

        this.store.dispatch('job/updateJob', payload)
      }
    },
    viewJobConfiguration(id: string, title: string, status: string) {
      this.currentJob = this.getJob(this.jobEnums[id])
      this.title = title
      this.currentJobStatus = status
      this.freqType = this.jobFrequencyType[id]

      if (this.currentJob && !this.isJobDetailAnimationCompleted) {
        const revealAnimation = createAnimation()
        .addElement(this.aside)
        .duration(1500)
        .easing('ease')
         .keyframes([
          { offset: 0, flex: '0', opacity: '0' },
          { offset: 0.5, flex: '1', opacity: '0' },
          { offset: 1, flex: '1', opacity: '1' }
        ])

        const gapAnimation = createAnimation()
          .addElement(this.main)
          .duration(500)
          .fromTo('gap', '0', 'var(--spacer-2xl)');

        createAnimation()
          .addAnimation([gapAnimation, revealAnimation])
          .play();
        this.isJobDetailAnimationCompleted = true;
      }
    },
    getTemporalExpression(enumId: string) {
      return this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description ?
        this.getTemporalExpr(this.getJobStatus(this.jobEnums[enumId]))?.description :
        this.$t('Disabled')
    },
    async runJob(header: string) {
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
              text: this.$t('Run now')
            }
          ]
        });

      return jobAlert.present();
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
    const main = ref({} as Element)
    const aside = ref({} as Element)

    return {
      addCircleOutline,
      aside,
      main,
      store
    };
  },
});
</script>
