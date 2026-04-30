<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/data-documents/${dataDocumentId}`" />
        </ion-buttons>
        <ion-title>{{ translate("Run Data Document") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="savePreset">
            <ion-icon slot="start" :icon="bookmarkOutline" />
            {{ translate("Save Preset") }}
          </ion-button>
        </ion-buttons>
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
            <ion-item v-for="field in fields" :key="field.fieldSeqId || field.fieldNameAlias">
              <ion-checkbox
                slot="start"
                :checked="selectedFields.includes(field.fieldNameAlias)"
                @ionChange="toggleField(field.fieldNameAlias, $event.detail.checked)"
              />
              <ion-label>
                <h2>{{ field.fieldNameAlias }}</h2>
                <p>{{ field.fieldPath }}</p>
              </ion-label>
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
                  <ion-select-option v-for="field in fields" :key="field.fieldNameAlias" :value="field.fieldNameAlias">
                    {{ field.fieldNameAlias }}
                  </ion-select-option>
                </ion-select>
                <ion-select v-model="filter.operator" :label="translate('Operator')" label-placement="stacked" interface="popover">
                  <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                    {{ translate(operator.label) }}
                  </ion-select-option>
                </ion-select>
                <ion-input v-model="filter.value" :label="translate('Value')" label-placement="stacked" />
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
                <ion-select-option v-for="field in fields" :key="field.fieldNameAlias" :value="field.fieldNameAlias">
                  {{ field.fieldNameAlias }}
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
              {{ translate("Schedule Export") }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Preview") }}</ion-card-title>
            <ion-card-subtitle>{{ previewTotal }} {{ translate("records") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list v-if="previewRows.length">
            <ion-item v-for="(row, index) in previewRows" :key="index">
              <ion-label>
                <h2>{{ translate("Record") }} {{ index + 1 }}</h2>
                <p v-for="field in previewFields" :key="field">
                  <strong>{{ field }}:</strong> {{ row[field] }}
                </p>
              </ion-label>
            </ion-item>
          </ion-list>
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
import { addOutline, bookmarkOutline, cloudUploadOutline, playOutline, trashOutline } from "ionicons/icons";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import { translate } from "@common";
import { showToast } from "@/utils";
import { useDataDocumentStore } from "@/store/dataDocuments";

const route = useRoute();
const store = useDataDocumentStore();
const dataDocumentId = computed(() => route.params.id as string);

const operators = [
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "starts-with", label: "Starts with" },
  { value: "in", label: "In list" },
  { value: "empty", label: "Is empty" },
  { value: "not-empty", label: "Is not empty" },
  { value: "greater", label: "Greater than" },
  { value: "greater-equals", label: "Greater than or equal" },
  { value: "less", label: "Less than" },
  { value: "less-equals", label: "Less than or equal" },
  { value: "between", label: "Between" }
];

const selectedFields = ref<string[]>([]);
const filters = ref<any[]>([]);
const sortField = ref("");
const sortDirection = ref("ASC");
const distinct = ref(false);
const pageSize = ref(25);

const document = computed(() => store.getCurrentDocument);
const fields = computed(() => store.getFields);
const presets = computed(() => store.getPresets);
const previewRows = computed(() => store.getPreviewRows);
const previewTotal = computed(() => store.getPreviewTotal);
const previewFields = computed(() => selectedFields.value.length ? selectedFields.value : Object.keys(previewRows.value[0] || {}));
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

const savePreset = async () => {
  const presetName = window.prompt(translate("Preset name"));
  if (!presetName) return;
  await store.savePreset(dataDocumentId.value, {
    presetId: route.params.presetId === "new" ? undefined : route.params.presetId,
    presetName,
    query: buildQuery()
  });
  showToast(translate("Query preset saved."));
};

const queueExport = async () => {
  await store.queueExport(dataDocumentId.value, {
    query: buildQuery(),
    format: "csv"
  });
  showToast(translate("Data document export queued."));
};

const hydratePreset = () => {
  const presetId = route.params.presetId as string;
  if (!presetId || presetId === "new") return;
  const preset = presets.value.find((item: any) => item.presetId === presetId);
  if (!preset?.query) return;
  selectedFields.value = preset.query.selectedFields || selectedFields.value;
  filters.value = (preset.query.filters || []).map((filter: any) => ({ ...filter, localId: getLocalId() }));
  sortField.value = preset.query.sort?.[0]?.fieldNameAlias || "";
  sortDirection.value = preset.query.sort?.[0]?.direction || "ASC";
  distinct.value = !!preset.query.distinct;
  pageSize.value = preset.query.pageSize || 25;
};

onIonViewWillEnter(async () => {
  await store.fetchDataDocument(dataDocumentId.value);
  selectedFields.value = fields.value.filter((field: any) => field.defaultDisplay === "Y").map((field: any) => field.fieldNameAlias);
  hydratePreset();
});
</script>
