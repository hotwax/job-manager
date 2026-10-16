<template>
  <ion-card :aria-busy="isPreview">
    <ion-list class="graph-metadata-list">
      <ion-item detail button :disabled="isPreview" @click="$emit('open-entity-modal')">
        <ion-label>
          <p>{{ translate("Primary Entity") }}</p>
          <ion-skeleton-text v-if="isPreview && !metadata.primaryEntityName" :animated="true" style="width: 60%" />
          <template v-else>
            {{ metadata.primaryEntityName || translate("Select Entity") }}
          </template>
        </ion-label>
      </ion-item>
      <ion-input
        :value="metadata.documentName"
        :disabled="isPreview"
        :label="translate('Name')"
        label-placement="floating"
        fill="outline"
        @ionInput="updateMetadata('documentName', $event.detail.value || '')"
      />
      <ion-input
        :value="metadata.documentTitle"
        :disabled="isPreview"
        :label="translate('Title')"
        label-placement="floating"
        fill="outline"
        @ionInput="updateMetadata('documentTitle', $event.detail.value || '')"
      />
      <ion-buttons>
        <ion-button slot="end" fill="clear" :disabled="isPreview" :aria-label="translate('Advanced Metadata')" @click="openAdvancedMetadataModal">
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
        <ion-buttons slot="end">
          <ion-button
            :aria-label="translate('What each field is for')"
            :color="showFieldInfo ? 'primary' : undefined"
            @click="showFieldInfo = !showFieldInfo"
          >
            <ion-icon slot="icon-only" :icon="showFieldInfo ? informationCircle : informationCircleOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list class="advanced-metadata-fields">
        <ion-item detail button @click="$emit('open-entity-modal')">
          <ion-label>
            <p>{{ translate("Primary Entity") }}</p>
            {{ metadata.primaryEntityName || translate("Select Entity") }}
          </ion-label>
        </ion-item>
        <ion-note v-if="showFieldInfo" class="field-hint">
          {{ translate("The entity each document is built from. Changing it clears the current fields and conditions.") }}
        </ion-note>

        <ion-input
          :value="metadata.documentName"
          :label="translate('Name')"
          label-placement="floating"
          fill="outline"
          :helper-text="showFieldInfo ? translate('Names this definition. Every document of this type shares it.') : undefined"
          @ionInput="updateMetadata('documentName', $event.detail.value || '')"
        />
        <ion-input
          :value="metadata.documentTitle"
          :label="translate('Title')"
          label-placement="floating"
          fill="outline"
          :helper-text="showFieldInfo ? translate('Names each generated document. Use {syntax} to insert a value from that document.', { syntax: '${fieldName}' }) : undefined"
          @ionInput="updateMetadata('documentTitle', $event.detail.value || '')"
        />
        <ion-input
          :value="metadata.dataDocumentId"
          :readonly="!isNew"
          :label="translate('Data Document ID')"
          label-placement="floating"
          fill="outline"
          counter
          :maxlength="DATA_DOCUMENT_ID_MAX_LENGTH"
          :helper-text="showFieldInfo ? translate('Identifies this document to the API, feeds and exports. Camel case, starting with a capital letter.') : undefined"
          @ionInput="updateMetadata('dataDocumentId', $event.detail.value || '')"
        />
        <ion-input
          :value="metadata.indexName"
          :label="translate('Index Name')"
          label-placement="floating"
          fill="outline"
          :helper-text="showFieldInfo ? translate('The search index these documents are written to. Must be lower case, and is only needed for indexed documents.') : undefined"
          @ionInput="updateMetadata('indexName', $event.detail.value || '')"
        />
        <ion-input
          :value="metadata.manualDataServiceName"
          :label="translate('Manual Data Service')"
          label-placement="floating"
          fill="outline"
          :helper-text="showFieldInfo ? translate('A service called to add extra data to each document. It must implement add#ManualDocumentData.') : undefined"
          @ionInput="updateMetadata('manualDataServiceName', $event.detail.value || '')"
        />
      </ion-list>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :disabled="hasErrors" :aria-label="translate('Save')" @click="saveFromModal">
          <ion-icon :icon="saveOutline" />
        </ion-fab-button>
      </ion-fab>
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
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSkeletonText,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { closeOutline, informationCircle, informationCircleOutline, optionsOutline, saveOutline } from "ionicons/icons";
import { computed, ref } from "vue";

import router from "@/router";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { DATA_DOCUMENT_ID_MAX_LENGTH } from "@/utils/dataDocumentGraph";
import type { DataDocumentRecord } from "@/utils/dataDocumentGraph";

// The card and the advanced-metadata modal are siblings, so this renders a fragment and has
// no single root to inherit attributes onto (the dev ide-trace plugin passes some).
defineOptions({ inheritAttrs: false });

// While the document loads, its catalog record stands in as a read-only preview (name, title and
// entity), so the card is meaningful before the first byte of the document arrives.
const props = defineProps<{ summary?: DataDocumentRecord }>();

// The entity picker and the save routine both live with the page that owns the graph, so the
// card only asks for them.
const emit = defineEmits<{ (e: "open-entity-modal"): void; (e: "save"): void }>();

const graphStore = useDataDocumentGraphStore();

// The store can still hold another document's graph (a restored one, or the previous page's) until
// this page claims it, so only a graph that is ready for this page counts.
const graph = computed(() => graphStore.status === "ready" ? graphStore.getGraph : undefined);
const isPreview = computed(() => !graph.value);
const metadata = computed<DataDocumentRecord>(() => graph.value?.metadata || props.summary || {});
// Reactive to the live route so it flips to false in place after the first save replaces
// /data-documents/new/graph with /data-documents/{id}/graph (same route record).
const isNew = computed(() => router.currentRoute.value.params.id === "new");
// Mirrors the page toolbar: an error-severity issue blocks the save, a warning does not.
const hasErrors = computed(() => !!graph.value?.validationIssues.some((issue) => issue.severity === "error"));

const advancedMetadataModal = ref();
const showFieldInfo = ref(false);

const updateMetadata = (key: string, value: string) => {
  graphStore.updateMetadata({ [key]: value });
};

const openAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.present();
};

const closeAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.dismiss();
};

// saveGraph reports both success and failure with a toast, so the modal can step out of the
// way immediately and leave the outcome to the toast and the Issues panel behind it.
const saveFromModal = () => {
  emit("save");
  closeAdvancedMetadataModal();
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

@media (max-width: 900px) {
  .graph-metadata-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .graph-metadata-list > ion-buttons {
    justify-self: end;
  }
}

/* Outlined controls stacked in a modal, matching CreateJobModal's .job-detail-fields. */
.advanced-metadata-fields > ion-input,
.advanced-metadata-fields > ion-item {
  margin-block-end: var(--spacer-sm);
}

/* The Save FAB is fixed over the content, so the last field needs room to scroll clear of it. */
.advanced-metadata-fields {
  padding-block-end: var(--spacer-2xl);
}

/* Sits where an outlined control's helper text would, for the one row that is not an input. */
.field-hint {
  display: block;
  padding-inline: var(--spacer-sm);
  margin-block-end: var(--spacer-sm);
}
</style>
