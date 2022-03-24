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
          <ion-segment-button value="history">
            <ion-label>{{ $t("History") }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section v-if="segmentSelected === 'pending'">
          <ion-card v-for="job in pendingJobs" :key="job.jobId">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ job.parentJobId }}</p>
                {{ job.jobName }}
              </ion-label>
              <ion-badge v-if="job.runTime" color="dark" slot="end">{{ timeTillJob(job.runTime)}}</ion-badge>
            </ion-item>

            <!-- Will remove it from comment when description is avaiable -->
            <!-- <ion-item lines="none">
              {{ getDescription(job.systemJobEnumId) }}
            </ion-item> -->
            <ion-item>
              <ion-icon slot="start" :icon="timeOutline" />
              <ion-label>{{ job.runTime ? getTime(job.runTime) : "-"  }}</ion-label>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" :icon="timerOutline" />
              <ion-label>{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
            </ion-item>

            <ion-item lines="full">
              <ion-icon slot="start" :icon="codeWorkingOutline" />
              <ion-label>{{ job.serviceName }}</ion-label>
            </ion-item>

            <ion-button fill="clear" @click="skipJob(job)">{{ $t("Skip") }}</ion-button>
            <ion-button color="danger" fill="clear" @click="cancelJob(job.jobId)">{{ $t("Cancel") }}</ion-button>
          </ion-card>

          <ion-infinite-scroll @ionInfinite="loadMorePendingJobs($event)" threshold="100px" :disabled="!isScrollable">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
          </ion-infinite-scroll>
          
        </section>

        <section v-if="segmentSelected === 'history'">
          <ion-card v-for="job in jobHistory" :key="job.jobId">
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ job.parentJobId }}</p>
                {{ job.jobName }}
              </ion-label>
              <ion-badge v-if="job.runTime" color="dark" slot="end">{{ timeTillJob(job.runTime)}}</ion-badge>
            </ion-item>

            <!-- Will remove it from comment when description is avaiable -->
            <!-- <ion-item lines="none">
              {{ getDescription(job.systemJobEnumId) }}
            </ion-item> -->
            <ion-item>
              <ion-icon slot="start" :icon="timeOutline" />
              <ion-label>{{ job.runTime ? getTime(job.runTime) : "-"  }}</ion-label>
            </ion-item>

            <ion-item>
              <ion-icon slot="start" :icon="timerOutline" />
              <ion-label>{{ job.tempExprId ? temporalExpr(job.tempExprId)?.description : "🙃"  }}</ion-label>
            </ion-item>

            <ion-item lines="full">
              <ion-icon slot="start" :icon="codeWorkingOutline" />
              <ion-label>{{ job.serviceName }}</ion-label>
            </ion-item>

          </ion-card>

          <ion-infinite-scroll @ionInfinite="loadMoreJobHistory($event)" threshold="100px" :disabled="!isScrollable">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
          </ion-infinite-scroll>
          
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
import { DateTime } from 'luxon';
import { mapGetters, useStore } from 'vuex'
import { defineComponent, ref } from "vue";
import { showToast } from '@/utils'
import { translate } from '@/i18n'
import {
  IonBadge,
  IonButton,
  IonContent,
  IonCard,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonPage,
  IonToolbar,
  IonTitle,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  alertController,
  IonSegment,
  IonSegmentButton
} from "@ionic/vue";
import { codeWorkingOutline, timeOutline, timerOutline } from "ionicons/icons";

export default defineComponent({
  name: "Pipeline",
  components: {
    IonBadge,
    IonButton,
    IonContent,
    IonCard,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonPage,
    IonToolbar,
    IonTitle,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSegment,
    IonSegmentButton
  },
  computed: {
    ...mapGetters({
      jobHistory: 'job/getJobHistory',
      pendingJobs: 'job/getPendingJobs',
      temporalExpr: 'job/getTemporalExpr',
      getDescription: 'job/getDescription',
      getCurrentEComStore:'user/getCurrentEComStore',
      isScrollable: 'job/isScrollable'
    })
  },
  methods: {
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
    async loadMorePendingJobs (event: any) {
      this.getPendingJobs(
        undefined,
        Math.ceil(this.pendingJobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    segmentChanged (e: CustomEvent) {
      this.segmentSelected = e.detail.value
      this.segmentSelected === 'pending' ? this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0}) : this.store.dispatch('job/fetchJobHistory', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0});
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
        await  this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async getJobHistory(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
        await  this.store.dispatch('job/fetchJobHistory', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async cancelJob(jobId: any){
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
                await this.store.dispatch('job/updateJob', {jobId, statusId: "SERVICE_CANCELLED"});
                await this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewIndex: 0});
              },
            }
          ],
        });

       return alert.present();
    }
  },
  created() {
    this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize:process.env.VUE_APP_VIEW_SIZE, viewIndex:0});
  },
  setup() {
    const store = useStore();
    const segmentSelected = ref('pending');

    return {
      store,
      codeWorkingOutline,
      timeOutline,
      timerOutline,
      segmentSelected
    };
  }
});
</script>

<style scoped>
@media (min-width: 991px) {
  ion-header{
    display: flex;
  }
}
</style>
