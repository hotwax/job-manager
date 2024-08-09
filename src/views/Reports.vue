<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Reports") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="empty-state" v-if="jobsLoading">
        <ion-item lines="none">
          <ion-spinner name="crescent" slot="start" />
          {{ translate("Fetching jobs") }}
        </ion-item>
      </div>
      <main v-else>
        <section>
          <div v-if="!reportsJobs?.length">
            <p class="ion-text-center">{{ translate("There are no reports jobs right now") }}</p>
            <div class="ion-text-center">
              <ion-button fill="outline" @click="refreshJobs()">
                {{ translate('retry') }}
                <ion-spinner v-if="isRetrying" name="crescent" />
              </ion-button>
            </div>
          </div>

          <div v-else>
            <ion-list>
              <ion-list-header>{{ translate("Reports jobs") }}</ion-list-header>
              <ion-item v-for="job in reportsJobs" :key="job.jobId" @click="viewJobConfiguration(job)" detail button>
                <ion-label>{{ job.jobName }}</ion-label>
                <ion-note slot="end">{{ getJobRuntime(job) }}</ion-note>
              </ion-item>
            </ion-list>
            <ion-infinite-scroll @ionInfinite="loadMoreReportsJobs($event)" threshold="100px" :disabled="!isReportsJobsScrollable">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')" />
            </ion-infinite-scroll>
          </div>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob && Object.keys(currentJob).length">
          <JobConfiguration :status="currentJobStatus" :key="currentJob" />
        </aside>
      </main>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import { DateTime } from 'luxon';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router'
import { mapGetters, useStore } from 'vuex'
import emitter from '@/event-bus';
import JobConfiguration from '@/components/JobConfiguration.vue';
import { isFutureDate } from '@/utils';
import { translate } from '@hotwax/dxp-components';

export default defineComponent({
  name: 'Reports',
  components: {
    IonButton,
    IonContent,
    IonHeader,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenuButton,
    IonNote,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToolbar,
    JobConfiguration
  },
  data() {
    return {
      currentJob: '' as any,
      currentJobTitle: '',
      currentJobStatus: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      isRetrying: false,
      jobsLoading: false
    }
  },
  computed: {
    ...mapGetters({
      reportsJobs: 'job/getReportsJobs',
      getCurrentEComStore: 'user/getCurrentEComStore',
      isReportsJobsScrollable: 'job/isReportsJobsScrollable'
    })
  },
  mounted() {
    emitter.on('jobUpdated', this.getReportsJobs);
    this.getReportsJobs();
    emitter.on("productStoreOrConfigChanged", this.getReportsJobs);
  },
  unmounted() {
    emitter.on('jobUpdated', this.getReportsJobs);
    emitter.off("productStoreOrConfigChanged", this.getReportsJobs);
  },
  methods: {
    async viewJobConfiguration(job: any) {
      this.currentJob = job
      this.currentJobStatus = job.status

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob });
      if (!this.isDesktop && job?.jobId) {
        this.router.push({ name: 'JobDetails', params: { jobId: job?.jobId, category: "reports" } });
        return;
      }

      if (job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    async getReportsJobs(viewSize = 200, viewIndex = 0) {
      this.jobsLoading = true;
      this.currentJob = "";
      await this.store.dispatch('job/updateCurrentJob', { });
      this.currentJobStatus = "";
      this.isJobDetailAnimationCompleted = false;
      await this.store.dispatch('job/fetchReportsJobs', { eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex });
      this.jobsLoading = false;
    },
    async loadMoreReportsJobs(event: any) {
      this.getReportsJobs(
        undefined,
        Math.ceil(this.reportsJobs.length / 200) //using 200 as harcoded value, as we are fetching the reports jobs in batches of 200, so we need to find the viewIndex using the same value that is used as viewSize
      ).then(() => {
        event.target.complete();
      })
    },
    async refreshJobs(event?: any) {
      this.isRetrying = true;
      this.getReportsJobs().then(() => {
        if (event) event.target.complete();
        this.isRetrying = false;
      })
    },
    timeFromNow(time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    getJobRuntime(job: any) {
      return job.statusId !== 'SERVICE_DRAFT' && this.timeFromNow(job.runTime) ? this.timeFromNow(job.runTime) : translate('Disabled')
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      router,
      store,
      translate
    };
  },
})
</script>
