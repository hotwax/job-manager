<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Solr Repair") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" router-link="/solr-monitoring">
            <ion-icon slot="start" :icon="pulseOutline" />
            <ion-label>{{ translate("Go to Monitoring") }}</ion-label>
          </ion-button>
          <ion-button fill="clear" @click="loadSummary">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="ion-padding">
          <h1>{{ translate("Data correction") }}</h1>
          <p>{{ translate("Rebuild and repair Solr documents to resolve search inconsistencies.") }}</p>
        </div>

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
              v-slot="searchbar"
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
  IonPage,
  IonProgressBar,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { computed, onUnmounted, ref } from "vue";
import { constructOutline, playCircleOutline, pulseOutline, refreshOutline, searchOutline, syncCircleOutline } from "ionicons/icons";

import { translate } from "@common";
import { useSolrMonitoringStore } from "@/store/solrMonitoring";
import { showToast } from "@/utils";

const store = useSolrMonitoringStore();

const rebuildOperation = computed(() => store.getRebuildOperation || {});
const repairResults = computed(() => store.getRepairResults);
const repairDocumentType = ref("ORDER");
const repairQuery = ref("");
const hasSearched = ref(false);
const repairingPrimaryId = ref("");
const rebuildPollId = ref<number>();
const isRebuildRunning = computed(() => ["QUEUED", "RUNNING"].includes(rebuildOperation.value.status));
const repairPlaceholder = computed(() => repairDocumentType.value === "ORDER"
  ? translate("Search by order ID, order name, customer, email, SKU")
  : translate("Search by product ID, name, SKU, UPC"));

onIonViewWillEnter(async () => {
  await loadSummary();
  if (isRebuildRunning.value && rebuildOperation.value.jobRunId) {
    startRebuildPolling(rebuildOperation.value.jobRunId);
  }
});

onUnmounted(() => stopRebuildPolling());

const loadSummary = async () => {
  await store.fetchSummary();
};

const startRebuild = async () => {
  const operation = await store.startRebuild();
  if (operation.jobRunId) {
    showToast(translate("Solr rebuild has been scheduled"));
    startRebuildPolling(operation.jobRunId);
  }
};

const startRebuildPolling = (jobRunId: string) => {
  stopRebuildPolling();
  rebuildPollId.value = window.setInterval(async () => {
    const operation = await store.fetchRebuildStatus(jobRunId);
    if (operation.status && !["QUEUED", "RUNNING"].includes(operation.status)) {
      stopRebuildPolling();
      await loadSummary();
    }
  }, 3000);
};

const stopRebuildPolling = () => {
  if (rebuildPollId.value) {
    window.clearInterval(rebuildPollId.value);
    rebuildPollId.value = undefined;
  }
};

const searchRepairDocuments = async () => {
  if (!repairQuery.value.trim()) return;
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
    if (result.status === "FINISHED") {
      showToast(translate("Solr document rebuilt"));
      await searchRepairDocuments();
      await loadSummary();
    }
  } finally {
    repairingPrimaryId.value = "";
  }
};

const operationColor = (status?: string) => {
  if (status === "FINISHED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RUNNING" || status === "QUEUED") return "warning";
  return "medium";
};

const formatNumber = (value: any) => typeof value === "number" ? value.toLocaleString() : translate("Unknown");
</script>
