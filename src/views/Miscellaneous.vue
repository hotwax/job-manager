<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Miscellaneous") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <!-- Empty state -->
          <div v-if="miscellaneousJobs?.length === 0">
            <p class="ion-text-center">{{ $t("There are no miscellaneous jobs right now")}}</p>
            <div class="ion-text-center">
              <ion-button fill="outline" @click="refreshJobs()">
                {{ $t('retry') }}
                <ion-spinner v-if="isRetrying" name="crescent" />
              </ion-button>
            </div>
          </div>

          <div v-else>
            <ion-list>
              <ion-list-header>{{ $t("Miscellaneous jobs") }}</ion-list-header>
              <ion-item v-for="job in miscellaneousJobs" :key="job.jobId" @click="hasPermission(Actions.APP_JOB_UPDATE) && viewJobConfiguration(job)" detail button>
                <ion-label>{{ job.jobName }}</ion-label>
                <ion-note slot="end">{{ getJobRuntime(job) }}</ion-note>
              </ion-item>
            </ion-list>

            <ion-infinite-scroll @ionInfinite="loadMoreMiscellaneousJobs($event)" threshold="100px" :disabled="!isMiscellaneousJobsScrollable">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
            </ion-infinite-scroll>
          </div>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob && Object.keys(currentJob).length">
          <JobConfiguration :title="currentJobTitle" :status="currentJobStatus" :key="currentJob"/>
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
import { Actions, hasPermission } from '@/authorization'

export default defineComponent({
  name: 'Miscellaneous',
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
  mounted() {
    this.getMiscellaneousJobs();
  },
  data() {
    return {
      currentJob: '' as any,
      currentJobTitle: '',
      currentJobStatus: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      isRetrying: false,
    }
  },
  computed: {
    ...mapGetters({
      miscellaneousJobs: 'job/getMiscellaneousJobs',
      getCurrentEComStore:'user/getCurrentEComStore',
      isMiscellaneousJobsScrollable: 'job/isMiscellaneousJobsScrollable'
    })
  },
  methods: {
    async viewJobConfiguration(job: any) {
      this.currentJob = job
      this.currentJobTitle = job.jobName
      this.currentJobStatus = job.status

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob });
      if(!this.isDesktop && job?.jobId) {
        this.router.push({name: 'JobDetails', params: { title: this.currentJobTitle, jobId: job?.jobId, category: "miscellaneous"}});
        return;
      }

      if (job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    async getMiscellaneousJobs(viewSize = 20, viewIndex = 0) {
      await this.store.dispatch('job/fetchMiscellaneousJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async loadMoreMiscellaneousJobs (event: any) {
      this.getMiscellaneousJobs(
        undefined,
        Math.ceil(this.miscellaneousJobs.length / (process.env.VUE_APP_VIEW_SIZE as any))
      ).then(() => {
        event.target.complete();
      })
    },
    async refreshJobs(event?: any) {
      this.isRetrying = true;
      this.getMiscellaneousJobs().then(() => {
        if(event) event.target.complete();
        this.isRetrying = false;
      })
    },
    timeFromNow (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
    getJobRuntime(job: any) {
      return job.statusId !== 'SERVICE_DRAFT' && this.timeFromNow(job.runTime) ? this.timeFromNow(job.runTime) : this.$t('Disabled')
    }
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      Actions,
      hasPermission,
      router,
      store,
    };
  },
})
</script>
