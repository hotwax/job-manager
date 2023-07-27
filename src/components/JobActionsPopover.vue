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
      <ion-item :disabled="!hasPermission(Actions.APP_JOB_UPDATE)" @click="runJobNow(job)" lines="none" button>
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
  alertController,
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
    async runJobNow(job: any) {
      const alert = await alertController
        .create({
          header: this.$t("Run now"),
          message: this.$t('Running this job now will not replace this job. A copy of this job will be created and run immediately. You may not be able to reverse this action.', { space: '<br/><br/>' }),
          buttons: [
            {
              text: this.$t("Cancel"),
              role: 'cancel',
            },
            {
              text: this.$t('Run now'),
              handler: async () => {
                if(job) {
                  await this.store.dispatch('job/runServiceNow', job)
                  this.closePopover();
                }
              }
            }
          ]
        });
      return alert.present();
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