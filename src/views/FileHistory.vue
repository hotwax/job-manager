<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("File history") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="title">
          <div class="title-header">
            <h1>{{ translate("Processed Files") }}</h1>
            <ion-chip color="medium" class="limit-chip">
              <ion-label>{{ translate("Latest 1000 records") }}</ion-label>
            </ion-chip>
          </div>
          <p>{{ translate("View history of processed files. The display is limited to the most recent 1000 records for performance.") }}</p>
        </div>

        <div class="kpi-grid">
          <ion-card class="kpi-card">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Total Files") }}</ion-card-subtitle>
              <ion-card-title>{{ totalFilesCount }}</ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card success">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Successful") }}</ion-card-subtitle>
              <ion-card-title>{{ successFilesCount }}</ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card failed">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Failed") }}</ion-card-subtitle>
              <ion-card-title>{{ failedFilesCount }}</ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card rate">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Success Rate") }}</ion-card-subtitle>
              <ion-card-title>{{ successRate }}%</ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card avg-time">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Avg Time") }}</ion-card-subtitle>
              <ion-card-title>{{ avgProcessingTime }}</ion-card-title>
            </ion-card-header>
          </ion-card>
        </div>

        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="handleQueryInput"
              :debounce="300"
              :placeholder="translate('Search by log ID or file name')"
            />

            <div class="filter-grid">
              <div class="filter-item">
                <ion-select
                  :label="translate('Status')"
                  label-placement="stacked"
                  interface="popover"
                  multiple="true"
                  :placeholder="translate('All')"
                  :value="selectedStatus"
                  @ionChange="selectedStatus = $event.detail.value"
                >
                  <ion-select-option
                    v-for="statusItem in statusItems"
                    :key="statusItem.statusId"
                    :value="statusItem.statusId"
                  >
                    {{ translate(statusItem.description) }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedStatus.length > 0" fill="clear" class="clear-filter-btn" @click="selectedStatus = []" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-select
                  :label="translate('Priority')"
                  label-placement="stacked"
                  interface="popover"
                  multiple="true"
                  :placeholder="translate('All')"
                  :value="selectedPriority"
                  @ionChange="selectedPriority = $event.detail.value"
                >
                  <ion-select-option value="HIGH">{{ translate("High") }}</ion-select-option>
                  <ion-select-option value="NORMAL">{{ translate("Normal") }}</ion-select-option>
                </ion-select>
                <ion-button v-if="selectedPriority.length > 0" fill="clear" class="clear-filter-btn" @click="selectedPriority = []" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-select
                  :label="translate('Config')"
                  label-placement="stacked"
                  interface="popover"
                  multiple="true"
                  :placeholder="translate('All')"
                  :value="selectedConfig"
                  @ionChange="selectedConfig = $event.detail.value"
                >
                  <ion-select-option
                    v-for="config in configs"
                    :key="config.configId"
                    :value="config.configId"
                  >
                    {{ config.configId }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedConfig.length > 0" fill="clear" class="clear-filter-btn" @click="selectedConfig = []" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <div class="pagination">
          <ion-button fill="outline" :disabled="pageIndex === 0" @click="goToPreviousPage">
            {{ translate("Previous") }}
          </ion-button>
          <div class="page-input">
            <span>Page</span>
            <input
              type="number"
              min="1"
              :max="pageCount"
              :value="pageIndex + 1"
              @keyup="validatePageInput($event)"
              @change="goToPage($event)"
              class="page-number-input"
            />
            <span>/ {{ pageCount }}</span>
          </div>
          <ion-button fill="outline" :disabled="pageIndex + 1 >= pageCount" @click="goToNextPage">
            {{ translate("Next") }}
          </ion-button>
        </div>

        <ion-list>
          <div class="list-item table-header log">
            <ion-label class="file-info">{{ translate("File & Log ID") }}</ion-label>
            <ion-label>{{ translate("Status & Results") }}</ion-label>
            <ion-label>{{ translate("Uploaded By") }}</ion-label>
            <ion-label>{{ translate("Uploaded") }}</ion-label>
            <ion-label>{{ translate("Duration") }}</ion-label>
            <ion-label></ion-label>
          </div>
          <template v-for="log in logs" :key="log.logId">
            <div class="list-item log" style="cursor: pointer;" @click="goToLogDetails(log.logId)">
              <ion-item lines="none" class="file-info" button @click="goToLogDetails(log.logId)">
              <ion-label class="ion-text-wrap">
                <p>{{ log.logId }}</p>
                {{ log.fileName }}
                <p>{{ getFileSize(log.fileSize) }}</p>
              </ion-label>
            </ion-item>
            <ion-label>
              <div class="status-results">
                <ion-chip :color="commonUtil.getStatusColor(log.statusId)">
                  {{ translate(getStatusDesc(log.statusId)) }}
                </ion-chip>
                <div v-if="log.totalRecordCount" class="score-card">
                  <div class="badge success">
                    <span class="count">{{ (Number(log.totalRecordCount) || 0) - (Number(log.failedRecordCount) || 0) }}</span>
                    <span class="label">{{ translate("SUCCESS") }}</span>
                  </div>
                  <div class="badge failed">
                    <span class="count">{{ Number(log.failedRecordCount) || 0 }}</span>
                    <span class="label">{{ translate("FAILED") }}</span>
                  </div>
                </div>
              </div>
            </ion-label>
            <ion-label>{{ log.createdByUserLogin || "-" }}</ion-label>
            <ion-label>
              {{ commonUtil.getDateTimeWithOrdinalSuffix(log.createdDate) }}
            </ion-label>
            <ion-label>
              {{ log.createdDate && (log.finishDateTime || log.lastUpdatedTxStamp) ? getDuration(log.createdDate, log.finishDateTime || log.lastUpdatedTxStamp) : '-' }}
            </ion-label>
              <ion-button v-if="log.statusId === 'DmlsPending'" color="danger" fill="clear" @click.stop="mdmStore.cancelDataManagerLog(log.configId, log.logId)">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </div>
          </template>
          <p class="empty-state" v-if="!logs.length">{{ translate("No logs found") }}</p>
        </ion-list>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  IonMenuButton,
  IonIcon,
  IonChip,
  IonModal,
  onIonViewWillEnter,
} from '@ionic/vue';
import { translate, commonUtil } from '@common';
import {
  closeOutline, documentOutline, chevronDownOutline, chevronForwardOutline,
  hardwareChipOutline, timeOutline, codeWorkingOutline, copyOutline, closeCircleOutline,
  archiveOutline, openOutline
} from 'ionicons/icons';
import { computed, ref, watch } from 'vue';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { getFileSize, showToast, getDuration } from '@/utils';
import { Clipboard } from '@capacitor/clipboard';
import { getStatusDesc } from '@/utils/config';
import { useUtilStore } from '@/store/util';
import router from '@/router';

const PAGE_SIZE = 10;

const mdmStore = useMdmConfigStore();
const utilStore = useUtilStore();

const queryString = ref("");
const selectedStatus = ref<string[]>([]);
const selectedPriority = ref<string[]>([]);
const selectedConfig = ref<string[]>([]);
const pageIndex = ref(0);

const rawLogs = computed(() => mdmStore.getLogs);
const configs = computed(() => mdmStore.getConfigs);
const statusItems = computed(() => utilStore.getStatusItemsByType("DataManagerLog"));

const isServerSideSearch = computed(() => {
  const q = queryString.value.trim();
  const isServerSideQ = !q || q.startsWith("M") || !isNaN(Number(q));
  const hasPriorityFilter = selectedPriority.value.length > 0;
  return isServerSideQ && !hasPriorityFilter;
});

const filteredLogs = computed(() => {
  let result = rawLogs.value;

  const q = queryString.value.trim().toLowerCase();
  if (q) {
    result = result.filter((log: any) =>
      log.fileName?.toLowerCase().includes(q) ||
      String(log.logId ?? "").toLowerCase().includes(q)
    );
  }

  if (selectedPriority.value.length > 0) {
    result = result.filter((log: any) => {
      const config = configs.value.find((c: any) => c.configId === log.configId);
      if (!config) return false;
      const isHigh = config.priority > 6;
      return selectedPriority.value.includes(isHigh ? "HIGH" : "NORMAL");
    });
  }

  return result;
});

const globalStats = computed(() => mdmStore.getGlobalStats);
const totalFilesCount = computed(() => globalStats.value.total);
const successFilesCount = computed(() => globalStats.value.successful);
const failedFilesCount = computed(() => globalStats.value.failed);
const successRate = computed(() => {
  if (totalFilesCount.value === 0) return 0;
  return ((successFilesCount.value / totalFilesCount.value) * 100).toFixed(1);
});

const avgProcessingTime = computed(() => {
  const finishedLogs = rawLogs.value.filter((log: any) => log.createdDate && (log.finishDateTime || log.lastUpdatedTxStamp));
  if (finishedLogs.length === 0) return "-";
  
  const totalDuration = finishedLogs.reduce((sum: number, log: any) => {
    const end = log.finishDateTime || log.lastUpdatedTxStamp;
    const diff = end - log.createdDate;
    return sum + (diff > 0 ? diff : 0);
  }, 0);
  
  const avgDuration = totalDuration / finishedLogs.length;
  
  const seconds = Math.floor(avgDuration / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
});

const logs = computed(() => {
  if (!isServerSideSearch.value) {
    const start = pageIndex.value * PAGE_SIZE;
    return filteredLogs.value.slice(start, start + PAGE_SIZE);
  }
  return filteredLogs.value;
});

const pageCount = computed(() => {
  if (isServerSideSearch.value) {
    return Math.max(Math.ceil(mdmStore.getLogsCount / PAGE_SIZE), 1);
  } else {
    return Math.max(Math.ceil(filteredLogs.value.length / PAGE_SIZE), 1);
  }
});

const handleQueryInput = (event: CustomEvent) => {
  queryString.value = (event as any).detail.value || "";
};


async function fetchLogs() {
  const filters: Record<string, any> = {};

  if (selectedStatus.value.length > 0) filters["statusId"] = selectedStatus.value;
  // Priority is handled entirely client-side
  if (selectedConfig.value.length > 0) filters["configId"] = selectedConfig.value;

  const q = queryString.value.trim();
  if (q && isServerSideSearch.value) {
    filters["logId"] = q;
    filters["logId_op"] = "contains";
    filters["logId_ic"] = "Y";
  }

  mdmStore.filters = filters;

  const size = isServerSideSearch.value ? PAGE_SIZE : 1000;
  const index = isServerSideSearch.value ? pageIndex.value : 0;

  await mdmStore.fetchDataManagerLogs({ pageSize: size, pageIndex: index });
}

const goToPreviousPage = () => {
  pageIndex.value -= 1;
};

const goToNextPage = () => {
  pageIndex.value += 1;
};

const validatePageInput = (event: any) => {
  const value = parseInt(event.target.value);
  if (value > pageCount.value) {
    event.target.value = pageCount.value;
  }
};

const goToPage = (event: any) => {
  const newPage = parseInt(event.target.value);
  if (newPage && newPage > 0 && newPage <= pageCount.value) {
    pageIndex.value = newPage - 1;
  } else {
    event.target.value = pageIndex.value + 1;
  }
};

const goToLogDetails = (logId: string) => {
  router.push({ name: 'FileHistoryDetail', params: { id: logId } });
};

// Filters trigger a fresh fetch from page 0
watch([queryString, selectedStatus, selectedPriority, selectedConfig], async () => {
  pageIndex.value = 0;
  await fetchLogs();
});

watch(pageIndex, () => {
  if (!isServerSideSearch.value) return; // paginating client-side
  fetchLogs();
});

onIonViewWillEnter(async () => {
  await fetchLogs();
  mdmStore.fetchConfigs();
  await utilStore.fetchStatusItemsByType("DataManagerLog");
  mdmStore.fetchGlobalStats();
});
</script>

<style scoped>
.title-header {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  flex-wrap: wrap;
}

.limit-chip {
  height: 24px;
  font-size: 0.75rem;
  font-weight: 500;
  margin: 0;
  --color: var(--ion-color-medium-shade);
  --background: var(--ion-color-step-100);
}

.list-item.log {
  --columns-desktop: 10;
  padding: var(--spacer-sm) var(--spacer-base);
}

.file-info {
  grid-column: span 5;
  --padding-start: 0;
  --inner-padding-end: 0;
  cursor: pointer;
}

.status-results {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.status-results ion-chip {
  margin: 0;
}

.file-name {
  grid-column: span 4;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacer-lg);
}

.filter-item {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-item ion-select {
  flex: 1;
}

.clear-filter-btn {
  --color: var(--ion-color-medium);
  --padding-start: 6px;
  --padding-end: 6px;
  --icon-font-size: 20px;
  flex-shrink: 0;
  margin-inline-start: 4px;
  height: 36px;
  width: 36px;
}

.clear-filter-btn:hover {
  --color: var(--ion-color-danger);
}

.clear-filter-btn ion-icon {
  font-size: 20px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.page-input {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
}

.page-number-input {
  width: 50px;
  text-align: center;
  border: 1px solid var(--ion-color-medium);
  border-radius: 4px;
  padding: 4px;
  background: var(--ion-color-step-50, var(--ion-background-color, #fff));
  color: var(--ion-text-color);
  font-size: 14px;
}

.page-number-input::-webkit-outer-spin-button,
.page-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.page-number-input[type=number] {
  -moz-appearance: textfield;
}

.score-card {
  display: flex;
  gap: var(--spacer-xs);
}

.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 6px;
  min-width: 52px;
}

.badge.success {
  background-color: rgba(var(--ion-color-success-rgb), 0.1);
  color: var(--ion-color-success);
}

.badge.failed {
  background-color: rgba(var(--ion-color-danger-rgb), 0.1);
  color: var(--ion-color-danger);
}

.badge .count {
  font-size: 1rem;
  font-weight: bold;
  line-height: 1.2;
}

.badge .label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.no-records {
  color: var(--ion-color-medium);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.kpi-card {
  margin: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.kpi-card.success ion-card-title {
  color: var(--ion-color-success);
}

.kpi-card.failed ion-card-title {
  color: var(--ion-color-danger);
}

.kpi-card.rate ion-card-title {
  color: var(--ion-color-primary);
}

.kpi-card.avg-time ion-card-title {
  color: var(--ion-color-warning);
}

</style>
