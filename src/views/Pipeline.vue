<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ $t("Pipeline") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main>
        <section>
          <ion-card v-for="job in pendingJobs" :key="job">
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
              <ion-label>{{ job.tempExprId ? temporalExpr(job.tempExprId) : "🙃"  }}</ion-label>
            </ion-item>

            <ion-item lines="full">
              <ion-icon slot="start" :icon="codeWorkingOutline" />
              <ion-label>{{ job.serviceName }}</ion-label>
            </ion-item>

            <!-- <ion-button fill="clear">{{ $t("Skip") }}</ion-button> -->
            <ion-button color="danger" fill="clear" @click="cancelJob(job.jobId)">{{ $t("Cancel") }}</ion-button>
          </ion-card>

          <ion-infinite-scroll @ionInfinite="loadMoreJobs($event)" threshold="100px" :disabled="!isScrollable">
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
import { defineComponent } from 'vue'
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
  alertController
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
    IonInfiniteScrollContent
  },
  computed: {
    ...mapGetters({
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
    async loadMoreJobs (event: any) {
      this.getJobs(
        undefined,
        Math.ceil(this.pendingJobs.length / (process.env.VUE_APP_VIEW_SIZE as any)).toString()
      ).then(() => {
        event.target.complete();
      })
    },
    async getJobs(vSize: any, vIndex: any) {
      const viewSize = vSize ? vSize : process.env.VUE_APP_VIEW_SIZE;
      const viewIndex = vIndex ? vIndex : 0;
        await  this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId, viewSize, viewIndex});
    },
    async cancelJob(jobId: any){
      const alert = await alertController
        .create({
          header: this.$t('Cancel job'),
          message: this.$t('Canceling this job will cancel this occurance and all following occurances. This job will have to be re-enabled manually to run it again.'),
          buttons: [
            {
              text: this.$t("DON'T CANCEL"),
              role: 'cancel',
            },
            {
              text: this.$t("CANCEL"),
              handler: () => {
                this.store.dispatch('job/updateJob', {jobId, statusId: "SERVICE_CANCELLED"});
                this.store.dispatch('job/fetchPendingJobs', {eComStoreId: this.getCurrentEComStore.productStoreId});
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

    return {
      store,
      codeWorkingOutline,
      timeOutline,
      timerOutline
    };
  }
});
</script>
