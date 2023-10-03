<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Brokering") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <ion-card @click="selectedCard = 'routing'">
            <ion-card-header>
              <ion-card-title :color="updateColor(selectedCard,'routing',currentJob)">{{ $t("Routing") }}</ion-card-title>
            </ion-card-header>
            <ion-item @click="viewJobConfiguration({ id: 'REJ_ORDR', status: getJobStatus(jobEnums['REJ_ORDR'])})" detail button>
              <ion-label class="ion-text-wrap" :color="updateColor(jobEnums['REJ_ORDR'], currentJob?.systemJobEnumId, currentJob)">{{ $t("Rejected orders") }}</ion-label>
              <ion-label slot="end">{{ getTemporalExpression('REJ_ORDR') }}</ion-label>
            </ion-item>
            <ion-item-divider>
              <ion-label class="ion-text-wrap">{{ $t("Batches") }}</ion-label>
              <ion-button :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" fill="clear" @click="addBatch()" slot="end">
                {{ $t("Add") }}
                <ion-icon :icon="addCircleOutline" slot="end" />
              </ion-button>
            </ion-item-divider>

            <ion-list ref="slidingOptions">
              <ion-item-sliding v-for="batch in orderBatchJobs" :key="batch?.id" detail v-show="batch?.status === 'SERVICE_PENDING'">
                <ion-item @click="hasPermission(Actions.APP_JOB_UPDATE) && editBatch(batch.id, batch.systemJobEnumId)" button>
                  <ion-label class="ion-text-wrap">{{ batch?.jobName }}</ion-label>
                  <ion-note slot="end">{{ batch?.runTime ? getTime(batch.runTime) : '' }}</ion-note>
                </ion-item>
                <ion-item-options side="start">
                  <ion-item-option @click="hasPermission(Actions.APP_JOB_UPDATE) && skipBatch(batch)" color="secondary">
                    <ion-icon slot="icon-only" :icon="arrowRedoOutline" />
                  </ion-item-option>
                </ion-item-options>
                <ion-item-options side="end">
                  <ion-item-option @click="hasPermission(Actions.APP_JOB_UPDATE) && deleteBatch(batch)" color="danger">
                    <ion-icon slot="icon-only" :icon="trashOutline" />
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </ion-list>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ $t("Create batches and schedule brokering for different orders.") }}</p>
              </ion-label>
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
  alertController,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
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
  IonToolbar,
  isPlatform,
  modalController
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { translate } from '@/i18n'
import { addCircleOutline, arrowRedoOutline, trashOutline } from 'ionicons/icons';
import BatchModal from '@/components/BatchModal.vue';
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import JobConfiguration from '@/components/JobConfiguration.vue';
import { DateTime } from 'luxon';
import { hasError, isFutureDate, showToast } from '@/utils';
import emitter from '@/event-bus';
import MoreJobs from '@/components/MoreJobs.vue';
import { Actions, hasPermission } from '@/authorization'
import {updateColor} from '@/utils';
export default defineComponent({
  name: 'Brokering',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
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
    IonToolbar,
    JobConfiguration,
    MoreJobs
  },
  data() {
    return {
      jobEnums: JSON.parse(process.env?.VUE_APP_BROKER_JOB_ENUMS as string) as any,
      batchJobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      currentJob: '' as any,
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      enumTypeId: 'BROKER_SYS_JOB',
      initialLoadJobEnums: JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      selectedCard: ''
    }
  },
  computed: {
    ...mapGetters({
      getJobStatus: 'job/getJobStatus',
      getJob: 'job/getJob',
      orderBatchJobs: "job/getOrderBatchJobs",
      getTemporalExpr: 'job/getTemporalExpr',
      getMoreJobs: 'job/getMoreJobs'
    }),
  },
  methods: {
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
    async viewJobConfiguration(jobInformation: any) {
      this.currentJob = jobInformation.job || this.getJob(this.jobEnums[jobInformation.id])
      this.currentJobStatus = jobInformation.status
      this.freqType = jobInformation.id && this.jobFrequencyType[jobInformation.id]

      // if job runTime is not a valid date then making runTime as empty
      if (this.currentJob?.runTime && !isFutureDate(this.currentJob?.runTime)) {
        this.currentJob.runTime = ''
      }

      await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob });
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
    },
    async fetchJobs(){
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          // If we fetch broker sys job by not passing systemJobEnumId filter then this api
          // call will fetch all the broker jobs which includes batch jobs also and will cause an error (jobs is not iterable) 
          // in getBatchJobs getters as jobs will be stored as objects in state
          "systemJobEnumId": Object.values(this.batchJobEnums).map((jobEnum: any) => jobEnum.id),
          "systemJobEnumId_op": "not-in",
          "enumTypeId": "BROKER_SYS_JOB"
        }
      });
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": {
          "systemJobEnumId": Object.values(this.batchJobEnums).map((jobEnum: any) => jobEnum.id),
          "systemJobEnumId_op": "in"
        }
      });
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
      hasPermission,
      addCircleOutline,
      arrowRedoOutline,
      router,
      store,
      trashOutline,
      updateColor
    };
  },
});
</script>