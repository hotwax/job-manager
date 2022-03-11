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
        <ion-card v-for="job in pendingJobs" :key="job">
            <ion-card-header>
              <ion-note>{{ job.parentJobId }}</ion-note>
              <ion-item lines="none">
                <ion-label>{{ job.systemJobEnumId }}</ion-label>
                <ion-badge  color="dark">{{ timeTillJob(job.runTime) }}</ion-badge>
              </ion-item>
            </ion-card-header>
            <!-- <ion-item lines="none">
              service description
            </ion-item> -->
            <ion-item>
              <ion-icon slot="start" :icon="timeOutline" />
              <ion-label>{{getTime(job.runTime)  }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="timerOutline" />
              <ion-label>{{ temporalExpr(job.tempExprId) }}</ion-label>
            </ion-item>
            <ion-item lines="full">
              <ion-icon slot="start" :icon="codeWorkingOutline" />
              <ion-label>{{ job.serviceName }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-buttons>
                <ion-button color="primary">{{ $t("Skip") }}</ion-button>
                <ion-button color="danger">{{ $t("Cancel") }}</ion-button>
              </ion-buttons>
            </ion-item>
          </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>
<script lang="ts">
import { DateTime } from 'luxon';
import { mapGetters, useStore } from 'vuex'
import { defineComponent } from 'vue'
import { IonContent, IonCard, IonNote, IonItem, IonLabel, IonIcon, IonBadge, IonButtons, IonButton, IonCardHeader, IonMenuButton, IonPage, IonHeader, IonToolbar, IonTitle } from "@ionic/vue";
import { timeOutline, timerOutline, codeWorkingOutline } from "ionicons/icons";

export default defineComponent({
  name: "Pipeline",
  components:{
    IonContent,
    IonCard,
    IonNote,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonButtons,
    IonButton,
    IonCardHeader,
    IonMenuButton,
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle
  },
  computed: {
    ...mapGetters({
      pendingJobs: 'job/getPendingJobs',
      temporalExpr: 'job/getTemporalExpr'
    })
  },
  methods: {
    getTime (time: any) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.TIME_SIMPLE);
    },
    timeTillJob (time: any) {
      const time1 = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(time1.milliseconds).toRelative();
    }
  },
  created() {
    this.store.dispatch('job/fetchPendingJobs');
    this.store.dispatch('job/fetchTemporalExpression');
  },
  setup() {
    const store = useStore();

    return {
      store,
      timeOutline,
      timerOutline,
      codeWorkingOutline
    }
  },
})
</script>
<style scoped>
main {
  max-width: 343px;
  margin-top: 20px;
  margin-right: auto;
  margin-left: auto;
}
</style>