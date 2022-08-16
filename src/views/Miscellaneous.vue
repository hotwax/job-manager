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
          <ion-list>
            <ion-list-header>{{ $t("Miscellaneous jobs") }}</ion-list-header>
            <ion-item v-for="job in miscellaneousJobs" :key="job.jobId" @click="viewJobConfiguration(job)" detail>
              <ion-label>{{ job.jobName }}</ion-label>
              <ion-note slot="end" v-if="job.runTime">{{ timeFromNow(job.runTime)}}</ion-note>
            </ion-item>
          </ion-list>

          <ion-infinite-scroll @ionInfinite="loadMoreMiscellaneousJobs($event)" threshold="100px" :disabled="!isMiscellaneousJobsScrollable">
            <ion-infinite-scroll-content loading-spinner="crescent" :loading-text="$t('Loading')"/>
          </ion-infinite-scroll>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob && Object.keys(currentJob).length">
          <JobConfiguration :title="title" :status="currentJobStatus" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>      
</template>

<script lang="ts">
import { DateTime } from 'luxon';
import {
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
import { chevronForwardOutline } from "ionicons/icons";

export default defineComponent({
  name: 'Miscellaneous',
  components: {
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
    JobConfiguration
  },
  mounted() {
    this.getMiscellaneousJobs();
  },
  data() {
    return {
      title: '',
      currentJobStatus: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      miscellaneousJobs: 'job/getMiscellaneousJobs',
      getCurrentEComStore:'user/getCurrentEComStore',
      currentJob: 'job/getCurrentJob',
      isMiscellaneousJobsScrollable: 'job/isMiscellaneousJobsScrollable'
    })
  },
  methods: {
    async viewJobConfiguration(job: any) {
      this.title = job.jobName
      this.currentJobStatus = job.tempExprId

      await this.store.dispatch('job/updateCurrentJob', { job });
      if(!this.isDesktop && job?.jobId) {
        this.router.push({name: 'JobDetails', params: { title: this.title, jobId: job?.jobId, category: "miscellaneous"}});
        return;
      }

      if (job && !this.isJobDetailAnimationCompleted) {
        emitter.emit('playAnimation');
        this.isJobDetailAnimationCompleted = true;
      }
    },
    async getMiscellaneousJobs(viewSize = process.env.VUE_APP_VIEW_SIZE, viewIndex = '0') {
      await this.store.dispatch('job/fetchMiscellaneousJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async loadMoreMiscellaneousJobs (event: any) {
      this.getMiscellaneousJobs(
        undefined,
        Math.ceil(this.miscellaneousJobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    timeFromNow (time: any) {
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    },
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    return {
      chevronForwardOutline,
      router,
      store,
    };
  },
})
</script>

<style scoped>
main > section {
  width: 423px;
}
</style>
