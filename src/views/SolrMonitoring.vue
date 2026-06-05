<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Solr Monitoring") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="loadSummary">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="refreshSummary">
        <ion-refresher-content />
      </ion-refresher>

      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Search health") }}</ion-card-title>
            <ion-card-subtitle>{{ config.solrUrl || translate("Configuration unavailable") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="full">
              <ion-item>
                <ion-icon slot="start" :icon="pulseOutline" />
                <ion-label>
                  {{ translate("Overall status") }}
                  <p>{{ translate("Generated") }}: {{ formatDate(summary.generatedAt) }}</p>
                </ion-label>
                <ion-badge slot="end" :color="healthColor(overview.health)">{{ overview.health || translate("Unknown") }}</ion-badge>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="serverOutline" />
                <ion-label>
                  {{ translate("Solr version") }}
                  <p>{{ translate("Lucene") }}: {{ system.luceneVersion || translate("Unknown") }}</p>
                </ion-label>
                <ion-note slot="end">{{ system.solrVersion || translate("Unknown") }}</ion-note>
              </ion-item>
              <ion-item>
                <ion-icon slot="start" :icon="hardwareChipOutline" />
                <ion-label>
                  {{ translate("JVM memory") }}
                  <p>{{ translate("Heap and process memory reported by Solr") }}</p>
                </ion-label>
                <ion-note slot="end">{{ formatBytes(system.memory?.used) }} / {{ formatBytes(system.memory?.max) }}</ion-note>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Index operations") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Repair search data without needing Solr document keys") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="full">
              <ion-item>
                <ion-icon slot="start" :icon="playCircleOutline" />
                <ion-label>
                  {{ translate("Rebuild enterpriseSearch") }}
                  <p>{{ translate("Runs as a Moqui service job and keeps working until the rebuild finishes") }}</p>
                </ion-label>
                <ion-button slot="end" :disabled="store.isRebuilding || isRebuildRunning" @click="startRebuild">
                  <ion-spinner v-if="store.isRebuilding" slot="start" name="crescent" />
                  {{ translate("Start") }}
                </ion-button>
              </ion-item>
              <ion-item v-if="rebuildOperation.jobRunId">
                <ion-icon slot="start" :icon="syncCircleOutline" />
                <ion-label>
                  {{ translate("Rebuild progress") }}
                  <p>{{ rebuildOperation.messages || translate("Waiting for job progress") }}</p>
                  <p v-if="rebuildOperation.results">
                    {{ translate("Products") }}: {{ formatNumber(rebuildOperation.results.productsIndexed || 0) }} ·
                    {{ translate("Orders") }}: {{ formatNumber(rebuildOperation.results.ordersIndexed || 0) }}
                  </p>
                </ion-label>
                <ion-badge slot="end" :color="operationColor(rebuildOperation.status)">{{ rebuildOperation.status || translate("Queued") }}</ion-badge>
              </ion-item>
              <ion-progress-bar v-if="isRebuildRunning" type="indeterminate" />
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Repair one record") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Find the order or product first, then rebuild its Solr documents") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-segment v-model="repairDocumentType">
              <ion-segment-button value="ORDER">
                <ion-label>{{ translate("Orders") }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="PRODUCT">
                <ion-label>{{ translate("Products") }}</ion-label>
              </ion-segment-button>
            </ion-segment>
            <ion-searchbar
              v-model="repairQuery"
              :placeholder="repairPlaceholder"
              enterkeyhint="search"
              @keyup.enter="searchRepairDocuments"
            />
            <ion-button expand="block" :disabled="store.isSearching || !repairQuery.trim()" @click="searchRepairDocuments">
              <ion-icon slot="start" :icon="searchOutline" />
              <ion-spinner v-if="store.isSearching" slot="end" name="crescent" />
              {{ translate("Find records") }}
            </ion-button>

            <ion-list v-if="repairResults.length" lines="full">
              <ion-item v-for="document in repairResults" :key="`${document.documentType}-${document.primaryId}`">
                <ion-icon slot="start" :icon="constructOutline" />
                <ion-label>
                  {{ document.title || document.primaryId }}
                  <p>{{ document.primaryField }}: {{ document.primaryId }}</p>
                  <p v-if="document.subtitle">{{ document.subtitle }}</p>
                </ion-label>
                <ion-button slot="end" fill="clear" :disabled="repairingPrimaryId === document.primaryId" @click="reindexRepairDocument(document)">
                  <ion-spinner v-if="repairingPrimaryId === document.primaryId" slot="start" name="crescent" />
                  {{ translate("Reindex") }}
                </ion-button>
              </ion-item>
            </ion-list>
            <ion-item v-else-if="hasSearched" lines="none">
              <ion-label>{{ translate("No matching Solr documents found") }}</ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Collections") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Indexed document visibility and ping latency") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list v-if="collections.length" lines="full">
              <ion-item v-for="collection in collections" :key="collection.actualName">
                <ion-icon slot="start" :icon="albumsOutline" />
                <ion-label>
                  {{ collection.name }}
                  <p>{{ collection.actualName }}</p>
                  <p>{{ translate("Documents") }}: {{ formatNumber(collection.numDocs) }} · {{ translate("Size") }}: {{ collection.size || translate("Unknown") }}</p>
                </ion-label>
                <ion-badge slot="end" :color="collectionColor(collection)">{{ collection.health || collectionStatus(collection) }}</ion-badge>
              </ion-item>
            </ion-list>
            <ion-item v-else lines="none">
              <ion-label>{{ translate("No Solr collections reported") }}</ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Core pings") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Request response from each monitored collection") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list v-if="pings.length" lines="full">
              <ion-item v-for="ping in pings" :key="ping.actualName">
                <ion-icon slot="start" :icon="radioOutline" />
                <ion-label>
                  {{ ping.name }}
                  <p v-if="ping.ok">{{ translate("Responded in") }} {{ ping.qTime ?? 0 }}ms</p>
                  <p v-else>{{ ping.errorMessage }}</p>
                </ion-label>
                <ion-badge slot="end" :color="ping.ok ? 'success' : 'danger'">{{ ping.ok ? translate("Online") : translate("Failed") }}</ion-badge>
              </ion-item>
            </ion-list>
            <ion-item v-else lines="none">
              <ion-label>{{ translate("No ping results available") }}</ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("API coverage") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Solr APIs used by this monitor") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="full">
              <ion-item v-for="check in checks" :key="check.id">
                <ion-icon slot="start" :icon="check.ok ? checkmarkCircleOutline : warningOutline" />
                <ion-label>{{ check.label }}</ion-label>
                <ion-badge slot="end" :color="check.ok ? 'success' : 'warning'">{{ check.ok ? translate("Available") : translate("Unavailable") }}</ion-badge>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Key metrics") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("JVM, node, and core counters from Solr") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="full">
              <ion-item v-for="metric in flattenedMetrics" :key="metric.key">
                <ion-icon slot="start" :icon="analyticsOutline" />
                <ion-label>
                  {{ metric.label }}
                  <p>{{ metric.key }}</p>
                </ion-label>
                <ion-note slot="end">{{ metric.value }}</ion-note>
              </ion-item>
              <ion-item v-if="!flattenedMetrics.length" lines="none">
                <ion-label>{{ translate("No metrics returned") }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-item v-if="store.isLoading" lines="none">
          <ion-spinner slot="start" name="crescent" />
          <ion-label>{{ translate("Loading Solr monitoring") }}</ion-label>
        </ion-item>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonPage,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { computed, onUnmounted, ref } from "vue";
import { albumsOutline, analyticsOutline, checkmarkCircleOutline, constructOutline, hardwareChipOutline, playCircleOutline, pulseOutline, radioOutline, refreshOutline, searchOutline, serverOutline, syncCircleOutline, warningOutline } from "ionicons/icons";

import { translate } from "@common";
import { useSolrMonitoringStore } from "@/store/solrMonitoring";
import { showToast } from "@/utils";

const store = useSolrMonitoringStore();

const summary = computed(() => store.getSummary);
const overview = computed(() => store.getOverview);
const system = computed(() => store.getSystem);
const config = computed(() => store.getConfig);
const collections = computed(() => store.getCollections);
const pings = computed(() => store.getPings);
const repairResults = computed(() => store.getRepairResults);
const rebuildOperation = computed(() => store.getRebuildOperation || {});
const checks = computed(() => overview.value.checks || []);
const repairDocumentType = ref("ORDER");
const repairQuery = ref("");
const hasSearched = ref(false);
const repairingPrimaryId = ref("");
const rebuildPollId = ref<number>();
const isRebuildRunning = computed(() => ["QUEUED", "RUNNING"].includes(rebuildOperation.value.status));
const repairPlaceholder = computed(() => repairDocumentType.value === "ORDER"
  ? translate("Search by order ID, order name, customer, email, SKU")
  : translate("Search by product ID, name, SKU, UPC"));
const flattenedMetrics = computed(() => {
  const metrics = store.getMetrics || {};
  return Object.entries(metrics).flatMap(([group, groupMetrics]: [string, any]) =>
    Object.entries(groupMetrics || {}).map(([key, value]: [string, any]) => ({
      key,
      label: group.toUpperCase(),
      value: formatMetricValue(value)
    }))
  ).slice(0, 30);
});

onIonViewWillEnter(async () => {
  await loadSummary();
  if(isRebuildRunning.value && rebuildOperation.value.jobRunId) startRebuildPolling(rebuildOperation.value.jobRunId);
});

onUnmounted(() => stopRebuildPolling());

const loadSummary = async () => {
  await store.fetchSummary();
};

const refreshSummary = async (event: CustomEvent) => {
  await loadSummary();
  event.detail.complete();
};

const startRebuild = async () => {
  const operation = await store.startRebuild();
  if(operation.jobRunId) {
    showToast(translate("Solr rebuild has been scheduled"));
    startRebuildPolling(operation.jobRunId);
  }
};

const startRebuildPolling = (jobRunId: string) => {
  stopRebuildPolling();
  rebuildPollId.value = window.setInterval(async () => {
    const operation = await store.fetchRebuildStatus(jobRunId);
    if(operation.status && !["QUEUED", "RUNNING"].includes(operation.status)) {
      stopRebuildPolling();
      await loadSummary();
    }
  }, 3000);
};

const stopRebuildPolling = () => {
  if(rebuildPollId.value) {
    window.clearInterval(rebuildPollId.value);
    rebuildPollId.value = undefined;
  }
};

const searchRepairDocuments = async () => {
  if(!repairQuery.value.trim()) return;
  hasSearched.value = true;
  await store.searchDocuments({
    documentType: repairDocumentType.value,
    query: repairQuery.value.trim()
  });
};

const reindexRepairDocument = async (document: any) => {
  repairingPrimaryId.value = document.primaryId;
  try {
    const result = await store.reindexDocument({
      documentType: document.documentType,
      primaryId: document.primaryId
    });
    if(result.status === "FINISHED") {
      showToast(translate("Solr document rebuilt"));
      await searchRepairDocuments();
      await loadSummary();
    }
  } finally {
    repairingPrimaryId.value = "";
  }
};

const healthColor = (health?: string) => {
  if(health === "GREEN") return "success";
  if(health === "YELLOW" || health === "ORANGE") return "warning";
  if(health === "RED") return "danger";
  return "medium";
};

const collectionColor = (collection: any) => {
  if(!collection.exists) return "danger";
  return healthColor(collection.health || "GREEN");
};

const collectionStatus = (collection: any) => {
  if(!collection.exists) return translate("Missing");
  return translate("Available");
};

const operationColor = (status?: string) => {
  if(status === "FINISHED") return "success";
  if(status === "FAILED") return "danger";
  if(status === "RUNNING" || status === "QUEUED") return "warning";
  return "medium";
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : translate("Unknown");

const formatNumber = (value: any) => typeof value === "number" ? value.toLocaleString() : translate("Unknown");

const formatBytes = (value: any) => {
  const bytes = Number(value);
  if(!Number.isFinite(bytes) || bytes <= 0) return translate("Unknown");
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, exponent)).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatMetricValue = (value: any): string => {
  if(value === null || value === undefined) return "";
  if(typeof value === "number") return value.toLocaleString();
  if(typeof value === "string") return value;
  if(typeof value === "object") {
    const preferredKeys = ["value", "count", "meanRate", "p95_ms", "max_ms"];
    const key = preferredKeys.find((metricKey) => value[metricKey] !== undefined);
    if(key) return String(value[key]);
  }
  return JSON.stringify(value);
};
</script>
