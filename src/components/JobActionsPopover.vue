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
      <ion-item @click="updatePinnedJobs(job?.systemJobEnumId)" lines="none" button>
        <ion-icon slot="start" :icon="pinOutline" />
        {{ $t("Pin job") }}
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
import { copyOutline, pinOutline, timeOutline  } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex'
import JobHistoryModal from '@/components/JobHistoryModal.vue'
import { Plugins } from '@capacitor/core';
import { showToast } from '@/utils'
import emitter from "@/event-bus"

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
      getEnumDescription: 'job/getEnumDescription',
      getEnumName: 'job/getEnumName',
      getPinnedJobs: 'user/getPinnedJobs'
    })
  },
  methods: {
    closePopover() {
      popoverController.dismiss({ dismissed: true });
    },
    async copyJobInformation(job: any) {
      const { Clipboard } = Plugins;
      const jobDetails = `jobId: ${job.jobId}, jobName: ${this.getEnumName(job.systemJobEnumId)}, jobDescription: ${this.getEnumDescription(job.systemJobEnumId)}`;

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
        emitter.emit("unSelectPinJob", enumId);
      } else {
        pinnedJobs.add(enumId);
      }

      await this.store.dispatch('user/updatePinnedJobs', { pinnedJobs: [...pinnedJobs] });
      this.closePopover();
    }
  },
  setup() {
    const store = useStore();  

    return {
      copyOutline, 
      pinOutline,
      store, 
      timeOutline  
    }
  }
});
</script> 