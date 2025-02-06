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
        <section class="ion-margin">
          <ion-item lines="none">
            <h1>{{ translate('Import logs') }}</h1>
          </ion-item>
          <ion-list>
            <ion-item>
              <ion-icon slot="start" :icon="pulseOutline" />
              {{ translate('Job') }}
              <ion-label slot="end" class="ion-text-wrap">{{ currentJob?.jobId }}</ion-label>
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
        <div class="config-details">
          <ion-item lines="none">
            <p class="overline">{{ currentJob?.runtimeData?.configId }}</p>
            <h1>{{ configDetails?.description }}</h1>
          </ion-item>
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
      <template v-else-if="dataManagerLogList?.length" >
        <div class="list-item" v-for="(log, index) in dataManagerLogList" :key="index">
          <ion-item class="file-name" lines="none">
            <ion-icon slot="start" :icon="documentTextOutline" />
            <ion-label>
              <p class="overline">{{ log.logId }}</p>
              {{ log.contentName }}
              <p>{{ getDateTime(log.createdDate) }}</p>
            </ion-label>
          </ion-item>
  
          <ion-label class="file-start-time">
            {{ log.startDateTime ? getDateTime(log.startDateTime) : '-' }}
            <p>{{ translate('Started') }}</p>
          </ion-label>
  
          <ion-label class="file-end-time">
            {{ log.finishDateTime ? getDateTime(log.finishDateTime) : '-' }}
            <p>{{ translate('Finished') }}</p>
          </ion-label>

          <ion-badge class="file-status tablet" v-if="log.statusId" :color="getLogStatusColor(log.statusId)">{{ translate(getStatusDesc(log.statusId)) }}</ion-badge>
          
          <div class="file-status tablet ion-text-center" v-if="log.errorRecordContentId">
            <ion-button fill="clear" color="medium" @click="downloadErrorRecordFile(log)">
              <ion-icon slot="icon-only" :icon="cloudDownloadOutline" />
            </ion-button>
            <ion-label>
              <p>{{ translate('Failed records') }}</p>
            </ion-label>
          </div>
          <div class="tablet" v-else></div>
  
          <ion-button fill="clear" color="medium" @click="openDownloadLogsFilePopover(log, $event)">
            <ion-icon slot="icon-only" :icon="ellipsisVerticalOutline" />
          </ion-button>
        </div>
      </template>
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
  name: "DataManagerLogDetails",
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
      currentJob: {},
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
      getDataManagerLogs: 'job/getDataManagerLogs',
      getStatusDesc: 'util/getStatusDesc',
    }),
  },
  props: ['jobId'],
  async mounted() {
    this.currentJob = await this.fetchJobHistory(this.jobId);
    await this.store.dispatch('job/updateCurrentJob', this.currentJob);
    await this.fetchDataManagerConfig(this.currentJob?.runtimeData.configId)
    await this.store.dispatch('job/fetchDataManagerLogs', this.currentJob.jobId)
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
    async fetchJobHistory(jobId) {
      let resp;

      try {
        resp = await JobService.fetchJobInformation({
          "inputFields": {
            "jobId": jobId
          },
          "noConditionFind": "Y"
        })
        if(resp.data.docs?.length > 0 && !hasError(resp)) {
          return resp.data.docs[0];
        } else {
          return {}
        }
      } catch(err) {
        logger.error(err)
        return {}
      }
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
        if (resp.data.docs?.length > 0 && !hasError(resp)) {
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
    },
    getLogStatusColor(statusId) {
      if (statusId === 'SERVICE_FINISHED') {
        return 'success';
      } else if (statusId === 'SERVICE_RUNNING') {
        return 'dark';
      } else if (statusId === 'SERVICE_FAILED') {
        return 'danger';
      } else {
        return 'medium';
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
.header > section {
  overflow: hidden;
  border: var(--border-medium);
  border-radius: 16px;
}

.list-item {
  --columns-desktop: 7;
  --columns-tablet: 5;
  border-bottom : 1px solid var(--ion-color-medium);
}

.list-item > ion-item {
  width: 100%;
}

.header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(375px, 1fr));
  grid-gap: var(--spacer-sm);
}

.config-details {
  align-self: end;
}

@media (min-width: 700px) {
  .file-name {
    grid-column: span 2;
  }
}

@media (max-width: 991px) {
  .header {
    display: block;
  }

  .config-details {
    margin-top: var(--spacer-base);
  }
}
</style> 
