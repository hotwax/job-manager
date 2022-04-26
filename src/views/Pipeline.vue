<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Pipeline") }}</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment v-model="segmentSelected" @ionChange="segmentChanged">
          <ion-segment-button value="pending">
            <ion-label>{{ $t("Pending") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="running">
            <ion-label>{{ $t("Running") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history">
            <ion-label>{{ $t("History") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section v-if="segmentSelected === 'pending'">
          <!-- Empty state -->
          <div v-if="pendingJobs?.length === 0">
            <p class="ion-text-center">{{ $t("There are no jobs pending right now")}}</p>
          </div>

          <div v-else>
            <ion-card v-for="job in pendingJobs" :key="job.jobId" @click="viewJobConfiguration(job)" :button="isDesktop">
              <ion-card-header>
                <ion-card-title>{{ getEnumName(job.systemJobEnumId) }}</ion-card-title>
                <ion-badge v-if="job.runTime" color="dark">{{ timeTillJob(job.runTime)}}</ion-badge>
              </ion-card-header>

              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p>{{ getEnumDescription(job.systemJobEnumId) }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label class="ion-text-wrap">{{ job.runTime ? getTime(job.runTime) : "-"  }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timerOutline" />
                <ion-label class="ion-text-wrap">{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
              </ion-item>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="refreshOutline" />
                <ion-label class="ion-text-wrap">{{ job.currentRetryCount }}</ion-label>
              </ion-item>

              <div class="actions">
                <div>
                  <ion-button fill="clear" @click.stop="skipJob(job)">{{ $t("Skip") }}</ion-button>
                  <ion-button color="danger" fill="clear" @click.stop="cancelJob(job)">{{ $t("Cancel") }}</ion-button>
                </div>
                <div>
                  <ion-button fill="clear" color="medium" slot="end" @click.stop="updateSearchPreference(job)">
                    <ion-icon slot="icon-only" :icon="starOutline" />
                  </ion-button>
                  <ion-button fill="clear" color="medium" slot="end">
                    <ion-icon slot="icon-only" :icon="copyOutline" />
                  </ion-button>
                  <ion-button fill="clear" color="medium" slot="end" @click.stop="viewJobHistory()">
                    <ion-icon slot="icon-only" :icon="timeOutline" />
                  </ion-button>
                </div>
              </div> 
            </ion-card>
            <ion-refresher slot="fixed" @ionRefresh="refreshJobs($event)">
              <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
            </ion-refresher>
            <ion-infinite-scroll @ionInfinite="loadMorePendingJobs($event)" threshold="100px" :disabled="!isPendingJobsScrollable">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
            </ion-infinite-scroll>
          </div>
        </section>

        <section v-if="segmentSelected === 'running'">
          <!-- Empty state -->
          <div v-if="runningJobs?.length === 0">
            <p class="ion-text-center">{{ $t("There are no jobs running right now")}}</p>
          </div>

          <div v-else>
            <ion-card v-for="job in runningJobs" :key="job.jobId">
              <ion-card-header>
                <div>
                  <ion-card-subtitle class="overline">{{ job.parentJobId }}</ion-card-subtitle>
                  <ion-card-title>{{ getEnumName(job.systemJobEnumId) }}</ion-card-title>
                </div>
                <ion-badge color="dark">Running</ion-badge>
              </ion-card-header>

              <ion-item lines="none">
                <ion-label class="ion-text-wrap">
                  <p>{{ getEnumDescription(job.systemJobEnumId) }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="timeOutline" />
                <ion-label class="ion-text-wrap">{{ job.runTime ? getTime(job.runTime) : "-"  }}</ion-label>
              </ion-item>

              <ion-item>
                <ion-icon slot="start" :icon="timerOutline" />
                <ion-label class="ion-text-wrap">{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
              </ion-item>

              <ion-item lines="full">
                <ion-icon slot="start" :icon="codeWorkingOutline" />
                <ion-label class="ion-text-wrap">{{ job.serviceName }}</ion-label>
              </ion-item>
            </ion-card>

            <ion-refresher slot="fixed" @ionRefresh="refreshJobs($event)">
              <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
            </ion-refresher>
            <ion-infinite-scroll @ionInfinite="loadMoreRunningJobs($event)" threshold="100px" :disabled="!isRunningJobsScrollable">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
            </ion-infinite-scroll>
          </div> 
        </section>

        <section v-if="segmentSelected === 'history'">
          <!-- Empty state -->
          <div v-if="jobHistory?.length === 0">
            <p class="ion-text-center">{{ $t("No jobs have run yet")}}</p>
          </div>

          <div v-else>
          <ion-card v-for="job in jobHistory" :key="job.jobId">
            <ion-card-header>
              <div>
                <ion-card-subtitle class="overline">{{ job.parentJobId }}</ion-card-subtitle>
                <ion-card-title>{{ getEnumName(job.systemJobEnumId) }}</ion-card-title>
              </div>
              <div>
                <ion-badge v-if="job.runTime" color="dark">{{ timeTillJob(job.runTime)}}</ion-badge>
                <ion-badge v-if="job.statusId" :color="job.statusId === 'SERVICE_FINISHED' ? 'success' : 'danger'">{{ job.statusDesc }}</ion-badge>
              </div>
            </ion-card-header>

            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p>{{ getEnumDescription(job.systemJobEnumId) }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="timeOutline" />
              <ion-label class="ion-text-wrap">{{ job.runTime ? getTime(job.runTime) : "-"  }}</ion-label>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" :icon="timerOutline" />
              <ion-label class="ion-text-wrap">{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
            </ion-item>

            <ion-item lines="full">
              <ion-icon slot="start" :icon="codeWorkingOutline" />
              <ion-label class="ion-text-wrap">{{ job.serviceName }}</ion-label>
            </ion-item>

          </ion-card>

          <ion-refresher slot="fixed" @ionRefresh="refreshJobs($event)">
            <ion-refresher-content pullingIcon="crescent" refreshingSpinner="crescent" />
          </ion-refresher>
          <ion-infinite-scroll @ionInfinite="loadMoreJobHistory($event)" threshold="100px" :disabled="!isHistoryJobsScrollable">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
          </ion-infinite-scroll>
          </div>          
        </section>

        <aside class="desktop-only" v-show="segmentSelected === 'pending' && currentJob">
          <JobConfiguration :title="title" :job="currentJob" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
import { DateTime } from 'luxon';
import { mapGetters, useStore } from 'vuex'
import { defineComponent, ref } from "vue";
import {
  IonBadge,
  IonButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
  IonTitle,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  alertController,
  IonSegment,
  IonSegmentButton,
  isPlatform,
  modalController
} from "@ionic/vue";
import JobConfiguration from '@/components/JobConfiguration.vue'
import { codeWorkingOutline, copyOutline, refreshOutline, starOutline, timeOutline, timerOutline } from "ionicons/icons";
import emitter from '@/event-bus';
import JobHistoryModal from '@/components/JobHistoryModal.vue';

export default defineComponent({
  name: "Pipeline",
  components: {
    IonBadge,
    IonButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonRefresher,
    IonRefresherContent,
    IonToolbar,
    IonTitle,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSegment,
    IonSegmentButton,
    JobConfiguration
  },
  data() {
    return {
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      jobEnums: {
        ...JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
        ...JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
      },
      currentJob: '' as any,
      title: '',
      currentJobStatus: '',
      freqType: '' as any,
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      jobHistory: 'job/getJobHistory',
      pendingJobs: 'job/getPendingJobs',
      runningJobs: 'job/getRunningJobs',
      temporalExpr: 'job/getTemporalExpr',
      getEnumDescription: 'job/getEnumDescription',
      getEnumName: 'job/getEnumName',
      getCurrentEComStore:'user/getCurrentEComStore',
      isPendingJobsScrollable: 'job/isPendingJobsScrollable',
      isRunningJobsScrollable: 'job/isRunningJobsScrollable',
      isHistoryJobsScrollable: 'job/isHistoryJobsScrollable',
      getSearchPreference: 'user/getSearchPreference'
    })
  },
  methods: {
    async viewJobHistory() {
      const jobHistoryModal = await modalController.create({
        component: JobHistoryModal
      });
      return jobHistoryModal.present();
    },
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.TIME_SIMPLE);
    },
    timeTillJob (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    async loadMoreJobHistory(event: any){
      this.getJobHistory(
        undefined,
        Math.ceil(this.jobHistory.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    async loadMoreRunningJobs(event: any){
      this.getRunningJobs(
        undefined,
        Math.ceil(this.runningJobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    async loadMorePendingJobs (event: any) {
      this.getPendingJobs(
        undefined,
        Math.ceil(this.pendingJobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    async refreshJobs(event: any) {
      if(this.segmentSelected === 'pending') {
        this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0}).then(() => { event.target.complete() });
      } else if(this.segmentSelected === 'running') {
        this.store.dispatch('job/fetchRunningJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0}).then(() => { event.target.complete() });
      } else {
        this.store.dispatch('job/fetchJobHistory', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0}).then(() => { event.target.complete() });
      }
    },
    segmentChanged (e: CustomEvent) {
      this.segmentSelected = e.detail.value
      this.segmentSelected === 'pending' ? this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0}) : 
      this.segmentSelected === 'running' ? this.store.dispatch('job/fetchRunningJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0}) :
      this.store.dispatch('job/fetchJobHistory', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0});
    },
    async skipJob (job: any) {
      const alert = await alertController
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
                await this.store.dispatch('job/skipJob', job);
                await this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewIndex: 0})
              },
            }
          ]
        });
      return alert.present();
    },
    async getPendingJobs(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      await this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async getRunningJobs(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      await this.store.dispatch('job/fetchRunningJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async getJobHistory(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
      await this.store.dispatch('job/fetchJobHistory', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async cancelJob(job: any){
      const alert = await alertController
        .create({
          header: this.$t('Cancel job'),
          message: this.$t('Canceling this job will cancel this occurrence and all following occurrences. This job will have to be re-enabled manually to run it again.'),
          buttons: [
            {
              text: this.$t("DON'T CANCEL"),
              role: 'cancel',
            },
            {
              text: this.$t("CANCEL"),
              handler: async () => {
                await this.store.dispatch('job/cancelJob', job);
                await this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewIndex: 0});
              },
            }
          ],
        });

       return alert.present();
    },
    viewJobConfiguration(job: any) {
      if(!this.isDesktop) {
        return;
      }

      this.currentJob = {id: job.jobId, ...job}
      this.title = this.getEnumName(job.systemJobEnumId)
      this.currentJobStatus = job.tempExprId
      const id = Object.entries(this.jobEnums).find((enums) => enums[1] == job.systemJobEnumId) as any
      this.freqType = id && (Object.entries(this.jobFrequencyType).find((freq) => freq[0] == id[0]) as any)[1]

      if (this.currentJob && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    async updateSearchPreference(job: any) {
      const searchPreference = this.getSearchPreference

      if(searchPreference?.searchPrefId) {
        const searchPrefValue = {
          ...searchPreference?.searchPrefValue,
          [job?.systemJobEnumId]: searchPreference?.searchPrefValue[job?.systemJobEnumId] || !searchPreference?.searchPrefValue[job?.systemJobEnumId] ? !searchPreference?.searchPrefValue[job?.systemJobEnumId] : true
        }

        const payload = {
          "searchPrefId": searchPreference?.searchPrefId,
          "searchPrefValue": searchPrefValue,
        }
        this.store.dispatch('user/updateSearchPreference', payload);
      } else {
        const payload = {
          searchPrefValue: {
            [job?.systemJobEnumId]: true
          }
        }
        this.store.dispatch('user/createSearchPreference', payload);
      }
    }
  },
  created() {
    this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0});
  },
  setup() {
    const store = useStore();
    const segmentSelected = ref('pending');

    return {
      copyOutline,
      store,
      codeWorkingOutline,
      refreshOutline,
      timeOutline,
      timerOutline,
      segmentSelected,
      starOutline
    };
  }
});
</script>

<style scoped>
ion-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0px;
}

ion-card-header :last-child {
  display: flex;
  flex-direction: column;
  align-items: end;
  row-gap: 4px;
}

ion-item {
  --background: transparent;
}

.actions {
  display: flex;
  justify-content: space-between;
}

@media (min-width: 991px) {
  ion-header{
    display: flex;
  }
}
</style>
