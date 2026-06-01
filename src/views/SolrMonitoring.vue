<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Solr Monitoring") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" router-link="/solr-repair">
            <ion-icon slot="start" :icon="constructOutline" />
            <ion-label>{{ translate("Go to Repair") }}</ion-label>
          </ion-button>
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
        <div class="ion-padding">
          <h1>{{ translate("Solr Monitoring") }}</h1>
          <p>{{ translate("Track search service health, collection statistics, core ping latencies, and performance metrics.") }}</p>
        </div>

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
              <ion-item lines="none">
                <ion-icon slot="start" :icon="hardwareChipOutline" />
                <ion-label>
                  {{ translate("JVM memory") }}
                  <p>{{ translate("Heap memory utilization") }}: {{ memoryPercentage }}</p>
                </ion-label>
                <ion-note slot="end">{{ formatBytes(system.memory?.used) }} / {{ formatBytes(system.memory?.max) }}</ion-note>
              </ion-item>
              <ion-item lines="none">
                <ion-progress-bar :value="memoryRatio" :color="memoryProgressBarColor" />
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Collections") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Indexed document visibility and status") }}</ion-card-subtitle>
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

        <ion-item v-slot="loadingItem" v-if="store.isLoading" lines="none">
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
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { computed } from "vue";
import { albumsOutline, analyticsOutline, checkmarkCircleOutline, constructOutline, hardwareChipOutline, pulseOutline, radioOutline, refreshOutline, serverOutline, warningOutline } from "ionicons/icons";

import { translate } from "@common";
import { useSolrMonitoringStore } from "@/store/solrMonitoring";

const store = useSolrMonitoringStore();

const summary = computed(() => store.getSummary);
const overview = computed(() => store.getOverview);
const system = computed(() => store.getSystem);
const config = computed(() => store.getConfig);
const collections = computed(() => store.getCollections);
const pings = computed(() => store.getPings);
const checks = computed(() => overview.value.checks || []);

const memoryRatio = computed(() => {
  const used = system.value.memory?.used || 0;
  const max = system.value.memory?.max || 1;
  return Math.min(Math.max(used / max, 0), 1);
});

const memoryPercentage = computed(() => {
  const ratio = memoryRatio.value;
  return `${(ratio * 100).toFixed(1)}%`;
});

const memoryProgressBarColor = computed(() => {
  const ratio = memoryRatio.value;
  if (ratio > 0.85) return "danger";
  if (ratio > 0.70) return "warning";
  return "success";
});

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
});

const loadSummary = async () => {
  await store.fetchSummary();
};

const refreshSummary = async (event: CustomEvent) => {
  await loadSummary();
  event.detail.complete();
};

const healthColor = (health?: string) => {
  if (health === "GREEN") return "success";
  if (health === "YELLOW" || health === "ORANGE") return "warning";
  if (health === "RED") return "danger";
  return "medium";
};

const collectionColor = (collection: any) => {
  if (!collection.exists) return "danger";
  return healthColor(collection.health || "GREEN");
};

const collectionStatus = (collection: any) => {
  if (!collection.exists) return translate("Missing");
  return translate("Available");
};

const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : translate("Unknown");

const formatNumber = (value: any) => typeof value === "number" ? value.toLocaleString() : translate("Unknown");

const formatBytes = (value: any) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return translate("Unknown");
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, exponent)).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatMetricValue = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const preferredKeys = ["value", "count", "meanRate", "p95_ms", "max_ms"];
    const key = preferredKeys.find((metricKey) => value[metricKey] !== undefined);
    if (key) return String(value[key]);
  }
  return JSON.stringify(value);
};
</script>
