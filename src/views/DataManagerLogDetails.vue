<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/pipeline" />
        <ion-title>{{ translate("Import logs")}}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="header ion-padding">
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
            <ion-label>
              <p class="overline">{{ currentJob?.runtimeData?.configId }}</p>
              <h1>{{ configDetails?.description }}</h1>
            </ion-label>
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
        <ion-chip v-for="filter in dataManagerLogFilters" :key="filter.id" :outline="selectedFilter !== filter.id" @click="filterDataManagerLogs(filter.id)">
          <ion-label>{{ filter.label }}</ion-label>
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
  
          <ion-label>
            {{ log.startDateTime ? getDateTime(log.startDateTime) : '-' }}
            <p>{{ translate('Started') }}</p>
          </ion-label>
  
          <ion-label>
            {{ log.finishDateTime ? getDateTime(log.finishDateTime) : '-' }}
            <p>{{ translate('Finished') }}</p>
          </ion-label>

          <ion-badge class="tablet" v-if="log.statusId" :color="getLogStatusColor(log.statusId)">{{ translate(getStatusDesc(log.statusId)) }}</ion-badge>
          
          <div class="tablet ion-text-center" lines="none" v-if="log.errorRecordContentId">
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

<script setup lang="ts">
import { codeWorkingOutline, cloudDownloadOutline, documentTextOutline, ellipsisVerticalOutline, fileTrayFullOutline, globeOutline, optionsOutline, pulseOutline, shareSocialOutline, warningOutline } from "ionicons/icons";
import { IonBackButton, IonBadge, IonButton, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonSpinner, IonTitle, IonToolbar } from "@ionic/vue";
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/authStore'
import { translate } from '@hotwax/dxp-components'

const userStore = useUserStore()

const configDetails = ref({})
const currentJob = ref({} as any)
const selectedFilter = ref('All')
const dataManagerLogFilters = ref([
  { id: 'ALL', label: 'All' },
  { id: 'FAILED_LOGS', label: 'Failed logs' },
  { id: 'FAILED_RECORDS', label: 'Failed records' }
])
const dataManagerLogList = ref([] as any[])
const isLoading = ref(true)

// TODO: These should be in a separate job/util store in Pinia
const getDataManagerLogs = computed(() => [])
const getStatusDesc = (statusId: string) => statusId

const getProcessedFileCount = () => 0
const getErrorFileCount = () => 0
const getDateTime = (dateTime: any) => dateTime
const getLogStatusColor = (statusId: string) => 'medium'
const filterDataManagerLogs = (filterId: string) => {
  selectedFilter.value = filterId
}
const downloadErrorRecordFile = (log: any) => {
  console.log('Downloading error record file', log)
}
const openDownloadLogsFilePopover = (log: any, event: Event) => {
  console.log('Opening download logs file popover', log, event)
}
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
