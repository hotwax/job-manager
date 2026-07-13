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


        <div class="kpi-grid">
          <ion-card class="kpi-card">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Total Files") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="totalFilesCount" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card success">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Successful") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="successFilesCount" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card failed">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Failed") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="failedFilesCount" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card rate">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Success Rate") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="Number(successRate)" />%</ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card class="kpi-card avg-time">
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Avg Time") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="avgProcessingTime" />s</ion-card-title>
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
                  :multiple="true"
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
                  :multiple="true"
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
                  :label="translate('Has Error')"
                  label-placement="stacked"
                  interface="popover"
                  :placeholder="translate('All')"
                  :value="hasErrorFilter"
                  @ionChange="hasErrorFilter = $event.detail.value"
                >
                  <ion-select-option value="Y">{{ translate("Yes") }}</ion-select-option>
                  <ion-select-option value="N">{{ translate("No") }}</ion-select-option>
                </ion-select>
                <ion-button v-if="hasErrorFilter" fill="clear" class="clear-filter-btn" @click="hasErrorFilter = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-item id="config-filter-trigger" button lines="none" class="config-filter-trigger">
                  <ion-label>
                    <p>{{ translate("Config") }}</p>
                    {{ selectedConfigText }}
                  </ion-label>
                </ion-item>
                <ion-button v-if="selectedConfig.length > 0" fill="clear" class="clear-filter-btn" @click.stop="selectedConfig = []" :title="translate('Clear')">
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
          <ion-card
            v-for="log in logs"
            :key="log.logId"
            class="list-item log log-card-layout"
            @click="goToLogDetails(log.logId)"
          >
            <ion-item lines="none" class="log-file-info">
              <ion-label class="ion-text-wrap">
                <p class="overline">{{ log.logId }}</p>
                {{ getConfigName(log.configId) || "-" }}
                <ion-button v-if="log.configId && isConfigNameMissing(log.configId)" size="small" fill="clear" @click.stop="showAddConfigNameAlert(log.configId)">
                  {{ translate("Add name") }}
                </ion-button>
                <p class="log-file-name" :title="log.fileName || ''">
                  <span class="tm-start">{{ splitFileName(log.fileName)[0] }}</span><span class="tm-end">{{ splitFileName(log.fileName)[1] }}</span>
                </p>
              </ion-label>
            </ion-item>

            <div class="log-result-stack">
              <ion-badge v-if="log.totalRecordCount" :color="getFailedRecordCount(log) > 0 ? 'warning' : 'success'">
                {{ getFailedRecordCount(log) }} / {{ log.totalRecordCount }} {{ translate("failed") }}
              </ion-badge>
            </div>

            <ion-label class="log-cell-stack">
              <p>{{ translate("Uploaded") }}: {{ commonUtil.getDateTimeWithOrdinalSuffix(log.createdDate) }}</p>
              <p>{{ translate("By") }}: {{ log.createdByUserLogin || "-" }}</p>
            </ion-label>

            <ion-label class="log-cell-stack log-meta">
              <ion-badge :color="getLogStatusColor(log)" style="display: inline-flex; align-items: center; gap: 4px;">
                <ion-icon v-if="log.statusId === 'DmlsFinished' && getFailedRecordCount(log) > 0" :icon="warningOutline" />
                <ion-icon v-else-if="['DmlsFailed', 'DmlsCrashed'].includes(log.statusId)" :icon="alertCircleOutline" />
                {{ translate(getLogStatusLabel(log)) }}
              </ion-badge>
              <p>{{ getFileSize(log.fileSize) }}</p>
              <p>{{ log.createdDate && (log.finishDateTime || log.lastUpdatedTxStamp) ? getDuration(log.createdDate, log.finishDateTime || log.lastUpdatedTxStamp) : '-' }}</p>
              <ion-button v-if="log.statusId === 'DmlsPending'" color="danger" fill="clear" @click.stop="mdmStore.cancelDataManagerLog(log.configId, log.logId)">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-label>
          </ion-card>
          <p class="empty-state" v-if="!logs.length">{{ translate("No logs found") }}</p>
        </ion-list>
      </main>

      <ion-modal trigger="config-filter-trigger" @willPresent="handleConfigModalWillPresent" @didDismiss="clearConfigModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeConfigModal" :title="translate('Close')">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Select Config") }}</ion-title>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar
              :value="configQuery"
              @ionInput="configQuery = ($event as any).detail.value || ''"
              :debounce="200"
              :placeholder="translate('Search config name')"
            />
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-list v-if="filteredConfigs.length">
            <ion-item v-for="config in filteredConfigs" :key="config.configId">
              <ion-checkbox
                label-placement="end"
                justify="start"
                :checked="selectedConfig.includes(config.configId)"
                @ionChange="toggleConfig(config.configId, $event.detail.checked)"
              >
                <ion-label>
                  {{ getConfigDisplayName(config) }}
                  <p v-if="getConfigDisplayName(config) !== config.configId">{{ config.configId }}</p>
                </ion-label>
              </ion-checkbox>
            </ion-item>
          </ion-list>
          <p v-else class="empty-state">{{ translate("No configs found") }}</p>
        </ion-content>
      </ion-modal>
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
  IonCheckbox,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  IonMenuButton,
  IonIcon,
  IonChip,
  IonBadge,
  modalController,
  onIonViewWillEnter,
  alertController,
} from '@ionic/vue';
import { translate, commonUtil, api } from "@common";
import { closeOutline, closeCircleOutline, warningOutline, alertCircleOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { useMdmConfigStore } from "@/store/mdmConfig";
import { getFileSize, getDuration, showToast } from "@/utils";
import logger from "@/logger";
import AnimatedNumber from "@/components/AnimatedNumber.vue";
import { getStatusDesc } from '@/utils/config';
import { useUtilStore } from '@/store/util';
import router from '@/router';

const PAGE_SIZE = 10;


const mdmStore = useMdmConfigStore();
const utilStore = useUtilStore();
const route = router.currentRoute.value;


const queryString = ref("");
const selectedStatus = ref<string[]>([]);
const selectedPriority = ref<string[]>([]);
const selectedConfig = ref<string[]>([]);
const hasErrorFilter = ref("");
const configQuery = ref("");
const pageIndex = ref(0);

const rawLogs = computed(() => mdmStore.getLogs);
const configs = computed(() => mdmStore.getConfigs);
const statusItems = computed(() => utilStore.getStatusItemsByType("DataManagerLog"));

const isServerSideSearch = computed(() => {
  const q = queryString.value.trim();
  const isServerSideQ = !q || q.startsWith("M") || !isNaN(Number(q));
  const hasPriorityFilter = selectedPriority.value.length > 0;
  const hasErrorFilterActive = !!hasErrorFilter.value;
  return isServerSideQ && !hasPriorityFilter && !hasErrorFilterActive;
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

  if (hasErrorFilter.value) {
    result = result.filter((log: any) => {
      const hasError = (Number(log.failedRecordCount) || 0) > 0 || ["DmlsFailed", "DmlsCrashed"].includes(log.statusId);
      return hasErrorFilter.value === "Y" ? hasError : !hasError;
    });
  }

  return result;
});

const globalStats = computed(() => mdmStore.getGlobalStats);
const totalFilesCount = computed(() => globalStats.value.total);
const successFilesCount = computed(() => globalStats.value.successful);
const failedFilesCount = computed(() => globalStats.value.failed);
const avgProcessingTime = computed(() => Number(globalStats.value.avgProcessingTime) || 0);
const successRate = computed(() => {
  if (totalFilesCount.value === 0) return 0;
  return ((successFilesCount.value / totalFilesCount.value) * 100).toFixed(1);
});

const selectedConfigText = computed(() => {
  if (!selectedConfig.value.length) return translate("All");
  if (selectedConfig.value.length === 1) return selectedConfig.value[0];
  return `${selectedConfig.value.length} ${translate("selected")}`;
});

const filteredConfigs = computed(() => {
  const query = configQuery.value.trim().toLowerCase();
  if (!query) return configs.value;
  return configs.value.filter((config: any) => {
    const searchableText = [
      config.configId,
      config.description,
      config.scriptTitle
    ].filter(Boolean).join(" ").toLowerCase();
    return searchableText.includes(query);
  });
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

const getFailedRecordCount = (log: any) => Number(log.failedRecordCount) || 0;

const getSuccessRecordCount = (log: any) => {
  return Math.max((Number(log.totalRecordCount) || 0) - getFailedRecordCount(log), 0);
};

const getLogStatusLabel = (log: any) => {
  if (log.statusId === "DmlsFinished" && getFailedRecordCount(log) > 0) {
    return translate("Finished with errors");
  }
  return getStatusDesc(log.statusId);
};

const getLogStatusColor = (log: any) => {
  if (log.statusId === "DmlsFinished" && getFailedRecordCount(log) > 0) {
    return "warning";
  }
  return commonUtil.getStatusColor(log.statusId);
};

// Split a file name into [head, tail] so the head can ellipsize while the tail
// (extension + a few chars) stays visible — i.e. middle truncation via CSS.
const splitFileName = (name?: string): [string, string] => {
  const value = name || "";
  const tailLength = 10;
  if (value.length <= tailLength + 6) return [value, ""];
  return [value.slice(0, value.length - tailLength), value.slice(value.length - tailLength)];
};

const getConfigDisplayName = (config: any) => config.scriptTitle || config.description || config.configId;

const getConfigName = (configId: string) => {
  const config = configs.value.find((c: any) => c.configId === configId);
  return config ? getConfigDisplayName(config) : configId;
};

const isConfigNameMissing = (configId: string) => {
  if (!configId) return false;
  const config = configs.value.find((c: any) => c.configId === configId);
  return !config || (!config.scriptTitle && !config.description);
};

const showAddConfigNameAlert = async (configId: string) => {
  const alert = await alertController.create({
    header: translate("Add configuration name"),
    inputs: [
      {
        name: "configName",
        type: "text",
        placeholder: translate("Configuration name")
      }
    ],
    buttons: [
      {
        text: translate("Cancel"),
        role: "cancel"
      },
      {
        text: translate("Save"),
        handler: async (data) => {
          const name = data.configName?.trim();
          if (!name) {
            showToast(translate("Configuration name cannot be empty"));
            return false;
          }
          try {
            await api({
              url: `admin/dataManager/${configId}`,
              method: "post",
              data: {
                configId,
                scriptTitle: name
              }
            });
            const config = configs.value.find((c: any) => c.configId === configId);
            if (config) {
              config.scriptTitle = name;
            } else {
              mdmStore.configs.push({
                configId,
                scriptTitle: name
              });
            }
            showToast(translate("Configuration name updated successfully"));
          } catch (err) {
            logger.error("Failed to update config name", err);
            showToast(translate("Failed to update configuration name"));
          }
        }
      }
    ]
  });
  await alert.present();
};

const handleConfigModalWillPresent = async () => {
  if (!configs.value.length) {
    await mdmStore.fetchConfigs();
  }
};

const closeConfigModal = () => {
  modalController.dismiss();
};

const clearConfigModal = () => {
  configQuery.value = "";
};

const toggleConfig = (configId: string, checked: boolean) => {
  if (checked && !selectedConfig.value.includes(configId)) {
    selectedConfig.value = [...selectedConfig.value, configId];
  } else if (!checked) {
    selectedConfig.value = selectedConfig.value.filter((selectedId) => selectedId !== configId);
  }
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
watch([queryString, selectedStatus, selectedPriority, selectedConfig, hasErrorFilter], async () => {
  pageIndex.value = 0;
  await fetchLogs();
});

watch(pageIndex, () => {
  if (!isServerSideSearch.value) return; // paginating client-side
  fetchLogs();
});

onIonViewWillEnter(async () => {
  if (route.query?.statusId) {
    await mdmStore.updateAppliedFilters("statusId", (route.query.statusId as string).split(","));
  } else {
    await mdmStore.updateAppliedFilters("statusId", []);
  }
  await fetchLogs();
  mdmStore.fetchConfigs();
  await utilStore.fetchStatusItemsByType("DataManagerLog");
  mdmStore.fetchGlobalStats();
});
</script>

<style scoped>


.limit-chip {
  height: 24px;
  margin: 0;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacer-lg);
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
}

.badge.failed {
}

.badge .count {
  line-height: 1.2;
}

.badge .label {
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.kpi-card {
  margin: 0;
  border-radius: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-value.service-name {
  word-break: break-all;
}

.small-chip {
  min-height: 24px;
  margin: 0;
  padding: 0 8px;
}

.list-item.log.is-expanded {
  border-bottom: none;
}

.config-filter-trigger {
  flex: 1;
  --min-height: 52px;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.list-item.log.log-card-layout {
  --columns-desktop: 5;
  --leading-columns: 3;
  --trailing-columns: calc(var(--col-calc) - var(--leading-columns) - 1);
  grid-template-columns: repeat(var(--leading-columns), 1fr) max-content repeat(var(--trailing-columns), 1fr);
  padding-block: var(--spacer-sm);
  padding-inline-start: 0;
  padding-inline-end: var(--spacer-sm);
}

.log-file-info {
  grid-column: span 2;
  --inner-padding-end: 0;
}

.list-item.log > .log-result-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacer-2xs);
}

.log-cell-stack p {
  margin: 2px 0;
}

.log-meta {
  justify-self: end;
  text-align: end;
}

.log-file-name {
  display: flex;
  flex-wrap: nowrap;
  max-width: 100%;
  margin-top: 2px;
}

.log-file-name .tm-start {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.log-file-name .tm-end {
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
