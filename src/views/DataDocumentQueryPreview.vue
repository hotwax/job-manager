<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/data-documents/${dataDocumentId}`" />
        </ion-buttons>
        <ion-title>{{ translate("Run Data Document") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card v-if="document">
          <ion-card-header>
            <ion-card-title>{{ document.documentName || document.dataDocumentId }}</ion-card-title>
            <ion-card-subtitle>{{ document.primaryEntityName }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-note color="warning" v-if="isBroadQuery">
              {{ translate("This query has no runtime filters. Preview a small page before scheduling an export.") }}
            </ion-note>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Output Fields") }}</ion-card-title>
          </ion-card-header>
          <ion-list>
            <ion-item v-for="field in fields" :key="field.fieldSeqId || fieldAlias(field)">
              <ion-checkbox
                label-placement="end"
                justify="start"
                :checked="selectedFields.includes(fieldAlias(field))"
                @ionChange="toggleField(fieldAlias(field), $event.detail.checked)"
              >
                <ion-label>
                  <h2>{{ fieldAlias(field) }}</h2>
                  <p>{{ field.fieldPath }}</p>
                </ion-label>
              </ion-checkbox>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Runtime Filters") }}</ion-card-title>
          </ion-card-header>
          <ion-list>
            <ion-item v-for="(filter, index) in filters" :key="filter.localId">
              <ion-label>
                <ion-select v-model="filter.fieldNameAlias" :label="translate('Field')" label-placement="stacked" interface="popover">
                  <ion-select-option v-for="field in fields" :key="fieldAlias(field)" :value="fieldAlias(field)">
                    {{ fieldAlias(field) }}
                  </ion-select-option>
                </ion-select>
                <ion-select v-model="filter.operator" :label="translate('Operator')" label-placement="stacked" interface="popover">
                  <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                    {{ translate(operator.label) }}
                  </ion-select-option>
                </ion-select>
                <ion-input v-if="operatorNeedsValue(filter.operator)" v-model="filter.value" :label="operatorNeedsToValue(filter.operator) ? translate('From value') : translate('Value')" label-placement="stacked" />
                <ion-input v-if="operatorNeedsToValue(filter.operator)" v-model="filter.toValue" :label="translate('To value')" label-placement="stacked" />
              </ion-label>
              <ion-button fill="clear" color="danger" slot="end" @click="filters.splice(index, 1)">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </ion-item>
            <ion-item button @click="addFilter">
              <ion-icon slot="start" :icon="addOutline" />
              <ion-label>{{ translate("Add filter") }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Run Options") }}</ion-card-title>
          </ion-card-header>
          <ion-list>
            <ion-item>
              <ion-select v-model="sortField" :label="translate('Sort Field')" label-placement="stacked" interface="popover">
                <ion-select-option value="">{{ translate("No sort") }}</ion-select-option>
                <ion-select-option v-for="field in fields" :key="fieldAlias(field)" :value="fieldAlias(field)">
                  {{ fieldAlias(field) }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-segment v-model="sortDirection">
                <ion-segment-button value="ASC">
                  <ion-label>{{ translate("Ascending") }}</ion-label>
                </ion-segment-button>
                <ion-segment-button value="DESC">
                  <ion-label>{{ translate("Descending") }}</ion-label>
                </ion-segment-button>
              </ion-segment>
            </ion-item>
            <ion-item>
              <ion-toggle v-model="distinct">{{ translate("Distinct results") }}</ion-toggle>
            </ion-item>
            <ion-item>
              <ion-input v-model="pageSize" type="number" :label="translate('Page Size')" label-placement="stacked" />
            </ion-item>
          </ion-list>
          <ion-card-content>
            <ion-button expand="block" @click="runPreview">
              <ion-icon slot="start" :icon="playOutline" />
              {{ translate("Preview Results") }}
            </ion-button>
            <ion-button expand="block" fill="outline" @click="queueExport">
              <ion-icon slot="start" :icon="cloudUploadOutline" />
              {{ translate("Export now") }}
            </ion-button>
            <ion-note class="ion-text-wrap ion-padding-top">
              {{ translate("Exports run the full document (with its conditions) and include up to 10,000 rows. Field selection and runtime filters apply to preview only.") }}
            </ion-note>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Preview") }}</ion-card-title>
            <ion-card-subtitle>
              <template v-if="previewCapped">{{ translate("Showing the first") }} {{ previewRows.length }} {{ translate("rows (capped at the page size) — run an export for the full result.") }}</template>
              <template v-else>{{ previewRows.length }} {{ translate("records") }}</template>
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content v-if="previewRows.length">
            <DataDocumentPreviewTable
              :rows="previewRows"
              :file-name="dataDocumentId"
              can-export
              @run-export="queueExport"
            />
          </ion-card-content>
          <ion-card-content v-else>
            <ion-text color="medium">{{ translate("Run a preview to see sample results.") }}</ion-text>
          </ion-card-content>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
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
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, cloudUploadOutline, playOutline, trashOutline } from "ionicons/icons";
import { computed, ref } from "vue";
import router from "../router";

import { translate } from "@common";
import { showToast } from "@/utils";
import { RUNTIME_FILTER_OPERATORS } from "@/utils/dataDocumentGraph";
import { useDataDocumentStore } from "@/store/dataDocuments";
import DataDocumentPreviewTable from "@/components/DataDocumentPreviewTable.vue";

const store = useDataDocumentStore();
// Read from the router singleton (always resolved post router.isReady), not useRoute() which
// can be transiently undefined on a deep-link/refresh and made the view fetch "/undefined".
const dataDocumentId = computed(() => (router.currentRoute.value.params.id as string) || "");

const operators = RUNTIME_FILTER_OPERATORS;
// Fields without an explicit alias are keyed by their terminal field name (the alias Moqui
// uses by default), so fall back to that — otherwise the field/sort pickers render empty.
const fieldAlias = (field: any) => field.fieldNameAlias || String(field.fieldPath || "").split(":").pop() || "";
const operatorNeedsValue = (value: string) => RUNTIME_FILTER_OPERATORS.find((op) => op.value === value)?.needsValue !== false;
const operatorNeedsToValue = (value: string) => !!RUNTIME_FILTER_OPERATORS.find((op) => op.value === value)?.needsToValue;

const selectedFields = ref<string[]>([]);
const filters = ref<any[]>([]);
const sortField = ref("");
const sortDirection = ref("ASC");
const distinct = ref(false);
const pageSize = ref(25);

const document = computed(() => store.getCurrentDocument);
const fields = computed(() => store.getFields);
const previewRows = computed(() => store.getPreviewRows);
// dataDocumentView returns no total — a full page back means the result is capped at pageSize.
const previewCapped = computed(() => previewRows.value.length >= Number(pageSize.value || 25));
const isBroadQuery = computed(() => !filters.value.length);

const getLocalId = () => `${Date.now()}-${Math.random()}`;

const buildQuery = () => ({
  selectedFields: selectedFields.value,
  filters: filters.value.map(({ localId, ...filter }) => filter),
  sort: sortField.value ? [{ fieldNameAlias: sortField.value, direction: sortDirection.value }] : [],
  distinct: distinct.value,
  pageSize: Number(pageSize.value || 25)
});

const toggleField = (fieldNameAlias: string, checked: boolean) => {
  selectedFields.value = checked
    ? [...new Set(selectedFields.value.concat(fieldNameAlias))]
    : selectedFields.value.filter((field) => field !== fieldNameAlias);
};

const addFilter = () => {
  filters.value.push({
    localId: getLocalId(),
    fieldNameAlias: fields.value[0]?.fieldNameAlias || "",
    operator: "equals",
    value: ""
  });
};

const runPreview = async () => {
  await store.runPreview(dataDocumentId.value, buildQuery());
};

const queueExport = async () => {
  await store.queueExport(dataDocumentId.value, {
    query: buildQuery(),
    format: "csv"
  });
  showToast(translate("Data document export queued."));
};

const loadDocument = async () => {
  if (!dataDocumentId.value) return;
  await store.fetchDataDocument(dataDocumentId.value);
  selectedFields.value = fields.value.filter((field: any) => field.defaultDisplay === "Y").map((field: any) => fieldAlias(field));
};

onIonViewWillEnter(loadDocument);
</script>
