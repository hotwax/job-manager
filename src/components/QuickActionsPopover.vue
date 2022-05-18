<template>
  <ion-content>
    <ion-list>
      <ion-item @click="updatePinnedJobs(job?.systemJobEnumId)" button>
        <ion-icon slot="start" :icon="pinOutline" />
        {{ $t("Pin jobs") }}
      </ion-item>
      <ion-item @click="copyJobInformation(job)" button>
        <ion-icon slot="start" :icon="copyOutline" />
        {{ $t("Copy job details") }}
      </ion-item>
      <ion-item @click="viewJobHistory(job)" button lines="none">
        <ion-icon slot="start" :icon="timeOutline" />
        {{ $t("View job history") }}
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
  modalController,
  popoverController
} from "@ionic/vue";
import { defineComponent } from "vue";
import { copyOutline, pinOutline, timeOutline  } from 'ionicons/icons'
import { mapGetters, useStore } from 'vuex'
import JobHistoryModal from '@/components/JobHistoryModal.vue'
import { Plugins } from '@capacitor/core';
import { showToast } from '@/utils'

export default defineComponent({
  name: "QuickActionsPopover",
  components: { 
    IonContent,
    IonIcon,
    IonItem,
    IonList,
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
      if(this.getPinnedJobs?.searchPrefId) {
        const payload = {
          "searchPrefId": this.getPinnedJobs?.searchPrefId,
          "searchPrefValue": JSON.stringify({ 
            ...this.getPinnedJobs?.searchPrefValue,
            [enumId]: this.getPinnedJobs?.searchPrefValue[enumId] ? false : true
          })
        }

        await this.store.dispatch('user/updatePinnedJobs', payload);
      } else {
        const payload = {
          searchPrefValue: JSON.stringify({ [enumId]: true })
        }
        await this.store.dispatch('user/createPinnedJob', payload);
      }
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