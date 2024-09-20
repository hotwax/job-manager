<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pipeline" />
        <ion-title>{{ translate("Import logs")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header">
        <div class="search ion-padding">
          <section>
            <ion-item lines="none">
              <h1>{{ translate('Import logs') }}</h1>
            </ion-item>
            <ion-list>
              <ion-item>
                <ion-icon slot="start" :icon="pulseOutline" />
                <ion-label>{{ translate('Job') }}</ion-label>
                <ion-label slot="end" class="ion-text-wrap">{{ currentJob.jobId }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="fileTrayFullOutline" />
                <ion-label>{{ translate('Files received') }}</ion-label>
                <ion-label slot="end">{{ getDataLogs.length }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="codeWorkingOutline" />
                <ion-label>{{ translate('Files processed') }}</ion-label>
                <ion-label slot="end">{{ getProcessedFileCount() }}</ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-icon slot="start" :icon="warningOutline" />
                <ion-label>{{ translate('Files with errors') }}</ion-label>
                <ion-label slot="end">{{ getErrorFileCount() }}</ion-label>
              </ion-item>
            </ion-list>
          </section>
        </div>
        <div class="filters ion-padding">
          <ion-label lines="none">
            <p class="overline">{{ currentJob.runtimeData?.configId }}</p>
            <h1>{{ configDetails[0]?.description }}</h1>
          </ion-label>
          <ion-list>
            <ion-item>
              <ion-icon slot="start" :icon="shareSocialOutline" />
              <ion-label>{{ translate('Multithreading') }}</ion-label>
              <ion-label slot="end">{{ currentJob.runtimeData?.groupBy ? currentJob.runtimeData?.groupBy : "-" }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="globeOutline" />
              <ion-label class="ion-text-wrap">{{ translate('SFTP') }}</ion-label>
              <ion-label class="ion-text-wrap" slot="end">{{ configDetails[0]?.importPath }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="optionsOutline" />
              <ion-label>{{ translate('Mode') }}</ion-label>
              <ion-label slot="end">{{ configDetails[0]?.executionModeId ? configDetails[0]?.executionModeId : "-"}}</ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="ion-padding">
        <ion-chip v-for="(chip, index) in chips" :key="index" outline @click="updateLogs(chip.label)">
          <ion-label>{{ chip.label }}</ion-label>
          <ion-icon v-if="chip.selected" :icon="checkmarkOutline" />
        </ion-chip>
      </div>
      
      <div class="empty-state" v-if="isLoading">
        <ion-spinner name="crescent" />
      </div>
      <div v-else-if="filteredLogs.length" >
        <div class="list-item" v-for="(log, index) in filteredLogs" :key="index">
          <ion-item lines="none">
            <ion-icon slot="start" :icon="documentTextOutline" />
            <ion-label>
              <p class="overline">{{ log.logId }}</p>
              {{ log.contentName }}
              <p>{{ getDateTime(log.createdDate) }}</p>
            </ion-label>
          </ion-item>
  
          <ion-label>
            {{ getDateTime(log.startDateTime) }}
            <p>{{ translate('Started') }}</p>
          </ion-label>
  
          <ion-label>
            {{ getDateTime(log.finishDateTime) }}
            <p>{{ translate('Finished') }}</p>
          </ion-label>
          
          <ion-badge color="success" v-if="log.statusId === 'SERVICE_FINISHED'">{{ translate('Finished') }}</ion-badge>
          <ion-badge color="danger" v-if="log.statusId === 'SERVICE_FAILED'">{{ translate('Failed') }}</ion-badge>
          <ion-badge color="success" v-if="log.statusId === 'SERVICE_RUNNING' || log.statusId === 'SERVICE_QUEUED'">{{ translate('Running') }}</ion-badge>
  
          <ion-label v-if="log.errorRecordContentId">
            <ion-icon slot="start" :icon="cloudDownloadOutline" />
            <p>{{ translate('Failed records') }}</p>
          </ion-label>
          <div v-else></div>
  
          <ion-button fill="clear" color="medium" @click="openDownloadLogsFilePopover($event)">
            <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
          </ion-button>
        </div>
      </div>
      <div v-else class="empty-state">
        {{ translate('No logs found') }}
      </div>
    </ion-content>
  </ion-page>
</template>

<script>
import { checkmarkOutline, codeWorkingOutline, cloudDownloadOutline, documentTextOutline, ellipsisVerticalOutline, fileTrayFullOutline, globeOutline, optionsOutline, pulseOutline, shareSocialOutline, warningOutline } from "ionicons/icons";
import { IonBackButton, IonBadge, IonButton, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSpinner, IonTitle, IonToolbar, popoverController } from "@ionic/vue";
import { defineComponent } from 'vue'
import { mapGetters, useStore } from 'vuex'
import { translate } from '@hotwax/dxp-components'
import { DateTime } from 'luxon'
import DownloadLogsFilePopover from "@/components/DownloadLogsFilePopover.vue";

export default defineComponent ({
  name: "ImportLogsDetail",
  components: {
    IonBackButton,
    IonBadge,
    IonButton,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonSpinner,
    IonTitle,
    IonToolbar,
  },
  data() {
    return {
      configDetails: {},
      chips: [
        { label: 'All', selected: true },
        { label: 'Failed logs', selected: false },
        { label: 'Failed records', selected: false }
      ],
      filteredLogs: [],
      isLoading: true,
    }
  },
  computed: {
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
      getDataLogs: 'job/getDataLogs',
      getJob: 'job/getJob',
    }),
  },
  async mounted() {
    await this.fetchJobs();
    this.updateLogs('All');
    const job = await this.getJob(this.$route.params.jobId)
    this.filteredLogs = await this.store.dispatch('job/fetchDataManagerLogs', job.runtimeData?.configId)
    this.configDetails = await this.store.dispatch('job/fetchDataManagerConfig', job.runtimeData?.configId)
    this.isLoading = false;
  },
  methods : {
    updateLogs(label) {
      if (label === 'All') {
        this.filteredLogs = this.getDataLogs
      } else if (label === 'Failed logs') {
        this.filteredLogs = this.getDataLogs.filter(log => log.statusId === 'SERVICE_FAILED')
      } else if (label === 'Failed records') {
        this.filteredLogs = this.getDataLogs.filter(log => log.errorRecordContentId !== null)
      }
      this.chips.map((chip) => {
        chip.selected = chip.label === label;
      });
    },
    getDateTime(time) {
      return DateTime.fromMillis(time).toLocaleString(DateTime.DATETIME_SHORT).replace(',', '')
    },
    getProcessedFileCount() {
      return this.getDataLogs.filter((log) => log.statusId === "SERVICE_FINISHED").length
    },
    getErrorFileCount() {
      return this.getDataLogs.filter((log) => log.errorRecordContentId !== null).length
    },
    async openDownloadLogsFilePopover(event) {
      const popover = await popoverController.create({
        component: DownloadLogsFilePopover,
        showBackdrop: false,
        event: event
      });
      return popover.present()
    },
    async fetchJobs(){
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": this.$route.params.jobId
      });
    },
  },
  setup() {
    const store = useStore();

    return {
      checkmarkOutline,
      codeWorkingOutline,
      cloudDownloadOutline,
      documentTextOutline,
      ellipsisVerticalOutline,
      fileTrayFullOutline,
      globeOutline,
      optionsOutline,
      pulseOutline,
      shareSocialOutline,
      warningOutline,
      translate,
      store
    }
  }
})
</script>

<style scoped>
section {
  overflow: hidden;
  border: var(--border-medium);
  border-radius: 16px;
}

.list-item {
  --columns-desktop: 6;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid: "search filters"
        /1fr 1fr;
}

.search {
  grid-area: search;
}

.filters {
  grid-area: filters;
  align-self: end;
}

@media (max-width: 991px) {
  .header {
    grid: "search"
          "filters"
          / auto;
    padding: 0;
  }
}
</style> 