<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Pre-order") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto listing") }}</ion-card-title>
            </ion-card-header>
            <ion-item button @click="viewJobConfiguration('LIST_PRE_ORDER', 'Automatically list pre-order', getJobStatus(this.jobEnums['LIST_PRE_ORDER']))" detail>
              <ion-label class="ion-text-wrap">{{ $t("Automatically list pre-order") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('LIST_PRE_ORDER') }}</ion-label>
            </ion-item>
            <ion-item button @click="viewJobConfiguration('LIST_BACK_ORDER', 'Automatically list back-order', getJobStatus(this.jobEnums['LIST_BACK_ORDER']))" detail>
              <ion-label class="ion-text-wrap">{{ $t("Automatically list back-order") }}</ion-label>
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
              <ion-label class="ion-text-wrap">{{ $t("Allocation") }}</ion-label>
              <ion-button fill="outline" color="danger" slot="end" @click="runJob('Allocation', jobEnums['REALLOC_PRODR'])">{{ $t("Run reallocation") }}</ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Re-allocation will re-allocate promise dates on all pre-orders based on upcoming inventory from purchase orders. Promise dates that were manually adjusted will be overriden.") }}</p></ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Auto releasing") }}</ion-card-title>
            </ion-card-header>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Run daily") }}</ion-label>
              <ion-checkbox :checked="autoReleaseRunDaily" @ionChange="updateJob($event['detail'].checked, jobEnums['AUTO_RELSE_DAILY'])" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Release preorders")}}</ion-label>
              <ion-button fill="outline" @click="runJob('Release preorders', jobEnums['AUTO_RELSE_DAILY'])">{{ $t("Release") }}</ion-button>
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
              <ion-label class="ion-text-wrap">{{ $t("Auto add pre-order tag in Shopify") }}</ion-label>
              <ion-checkbox :checked="addPreOrderTagInShopify" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_PRODR_TG_SHPFY'], 'EVERY_15_MIN')" />
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Auto remove tags in Shopify") }}</ion-label>
              <ion-checkbox :checked="removeTagInShopify" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['REMV_ODR_TG_SHPFY'], 'EVERY_15_MIN')"/>
            </ion-item>
            <ion-item>
              <ion-label class="ion-text-wrap">{{ $t("Add shipping dates in Shopify") }}</ion-label>
              <ion-checkbox :checked="addShippingDateInShopify" slot="end" @ionChange="updateJob($event['detail'].checked, jobEnums['ADD_SHPG_DTE_SHPFY'], 'EVERY_15_MIN')"/>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap"><p>{{ $t("Transfer pre-order related information to Shopify as tags and meta fields.") }}</p></ion-label>
            </ion-item>
          </ion-card>
        </section>

        <aside class="desktop-only" v-show="currentJob">
          <JobDetail :title="title" :job="currentJob" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
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
  IonTitle,
  IonToolbar
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from "@/store";
import { mapGetters } from "vuex";
import { DateTime } from 'luxon';
import { alertController } from '@ionic/vue';
import JobDetail from '@/components/JobDetail.vue'
import { isValidDate } from '@/utils';
import emitter from '@/event-bus';

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
    },
    autoReleaseRunDaily(): boolean {
      const status = this.getJobStatus(this.jobEnums["AUTO_RELSE_DAILY"]);
      return status && status !== "SERVICE_DRAFT";
    }
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      title: 'Automatically list pre-order',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false
    }
  },
  methods: {
    async updateJob(checked: boolean, id: string, status = 'MIDNIGHT_DAILY') {
      const job = this.getJob(id);
      job['jobStatus'] = status

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (!job || (checked && job?.status === 'SERVICE_PENDING') || (!checked && job?.status === 'SERVICE_DRAFT')) {
        return;
      }

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isValidDate(job?.runTime)) {
        job.runTime = ''
      }

      if (!checked) {
        this.store.dispatch('job/cancelJob', job)
      } else if (job?.status === 'SERVICE_DRAFT') {
        this.store.dispatch('job/scheduleService', job)
      } else if (job?.status === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job)
      }
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
    viewJobConfiguration(id: string, title: string, status: string) {
      this.currentJob = this.getJob(this.jobEnums[id])
      this.title = title
      this.currentJobStatus = status
      this.freqType = this.jobFrequencyType[id]

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isValidDate(this.currentJob?.runTime)) {
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

    return {
      store
    };
  },
});
</script>
