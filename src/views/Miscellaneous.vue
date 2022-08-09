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
            <ion-item v-for="job in miscellaneousJobs" :key="job.jobId" @click="viewJobConfiguration(job)">
              <ion-label>{{ job.jobName }}</ion-label>
              <ion-badge v-if="job.runTime" color="light">{{ timeFromNow(job.runTime)}}</ion-badge>
              <ion-icon slot="end" :icon="chevronForwardOutline" />
            </ion-item>
          </ion-list>
        </section>

        <aside class="desktop-only" v-if="isDesktop" v-show="currentJob && Object.keys(currentJob).length">
          <JobConfiguration :title="title" :status="currentJobStatus" :type="freqType" :key="currentJob"/>
        </aside>
      </main>
    </ion-content>
  </ion-page>      
</template>
<script lang="ts">
import { DateTime } from 'luxon';
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  isPlatform,
} from '@ionic/vue';
import { defineComponent } from 'vue';
import { useStore } from "@/store";
import { useRouter } from 'vue-router'
import { mapGetters } from "vuex";
import emitter from '@/event-bus';
import JobConfiguration from '@/components/JobConfiguration.vue';
import { chevronForwardOutline } from "ionicons/icons";

export default defineComponent({
  name: 'Miscellaneous',
  components: {
    IonBadge,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonMenuButton,
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
      jobEnums: JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
      batchJobEnums: JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string) as any,
      jobFrequencyType: JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string) as any,
      webhookEnums: JSON.parse(process.env?.VUE_APP_WEBHOOK_ENUMS as string) as any,
      title: '',
      currentJobStatus: '',
      freqType: '',
      isJobDetailAnimationCompleted: false,
      isDesktop: isPlatform('desktop')
    }
  },
  computed: {
    ...mapGetters({
      miscellaneousJobs: 'job/getMiscellaneousJobs',
      temporalExpr: 'job/getTemporalExpr',
      getEnumDescription: 'job/getEnumDescription',
      getEnumName: 'job/getEnumName',
      getCurrentEComStore:'user/getCurrentEComStore',
      currentJob: 'job/getCurrentJob',
    })
  },
  methods: {
    async viewJobConfiguration(job: any) {
      this.title = job.jobName
      this.currentJobStatus = job.tempExprId
      const id = Object.entries(this.jobEnums).find((enums) => enums[1] == job.systemJobEnumId) as any
      this.freqType = id && (Object.entries(this.jobFrequencyType).find((freq) => freq[0] == id[0]) as any)[1]

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

