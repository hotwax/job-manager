<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/file-history" slot="start"></ion-back-button>
        <ion-title>{{ translate("File Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main v-if="log">
        <div class="header-section">
          <h2>{{ log.fileName }}</h2>
          <p class="subtitle">{{ log.logId }} &bull; {{ getFileSize(log.fileSize) }}</p>
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
                <p>{{ translate("Config ID") }}</p>
                {{ log.configId || "-" }}
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
            <h3><ion-icon :icon="codeWorkingOutline" /> {{ translate("Payload") }}
              <ion-chip v-if="contentType" class="type-chip" outline>{{ contentType.toUpperCase() }}</ion-chip>
            </h3>
            <div class="payload-actions">
              <ion-button fill="clear" size="small" :disabled="!rawText" @click="copyContent" :title="translate('Copy')">
                <ion-icon slot="icon-only" :icon="copyOutline" />
              </ion-button>
              <ion-button fill="clear" size="small" :disabled="!rawText" @click="downloadContent" :title="translate('Download')">
                <ion-icon slot="icon-only" :icon="downloadOutline" />
              </ion-button>
            </div>
          </div>

          <div v-if="showPayloadControls" class="payload-controls">
            <ion-segment
              v-if="payloadTabs.length > 1"
              :scrollable="true"
              v-model="selectedPayload"
            >
              <ion-segment-button v-for="tab in payloadTabs" :key="tab.key" :value="tab.key">
                <ion-label>{{ tab.label }}</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-searchbar
              v-if="contentType"
              class="payload-search"
              :value="payloadSearch"
              @ionInput="payloadSearch = ($event as any).detail.value || ''"
              :debounce="200"
              :placeholder="contentType === 'csv' ? translate('Filter rows') : translate('Search keys and values')"
            />
          </div>

          <div v-if="payloadLoading" class="payload-loading">
            <ion-spinner name="crescent"></ion-spinner>
          </div>

          <json-viewer v-else-if="contentType === 'json'" :data="parsedJson" :search="payloadSearch" />

          <div v-else-if="contentType === 'csv'" class="csv-wrap">
            <table class="csv-table">
              <thead>
                <tr>
                  <th v-for="col in csvColumns" :key="col">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in filteredCsvRows" :key="i">
                  <td v-for="col in csvColumns" :key="col">{{ row[col] }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="!filteredCsvRows.length" class="payload-empty">{{ translate("No matching rows") }}</p>
          </div>

          <pre v-else-if="contentType === 'text'" class="raw-text">{{ rawText }}</pre>

          <p v-else class="payload-empty">{{ translate("No payload content available") }}</p>
        </section>
      </main>
      <div v-else class="loading-state">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonList,
  IonItem,
  IonLabel,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  onIonViewWillEnter
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { translate, commonUtil } from '@common';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { getFileSize, showToast, getDuration } from '@/utils';
import { codeWorkingOutline, copyOutline, downloadOutline } from 'ionicons/icons';
import JsonViewer from '@/components/JsonViewer.vue';
import { saveAs } from 'file-saver';

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const mdmStore = useMdmConfigStore();
const logId = props.id;

type PayloadKey = "original" | "errors";
type ContentType = "" | "json" | "csv" | "text";
type ParsedPayload = {
  contentType: ContentType;
  parsedJson: any;
  csvRows: any[];
  rawText: string;
  fileName?: string;
};

const log = ref<any>(null);
const payloadLoading = ref(true);
const selectedPayload = ref<PayloadKey>("original");
const payloads = ref<Record<PayloadKey, ParsedPayload>>({
  original: createPayload(),
  errors: createPayload()
});
const payloadSearch = ref("");

const activePayload = computed(() => payloads.value[selectedPayload.value]);
const contentType = computed(() => activePayload.value.contentType);
const parsedJson = computed(() => activePayload.value.parsedJson);
const csvRows = computed(() => activePayload.value.csvRows);
const rawText = computed(() => activePayload.value.rawText);
const failedRecordCount = computed(() => Number(log.value?.failedRecordCount) || 0);
const hasErrorPayload = computed(() => !!log.value?.errorLogContentId && failedRecordCount.value > 0);
const payloadTabs = computed(() => {
  const tabs = [{ key: "original" as PayloadKey, label: translate("Original") }];
  if (hasErrorPayload.value) {
    tabs.push({ key: "errors" as PayloadKey, label: `${translate("Errors")} (${failedRecordCount.value})` });
  }
  return tabs;
});
const showPayloadControls = computed(() => payloadTabs.value.length > 1 || !!contentType.value);
const csvColumns = computed(() => (csvRows.value.length ? Object.keys(csvRows.value[0]) : []));
const filteredCsvRows = computed(() => {
  const q = payloadSearch.value.trim().toLowerCase();
  if (!q) return csvRows.value;
  return csvRows.value.filter((row: any) =>
    Object.values(row).some((value: any) => String(value ?? "").toLowerCase().includes(q))
  );
});

onIonViewWillEnter(async () => {
  if (!logId) return;
  const fetchedLog = await mdmStore.fetchDataManagerLogById(logId);
  if (!fetchedLog) {
    showToast(translate("Log details not found"));
    payloadLoading.value = false;
    return;
  }
  log.value = fetchedLog;
  await loadPayloads(fetchedLog);
});

function createPayload(fileName?: string): ParsedPayload {
  return {
    contentType: "",
    parsedJson: null,
    csvRows: [],
    rawText: "",
    fileName
  };
}

async function loadPayloads(logData: any) {
  payloadLoading.value = true;
  selectedPayload.value = "original";
  payloads.value = {
    original: createPayload(logData.fileName),
    errors: createPayload(logData.errorFileName)
  };

  try {
    const [originalPayload, errorPayload] = await Promise.all([
      loadPayload(logData.configId, logData.logContentId, logData.fileName),
      hasErrorPayload.value ? loadPayload(logData.configId, logData.errorLogContentId, logData.errorFileName) : Promise.resolve(createPayload(logData.errorFileName))
    ]);

    payloads.value = {
      original: originalPayload,
      errors: errorPayload
    };
  } finally {
    payloadLoading.value = false;
  }
}

async function loadPayload(configId?: string, logContentId?: string, fileName?: string) {
  if (!configId || !logContentId) return createPayload(fileName);

  const raw = await mdmStore.fetchDataManagerFileContent(configId, logContentId);
  if (!raw) {
    // No file content is served for this log; leave the payload area in its empty state.
    return createPayload(fileName);
  }

  return detectAndParse(raw, fileName);
}

async function detectAndParse(raw: string, fileName?: string): Promise<ParsedPayload> {
  const trimmed = raw.trim();
  const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  const isCsvName = (fileName || "").toLowerCase().endsWith(".csv");

  if (looksJson && !isCsvName) {
    try {
      return {
        ...createPayload(fileName),
        contentType: "json",
        parsedJson: JSON.parse(trimmed),
        rawText: raw
      };
    } catch {
      // fall through to CSV / text
    }
  }

  try {
    const rows = (await commonUtil.parseCsv(trimmed as any)) as any[];
    if (rows && rows.length) {
      return {
        ...createPayload(fileName),
        contentType: "csv",
        csvRows: rows,
        rawText: raw
      };
    }
  } catch {
    // fall through to raw text
  }

  return {
    ...createPayload(fileName),
    contentType: "text",
    rawText: raw
  };
}


const copyContent = async () => {
  try {
    await commonUtil.copyToClipboard(rawText.value, translate("Copied to clipboard"));
  } catch {
    showToast(translate("Failed to copy"));
  }
};

const downloadContent = () => {
  if (!rawText.value) return;
  const blob = new Blob([rawText.value], { type: "text/plain;charset=utf-8" });
  saveAs(blob, activePayload.value.fileName || `${logId}.txt`);
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
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ion-color-dark);
}

.header-section .subtitle {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

/* Execution Details + Timeline side by side on desktop, stacked on narrow screens */
.meta-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacer-base);
}

.meta-cards ion-card {
  margin: 0;
  height: 100%;
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
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ion-color-dark);
}

.type-chip {
  height: 20px;
  font-size: 0.7rem;
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
  --background: var(--ion-color-step-50, #f9f9f9);
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

.payload-loading {
  display: flex;
  justify-content: center;
  padding: var(--spacer-lg);
}

.payload-empty {
  color: var(--ion-color-medium);
  padding: var(--spacer-base);
  text-align: center;
}

.csv-wrap {
  overflow-x: auto;
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
  border-radius: 8px;
  max-height: 70vh;
}

.csv-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.85rem;
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
  background: var(--ion-color-step-100, #f4f5f8);
  font-weight: 600;
  color: var(--ion-color-dark);
}

.raw-text {
  background: var(--ion-color-step-50, #f9f9f9);
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  font-size: 0.85rem;
  margin: 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}
</style>
