<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button slot="start" default-href="/file-history" />
        <ion-title>{{ translate("File Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main v-if="log">
        <div class="header-section">
          <h2>{{ log.fileName }}</h2>
          <p class="subtitle">
            {{ log.logId }} &bull; {{ getFileSize(log.fileSize) }}
            <span v-if="log.totalRecordCount != null">
              &bull; {{ translate("Failed") }}: {{ log.failedRecordCount || 0 }} / {{ translate("Total") }}: {{ log.totalRecordCount }}
            </span>
          </p>
        </div>

        <div class="meta-cards">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Execution Details") }}</ion-card-title>
            </ion-card-header>
            <ion-list>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Log ID") }}</p>
                  {{ log.logId }}
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Status") }}</p>
                  <ion-badge :color="getLogStatusColor(log)" style="display: inline-flex; align-items: center; gap: 4px; margin-top: 4px;">
                    <ion-icon v-if="log.statusId === 'DmlsFinished' && failedRecordCount > 0" :icon="warningOutline" />
                    <ion-icon v-else-if="['DmlsFailed', 'DmlsCrashed'].includes(log.statusId)" :icon="alertCircleOutline" />
                    {{ translate(getLogStatusLabel(log)) }}
                  </ion-badge>
                </ion-label>
              </ion-item>
              <ion-item button detail="true" @click="goToConfigDetail(log.configId)">
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Config") }}</p>
                  {{ getConfigName(log.configId) }}
                  <p>{{ log.configId }}</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Execution Mode") }}</p>
                  {{ log.executionModeId || "N/A" }}
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Log Type") }}</p>
                  {{ log.logTypeEnumId || log.logContentTypeEnumId || "N/A" }}
                </ion-label>
              </ion-item>
              <ion-item v-if="log.runByInstanceId">
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Run Instance") }}</p>
                  {{ log.runByInstanceId }}
                </ion-label>
              </ion-item>
              <ion-item v-if="log.importServiceName">
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Service Name") }}</p>
                  {{ log.importServiceName }}
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ translate("Timeline") }}</ion-card-title>
            </ion-card-header>
            <ion-list>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Created At") }}</p>
                  {{ log.createdDate ? commonUtil.getDateTimeWithOrdinalSuffix(log.createdDate) : "-" }}
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Started At") }}</p>
                  {{ log.startDateTime ? commonUtil.getDateTimeWithOrdinalSuffix(log.startDateTime) : "-" }}
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Finished At") }}</p>
                  {{ (log.finishDateTime || log.lastUpdatedTxStamp) ? commonUtil.getDateTimeWithOrdinalSuffix(log.finishDateTime || log.lastUpdatedTxStamp) : "-" }}
                </ion-label>
              </ion-item>
              <ion-item v-if="log.createdDate && (log.finishDateTime || log.lastUpdatedTxStamp)">
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Duration") }}</p>
                  {{ getDuration(log.createdDate, log.finishDateTime || log.lastUpdatedTxStamp) }}
                </ion-label>
              </ion-item>
              <ion-item v-if="log.runThread">
                <ion-label class="ion-text-wrap">
                  <p>{{ translate("Run Thread") }}</p>
                  {{ log.runThread }}
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card>
        </div>

        <section class="payload">
          <div class="payload-header">
            <h3>
              <ion-icon :icon="codeWorkingOutline" /> {{ translate("Payload") }}
              <ion-chip v-if="contentType" class="type-chip" outline>
                {{ contentType.toUpperCase() }}
              </ion-chip>
            </h3>
            <div class="payload-actions">
              <ion-button
                fill="clear"
                size="small"
                :disabled="!activePayload.isLoaded || !activePayload.rawLength || !!activePayload.error || copying"
                :title="translate('Copy')"
                @click="copyContent"
              >
                <ion-icon slot="icon-only" :icon="copyOutline" />
              </ion-button>
              <ion-button
                fill="clear"
                size="small"
                :disabled="!canDownload || downloading"
                :title="translate('Download')"
                @click="downloadContent"
              >
                <ion-icon slot="icon-only" :icon="downloadOutline" />
              </ion-button>
            </div>
          </div>

          <div v-if="showPayloadControls" class="payload-controls">
            <ion-segment
              v-if="payloadTabs.length > 1"
              :scrollable="true"
              :value="selectedPayload"
              @ionChange="handleTabChange(($event as any).detail.value)"
            >
              <ion-segment-button v-for="tab in payloadTabs" :key="tab.key" :value="tab.key">
                <ion-label>{{ tab.label }}</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-searchbar
              v-if="contentType === 'csv' || contentType === 'json'"
              class="payload-search"
              :value="payloadSearch"
              :debounce="200"
              :placeholder="contentType === 'csv' ? translate('Filter rows') : translate('Search keys and values')"
              @ionInput="onSearchInput(($event as any).detail.value || '')"
            />
          </div>

          <div class="payload-viewport">
            <div v-if="activePayload.isLoading" class="payload-loading">
              <ion-spinner name="crescent" />
            </div>

            <ion-item v-else-if="activePayload.error" lines="none">
              <ion-label class="ion-text-wrap">
                {{ activePayload.error }}
              </ion-label>
              <ion-button slot="end" fill="outline" @click="retryPayload">
                {{ translate("Retry") }}
              </ion-button>
            </ion-item>

            <template v-else>
              <ion-item v-if="activePayload.previewTruncated" lines="full">
                <ion-label class="ion-text-wrap">
                  {{ translate("Preview limited for performance. Download to inspect the complete file.") }}
                </ion-label>
              </ion-item>

              <template v-if="contentType === 'json'">
                <div v-if="payloadSearch.trim()">
                  <div v-if="activePayload.isSearching" class="payload-loading">
                    <ion-spinner name="crescent" />
                  </div>
                  <ion-list v-else-if="activePayload.jsonSearchResults.length">
                    <ion-item
                      v-for="(result, index) in activePayload.jsonSearchResults"
                      :key="`${result.path}:${index}`"
                    >
                      <ion-label class="ion-text-wrap">
                        <p>{{ result.path }}</p>
                        {{ result.value }}
                      </ion-label>
                    </ion-item>
                    <ion-item v-if="activePayload.jsonSearchTruncated" lines="none">
                      <ion-label class="ion-text-wrap">
                        {{ translate("Search results are limited to the first 200 matches.") }}
                      </ion-label>
                    </ion-item>
                  </ion-list>
                  <p v-else class="payload-empty">
                    {{ translate("No matching values") }}
                  </p>
                </div>
                <json-viewer v-else :data="activePayload.jsonPreview" search="" />
              </template>

              <div v-else-if="contentType === 'csv'" class="csv-wrap">
                <ion-item v-if="activePayload.csvTotalMatches > pageSize" lines="full">
                  <ion-label class="ion-text-wrap">
                    {{ translate("Showing") }} {{ (activePayload.csvPage - 1) * pageSize + 1 }} -
                    {{ Math.min(activePayload.csvPage * pageSize, activePayload.csvTotalMatches) }}
                    {{ translate("of") }} {{ activePayload.csvTotalMatches }} {{ translate("rows") }}
                  </ion-label>
                  <ion-buttons slot="end">
                    <ion-button
                      :disabled="activePayload.csvRequestedPage <= 1 || activePayload.isSearching"
                      @click="changeCsvPage(-1)"
                    >
                      <ion-icon slot="icon-only" :icon="chevronBackOutline" />
                    </ion-button>
                    <ion-label>
                      {{ activePayload.csvRequestedPage }} / {{ totalPages }}
                    </ion-label>
                    <ion-button
                      :disabled="activePayload.csvRequestedPage >= totalPages || activePayload.isSearching"
                      @click="changeCsvPage(1)"
                    >
                      <ion-icon slot="icon-only" :icon="chevronForwardOutline" />
                    </ion-button>
                  </ion-buttons>
                </ion-item>

                <div v-if="activePayload.isSearching" class="payload-loading">
                  <ion-spinner name="crescent" />
                </div>
                <template v-else>
                  <table class="csv-table">
                    <thead>
                      <tr>
                        <th v-for="col in activePayload.csvColumns" :key="col">
                          {{ col }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, index) in activePayload.csvRows" :key="index">
                        <td v-for="col in activePayload.csvColumns" :key="col">
                          {{ row[col] }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-if="!activePayload.csvRows.length" class="payload-empty">
                    {{ translate("No matching rows") }}
                  </p>
                </template>
              </div>

              <pre v-else-if="contentType === 'text'" class="raw-text">{{ activePayload.textPreview }}</pre>

              <p v-else class="payload-empty">
                {{ translate("No payload content available") }}
              </p>
            </template>
          </div>
        </section>
      </main>
      <div v-else class="loading-state">
        <ion-spinner name="crescent" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { commonUtil, translate } from "@common";
import { WorkerFactory } from "@common/core/workerFactory";
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  onIonViewWillLeave
} from "@ionic/vue";
import { saveAs } from "file-saver";
import {
  alertCircleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  codeWorkingOutline,
  copyOutline,
  downloadOutline,
  warningOutline
} from "ionicons/icons";
import { computed, onUnmounted, reactive, ref } from "vue";
import JsonViewer from "@/components/JsonViewer.vue";
import router from "@/router";
import { useMdmConfigStore } from "@/store/mdmConfig";
import { getDuration, getFileSize, showToast } from "@/utils";
import { getStatusDesc } from "@/utils/config";
import type {
  CsvRow,
  JsonSearchResult,
  PayloadContentType,
  PayloadKey,
  PayloadParserApi
} from "@/workers/payloadParser";
import payloadParserWorkerUrl from "@/workers/payloadParser.worker.ts?worker&url";

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const mdmStore = useMdmConfigStore();
type PayloadState = {
  contentType: "" | PayloadContentType;
  csvColumns: string[];
  csvPage: number;
  csvRequestedPage: number;
  csvRows: CsvRow[];
  csvTotalMatches: number;
  csvTotalRows: number;
  error: string;
  fileName?: string;
  isLoaded: boolean;
  isLoading: boolean;
  isSearching: boolean;
  jsonPreview: unknown;
  jsonSearchResults: JsonSearchResult[];
  jsonSearchTotal: number;
  jsonSearchTruncated: boolean;
  previewTruncated: boolean;
  rawLength: number;
  searchRequestId: number;
  textPreview: string;
};

const COPY_CHARACTER_LIMIT = 1000000;
const PAGE_SIZE = 50;
const WORKER_TIMEOUT_MS = 120000;

const log = ref<any>(null);
const selectedPayload = ref<PayloadKey>("original");
const payloads = reactive<Record<PayloadKey, PayloadState>>({
  original: createPayload(),
  errors: createPayload()
});
const payloadSearch = ref("");
const copying = ref(false);
const downloading = ref(false);

let parserApi: PayloadParserApi | null = null;
let parserWorker: Worker | null = null;
let terminateParser: (() => void) | null = null;
let searchRequestCounter = 0;
let viewGeneration = 0;

const pageSize = PAGE_SIZE;
const activePayload = computed(() => payloads[selectedPayload.value]);
const contentType = computed(() => activePayload.value.contentType);
const failedRecordCount = computed(() => Number(log.value?.failedRecordCount) || 0);
const hasErrorPayload = computed(() => !!log.value?.errorLogContentId);
const payloadTabs = computed(() => {
  const tabs = [{ key: "original" as PayloadKey, label: translate("Original") }];
  if(hasErrorPayload.value) {
    const errorCount = failedRecordCount.value ? ` (${failedRecordCount.value})` : "";
    tabs.push({ key: "errors" as PayloadKey, label: `${translate("Errors")}${errorCount}` });
  }

  return tabs;
});
const totalPages = computed(() => Math.max(1, Math.ceil(activePayload.value.csvTotalMatches / PAGE_SIZE)));
const showPayloadControls = computed(() => payloadTabs.value.length > 1 || !!contentType.value);
const canDownload = computed(() => {
  const source = getPayloadSource(selectedPayload.value);

  return !!source.configId && !!source.contentId;
});

const getConfigName = (configId: string) => {
  if(!configId) {return "";}
  const config = mdmStore.getConfigById(configId);
  if(config && Object.keys(config).length > 0) {
    return config.scriptTitle || config.description || configId;
  }

  return configId;
};

const goToConfigDetail = (configId: string) => {
  if(!configId) {return;}
  router.push({ name: "ImportDetail", params: { type: configId } });
};

const getLogStatusLabel = (logVal: any) => {
  if(!logVal) {return "";}
  if(logVal.statusId === "DmlsFinished" && failedRecordCount.value > 0) {
    return translate("Finished with errors");
  }

  return getStatusDesc(logVal.statusId);
};

const getLogStatusColor = (logVal: any) => {
  if(!logVal) {return "medium";}
  if(logVal.statusId === "DmlsFinished" && failedRecordCount.value > 0) {
    return "warning";
  }

  return commonUtil.getStatusColor(logVal.statusId);
};

onIonViewWillEnter(async () => {
  if(!props.id) {return;}

  const generation = ++viewGeneration;
  disposeParser();
  log.value = null;
  selectedPayload.value = "original";
  payloadSearch.value = "";
  resetPayloadState("original");
  resetPayloadState("errors");

  try {
    const fetchedLog = await mdmStore.fetchDataManagerLogById(props.id);
    if(generation !== viewGeneration) {return;}
    if(!fetchedLog) {
      showToast(translate("Log details not found"));

      return;
    }

    log.value = fetchedLog;
    resetPayloadState("original", fetchedLog.fileName);
    resetPayloadState("errors", fetchedLog.errorFileName);
    await loadSelectedPayload("original", generation);

    if(generation === viewGeneration && !mdmStore.getConfigs.length) {
      await mdmStore.fetchConfigs();
    }
  } catch {
    if(generation === viewGeneration) {
      showToast(translate("Unable to load file details"));
    }
  }
});

onIonViewWillLeave(teardownView);
onUnmounted(teardownView);

function createPayload(fileName?: string): PayloadState {
  return {
    contentType: "",
    csvColumns: [],
    csvPage: 1,
    csvRequestedPage: 1,
    csvRows: [],
    csvTotalMatches: 0,
    csvTotalRows: 0,
    error: "",
    fileName,
    isLoaded: false,
    isLoading: false,
    isSearching: false,
    jsonPreview: null,
    jsonSearchResults: [],
    jsonSearchTotal: 0,
    jsonSearchTruncated: false,
    previewTruncated: false,
    rawLength: 0,
    searchRequestId: 0,
    textPreview: ""
  };
}

function resetPayloadState(tab: PayloadKey, fileName?: string) {
  Object.assign(payloads[tab], createPayload(fileName));
}

function getPayloadSource(tab: PayloadKey) {
  return {
    configId: log.value?.configId,
    contentId: tab === "original" ? log.value?.logContentId : log.value?.errorLogContentId,
    fileName: tab === "original" ? log.value?.fileName : log.value?.errorFileName
  };
}

function initParser() {
  if(parserApi) {return parserApi;}

  const parser = WorkerFactory.createWorker<PayloadParserApi>(new URL(payloadParserWorkerUrl, import.meta.url));
  parserApi = parser.api as unknown as PayloadParserApi;
  parserWorker = parser.worker;
  terminateParser = parser.terminate;
  parserWorker.addEventListener("error", handleParserFailure);
  parserWorker.addEventListener("messageerror", handleParserFailure);

  return parserApi;
}

function disposeParser() {
  const terminate = terminateParser;
  parserApi = null;
  parserWorker = null;
  terminateParser = null;
  terminate?.();
}

function teardownView() {
  viewGeneration += 1;
  disposeParser();
}

function handleParserFailure() {
  const message = translate("Unable to process payload preview. Download is still available.");
  (["original", "errors"] as PayloadKey[]).forEach((tab) => {
    const state = payloads[tab];
    if(state.isLoaded || state.isLoading || state.isSearching) {
      state.error = message;
      state.isLoading = false;
      state.isSearching = false;
    }
  });
  disposeParser();
}

async function withWorkerTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Payload worker timed out")), WORKER_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if(timeout) {clearTimeout(timeout);}
  }
}

async function handleTabChange(tabKey: unknown) {
  if(tabKey !== "original" && tabKey !== "errors") {return;}
  if(selectedPayload.value === tabKey) {return;}

  cancelPayloadSearch(selectedPayload.value);
  selectedPayload.value = tabKey;
  payloadSearch.value = "";
  if(!payloads[tabKey].isLoaded) {
    await loadSelectedPayload(tabKey, viewGeneration);
  } else if(payloads[tabKey].contentType === "csv") {
    await requestCsvPage(tabKey, "", 1);
  }
}

async function loadSelectedPayload(tab: PayloadKey, generation: number, force = false) {
  const state = payloads[tab];
  const source = getPayloadSource(tab);
  if(state.isLoaded && !force) {return;}

  state.error = "";
  state.isLoading = true;
  state.isSearching = false;
  state.fileName = source.fileName;

  try {
    const api = initParser();
    if(force) {
      await withWorkerTimeout(api.releasePayload(tab));
    }

    if(!source.configId || !source.contentId) {
      Object.assign(state, createPayload(source.fileName), { isLoaded: true });

      return;
    }

    const raw = await mdmStore.fetchDataManagerFileContent(source.configId, source.contentId);
    if(generation !== viewGeneration) {return;}
    if(!raw) {
      Object.assign(state, createPayload(source.fileName), { isLoaded: true });

      return;
    }

    const parsed = await withWorkerTimeout(api.parsePayload(tab, raw, source.fileName, PAGE_SIZE));
    if(generation !== viewGeneration) {return;}

    Object.assign(state, createPayload(source.fileName), {
      contentType: parsed.contentType,
      csvColumns: parsed.csvPage?.columns || [],
      csvPage: parsed.csvPage?.page || 1,
      csvRequestedPage: parsed.csvPage?.page || 1,
      csvRows: parsed.csvPage?.rows || [],
      csvTotalMatches: parsed.csvPage?.totalMatches || 0,
      csvTotalRows: parsed.csvPage?.totalRows || 0,
      isLoaded: true,
      jsonPreview: parsed.jsonPreview ?? null,
      previewTruncated: parsed.previewTruncated,
      rawLength: parsed.rawLength,
      textPreview: parsed.textPreview || ""
    });
  } catch {
    if(generation === viewGeneration) {
      state.error = translate("Unable to process payload preview. Download is still available.");
      disposeParser();
    }
  } finally {
    if(generation === viewGeneration) {state.isLoading = false;}
  }
}

function cancelPayloadSearch(tab: PayloadKey) {
  const state = payloads[tab];
  const requestId = state.searchRequestId;
  state.searchRequestId = 0;
  state.isSearching = false;
  if(requestId && parserApi) {
    void parserApi.cancelSearch(tab, requestId).catch(() => undefined);
  }
}

function onSearchInput(val: string) {
  payloadSearch.value = val;
  const tab = selectedPayload.value;
  if(payloads[tab].contentType === "csv") {
    void requestCsvPage(tab, val, 1);
  } else if(payloads[tab].contentType === "json") {
    void requestJsonSearch(tab, val);
  }
}

async function requestCsvPage(tab: PayloadKey, query: string, page: number) {
  const state = payloads[tab];
  if(!parserApi || state.contentType !== "csv") {return;}

  cancelPayloadSearch(tab);
  const requestId = ++searchRequestCounter;
  const tabTotalPages = Math.max(1, Math.ceil(state.csvTotalMatches / PAGE_SIZE));
  const requestedPage = Math.min(Math.max(page, 1), tabTotalPages);
  const generation = viewGeneration;
  state.searchRequestId = requestId;
  state.csvRequestedPage = requestedPage;
  state.isSearching = true;

  try {
    const result = await withWorkerTimeout(parserApi.getCsvPage(tab, query, requestedPage, PAGE_SIZE, requestId));
    if(
      result.cancelled ||
      generation !== viewGeneration ||
      state.searchRequestId !== requestId
    ) {return;}

    state.csvColumns = result.columns;
    state.csvPage = result.page;
    state.csvRequestedPage = result.page;
    state.csvRows = result.rows;
    state.csvTotalMatches = result.totalMatches;
    state.csvTotalRows = result.totalRows;
  } catch {
    if(generation === viewGeneration && state.searchRequestId === requestId) {
      state.error = translate("Unable to process payload preview. Download is still available.");
      disposeParser();
    }
  } finally {
    if(state.searchRequestId === requestId) {
      state.isSearching = false;
    }
  }
}

async function requestJsonSearch(tab: PayloadKey, query: string) {
  const state = payloads[tab];
  cancelPayloadSearch(tab);
  state.jsonSearchResults = [];
  state.jsonSearchTotal = 0;
  state.jsonSearchTruncated = false;
  if(!query.trim() || !parserApi || state.contentType !== "json") {return;}

  const requestId = ++searchRequestCounter;
  const generation = viewGeneration;
  state.searchRequestId = requestId;
  state.isSearching = true;

  try {
    const result = await withWorkerTimeout(parserApi.searchJson(tab, query, requestId));
    if(
      result.cancelled ||
      generation !== viewGeneration ||
      state.searchRequestId !== requestId
    ) {return;}

    state.jsonSearchResults = result.results;
    state.jsonSearchTotal = result.totalMatches;
    state.jsonSearchTruncated = result.truncated;
  } catch {
    if(generation === viewGeneration && state.searchRequestId === requestId) {
      state.error = translate("Unable to process payload preview. Download is still available.");
      disposeParser();
    }
  } finally {
    if(state.searchRequestId === requestId) {
      state.isSearching = false;
    }
  }
}

function changeCsvPage(direction: number) {
  const target = activePayload.value.csvRequestedPage + direction;
  if(target < 1 || target > totalPages.value) {return;}
  void requestCsvPage(selectedPayload.value, payloadSearch.value, target);
}

async function retryPayload() {
  disposeParser();
  await loadSelectedPayload(selectedPayload.value, viewGeneration, true);
}

const copyContent = async () => {
  const tab = selectedPayload.value;
  const state = payloads[tab];
  if(!state.rawLength || !parserApi) {return;}
  if(state.rawLength > COPY_CHARACTER_LIMIT) {
    showToast(translate("Payload is too large to copy. Please use Download instead."));

    return;
  }

  const generation = viewGeneration;
  copying.value = true;
  try {
    const raw = await withWorkerTimeout(parserApi.getRawText(tab));
    if(generation !== viewGeneration || tab !== selectedPayload.value) {return;}
    await commonUtil.copyToClipboard(raw, translate("Copied to clipboard"));
  } catch {
    showToast(translate("Failed to copy"));
  } finally {
    copying.value = false;
  }
};

const downloadContent = async () => {
  const tab = selectedPayload.value;
  const source = getPayloadSource(tab);
  if(!source.configId || !source.contentId) {return;}

  downloading.value = true;
  try {
    const raw = await mdmStore.fetchDataManagerFileContent(source.configId, source.contentId);
    if(raw === undefined || raw === null) {
      throw new Error("Payload download is empty");
    }
    const blob = new Blob([raw], { type: "text/plain;charset=utf-8" });
    saveAs(blob, source.fileName || `${props.id}.txt`);
  } catch {
    showToast(translate("Download failed"));
  } finally {
    downloading.value = false;
  }
};
</script>

<style scoped>
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacer-lg);
}

.header-section {
  margin-bottom: var(--spacer-base);
}

.header-section h2 {
  margin: 0;
}

.header-section .subtitle {
  margin: 8px 0 0;
}

/* Execution Details + Timeline side by side on desktop, stacked on narrow screens */
.meta-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacer-base);
  align-items: start;
}

.meta-cards ion-card {
  margin: 0;
}

@media (min-width: 768px) {
  .meta-cards {
    grid-template-columns: 1fr 1fr;
  }
}

.payload {
  margin-top: var(--spacer-lg);
}

.payload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacer-sm);
}

.payload-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.type-chip {
  height: 20px;
}

.payload-actions {
  display: flex;
  gap: 4px;
}

.payload-controls {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  margin-bottom: var(--spacer-sm);
}

.payload-controls ion-segment {
  flex: 0 0 auto;
  max-width: 45%;
}

.payload-controls .payload-search {
  flex: 1 1 280px;
  min-width: 0;
  margin-bottom: 0;
}

.payload-search {
  padding: 0;
  margin-bottom: var(--spacer-sm);
}

@media (max-width: 600px) {
  .payload-controls {
    flex-wrap: wrap;
  }

  .payload-controls ion-segment,
  .payload-controls .payload-search {
    flex: 1 1 100%;
    max-width: 100%;
  }
}

.payload-viewport {
  height: clamp(360px, 70vh, 720px);
  overflow: auto;
}

.payload-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.payload-empty {
  padding: var(--spacer-base);
  text-align: center;
}

.csv-wrap {
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
  border-radius: 8px;
}

.csv-table {
  border-collapse: collapse;
  width: 100%;
}

.csv-table th,
.csv-table td {
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}

.csv-table th {
  position: sticky;
  top: 0;
}

.raw-text {
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}
</style>
