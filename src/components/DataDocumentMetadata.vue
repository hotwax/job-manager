<template>
  <ion-card>
    <ion-list class="graph-metadata-list">
      <ion-item detail button @click="$emit('open-entity-modal')">
        <ion-label>
          <p>{{ translate("Primary Entity") }}</p>
          {{ metadata.primaryEntityName || translate("Select Entity") }}
        </ion-label>
      </ion-item>
      <ion-input
        :value="metadata.documentName"
        :label="translate('Name')"
        label-placement="floating"
        fill="outline"
        @ionInput="updateMetadata('documentName', $event.detail.value || '')"
      />
      <ion-input
        :value="metadata.documentTitle"
        :label="translate('Title')"
        label-placement="floating"
        fill="outline"
        @ionInput="updateMetadata('documentTitle', $event.detail.value || '')"
      />
      <ion-buttons>
        <ion-button slot="end" fill="clear" :aria-label="translate('Advanced Metadata')" @click="openAdvancedMetadataModal">
          <ion-icon slot="icon-only" :icon="optionsOutline" />
        </ion-button>
      </ion-buttons>
    </ion-list>
  </ion-card>

  <ion-modal ref="advancedMetadataModal">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="closeAdvancedMetadataModal">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Advanced Metadata") }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list class="advanced-metadata-fields">
        <ion-input
          :value="metadata.dataDocumentId"
          :readonly="!isNew"
          :label="translate('Data Document ID')"
          label-placement="floating"
          fill="outline"
          counter
          :maxlength="DATA_DOCUMENT_ID_MAX_LENGTH"
          @ionInput="updateMetadata('dataDocumentId', $event.detail.value || '')"
        />
        <ion-input
          :value="metadata.indexName"
          :label="translate('Index Name')"
          label-placement="floating"
          fill="outline"
          @ionInput="updateMetadata('indexName', $event.detail.value || '')"
        />
        <ion-input
          :value="metadata.manualDataServiceName"
          :label="translate('Manual Data Service')"
          label-placement="floating"
          fill="outline"
          @ionInput="updateMetadata('manualDataServiceName', $event.detail.value || '')"
        />
      </ion-list>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { translate } from "@common";
import {
  IonButton,
  IonButtons,
  IonCard,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { closeOutline, optionsOutline } from "ionicons/icons";
import { computed, ref } from "vue";

import router from "@/router";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { DATA_DOCUMENT_ID_MAX_LENGTH } from "@/utils/dataDocumentGraph";
import type { DataDocumentRecord } from "@/utils/dataDocumentGraph";

// The card and the advanced-metadata modal are siblings, so this renders a fragment and has
// no single root to inherit attributes onto (the dev ide-trace plugin passes some).
defineOptions({ inheritAttrs: false });

// The entity picker lives with the page that owns the graph, so the card only asks for it.
defineEmits<{ (e: "open-entity-modal"): void }>();

const graphStore = useDataDocumentGraphStore();

const metadata = computed<DataDocumentRecord>(() => graphStore.getGraph?.metadata || {});
// Reactive to the live route so it flips to false in place after the first save replaces
// /data-documents/new/graph with /data-documents/{id}/graph (same route record).
const isNew = computed(() => router.currentRoute.value.params.id === "new");

const advancedMetadataModal = ref();

const updateMetadata = (key: string, value: string) => {
  graphStore.updateMetadata({ [key]: value });
};

const openAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.present();
};

const closeAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.dismiss();
};
</script>

<style scoped>
.graph-metadata-list {
  display: grid;
  grid-template-columns: 1fr auto auto min-content;
  align-items: center;
  gap: var(--spacer-sm);
  padding-inline: var(--spacer-sm);
}

/* Outlined controls stacked in a modal, matching CreateJobModal's .job-detail-fields. */
.advanced-metadata-fields > ion-input {
  margin-block-end: var(--spacer-sm);
}
</style>
