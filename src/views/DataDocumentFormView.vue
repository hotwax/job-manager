<template>
  <ion-content v-if="graph">
    <main>
      <ion-card>
        <ion-list class="graph-metadata-list">
          <ion-item detail button @click="openEntityModal">
            <ion-label>
              {{ translate("Primary Entity") }}
              <p>{{ graph.metadata.primaryEntityName || translate("Select Entity") }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-input
              :value="graph.metadata.documentName"
              :label="translate('Name')"
              label-placement="stacked"
              @ionInput="updateMetadata('documentName', $event.detail.value || '')"
            />
          </ion-item>
          <ion-item>
            <ion-input
              :value="graph.metadata.documentTitle"
              :label="translate('Title')"
              label-placement="stacked"
              @ionInput="updateMetadata('documentTitle', $event.detail.value || '')"
            />
          </ion-item>
          <ion-buttons>
            <ion-button fill="clear" @click="openAdvancedMetadataModal" :aria-label="translate('Advanced Metadata')">
              <ion-icon slot="icon-only" :icon="optionsOutline" />
            </ion-button>
          </ion-buttons>
        </ion-list>
      </ion-card>

      <h2>{{ translate("Fields") }}</h2>
      <p>{{ translate("Use direct fields or relation paths such as product:internalName.") }}</p>
      <ion-card v-for="group in fieldGroups" :key="group.entityPath">
        <ion-card-header>
          <ion-card-title>{{ group.entityLabel }}</ion-card-title>
          <ion-card-subtitle>{{ group.entityPath }}</ion-card-subtitle>
          <ion-buttons>
            <ion-button fill="clear" @click="openNewFieldModal(group)">
              <ion-icon slot="start" :icon="addOutline" />
              {{ translate("Add field") }}
            </ion-button>
            <ion-button fill="clear" @click="openNewFieldModal(group)">
              <ion-icon slot="start" :icon="gitBranchOutline" />
              {{ translate("Add related entity") }}
            </ion-button>
          </ion-buttons>
        </ion-card-header>
        <ion-list>
          <template v-for="field in group.fields" :key="field.fieldSeqId || field.fieldPath">
            <ion-item-divider>
              <ion-label>{{ field.fieldNameAlias || field.fieldPath }}</ion-label>
            </ion-item-divider>
            <ion-item detail button @click="openFieldModal(getFieldIndex(field))">
              <ion-label>
                <p>{{ field.fieldPath || translate("Select Field") }}</p>
              </ion-label>
              <ion-button fill="clear" slot="end" color="danger" @click.stop="graphStore.removeField(field.fieldSeqId || field.fieldPath)">
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </ion-item>
            <ion-item>
              <ion-input
                :value="field.fieldNameAlias"
                :label="translate('Alias')"
                label-placement="stacked"
                @ionInput="updateField(field, { fieldNameAlias: $event.detail.value || '' })"
              />
            </ion-item>
            <ion-item>
              <ion-input
                :value="field.sequenceNum"
                type="number"
                :label="translate('Sequence')"
                label-placement="stacked"
                @ionInput="updateField(field, { sequenceNum: Number($event.detail.value || 0) })"
              />
            </ion-item>
            <ion-item>
              <ion-toggle
                :checked="field.defaultDisplay === 'Y'"
                @ionChange="updateField(field, { defaultDisplay: $event.detail.checked ? 'Y' : 'N' })"
              >
                {{ translate("Display") }}
              </ion-toggle>
            </ion-item>
          </template>
        </ion-list>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ translate("Conditions") }}</ion-card-title>
          <ion-card-subtitle>{{ translate("Add conditions that always apply to this document.") }}</ion-card-subtitle>
        </ion-card-header>
        <ion-list>
          <ion-item v-for="condition in graph.conditions" :key="condition.conditionSeqId">
            <ion-label>
              <ion-input
                :value="condition.fieldNameAlias"
                :label="translate('Field Alias')"
                label-placement="stacked"
                @ionInput="updateCondition(condition, { fieldNameAlias: $event.detail.value || '' })"
              />
              <ion-select
                :value="condition.operator"
                :label="translate('Operator')"
                label-placement="stacked"
                interface="popover"
                @ionChange="updateCondition(condition, { operator: $event.detail.value })"
              >
                <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                  {{ translate(operator.label) }}
                </ion-select-option>
              </ion-select>
              <ion-input
                :value="condition.fieldValue"
                :label="translate('Value')"
                label-placement="stacked"
                @ionInput="updateCondition(condition, { fieldValue: $event.detail.value || '' })"
              />
            </ion-label>
            <ion-button fill="clear" slot="end" color="danger" @click="graphStore.removeCondition(condition.conditionSeqId || '')">
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-button>
          </ion-item>
          <ion-item button @click="graphStore.addCondition('')">
            <ion-icon slot="start" :icon="addOutline" />
            <ion-label>{{ translate("Add condition") }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-card>
    </main>

    <ion-modal ref="entityModal">
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
        <ion-radio-group :value="graph.metadata.primaryEntityName" @ionChange="selectEntity($event.detail.value)">
          <ion-list>
            <ion-item v-for="entity in filteredEntities" :key="entity">
              <ion-radio :value="entity" label-placement="end" justify="start">{{ entity }}</ion-radio>
            </ion-item>
          </ion-list>
        </ion-radio-group>
      </ion-content>
    </ion-modal>

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
      <ion-content>
        <ion-list>
          <ion-item>
            <ion-input
              :value="graph.metadata.dataDocumentId"
              :readonly="!isNew"
              :label="translate('Data Document ID')"
              label-placement="stacked"
              @ionInput="updateMetadata('dataDocumentId', $event.detail.value || '')"
            />
          </ion-item>
          <ion-item>
            <ion-input
              :value="graph.metadata.indexName"
              :label="translate('Index Name')"
              label-placement="stacked"
              @ionInput="updateMetadata('indexName', $event.detail.value || '')"
            />
          </ion-item>
          <ion-item>
            <ion-input
              :value="graph.metadata.manualDataServiceName"
              :label="translate('Manual Data Service')"
              label-placement="stacked"
              @ionInput="updateMetadata('manualDataServiceName', $event.detail.value || '')"
            />
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

    <ion-modal ref="fieldModal">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button v-if="modalEntityPath.length > 0" @click="navigateUp">
              <ion-icon slot="icon-only" :icon="arrowBackOutline" />
            </ion-button>
            <ion-button v-else @click="closeFieldModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ modalEntityPath.length > 0 ? modalEntityPath[modalEntityPath.length - 1].relationshipName : translate("Select Field") }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="utilStore.fetchEntityFields(modalCurrentEntity, true); utilStore.fetchEntityRelationships(modalCurrentEntity, true)">
              <ion-icon slot="icon-only" :icon="refreshOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        <ion-toolbar>
          <ion-searchbar v-model="fieldQueryString" :placeholder="translate('Search fields and relations')" />
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div v-if="utilStore.getFetchStatus.entityFields === 'pending' || utilStore.getFetchStatus.entityRelationships === 'pending'" class="ion-text-center ion-padding">
          <ion-spinner name="crescent" />
          <p>{{ translate("Fetching metadata...") }}</p>
        </div>
        <ion-list v-else>
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ translate("Fields") }}</ion-label>
            </ion-item-divider>
            <ion-item v-for="field in filteredEntityFields" :key="field.fieldName" button @click="selectField(field)">
              <ion-label>
                <h2>{{ field.fieldName }}</h2>
                <p v-if="field.description">{{ field.description }}</p>
              </ion-label>
              <ion-radio slot="end" :checked="graph.fields[activeFieldIndex]?.fieldPath.endsWith(field.fieldName)" :value="field.fieldName" />
            </ion-item>
            <ion-item v-if="!filteredEntityFields.length">
              <ion-label class="ion-text-center">
                <p>{{ translate("No fields found.") }}</p>
              </ion-label>
            </ion-item>
          </ion-item-group>

          <ion-item-group v-if="filteredEntityRelations.length">
            <ion-item-divider>
              <ion-label>{{ translate("Related Entities") }}</ion-label>
            </ion-item-divider>
            <ion-item v-for="relation in filteredEntityRelations" :key="relation.relationshipName" button @click="drillDown(relation)">
              <ion-label>
                <h2>{{ relation.relationshipName }}</h2>
                <p>{{ relation.title || relation.relatedEntityName }}</p>
              </ion-label>
              <ion-icon slot="end" :icon="chevronForwardOutline" />
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-content>
    </ion-modal>
  </ion-content>
</template>

<script setup lang="ts">
import {
  alertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonLabel,
  IonList,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar
} from "@ionic/vue";
import { addOutline, arrowBackOutline, chevronForwardOutline, closeOutline, gitBranchOutline, optionsOutline, refreshOutline, trashOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { translate } from "@common";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useUtilStore } from "@/store/util";

const route = useRoute();
const isNew = computed(() => route.name === "CreateDataDocument");

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

const graphStore = useDataDocumentGraphStore();
const utilStore = useUtilStore();

const graph = computed(() => graphStore.getGraph);

const entityModal = ref();
const entityQueryString = ref("");
const advancedMetadataModal = ref();

const fieldModal = ref();
const fieldQueryString = ref("");
const activeFieldIndex = ref(-1);
const modalEntityPath = ref<any[]>([]); // Array of { relationshipName, relatedEntityName }

const modalCurrentEntity = computed(() => {
  if (modalEntityPath.value.length === 0) return graph.value?.metadata.primaryEntityName;
  return modalEntityPath.value[modalEntityPath.value.length - 1].relatedEntityName;
});

const entities = computed(() => utilStore.getEntities);
const filteredEntities = computed(() => {
  const query = entityQueryString.value.trim().toLowerCase();
  if (!query) return entities.value;
  return entities.value.filter((entity: string) => entity.toLowerCase().includes(query));
});

const filteredEntityFields = computed(() => {
  const query = fieldQueryString.value.trim().toLowerCase();
  if (!modalCurrentEntity.value) return [];
  const fields = utilStore.getEntityFields(modalCurrentEntity.value).map((field: any) => typeof field === 'string' ? { fieldName: field, description: "" } : field);
  if (!query) return fields;
  return fields.filter((field: any) => 
    field.fieldName.toLowerCase().includes(query) || 
    field.description?.toLowerCase().includes(query)
  );
});

const filteredEntityRelations = computed(() => {
  const query = fieldQueryString.value.trim().toLowerCase();
  if (!modalCurrentEntity.value) return [];
  const relations = utilStore.getEntityRelationships(modalCurrentEntity.value);
  if (!query) return relations;
  return relations.filter((relation: any) => 
    relation.relationshipName.toLowerCase().includes(query) || 
    (relation.title && relation.title.toLowerCase().includes(query))
  );
});

const getRelationshipSegments = (fieldPath: string) => {
  const segments = String(fieldPath || "").split(":");
  segments.pop();
  return segments.filter(Boolean);
};

const getEffectiveRelationshipSegments = (fieldPath: string) => {
  const segments = getRelationshipSegments(fieldPath);
  const pathText = segments.join(":");
  return pathText === graph.value?.metadata.primaryEntityName ? [] : segments;
};

const getPathLabel = (path: string) => {
  const hashIndex = path.lastIndexOf("#");
  const normalizedPath = hashIndex > -1 ? path.slice(hashIndex + 1) : path;
  const pieces = normalizedPath.split(".");
  return pieces[pieces.length - 1] || normalizedPath || translate("Primary Entity");
};

const toModalPath = (segments: string[]) => segments.map((segment) => ({
  relationshipName: segment,
  relatedEntityName: segment
}));

const fieldGroups = computed(() => {
  if (!graph.value) return [];
  const groups = new Map<string, any[]>();
  graph.value.fields.forEach((field: any) => {
    const segments = getEffectiveRelationshipSegments(field.fieldPath);
    const entityPath = segments.join(":") || graph.value?.metadata.primaryEntityName || translate("Primary Entity");
    groups.set(entityPath, (groups.get(entityPath) || []).concat(field));
  });
  if (!groups.size) {
    const entityPath = graph.value.metadata.primaryEntityName || translate("Primary Entity");
    groups.set(entityPath, []);
  }
  return Array.from(groups.entries()).map(([entityPath, fields]) => {
    const segments = entityPath === graph.value?.metadata.primaryEntityName ? [] : entityPath.split(":").filter(Boolean);
    return {
      entityPath,
      entityLabel: getPathLabel(segments[segments.length - 1] || entityPath),
      relationshipPath: segments,
      fields
    };
  });
});

watch(() => graph.value?.metadata.primaryEntityName, (newEntityName) => {
  if (newEntityName) {
    utilStore.fetchEntityFields(newEntityName);
  }
}, { immediate: true });

const updateMetadata = (key: string, value: string) => {
  graphStore.updateMetadata({ [key]: value });
};

const updateField = (field: any, patch: any) => {
  graphStore.updateField(field.fieldSeqId, field.fieldPath, patch);
};

const updateCondition = (condition: any, patch: any) => {
  graphStore.updateCondition(condition.conditionSeqId, patch);
};

const selectEntity = async (entity: string) => {
  if (graph.value && (graph.value.fields.length > 0 || graph.value.conditions.length > 0)) {
    const alert = await alertController.create({
      header: translate("Change Primary Entity?"),
      message: translate("You already have fields and conditions defined. Changing the primary entity will re-evaluate them, and existing connections may become invalid and need to be reworked or remapped. Do you wish to proceed?"),
      buttons: [
        {
          text: translate("Cancel"),
          role: "cancel"
        },
        {
          text: translate("Proceed"),
          role: "confirm",
          handler: () => {
            updateMetadata("primaryEntityName", entity);
            closeEntityModal();
          }
        }
      ]
    });
    await alert.present();
  } else {
    updateMetadata("primaryEntityName", entity);
    closeEntityModal();
  }
};

const closeEntityModal = () => {
  entityModal.value.$el.dismiss();
};

const openEntityModal = () => {
  entityModal.value.$el.present();
};

const openAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.present();
};

const closeAdvancedMetadataModal = () => {
  advancedMetadataModal.value.$el.dismiss();
};

const getFieldIndex = (field: any) => graph.value?.fields.findIndex((item: any) => (
  item.fieldSeqId === field.fieldSeqId || item.fieldPath === field.fieldPath
)) ?? -1;

const openFieldModal = (index: number) => {
  activeFieldIndex.value = index;
  fieldQueryString.value = "";
  const targetField = graph.value?.fields[index];
  modalEntityPath.value = targetField ? toModalPath(getEffectiveRelationshipSegments(targetField.fieldPath)) : [];
  if (modalCurrentEntity.value) {
    utilStore.fetchEntityFields(modalCurrentEntity.value);
    utilStore.fetchEntityRelationships(modalCurrentEntity.value);
  }
  fieldModal.value.$el.present();
};

const openNewFieldModal = (group: any) => {
  const fieldPath = group.relationshipPath.length ? `${group.relationshipPath.join(":")}:` : "";
  const field = graphStore.addFieldPath(fieldPath, "");
  const nextIndex = graph.value?.fields.findIndex((item: any) => item.fieldSeqId === field?.fieldSeqId) ?? -1;
  activeFieldIndex.value = nextIndex;
  fieldQueryString.value = "";
  modalEntityPath.value = toModalPath(group.relationshipPath);
  if (modalCurrentEntity.value) {
    utilStore.fetchEntityFields(modalCurrentEntity.value);
    utilStore.fetchEntityRelationships(modalCurrentEntity.value);
  }
  fieldModal.value.$el.present();
};

const drillDown = (relation: any) => {
  modalEntityPath.value.push(relation);
  fieldQueryString.value = "";
  utilStore.fetchEntityFields(relation.relatedEntityName);
  utilStore.fetchEntityRelationships(relation.relatedEntityName);
};

const navigateUp = () => {
  modalEntityPath.value.pop();
  fieldQueryString.value = "";
};

const selectField = (field: any) => {
  if (activeFieldIndex.value !== -1 && graph.value) {
    const targetField = graph.value.fields[activeFieldIndex.value];
    const path = modalEntityPath.value.map(r => r.relationshipName).join(":");
    const fullPath = path ? `${path}:${field.fieldName}` : field.fieldName;
    
    // Auto-generate alias if empty
    const fieldNameAlias = targetField.fieldNameAlias || field.fieldName;
    updateField(targetField, { fieldPath: fullPath, fieldNameAlias });
  }
  closeFieldModal();
};

const closeFieldModal = () => {
  fieldModal.value.$el.dismiss();
};
</script>

<style scoped>
.graph-metadata-list {
  display: grid;
  grid-template-columns: 1fr auto auto min-content;
}

ion-card-header {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: "title actions" "subtitle actions";
}

ion-card-title {
  grid-area: title;
}

ion-card-subtitle {
  grid-area: subtitle;
}

ion-card-header ion-buttons {
  grid-area: actions;
}
</style>
