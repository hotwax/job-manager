<template>
  <div v-if="graph" class="dd-form-view">
    <main>
      <ion-card v-if="!embedded">
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

      <ion-card v-for="group in fieldGroups" :key="group.entityPath">
        <ion-card-header>
          <ion-card-title>{{ group.entityLabel }}</ion-card-title>
          <ion-card-subtitle>{{ group.entityPath }}</ion-card-subtitle>
          <ion-buttons>
            <ion-button fill="clear" @click="openNewFieldModal(group, 'field')">
              <ion-icon slot="start" :icon="addOutline" />
              {{ translate("Add field") }}
            </ion-button>
            <ion-button fill="clear" @click="openNewFieldModal(group, 'relation')">
              <ion-icon slot="start" :icon="gitBranchOutline" />
              {{ translate("Add related entity") }}
            </ion-button>
          </ion-buttons>
        </ion-card-header>
        <ion-list>
          <ion-item
            v-for="field in group.fields"
            :key="field.fieldSeqId || field.fieldPath"
            lines="none"
            class="field-row"
          >
            <div class="field-controls">
              <ion-chip
                outline
                color="primary"
                class="field-selector"
                @click="openFieldModal(getFieldIndex(field))"
              >
                <ion-label>
                  {{ field.fieldPath || translate("Select Field") }}
                </ion-label>
              </ion-chip>
              <ion-input
                class="field-alias"
                :value="field.fieldNameAlias"
                :label="translate('Alias')"
                label-placement="floating"
                fill="outline"
                @ionInput="updateField(field, { fieldNameAlias: $event.detail.value || '' })"
              />
              <ion-input
                class="field-sequence"
                :value="field.sequenceNum"
                type="number"
                :label="translate('Sequence')"
                label-placement="floating"
                fill="outline"
                @ionInput="updateField(field, { sequenceNum: Number($event.detail.value || 0) })"
              />
              <ion-toggle
                class="field-display"
                :checked="field.defaultDisplay === 'Y'"
                label-placement="stacked"
                @ionChange="updateField(field, { defaultDisplay: $event.detail.checked ? 'Y' : 'N' })"
              >
                {{ translate("Display") }}
              </ion-toggle>
              <ion-button
                class="field-remove-button"
                fill="clear"
                color="danger"
                :aria-label="translate('Remove field')"
                @click="graphStore.removeField(field.fieldSeqId || field.fieldPath)"
              >
                <ion-icon slot="icon-only" :icon="trashOutline" />
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </ion-card>

      <ion-card v-if="!embedded">
        <ion-card-header>
          <ion-card-title>{{ translate("Conditions") }}</ion-card-title>
          <ion-card-subtitle>{{ translate("Add conditions that always apply to this document.") }}</ion-card-subtitle>
        </ion-card-header>
        <ion-list>
          <ion-item
            v-for="(condition, conditionIndex) in graph.conditions"
            :key="getConditionKey(condition, conditionIndex)"
            lines="none"
            class="condition-row"
          >
            <div class="condition-controls">
              <ion-select
                :value="condition.fieldNameAlias"
                :label="translate('Field Alias')"
                :placeholder="translate('Select alias')"
                label-placement="floating"
                fill="outline"
                interface="popover"
                @ionChange="updateCondition(condition, { fieldNameAlias: $event.detail.value || '' })"
              >
                <ion-select-option v-for="alias in getConditionAliasOptions(condition)" :key="alias" :value="alias">
                  {{ alias }}
                </ion-select-option>
              </ion-select>
              <ion-select
                :value="condition.operator"
                :label="translate('Operator')"
                label-placement="floating"
                fill="outline"
                interface="popover"
                @ionChange="updateCondition(condition, { operator: $event.detail.value })"
              >
                <ion-select-option v-for="operator in operators" :key="operator.value" :value="operator.value">
                  {{ translate(operator.label) }}
                </ion-select-option>
              </ion-select>
              <ion-select
                v-if="getConditionValueOptions(condition)"
                :value="condition.fieldValue"
                :label="translate('Value')"
                :placeholder="getConditionValueOptions(condition)?.label || translate('Select value')"
                label-placement="floating"
                fill="outline"
                interface="popover"
                @ionChange="updateCondition(condition, { fieldValue: $event.detail.value ?? '' })"
              >
                <ion-select-option
                  v-for="option in getConditionValueOptions(condition)?.options || []"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </ion-select-option>
              </ion-select>
              <ion-input
                v-else
                :value="condition.fieldValue"
                :label="translate('Value')"
                label-placement="floating"
                fill="outline"
                @ionInput="updateCondition(condition, { fieldValue: $event.detail.value || '' })"
              />
            </div>
            <ion-button fill="clear" slot="end" color="danger" @click="removeCondition(condition)">
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
          <ion-searchbar
            ref="entitySearchbar"
            :placeholder="translate('Search entities')"
            v-model="entityQueryString"
            role="combobox"
            aria-expanded="true"
            :aria-controls="entityPickerNavigation.listId"
            :aria-activedescendant="entityPickerNavigation.activeDescendant.value"
            @keydown="entityPickerNavigation.handleInputKeydown"
          />
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-radio-group :value="graph.metadata.primaryEntityName">
          <ion-list :id="entityPickerNavigation.listId" role="listbox">
            <template v-for="entityGroup in groupedEntities" :key="entityGroup.packageName">
              <ion-item-divider color="light">
                <ion-label>{{ entityGroup.packageName }}</ion-label>
              </ion-item-divider>
              <ion-item
                v-for="entity in entityGroup.entities"
                :key="getEntityValue(entity)"
                v-bind="entityPickerNavigation.getItemAttributes(entity, getEntityKeyboardIndex(entity))"
                :ref="(element) => entityPickerNavigation.setItemRef(getEntityKeyboardIndex(entity), element)"
                button
                @click="selectEntity(getEntityValue(entity))"
                @keydown="entityPickerNavigation.handleItemKeydown($event, getEntityKeyboardIndex(entity))"
              >
                <ion-radio :value="getEntityValue(entity)" label-placement="end" justify="start">{{ getEntityLabel(entity) }}</ion-radio>
              </ion-item>
            </template>
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
            <ion-button v-if="modalEntityPath.length > modalBaseDepth" @click="navigateUp">
              <ion-icon slot="icon-only" :icon="arrowBackOutline" />
            </ion-button>
            <ion-button v-else @click="closeFieldModal">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ fieldModalTitle }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="utilStore.fetchEntityFields(modalCurrentEntity, true); utilStore.fetchEntityRelationships(modalCurrentEntity, true)">
              <ion-icon slot="icon-only" :icon="refreshOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
        <ion-toolbar>
          <ion-searchbar
            ref="fieldSearchbar"
            v-model="fieldQueryString"
            :placeholder="fieldModalSearchPlaceholder"
            role="combobox"
            aria-expanded="true"
            :aria-controls="fieldPickerNavigation.listId"
            :aria-activedescendant="fieldPickerNavigation.activeDescendant.value"
            @keydown="fieldPickerNavigation.handleInputKeydown"
          />
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div v-if="utilStore.getFetchStatus.entityFields === 'pending' || utilStore.getFetchStatus.entityRelationships === 'pending'" class="ion-text-center ion-padding">
          <ion-spinner name="crescent" />
          <p>{{ translate("Fetching metadata...") }}</p>
        </div>
        <ion-list v-else :id="fieldPickerNavigation.listId" role="listbox">
          <ion-item-group v-if="showFieldSection">
            <ion-item-divider color="light">
              <ion-label>{{ translate("Fields") }}</ion-label>
            </ion-item-divider>
            <ion-item
              v-for="field in filteredEntityFields"
              :key="field.fieldName"
              v-bind="fieldPickerNavigation.getItemAttributes(getFieldPickerOption('field', field.fieldName), getFieldPickerIndex('field', field.fieldName))"
              :ref="(element) => fieldPickerNavigation.setItemRef(getFieldPickerIndex('field', field.fieldName), element)"
              button
              @click="selectField(field)"
              @keydown="fieldPickerNavigation.handleItemKeydown($event, getFieldPickerIndex('field', field.fieldName))"
            >
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

          <ion-item-group v-if="showRelationSection">
            <ion-item-divider color="light">
              <ion-label>{{ translate("Related Entities") }}</ion-label>
            </ion-item-divider>
            <ion-item
              v-for="relation in filteredEntityRelations"
              :key="relation.relationshipName"
              v-bind="fieldPickerNavigation.getItemAttributes(getFieldPickerOption('relation', relation.relationshipName), getFieldPickerIndex('relation', relation.relationshipName))"
              :ref="(element) => fieldPickerNavigation.setItemRef(getFieldPickerIndex('relation', relation.relationshipName), element)"
              button
              @click="drillDown(relation)"
              @keydown="fieldPickerNavigation.handleItemKeydown($event, getFieldPickerIndex('relation', relation.relationshipName))"
            >
              <ion-label>
                <h2>{{ relation.relationshipName }}</h2>
                <p>{{ relation.title || relation.relatedEntityName }}</p>
              </ion-label>
              <ion-icon slot="end" :icon="chevronForwardOutline" />
            </ion-item>
            <ion-item v-if="!filteredEntityRelations.length">
              <ion-label class="ion-text-center">
                <p>{{ translate("No related entities found.") }}</p>
              </ion-label>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-content>
    </ion-modal>
  </div>
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
  IonChip,
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
import router from "@/router";

import { translate } from "@common";
import { useDataDocumentGraphStore } from "@/store/dataDocumentGraph";
import { useUtilStore } from "@/store/util";
import { getConditionValueOptionSource } from "@/utils/conditionValueOptions";
import { getEntityLabel, getEntitySearchText, getEntityValue, groupEntityOptions } from "@/utils/entityOptions";
import type { EntityOption } from "@/utils/entityOptions";
import { useKeyboardListNavigation } from "@/utils/keyboardListNavigation";

defineProps<{ embedded?: boolean }>();
// id === "new" drives create mode (mirrors the graph page); unlocks the dataDocumentId field.
const isNew = computed(() => router.currentRoute.value.params.id === "new");

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
const entitySearchbar = ref();
const entityQueryString = ref("");
const advancedMetadataModal = ref();

const fieldModal = ref();
const fieldSearchbar = ref();
const fieldQueryString = ref("");
const activeFieldIndex = ref(-1);
const modalEntityPath = ref<any[]>([]); // Array of { relationshipName, relatedEntityName }

// Which sections the field modal exposes:
// - "field": only fields of the current table (Add field)
// - "relation": only related entities, until the user drills deeper (Add related entity)
// - "both": fields and relations together (editing an existing field)
const fieldModalMode = ref<"field" | "relation" | "both">("both");
// Relationship-path depth the modal opened at, so "relation" mode can keep showing
// only relations at the starting level and reveal fields once the user drills in.
const modalBaseDepth = ref(0);
// In "relation" mode, stores the base relationship path segments of the originating group
// so selectField can build the correct full path for the new related-entity field.
const modalBaseRelPath = ref<string[]>([]);

const showFieldSection = computed(() => (
  fieldModalMode.value !== "relation" || modalEntityPath.value.length > modalBaseDepth.value
));
const showRelationSection = computed(() => fieldModalMode.value !== "field");

const fieldModalTitle = computed(() => {
  if (modalEntityPath.value.length > modalBaseDepth.value) {
    return modalEntityPath.value[modalEntityPath.value.length - 1].relationshipName;
  }
  if (fieldModalMode.value === "relation") return translate("Add Related Entity");
  if (fieldModalMode.value === "field") return translate("Add Field");
  if (modalEntityPath.value.length > 0) {
    return modalEntityPath.value[modalEntityPath.value.length - 1].relationshipName;
  }
  return translate("Select Field");
});

const fieldModalSearchPlaceholder = computed(() => {
  if (fieldModalMode.value === "relation" && !showFieldSection.value) return translate("Search related entities");
  if (fieldModalMode.value === "field") return translate("Search fields");
  return translate("Search fields and relations");
});

const modalCurrentEntity = computed(() => {
  if (modalEntityPath.value.length === 0) return graph.value?.metadata.primaryEntityName;
  return modalEntityPath.value[modalEntityPath.value.length - 1].relatedEntityName;
});

const entities = computed<EntityOption[]>(() => utilStore.getEntities);
const filteredEntities = computed(() => {
  const query = entityQueryString.value.trim().toLowerCase();
  if (!query) return entities.value;
  return entities.value.filter((entity) => getEntitySearchText(entity).includes(query));
});
const groupedEntities = computed(() => groupEntityOptions(filteredEntities.value));
const entityKeyboardItems = computed(() => groupedEntities.value.flatMap((entityGroup) => entityGroup.entities));

const getSafeDomId = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "-");

const getEntityKeyboardIndex = (entity: EntityOption) => entityKeyboardItems.value.findIndex((item) => (
  getEntityValue(item) === getEntityValue(entity)
));

const entityPickerNavigation = useKeyboardListNavigation<EntityOption>({
  items: entityKeyboardItems,
  inputRef: entitySearchbar,
  listId: "data-document-entity-picker",
  getItemId: (entity) => `data-document-entity-option-${getSafeDomId(getEntityValue(entity))}`,
  onSelect: (entity) => selectEntity(getEntityValue(entity))
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

type FieldPickerOption = {
  kind: "field" | "relation";
  key: string;
  item: any;
};

const fieldPickerItems = computed<FieldPickerOption[]>(() => [
  ...(showFieldSection.value ? filteredEntityFields.value.map((field: any) => ({
    kind: "field" as const,
    key: field.fieldName,
    item: field
  })) : []),
  ...(showRelationSection.value ? filteredEntityRelations.value.map((relation: any) => ({
    kind: "relation" as const,
    key: relation.relationshipName,
    item: relation
  })) : [])
]);

const getFieldPickerIndex = (kind: FieldPickerOption["kind"], key: string) => fieldPickerItems.value.findIndex((option) => (
  option.kind === kind && option.key === key
));

const getFieldPickerOption = (kind: FieldPickerOption["kind"], key: string) => {
  return fieldPickerItems.value.find((option) => option.kind === kind && option.key === key) || { kind, key, item: {} };
};

const fieldPickerNavigation = useKeyboardListNavigation<FieldPickerOption>({
  items: fieldPickerItems,
  inputRef: fieldSearchbar,
  listId: "data-document-field-picker",
  getItemId: (option) => `data-document-field-option-${option.kind}-${getSafeDomId(option.key)}`,
  onSelect: (option) => {
    if (option.kind === "field") {
      selectField(option.item);
    } else {
      drillDown(option.item);
    }
  }
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
const fieldAliasOptions = computed(() => {
  if (!graph.value) return [];
  return Array.from(new Set(graph.value.fields.map((field: any) => (
    field.fieldNameAlias || field.outputName || field.fieldName
  )).filter(Boolean)));
});

const getConditionAliasOptions = (condition: any) => {
  if (!condition.fieldNameAlias || fieldAliasOptions.value.includes(condition.fieldNameAlias)) {
    return fieldAliasOptions.value;
  }
  return [condition.fieldNameAlias, ...fieldAliasOptions.value];
};

const getConditionKey = (condition: any, index: number) => condition.localId || condition.conditionSeqId || `condition-${index}`;

const getConditionField = (condition: any) => graph.value?.fields.find((field: any) => (
  field.fieldNameAlias === condition.fieldNameAlias ||
  field.outputName === condition.fieldNameAlias ||
  field.fieldName === condition.fieldNameAlias ||
  field.fieldPath === condition.fieldNameAlias
));

const getRelationship = (entityName: string, relationshipName: string) => (
  utilStore.getEntityRelationships(entityName).find((relationship: any) => (
    relationship.relationshipName === relationshipName ||
    relationship.shortAlias === relationshipName ||
    relationship.title === relationshipName
  ))
);

const getFieldEntityName = (field: any) => {
  let entityName = graph.value?.metadata.primaryEntityName || "";
  if (!entityName || !field?.fieldPath) return entityName;

  for (const segment of getRelationshipSegments(field.fieldPath)) {
    const relationship = getRelationship(entityName, segment);
    if (!relationship?.relatedEntityName) return entityName;
    entityName = relationship.relatedEntityName;
  }

  return entityName;
};

const getConditionValueOptions = (condition: any) => {
  const field = getConditionField(condition);
  const entityName = getFieldEntityName(field);

  if (!field || !entityName) return undefined;

  return getConditionValueOptionSource({
    condition,
    fields: [field],
    relationships: utilStore.getEntityRelationships(entityName),
    enumerations: utilStore.getEnumerations,
    statuses: utilStore.getStatuses
  });
};

utilStore.fetchEnumerations();
utilStore.fetchStatuses();

watch(() => graph.value?.metadata.primaryEntityName, (newEntityName) => {
  if (newEntityName) {
    utilStore.fetchEntityFields(newEntityName);
  }
}, { immediate: true });

watch(entityQueryString, () => {
  entityPickerNavigation.resetNavigation();
});

watch([fieldQueryString, modalCurrentEntity], () => {
  fieldPickerNavigation.resetNavigation();
});

const updateMetadata = (key: string, value: string) => {
  graphStore.updateMetadata({ [key]: value });
};

const updateField = (field: any, patch: any) => {
  graphStore.updateField(field.fieldSeqId, field.fieldPath, patch);
};

const updateCondition = (condition: any, patch: any) => {
  graphStore.updateCondition(condition.localId || condition.conditionSeqId, patch);
};

const removeCondition = (condition: any) => {
  graphStore.removeCondition(condition.localId || condition.conditionSeqId || "");
};

const selectEntity = async (entity: string) => {
  if (graph.value && (graph.value.fields.length > 0 || graph.value.conditions.length > 0)) {
    const alert = await alertController.create({
      header: translate("Change Primary Entity?"),
      message: translate("Changing the Primary Entity will affect your current configuration. What would you like to do?"),
      buttons: [
        {
          text: translate("Keep Configuration"),
          role: "cancel",
          handler: () => {
            closeEntityModal();
          }
        },
        {
          text: translate("Clear Configuration"),
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
  entityPickerNavigation.resetNavigation();
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
  fieldModalMode.value = "both";
  fieldQueryString.value = "";
  fieldPickerNavigation.resetNavigation();
  const targetField = graph.value?.fields[index];
  modalEntityPath.value = targetField ? toModalPath(getEffectiveRelationshipSegments(targetField.fieldPath)) : [];
  modalBaseDepth.value = modalEntityPath.value.length;
  if (modalCurrentEntity.value) {
    utilStore.fetchEntityFields(modalCurrentEntity.value);
    utilStore.fetchEntityRelationships(modalCurrentEntity.value);
  }
  fieldModal.value.$el.present();
};

const openNewFieldModal = (group: any, mode: "field" | "relation" = "field") => {
  // Always defer creation until the user actually picks a field.
  // No placeholder is added here — avoids blank ghost entries on cancel.
  activeFieldIndex.value = -1;
  modalBaseRelPath.value = [...group.relationshipPath];
  modalEntityPath.value = toModalPath(group.relationshipPath);
  fieldModalMode.value = mode;
  fieldQueryString.value = "";
  fieldPickerNavigation.resetNavigation();
  modalBaseDepth.value = modalEntityPath.value.length;
  if (modalCurrentEntity.value) {
    utilStore.fetchEntityFields(modalCurrentEntity.value);
    utilStore.fetchEntityRelationships(modalCurrentEntity.value);
  }
  fieldModal.value.$el.present();
};

const drillDown = (relation: any) => {
  modalEntityPath.value.push(relation);
  fieldQueryString.value = "";
  fieldPickerNavigation.resetNavigation();
  utilStore.fetchEntityFields(relation.relatedEntityName);
  utilStore.fetchEntityRelationships(relation.relatedEntityName);
};

const navigateUp = () => {
  modalEntityPath.value.pop();
  fieldQueryString.value = "";
  fieldPickerNavigation.resetNavigation();
};

const selectField = (field: any) => {
  if (fieldModalMode.value === "both" && activeFieldIndex.value !== -1 && graph.value) {
    // Editing an existing field — update it in-place.
    const targetField = graph.value.fields[activeFieldIndex.value];
    const path = modalEntityPath.value.map(r => r.relationshipName).join(":");
    const fullPath = path ? `${path}:${field.fieldName}` : field.fieldName;
    updateField(targetField, { fieldPath: fullPath });
  } else {
    // "field" or "relation" mode: deferred creation — build the full path and add a new field.
    const drilledSegments = modalEntityPath.value.slice(modalBaseDepth.value).map(r => r.relationshipName);
    const allSegments = [...modalBaseRelPath.value, ...drilledSegments, field.fieldName];
    const fullPath = allSegments.join(":");
    graphStore.addFieldPath(fullPath, field.fieldName);
  }
  closeFieldModal();
};

const closeFieldModal = () => {
  activeFieldIndex.value = -1;
  fieldModal.value.$el.dismiss();
};
</script>

<style scoped>
/* Embedded in the graph page's Fields segment, this view's <main> sits inside the page's own
   <main>; drop the redundant max-width + horizontal padding so the field rows get the full
   segment width instead of a double inset (which was clipping the Remove button). */
.dd-form-view > main {
  max-width: none;
  padding-inline: 0;
}

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

.condition-row {
  --inner-padding-top: var(--spacer-sm);
  --inner-padding-bottom: var(--spacer-sm);
}

.field-row {
  --inner-padding-top: var(--spacer-sm);
  --inner-padding-bottom: var(--spacer-sm);
}

/* All field controls on one horizontal row, vertically centered: chip | alias | sequence |
   display | remove. Alias grows; the rest size to content so the row stays compact. */
.field-controls {
  display: flex;
  align-items: center;
  gap: var(--spacer-base);
  padding: var(--spacer-sm) 0;
  width: 100%;
}

.field-controls ion-button {
  margin: 0;
}

.field-selector {
  flex: 0 0 auto;
  max-width: 11rem;
  margin: 0;
  cursor: pointer;
}

.field-selector ion-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-alias {
  flex: 1 1 8rem;
  min-width: 6rem;
}

.field-sequence {
  flex: 0 0 6rem;
}

/* "Display" label sits stacked above its toggle (label-placement="stacked"), vertically
   aligned. Fixed basis so the toggle can't stretch to its full intrinsic width and push the
   row into overflow. */
.field-display {
  flex: 0 0 6.5rem;
  text-align: center;
}

.field-remove-button {
  flex: 0 0 auto;
  min-height: 44px;
}

.condition-controls {
  display: grid;
  gap: var(--spacer-sm);
  grid-template-columns: minmax(12rem, 1fr) minmax(10rem, 0.75fr) minmax(12rem, 1fr);
  padding: var(--spacer-sm) 0;
  width: 100%;
}

.condition-controls ion-input,
.condition-controls ion-select {
  min-width: 0;
}

@media (max-width: 768px) {
  /* Let the single field row wrap (rather than overflow) on small screens. */
  .field-controls {
    flex-wrap: wrap;
  }
  .condition-controls {
    grid-template-columns: 1fr;
  }
}
</style>
