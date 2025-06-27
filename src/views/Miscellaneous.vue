<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Miscellaneous") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <section>
          <!-- Empty state -->
          <div v-if="miscellaneousJobs?.length === 0">
            <p class="ion-text-center">{{ translate("There are no miscellaneous jobs right now")}}</p>
            <div class="ion-text-center">
              <ion-button fill="outline" @click="refreshJobs()">
                {{ translate('retry') }}
                <ion-spinner v-if="isRetrying" name="crescent" />
              </ion-button>
            </div>
          </div>

          <div v-else>
            <ion-list>
              <ion-list-header>{{ translate("Miscellaneous jobs") }}</ion-list-header>

              <ion-card v-if="maargJobs?.length">
                <ion-card-header>
                  <ion-card-title>{{ translate("Shopify bulk query") }}</ion-card-title>
                </ion-card-header>
                <ion-item v-for="(job, index) in maargJobs" :key="index" button detail @click="viewMaargJobConfiguration(job.jobTypeEnumId)">
                  <ion-label class="ion-text-wrap">
                    {{ job.enumName ? job.enumName : job.jobName }}
                    <p>{{ getMaargJobStatus(job.jobTypeEnumId) }}</p>
                  </ion-label>
                  <ion-label slot="end">{{ translate(job?.paused === "N" ? "Enabled" : "Disabled") }}</ion-label>
                </ion-item>
              </ion-card>

              <ion-item v-for="job in prepareMiscJobs" :key="job.jobId" @click="viewJobConfiguration(job)" detail button>
                <ion-label>{{ job.jobName }}</ion-label>
                <ion-note slot="end">{{ getJobRuntime(job) }}</ion-note>
              </ion-item>
            </ion-list>

            <ion-infinite-scroll @ionInfinite="loadMoreMiscellaneousJobs($event)" threshold="100px" :disabled="!isMiscellaneousJobsScrollable">
              <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="translate('Loading')"/>
            </ion-infinite-scroll>
          </div>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob || Object.keys(currentMaargJob).length">
          <JobConfiguration v-if="currentJob" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
          <MaargJobConfiguration v-else-if="Object.keys(currentMaargJob).length" :key="currentMaargJob" />
        </aside>
      </main>
    </ion-content>
  </ion-page>      
</template>

<script lang="ts">
import { DateTime } from 'luxon';
import {
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
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
  IonTitle,
  IonToolbar,
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useRouter } from 'vue-router'
import { mapGetters, useStore } from 'vuex'
import emitter from '@/event-bus';
import JobConfiguration from '@/components/JobConfiguration.vue';
import { getCronString, isFutureDate } from '@/utils';
import { translate } from '@hotwax/dxp-components';
import MaargJobConfiguration from '@/components/MaargJobConfiguration.vue';

export default defineComponent({
  name: 'Miscellaneous',
  components: {
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
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
    IonTitle,
    IonToolbar,
    JobConfiguration,
    MaargJobConfiguration
  },
  mounted() {
    emitter.on('jobUpdated', this.getMiscellaneousJobs);
    this.getMiscellaneousJobs();
    emitter.on("productStoreOrConfigChanged", this.updateProductStoreConfig);
  },
  unmounted() {
    emitter.off("productStoreOrConfigChanged", this.updateProductStoreConfig);
    emitter.off('jobUpdated', this.getMiscellaneousJobs);
  },
  data() {
    return {
      currentJob: '' as any,
      currentJobStatus: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop'),
      isRetrying: false
    }
  },
  computed: {
    ...mapGetters({
      miscellaneousJobs: 'job/getMiscellaneousJobs',
      getCurrentEComStore:'user/getCurrentEComStore',
      isMiscellaneousJobsScrollable: 'job/isMiscellaneousJobsScrollable',
      getMaargJob: 'maargJob/getMaargJob',
      maargJobs: 'maargJob/getMaargJobsList',
      currentMaargJob: 'maargJob/getCurrentMaargJob'
    }),
    prepareMiscJobs() {
      // preparing the jobs to display single instance of a job if the job is in pending and draft status
      const miscJobs = {} as any
      const pendingJobs = this.miscellaneousJobs.filter((job: any) => job.statusId === 'SERVICE_PENDING')
      const draftJobs = this.miscellaneousJobs.filter((job: any) => job.statusId === 'SERVICE_DRAFT')

      pendingJobs.map((job: any) => miscJobs[job.systemJobEnumId] = job)
      draftJobs.map((job: any) => miscJobs[job.systemJobEnumId] = miscJobs[job.systemJobEnumId] ? miscJobs[job.systemJobEnumId] : job)

      return Object.values(miscJobs);
    }
  },
  methods: {
    async viewJobConfiguration(job: any) {
      this.currentJob = job
      this.currentJobStatus =  job.status === "SERVICE_DRAFT" ? 'SERVICE_DRAFT' : job.frequency;

      // if job runTime is not a valid date then making runTime as empty
      if (job?.runTime && !isFutureDate(job?.runTime)) {
        job.runTime = ''
      }

      await this.store.dispatch('job/updateCurrentJob', { job: this.currentJob });
      if(!this.isDesktop && job?.jobId) {
        this.router.push({ name: 'JobDetails', params: { jobId: job?.jobId, category: "miscellaneous" } });
        return;
      }

      if (job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    async getMiscellaneousJobs(viewSize = 100, viewIndex = 0) {
      await this.store.dispatch('job/fetchMiscellaneousJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
      await this.store.dispatch("maargJob/fetchMaargJobs", "MISC_SYS_JOB");
    },
    async updateProductStoreConfig(isCurrentJobUpdateRequired = false) {
      if(isCurrentJobUpdateRequired) {
        this.currentJob = "";
        await this.store.dispatch('job/updateCurrentJob', { });
        await this.store.dispatch("maargJob/clearCurrentMaargJob")
        this.currentJobStatus = "";
        this.isJobDetailAnimationCompleted = false;
      }
      this.getMiscellaneousJobs();
    },
    async loadMoreMiscellaneousJobs (event: any) {
      this.getMiscellaneousJobs(
        undefined,
        Math.ceil(this.miscellaneousJobs.length / 100) //using 100 as harcoded value, as we are fetching the miscellaneous jobs in batches of 100, so we need to find the viewIndex using the same value that is used as viewSize
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
      return job.statusId !== 'SERVICE_DRAFT' && this.timeFromNow(job.runTime) ? this.timeFromNow(job.runTime) : translate('Disabled')
    },
    getMaargJobStatus(id: string) {
      const job = this.getMaargJob(id)
      return (job?.paused === "N" && job?.cronExpression && !job.isDraftJob) ? this.getCronString(job.cronExpression) ? this.getCronString(job.cronExpression) : job.cronExpression : ""
    },
    async viewMaargJobConfiguration(enumId: any) {
      const job = this.getMaargJob(enumId);
      await this.store.dispatch("maargJob/updateCurrentMaargJob", { job })
      this.currentJob = ""
      if(!this.isDesktop && this.currentMaargJob?.jobName) {
        this.router.push({ name: 'JobDetails', params: { jobId: this.currentMaargJob.jobTypeEnumId, category: "miscellaneous-maarg" } });
        return;
      }
      if(!this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
  },
  async ionViewWillLeave() {
    await this.store.dispatch("maargJob/clearCurrentMaargJob");
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      getCronString,
      router,
      store,
      translate
    };
  },
})
</script>
