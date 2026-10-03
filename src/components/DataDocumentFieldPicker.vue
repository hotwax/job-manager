<template>
  <ion-modal :is-open="isOpen" @will-present="onWillPresent" @did-dismiss="close">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :aria-label="translate('Close')" @click="close">
            <ion-icon slot="icon-only" :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ translate("Select Field") }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          ref="searchbar"
          v-model="queryString"
          :placeholder="translate('Search fields')"
          role="combobox"
          aria-expanded="true"
          :aria-controls="pickerNavigation.listId"
          :aria-activedescendant="pickerNavigation.activeDescendant.value"
          @keydown="pickerNavigation.handleInputKeydown"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content class="picker-content">
      <div v-if="utilStore.getFetchStatus.entityFields === 'pending'" class="ion-text-center ion-padding">
        <ion-spinner name="crescent" />
        <p>{{ translate("Fetching fields...") }}</p>
      </div>
      <ion-list v-else :id="pickerNavigation.listId" role="listbox">
        <ion-item
          v-for="(field, index) in filteredFields"
          :key="field.name"
          v-bind="pickerNavigation.getItemAttributes(field, index)"
          :ref="(element) => pickerNavigation.setItemRef(index, element)"
          @keydown="pickerNavigation.handleItemKeydown($event, index)"
        >
          <ion-checkbox
            :checked="selectedFieldNames.includes(field.name)"
            @ionChange="toggleField(field.name, $event.detail.checked)"
          >
            {{ field.name }}
          </ion-checkbox>
        </ion-item>
        <ion-item v-if="!filteredFields.length">
          <ion-label class="ion-text-center">
            <p>{{ translate("No fields found for this entity.") }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :disabled="!selectedFieldNames.length" :aria-label="translate('Save')" @click="confirm">
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
  IonCheckbox,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar
} from "@ionic/vue";
import { closeOutline, saveOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";

import { useUtilStore } from "@/store/util";
import { useKeyboardListNavigation } from "@/utils/keyboardListNavigation";

// Picks field names off one entity. It deliberately does not add anything to the graph: the
// builder adds by nodeId and the field form adds by relationship path, so each caller keeps
// its own add semantics and this stays the one checkbox list they share.
const props = defineProps<{ isOpen: boolean; entityName?: string }>();
const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (e: "confirm", fieldNames: string[]): void;
}>();

const utilStore = useUtilStore();

const searchbar = ref();
const queryString = ref("");
const selectedFieldNames = ref<string[]>([]);

const getSafeDomId = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "-");

const entityFields = computed(() => props.entityName ? utilStore.getEntityFields(props.entityName) : []);
const filteredFields = computed(() => {
  const query = queryString.value.trim().toLowerCase();
  if(!query) { return entityFields.value; }

  return entityFields.value.filter((field: any) => field.name.toLowerCase().includes(query));
});

const toggleField = (fieldName: string, checked: boolean) => {
  selectedFieldNames.value = checked
    ? [...new Set([...selectedFieldNames.value, fieldName])]
    : selectedFieldNames.value.filter((name) => name !== fieldName);
};

const pickerNavigation = useKeyboardListNavigation<any>({
  items: filteredFields,
  inputRef: searchbar,
  listId: "data-document-field-picker",
  getItemId: (field) => `data-document-field-option-${getSafeDomId(field.name)}`,
  onSelect: (field) => toggleField(field.name, !selectedFieldNames.value.includes(field.name))
});

const close = () => {
  if(props.isOpen) { emit("update:isOpen", false); }
};

const onWillPresent = async () => {
  queryString.value = "";
  selectedFieldNames.value = [];
  pickerNavigation.resetNavigation();

  if(props.entityName) { await utilStore.fetchEntityFields(props.entityName); }
};

const confirm = () => {
  emit("confirm", [...selectedFieldNames.value]);
  close();
};

watch([queryString, () => props.entityName], () => pickerNavigation.resetNavigation());
</script>

<style scoped>
/* The Save FAB is fixed over the list, so the last row needs room to scroll clear of it. */
.picker-content {
  --padding-bottom: var(--spacer-2xl);
}
</style>
