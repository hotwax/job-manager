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
          <ion-item lines="none">
            <ion-label>
              <p class="overline">{{ job.parentJobId }}</p>
              {{ job.systemJobEnumId }}
            </ion-label>
            <ion-badge color="dark" slot="end">{{ timeTillJob(job.runTime) }}</ion-badge>
          </ion-item>

          <!-- <ion-item lines="none">
            service description
          </ion-item> -->

          <ion-item>
            <ion-icon slot="start" :icon="timeOutline" />
            <ion-label>{{ getTime(job.runTime) }}</ion-label>
          </ion-item>

          <ion-item>
            <ion-icon slot="start" :icon="timerOutline" />
            <ion-label>{{ temporalExpr(job.tempExprId) }}</ion-label>
          </ion-item>

          <ion-item lines="full">
            <ion-icon slot="start" :icon="codeWorkingOutline" />
            <ion-label>{{ job.serviceName }}</ion-label>
          </ion-item>

          <ion-button fill="clear">{{ $t("Skip") }}</ion-button>
          <ion-button color="danger" fill="clear">{{ $t("Cancel") }}</ion-button>
        </ion-card>
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
  IonTitle
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
      const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
      return DateTime.local().plus(timeDiff).toRelative();
    }
  },
  created() {
    this.store.dispatch('job/fetchPendingJobs');
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
<style scoped>
main {
  max-width: 343px;
  margin: var(--spacer-base) auto 0;
}
</style>
