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
        <div class="ion-padding">
          <section>
            <ion-item lines="none">
              <h1>{{ translate('Import logs') }}</h1>
            </ion-item>
            <ion-list>
              <ion-item>
                <ion-icon slot="start" :icon="pulseOutline" />
                {{ translate('Job') }}
                <ion-label slot="end" class="ion-text-wrap">{{ currentJob.jobId }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="fileTrayFullOutline" />
                {{ translate('Files received') }}
                <ion-label slot="end">{{ getDataManagerLogs.length }}</ion-label>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="codeWorkingOutline" />
                {{ translate('Files processed') }}
                <ion-label slot="end">{{ getProcessedFileCount() }}</ion-label>
              </ion-item>
              <ion-item lines="none">
                <ion-icon slot="start" :icon="warningOutline" />
                {{ translate('Files with errors') }}
                <ion-label slot="end">{{ getErrorFileCount() }}</ion-label>
              </ion-item>
            </ion-list>
          </section>
        </div>
        <div class="config ion-padding">
          <ion-label lines="none">
            <p class="overline">{{ currentJob.runtimeData?.configId }}</p>
            <h1>{{ configDetails?.description }}</h1>
          </ion-label>
          <ion-list>
            <ion-item>
              <ion-icon slot="start" :icon="shareSocialOutline" />
              {{ translate('Multithreading') }}
              <ion-label slot="end">{{ currentJob.runtimeData?.groupBy ? currentJob.runtimeData?.groupBy : "-" }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="globeOutline" />
              {{ translate('SFTP') }}
              <ion-label class="ion-text-wrap" slot="end">{{ configDetails?.importPath }}</ion-label>
            </ion-item>
            <ion-item>
              <ion-icon slot="start" :icon="optionsOutline" />
              {{ translate('Mode') }}
              <ion-label slot="end">{{ configDetails?.executionModeId ? configDetails?.executionModeId : "-"}}</ion-label>
            </ion-item>
          </ion-list>
        </div>
      </div>

      <div class="ion-padding">
        <ion-chip v-for="filter in dataManagerLogFilters" :key="filter.id" outline @click="filterDataManagerLogs(filter.id)">
          <ion-label>{{ filter.label }}</ion-label>
          <ion-icon v-if="selectedFilter === filter.id" :icon="checkmarkOutline" />
        </ion-chip>
      </div>
      
      <div class="empty-state" v-if="isLoading">
        <ion-spinner name="crescent" />
      </div>
      <div v-else-if="dataManagerLogList?.length" >
        <div class="list-item" v-for="(log, index) in dataManagerLogList" :key="index">
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

          <ion-badge v-if="log.statusId" :color="log.statusId === 'SERVICE_FAILED' ? 'danger' : 'success'">{{ translate(getStatusDesc(log.statusId)) }}</ion-badge>
          
          <div class="ion-text-center" lines="none" v-if="log.errorRecordContentId" button @click="downloadErrorRecordFile(log)">
            <ion-icon slot="start" :icon="cloudDownloadOutline" />
            <ion-label>
              <p>{{ translate('Failed records') }}</p>
            </ion-label>
          </div>
          <div v-else></div>
  
          <ion-button fill="clear" color="medium" @click="openDownloadLogsFilePopover(log, $event)">
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
import { saveDataFile, hasError } from '@/utils';
import { translate } from '@hotwax/dxp-components'
import { DateTime } from 'luxon'
import DownloadLogsFilePopover from "@/components/DownloadLogsFilePopover.vue";
import { JobService } from "@/services/JobService";
import logger from '@/logger';

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
      selectedFilter: 'All',
      dataManagerLogFilters: [
        { id: 'ALL', label: 'All' },
        { id: 'FAILED_LOGS', label: 'Failed logs' },
        { id: 'FAILED_RECORDS', label: 'Failed records' }
      ],
      dataManagerLogList: [],
      isLoading: true,
    }
  },
  computed: {
    ...mapGetters({
      currentJob: 'job/getCurrentJob',
      getDataManagerLogs: 'job/getDataManagerLogs',
      getJob: 'job/getJob',
      getStatusDesc: 'util/getStatusDesc',
    }),
  },
  async mounted() {
    await this.fetchJobs();
    const job = await this.getJob(this.$route.params.jobId)
    await this.store.dispatch('job/updateCurrentJob', { job });
    await this.fetchDataManagerConfig(job.runtimeData?.configId)
    await this.store.dispatch('job/fetchDataManagerLogs', job.runtimeData?.configId)
    await this.store.dispatch('job/fetchDataResource', this.getDataManagerLogs)
    this.filterDataManagerLogs('ALL');
    this.isLoading = false;
  },
  methods : {
    filterDataManagerLogs(id) {
      this.selectedFilter = id
      if (id === 'ALL') {
        this.dataManagerLogList = this.getDataManagerLogs
      } else if (id === 'FAILED_LOGS') {
        this.dataManagerLogList = this.getDataManagerLogs.filter(log => log.statusId === 'SERVICE_FAILED')
      } else if (id === 'FAILED_RECORDS') {
        this.dataManagerLogList = this.getDataManagerLogs.filter(log => log.errorRecordContentId !== null)
      }
    },
    getDateTime(time) {
      return DateTime.fromMillis(time).toFormat("dd/MM/yyyy H:mm a")
    },
    getProcessedFileCount() {
      return this.getDataManagerLogs.filter((log) => log.statusId === "SERVICE_FINISHED").length
    },
    getErrorFileCount() {
      return this.getDataManagerLogs.filter((log) => log.errorRecordContentId !== null).length
    },
    async openDownloadLogsFilePopover(dataManagerLog, event) {
      const popover = await popoverController.create({
        component: DownloadLogsFilePopover,
        showBackdrop: false,
        event: event,
        componentProps: { dataManagerLog }
      });
      return popover.present()
    },
    async fetchJobs(){
      await this.store.dispatch("job/fetchJobs", {
        "inputFields": this.$route.params.jobId
      });
    },
    async fetchDataManagerConfig(configId) {
      let resp = {}
      const payload = {
        "inputFields":  {
          "configId": configId
        },
        "fieldList": ["importPath", "multiThreading", "description", "executionModeId"],
        "noConditionFind": "Y",
        "viewSize": 1,
        "entityName": "DataManagerConfig",
      }
      
      try {
        resp = await JobService.fetchDataManagerConfig(payload);
        if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
          this.configDetails = resp.data.docs[0];
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error(err);
      }
    },
    async downloadErrorRecordFile(dataManagerLog) {
      try {
        if (dataManagerLog?.errorRecordDataResourceId) {
          const response = await JobService.fetchFileData({
            dataResourceId: dataManagerLog.errorRecordDataResourceId
          });
          saveDataFile(response.data, dataManagerLog?.errorRecordContentName);
        }
      } catch (error) {
        logger.error(error);
      }
    }
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
  grid-template-columns: repeat(2, 1fr);
}

.config {
  align-self: end;
}

@media (max-width: 991px) {
  .header {
    grid-template-columns: 1fr;
  }
}
</style> 