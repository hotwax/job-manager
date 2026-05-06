<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/data-documents" />
        </ion-buttons>
        <ion-title>{{ translate("Data Document Builder") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="saveDocument" :disabled="!graph || graphHasErrors">
            <ion-icon slot="start" :icon="saveOutline" />
            {{ translate("Save") }}
          </ion-button>
          <ion-button @click="runPreview" :disabled="!graph?.dataDocumentId">
            <ion-icon slot="start" :icon="playOutline" />
            {{ translate("Preview") }}
          </ion-button>
          <ion-button @click="queueExport" :disabled="!graph?.dataDocumentId">
            <ion-icon slot="start" :icon="cloudUploadOutline" />
            {{ translate("Export") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="loading">
      <ion-card>
        <ion-card-content class="ion-text-center">
          <ion-spinner />
          <p>{{ translate("Loading document...") }}</p>
        </ion-card-content>
      </ion-card>
    </ion-content>

    <DataDocumentFormView v-else />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { cloudUploadOutline, playOutline, saveOutline } from "ionicons/icons";
import { computed } from "vue";
import router from "../router";
import { translate } from "@common";
import { showToast } from "@/utils";

import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";
import DataDocumentFormView from "./DataDocumentFormView.vue";

const route = router.currentRoute.value;
const graphStore = useDataDocumentGraphStore();
const dataDocumentStore = useDataDocumentStore();

const isNew = computed(() => route.name === "CreateDataDocument");
const graph = computed(() => graphStore.getGraph);
const loading = computed(() => graphStore.isLoading);
const graphHasErrors = computed(() => graph.value?.validationIssues.some((issue) => issue.severity === "error"));

const saveDocument = async () => {
  await graphStore.saveGraph();
  showToast(translate("Data document saved."));
  if (isNew.value && graph.value?.dataDocumentId) {
    router.replace(`/data-documents/${graph.value.dataDocumentId}/edit`);
  }
};

const runPreview = () => {
  if (graph.value?.dataDocumentId) {
    router.push(`/data-documents/${graph.value.dataDocumentId}/run`);
  }
};

const queueExport = async () => {
  if (!graph.value?.dataDocumentId) return;
  // Use a default query for export from builder wrapper
  await dataDocumentStore.queueExport(graph.value.dataDocumentId, {
    query: {
      selectedFields: graph.value.fields.filter(f => f.defaultDisplay !== "N").map(f => f.outputName),
      filters: graph.value.conditions.map(c => ({
        fieldNameAlias: c.fieldNameAlias,
        operator: c.operator,
        value: c.fieldValue
      }))
    },
    format: "csv"
  });
  showToast(translate("Data document export queued."));
};

onIonViewWillEnter(async () => {
  if (isNew.value) {
    graphStore.startNewGraph();
  } else {
    await graphStore.fetchGraph(route.params.id as string);
  }
});
</script>
