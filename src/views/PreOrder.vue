<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Pre-order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main ref="main">
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto listing") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration('LIST_PRE_ORDER', 'Automatically list pre-order', getJobStatus(this.jobEnums['LIST_PRE_ORDER']))" detail>
              <ion-label>{{ $t("Automatically list pre-order") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('LIST_PRE_ORDER') }}</ion-label>
            </ion-item>
            <ion-item button @click="viewJobConfiguration('LIST_BACK_ORDER', 'Automatically list back-order', getJobStatus(this.jobEnums['LIST_BACK_ORDER']))" detail>
              <ion-label>{{ $t("Automatically list back-order") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('LIST_BACK_ORDER') }}</ion-label>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("This will automatically list items from purchase orders for preorder when stock runs out.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Re-allocate pre-orders") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Allocation") }}</ion-label>
              <!-- TODO: env file entry = REALLOC_PRODR -->
              <ion-button fill="outline" color="danger" slot="end" @click="runJob('Allocation')">{{ $t("Run reallocation") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Re-allocation will re-allocate promise dates on all pre-orders based on upcoming inventory from purchase orders. Promise dates that were manually adjusted will be overriden.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto releasing") }}</ion-card-title>
            </ion-card-header>
            <!-- TODO: env file entry = AUTO_RELSE_DAILY, run time 12 am daily-->
            <ion-item>
              <ion-label>{{ $t("Run daily") }}</ion-label>
              <ion-checkbox slot="end" />
            </ion-item>
            <!-- TODO: env file entry = AUTO_RELSE_DAILY, run now, run as user, count: 1-->
            <ion-item>
              <ion-label>{{ $t("Release preorders")}}</ion-label>
              <ion-button fill="outline" @click="runJob('Release preorders')">{{ $t("Release") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Auto releasing pre-orders will find pre-orders that have promise dates that have passed and release them from fulfillment.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Sync") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label>{{ $t("Auto add pre-order tag in Shopify") }}</ion-label>
              <ion-checkbox :checked="addPreOrderTagInShopify" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_PRODR_TG_SHPFY'])" />
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Auto remove tags in Shopify") }}</ion-label>
              <ion-checkbox :checked="removeTagInShopify" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['REMV_ODR_TG_SHPFY'])"/>
            </ion-item>
            <ion-item>
              <ion-label>{{ $t("Add shipping dates in Shopify") }}</ion-label>
              <ion-checkbox :checked="addShippingDateInShopify" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_SHPG_DTE_SHPFY'])"/>
            </ion-item>
            <!-- TODO: run all sync jobs with time diff of 2 mins and run now and count: 1 -->
            <ion-item>
              <ion-label>{{ $t("Manual update") }}</ion-label>
              <ion-button fill="outline" @click="runJob('Manual update')">{{ $t("Run sync now") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Transfer pre-order related information to Shopify as tags and meta fields.") }}</p></ion-label>
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
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent, ref } from 'vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";
import { DateTime } from 'luxon';
import { alertController } from '@ionic/vue';
import JobDetail from '@/components/JobDetail.vue'

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
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonTitle,
    IonToolbar,
    JobDetail
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr'
    }),
    automaticallyListPreOrder(): boolean {
      const status = this.getJobStatus(this.jobEnums["LIST_PRE_ORDER"]);
      return status && status !== "SERVICE_DRAFT";
    },
    automaticallyListBackOrder(): boolean {
      const status = this.getJobStatus(this.jobEnums["LIST_BACK_ORDER"]);
      return status && status !== "SERVICE_DRAFT";
    },
    addPreOrderTagInShopify(): boolean {
      const status = this.getJobStatus(this.jobEnums["ADD_PRODR_TG_SHPFY"]);
      return status && status !== "SERVICE_DRAFT";
    },
    removeTagInShopify(): boolean {
      const status = this.getJobStatus(this.jobEnums["REMV_ODR_TG_SHPFY"]);
      return status && status !== "SERVICE_DRAFT";
    },
    addShippingDateInShopify(): boolean {
      const status = this.getJobStatus(this.jobEnums["ADD_SHPG_DTE_SHPFY"]);
      return status && status !== "SERVICE_DRAFT";
    }
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '',
      title: '',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false
    }
  },
  methods: {
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
        this.store.dispatch('job/updateJob', payload)
      } else if (job?.status === 'SERVICE_DRAFT') {
        payload['JOB_NAME'] = job.jobName
        payload['SERVICE_NAME'] = job.serviceName
        payload['SERVICE_TIME'] = job.runTime.toString()
        payload['SERVICE_COUNT'] = '0'
        payload['jobFields'] = {
          'productStoreId': this.currentEComStore.productStoreId,
          'systemJobEnumId': job.systemJobEnumId,
          'tempExprId': 'EVERY_15_MIN',
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
        payload['tempExprId'] = 'EVERY_15_MIN'
        payload['jobId'] = job.id

        this.store.dispatch('job/updateJob', payload)
      }
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
      aside,
      main,
      store
    };
  },
});
</script>
