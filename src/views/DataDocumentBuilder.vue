<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/data-documents" />
        </ion-buttons>
        <ion-title>{{ isNew ? translate("Create Data Document") : translate("Edit Data Document") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="saveDocument">
            <ion-icon slot="start" :icon="saveOutline" />
            {{ translate("Save") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Metadata") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Define the document ID, entity, and title expression.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list>
            <ion-item>
              <ion-input v-model="form.dataDocumentId" :readonly="!isNew" :label="translate('Data Document ID')" label-placement="stacked" />
            </ion-item>
            <ion-item>
              <ion-input v-model="form.documentName" :label="translate('Document Name')" label-placement="stacked" />
            </ion-item>
            <ion-item detail button id="select-entity-modal">
              <ion-label>
                {{ translate("Primary Entity") }}
                <p>{{ form.primaryEntityName || translate("Select Entity") }}</p>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-input v-model="form.documentTitle" :label="translate('Document Title')" label-placement="stacked" />
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Fields") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Use direct fields or relation paths such as product:internalName.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list>
            <ion-item v-for="(field, index) in fields" :key="field.localId">
              <ion-label>
                <ion-button fill="outline" expand="block" @click="openFieldModal(index)">
                  {{ field.fieldPath || translate("Select Field") }}
                </ion-button>
                <ion-input v-model="field.fieldNameAlias" :label="translate('Alias')" label-placement="stacked" />
                <ion-input v-model="field.sequenceNum" type="number" :label="translate('Sequence')" label-placement="stacked" />
                <ion-toggle :checked="field.defaultDisplay === 'Y'" @ionChange="field.defaultDisplay = $event.detail.checked ? 'Y' : 'N'">
                  {{ translate("Default display") }}
                </ion-toggle>
                <p>{{ translate("Determines if this field is displayed by default when viewing the data document results.") }}</p>
              </ion-label>
              <ion-button fill="clear" slot="end" color="danger" @click="removeField(index)">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </ion-item>
            <ion-item button @click="addField">
              <ion-icon slot="start" :icon="addOutline" />
              <ion-label>{{ translate("Add field") }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Conditions") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Add conditions that always apply to this document.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list>
            <ion-item v-for="(condition, index) in conditions" :key="condition.localId">
              <ion-label>
                <ion-input v-model="condition.fieldNameAlias" :label="translate('Field Alias')" label-placement="stacked" />
                <ion-select v-model="condition.operator" :label="translate('Operator')" label-placement="stacked" interface="popover">
                  <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                    {{ translate(operator.label) }}
                  </ion-select-option>
                </ion-select>
                <ion-input v-model="condition.value" :label="translate('Value')" label-placement="stacked" />
              </ion-label>
              <ion-button fill="clear" slot="end" color="danger" @click="removeCondition(index)">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </ion-item>
            <ion-item button @click="addCondition">
              <ion-icon slot="start" :icon="addOutline" />
              <ion-label>{{ translate("Add condition") }}</ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-card>
          <ion-card-content>
            <ion-button expand="block" @click="previewSample" :disabled="!form.dataDocumentId">
              <ion-icon slot="start" :icon="eyeOutline" />
              {{ translate("VALIDATE WITH PREVIEW") }}
            </ion-button>
          </ion-card-content>
        </ion-card>
      </main>

      <ion-modal ref="entityModal" trigger="select-entity-modal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeEntityModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Select Primary Entity") }}</ion-title>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar :placeholder="translate('Search entities')" v-model="entityQueryString" />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-radio-group :value="form.primaryEntityName" @ionChange="selectEntity($event.detail.value)">
            <ion-list>
              <ion-item v-for="entity in filteredEntities" :key="entity">
                <ion-radio :value="entity" label-placement="end" justify="start">{{ entity }}</ion-radio>
              </ion-item>
            </ion-list>
          </ion-radio-group>
        </ion-content>
      </ion-modal>

      <ion-modal ref="fieldModal">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="closeFieldModal">
                <ion-icon slot="icon-only" :icon="closeOutline" />
              </ion-button>
            </ion-buttons>
            <ion-title>{{ translate("Select Field") }}</ion-title>
          </ion-toolbar>
          <ion-toolbar>
            <ion-searchbar v-model="fieldQueryString" :placeholder="translate('Search fields')" />
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list>
            <ion-item v-for="field in filteredEntityFields" :key="field.fieldName" button @click="selectField(field)">
              <ion-label>
                <h2>{{ field.fieldName }}</h2>
                <p v-if="field.description">{{ field.description }}</p>
              </ion-label>
              <ion-radio slot="end" :checked="fields[activeFieldIndex]?.fieldPath === field.fieldName" :value="field.fieldName" />
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
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
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, closeOutline, eyeOutline, saveOutline, searchOutline, trashOutline } from "ionicons/icons";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { translate } from "@common";
import { showToast } from "@/utils";
import { useDataDocumentStore } from "@/store/dataDocuments";
import { useUtilStore } from "@/store/util";

const route = useRoute();
const router = useRouter();
const store = useDataDocumentStore();
const isNew = computed(() => route.name === "CreateDataDocument");

const operators = [
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "starts-with", label: "Starts with" },
  { value: "in-list", label: "In list" },
  { value: "is-empty", label: "Is empty" },
  { value: "is-not-empty", label: "Is not empty" },
  { value: "greater-than", label: "Greater than" },
  { value: "greater-than-equal-to", label: "Greater than or equal" },
  { value: "less-than", label: "Less than" },
  { value: "less-than-equal-to", label: "Less than or equal" },
  { value: "between", label: "Between" }
];

const form = reactive({
  dataDocumentId: "",
  documentName: "",
  primaryEntityName: "",
  documentTitle: ""
});
const fields = ref<any[]>([]);
const conditions = ref<any[]>([]);

const utilStore = useUtilStore();
const entityModal = ref();
const entityQueryString = ref("");

const fieldModal = ref();
const fieldQueryString = ref("");
const activeFieldIndex = ref(-1);

const entities = computed(() => utilStore.getEntities);
const entityFields = computed(() => utilStore.getEntityFields(form.primaryEntityName));
const filteredEntities = computed(() => {
  const query = entityQueryString.value.trim().toLowerCase();
  if (!query) return entities.value;
  return entities.value.filter((entity: string) => entity.toLowerCase().includes(query));
});

const filteredEntityFields = computed(() => {
  const query = fieldQueryString.value.trim().toLowerCase();
  const fields = entityFields.value.map((field: any) => typeof field === 'string' ? { fieldName: field, description: "" } : field);
  if (!query) return fields;
  return fields.filter((field: any) => 
    field.fieldName.toLowerCase().includes(query) || 
    field.description?.toLowerCase().includes(query)
  );
});

watch(() => form.primaryEntityName, (newEntityName) => {
  if (newEntityName) {
    utilStore.fetchEntityFields(newEntityName);
  }
}, { immediate: true });

const selectEntity = (entity: string) => {
  form.primaryEntityName = entity;
  closeEntityModal();
};

const closeEntityModal = () => {
  entityModal.value.$el.dismiss();
};

const openFieldModal = (index: number) => {
  activeFieldIndex.value = index;
  fieldQueryString.value = "";
  fieldModal.value.$el.present();
};

const selectField = (field: any) => {
  if (activeFieldIndex.value !== -1) {
    fields.value[activeFieldIndex.value].fieldPath = field.fieldName;
    // Auto-generate alias if empty
    if (!fields.value[activeFieldIndex.value].fieldNameAlias) {
      fields.value[activeFieldIndex.value].fieldNameAlias = field.fieldName;
    }
  }
  closeFieldModal();
};

const closeFieldModal = () => {
  fieldModal.value.$el.dismiss();
};

const getLocalId = () => `${Date.now()}-${Math.random()}`;

const hydrate = () => {
  const document = store.getCurrentDocument || {};
  form.dataDocumentId = document.dataDocumentId || "";
  form.documentName = document.documentName || "";
  form.primaryEntityName = document.primaryEntityName || "";
  form.documentTitle = document.documentTitle || "";
  fields.value = store.getFields.map((field: any) => ({ ...field, localId: getLocalId() }));
  conditions.value = store.getConditions.map((condition: any) => ({ ...condition, localId: getLocalId() }));
};

const addField = () => {
  fields.value.push({
    localId: getLocalId(),
    isNew: true,
    fieldPath: "",
    fieldNameAlias: "",
    defaultDisplay: "Y",
    sequenceNum: (fields.value.length + 1) * 10
  });
};

const removeField = (index: number) => {
  fields.value.splice(index, 1);
};

const addCondition = () => {
  conditions.value.push({
    localId: getLocalId(),
    isNew: true,
    fieldNameAlias: "",
    operator: "equals",
    value: ""
  });
};

const removeCondition = (index: number) => {
  conditions.value.splice(index, 1);
};

const saveDocument = async () => {
  if (!form.dataDocumentId || !form.documentName || !form.primaryEntityName) {
    showToast(translate("Data document ID, document name, and primary entity are required."));
    return;
  }

  await store.saveDataDocument({ ...form });
  await Promise.all(fields.value.map((field) => store.saveField(form.dataDocumentId, field)));
  await Promise.all(conditions.value.map((condition) => store.saveCondition(form.dataDocumentId, condition)));
  showToast(translate("Data document saved."));
  router.push(`/data-documents/${form.dataDocumentId}`);
};

const previewSample = async () => {
  await store.runPreview(form.dataDocumentId, {
    selectedFields: fields.value.filter((field) => field.defaultDisplay === "Y").map((field) => field.fieldNameAlias),
    filters: [],
    pageSize: 5
  });
  router.push(`/data-documents/${form.dataDocumentId}/run`);
};

onIonViewWillEnter(async () => {
  if (isNew.value) {
    form.dataDocumentId = "";
    form.documentName = "";
    form.primaryEntityName = "";
    form.documentTitle = "";
    fields.value = [];
    conditions.value = [];
    addField();
    return;
  }

  await store.fetchDataDocument(route.params.id as string);
  hydrate();
});
</script>
