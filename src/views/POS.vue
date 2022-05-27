<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("POS") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Import") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration('IMP_SALES', 'Sales', getJobStatus(this.jobEnums['IMP_SALES']))" lines="none" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Sales") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_SALES') }}</ion-label>
            </ion-item>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ $t("Upload") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration('IMP_ECOM_SALES', 'eCommerce sales', getJobStatus(this.jobEnums['IMP_ECOM_SALES']))" detail button>
              <ion-label class="ion-text-wrap">{{ $t("eCommerce sales") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('IMP_ECOM_SALES') }}</ion-label>
            </ion-item>
            <ion-item @click="viewJobConfiguration('SHIPPED_INVENTORY', 'Shipped inventory', getJobStatus(this.jobEnums['SHIPPED_INVENTORY']))" lines="none" detail button>
              <ion-label class="ion-text-wrap">{{ $t("Shipped inventory") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('SHIPPED_INVENTORY') }}</ion-label>
            </ion-item>
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  isPlatform,
  alertController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import { isFutureDate } from '@/utils';
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import emitter from '@/event-bus';
import { DateTime } from 'luxon';


export default defineComponent({
  name: 'POS',
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
    IonTitle,
    IonToolbar,
    JobConfiguration
  },
  data() {
    return {  
      jobEnums: JSON.parse(process.env?.VUE_APP_POS_JOB_ENUMS as string) as any,
      batchJobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      title: 'New orders',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      orderBatchJobs: "job/getOrderBatchJobs",
      shopifyConfigId: 'user/getShopifyConfigId',
      currentEComStore: 'user/getCurrentEComStore',
      getTemporalExpr: 'job/getTemporalExpr'
    })
  },
  methods: {
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
      console.log(this.currentJob)
    },  
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_MED);
    },
        async updateJob(checked: boolean, id: string, status = 'EVERY_15_MIN') {
      const job = this.getJob(id);

      // TODO: added this condition to not call the api when the value of the select automatically changes
      // need to handle this properly
      if (!job || (checked && job?.status === 'SERVICE_PENDING') || (!checked && job?.status === 'SERVICE_DRAFT')) {
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
        this.store.dispatch('job/scheduleService', job)
      } else if (job?.status === 'SERVICE_PENDING') {
        this.store.dispatch('job/updateJob', job)
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
     const router = useRouter();
     
     return {
       router,
       store  
     }
  }
});
</script>

<style scoped>
@media (min-width: 991px) {
  section {
    width: 444px;
  } 
}
</style>
