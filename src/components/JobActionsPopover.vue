<template>
  <ion-content>
    <ion-list>
      <ion-list-header>{{ $t("More options") }}</ion-list-header>
      <ion-item @click="viewJobHistory(job)" button>
        <ion-icon slot="start" :icon="timeOutline" />
        {{ $t("History") }}
      </ion-item>
      <ion-item @click="copyJobInformation(job)" button>
        <ion-icon slot="start" :icon="copyOutline" />
        {{ $t("Copy details") }}
      </ion-item>
      <ion-item @click="updatePinnedJobs(job?.systemJobEnumId)" button>
        <ion-icon slot="start" :icon="pinOutline" />
        {{ $t("Pin job") }}
      </ion-item>
      <ion-item :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" @click="openJobCustomParameterModal()" lines="none" button>
        <ion-icon slot="start" :icon="flashOutline" />
        {{ $t("Run now") }}
      </ion-item>      
    </ion-list>
  </ion-content>
</template>

<script lang="ts">
import {
  IonContent,
  IonIcon,
  IonItem,
  IonList,
  IonListHeader,
  modalController,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { copyOutline, flashOutline, pinOutline, timeOutline  } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex'
import JobHistoryModal from '@/components/JobHistoryModal.vue'
import { Plugins } from '@capacitor/core';
import { showToast } from '@/utils'
import emitter from "@/event-bus"
import { Actions, hasPermission } from '@/authorization'
import JobParameterModal from '@/components/JobParameterModal.vue'

export default defineComponent({
  name: "JobActionsPopover",
  components: { 
    IonContent,
    IonIcon,
    IonItem,
    IonList,
    IonListHeader
  },
  props: ["job"],
  computed: {
    ...mapGetters({
      getPinnedJobs: 'user/getPinnedJobs'
    })
  },
  methods: {
    closePopover() {
      popoverController.dismiss({ dismissed: true });
    },
    async copyJobInformation(job: any) {
      const { Clipboard } = Plugins;
      const jobDetails = `jobId: ${job.jobId}, jobName: ${job.enumName}, jobDescription: ${job.description} ${job.runtimeData ? (", runtimeData: " + JSON.stringify(job.runtimeData)) : ""}`;

      await Clipboard.write({
        string: jobDetails
      }).then(() => {
        showToast(this.$t("Copied job details to clipboard"));
      })
      this.closePopover();
    },
    async viewJobHistory(job: any) {
      const jobHistoryModal = await modalController.create({
        component: JobHistoryModal,
        componentProps: { currentJob: job }
      });
      await jobHistoryModal.present();
      jobHistoryModal.onDidDismiss().then(() => {
        this.closePopover();
      })
    },
    async updatePinnedJobs(enumId: any) {
      const pinnedJobs = new Set(this.getPinnedJobs);
      if(pinnedJobs.has(enumId)) {
        pinnedJobs.delete(enumId);
        await this.store.dispatch('user/updatePinnedJobs', { pinnedJobs: [...pinnedJobs] });
        emitter.emit("pinnedJobsUpdated", enumId);
      } else {
        pinnedJobs.add(enumId);
        await this.store.dispatch('user/updatePinnedJobs', { pinnedJobs: [...pinnedJobs] });
      }
      this.closePopover();
    },
    async openJobCustomParameterModal() {
      const jobParameterModal = await modalController.create({
        component: JobParameterModal,
        // deep cloning the props for the 'run now' case as the parameter objects are
        // v-modeled in the job parameter modal hence, changes are reflected back on the UI
        // (because of reference) which is misleading as the job with edited changes
        // has already ran
        componentProps: {
          customOptionalParameters: [],
          customRequiredParameters: [],
          currentJob: JSON.parse(JSON.stringify(this.job)),
          runNow: true
        },
        breakpoints: [0, 0.25, 0.5, 0.75, 1],
        initialBreakpoint: 0.75
      });
      await jobParameterModal.present();
      this.closePopover();
    },
  },
  setup() {
    const store = useStore();  

    return {
      Actions,
      copyOutline, 
      flashOutline,
      hasPermission,
      pinOutline,
      store, 
      timeOutline  
    }
  }
});
</script> 