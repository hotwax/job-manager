<template>
  <ion-searchbar
    :value="queryString"
    @ionInput="$emit('update:queryString', ($event as any).detail.value || '')"
    :debounce="300"
    :placeholder="searchPlaceholder"
  />

  <div class="filter-grid">
    <div class="filter-item">
      <ion-select
        :label="translate(statusLabel)"
        label-placement="stacked"
        interface="popover"
        :value="status"
        @ionChange="$emit('update:status', $event.detail.value)"
      >
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ translate(option.label) }}</ion-select-option>
      </ion-select>
      <ion-button v-if="status" fill="clear" class="clear-filter-btn" @click="$emit('update:status', '')" :title="translate('Clear')">
        <ion-icon slot="icon-only" :icon="closeCircleOutline" />
      </ion-button>
    </div>

    <!-- The job picker only makes sense where runs span jobs. -->
    <slot name="scope" />

    <div class="filter-item">
      <ion-input
        :value="userId"
        :label="translate('User')"
        label-placement="stacked"
        fill="outline"
        :placeholder="userPlaceholder || translate('Any user')"
        :debounce="300"
        @ionInput="$emit('update:userId', ($event as any).detail.value || '')"
      />
      <ion-button v-if="userId" fill="clear" class="clear-filter-btn" @click="$emit('update:userId', '')" :title="translate('Clear')">
        <ion-icon slot="icon-only" :icon="closeCircleOutline" />
      </ion-button>
    </div>

    <div v-if="showDataLogs" class="filter-item">
      <ion-select
        :label="translate('Data logs')"
        label-placement="stacked"
        interface="popover"
        :value="hasDataLogs"
        @ionChange="$emit('update:hasDataLogs', $event.detail.value)"
      >
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option value="Y">{{ translate("Has data logs") }}</ion-select-option>
        <ion-select-option value="N">{{ translate("No data logs") }}</ion-select-option>
      </ion-select>
      <ion-button v-if="hasDataLogs" fill="clear" class="clear-filter-btn" @click="$emit('update:hasDataLogs', '')" :title="translate('Clear')">
        <ion-icon slot="icon-only" :icon="closeCircleOutline" />
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSearchbar,
  IonSelect,
  IonSelectOption
} from "@ionic/vue";
import { computed } from "vue";
import { closeCircleOutline } from "ionicons/icons";
import { translate } from "@common";

const props = defineProps({
  queryString: { type: String, default: "" },
  status: { type: String, default: "" },
  statusLabel: { type: String, default: "Status" },
  statusOptions: { type: Array as () => Array<{ value: string; label: string }>, default: () => [
    { value: "RUNNING", label: "Running" },
    { value: "SUCCESSFUL", label: "Successful" },
    { value: "FAILED", label: "Failed" },
    { value: "TERMINATED", label: "Terminated" }
  ] },
  userId: { type: String, default: "" },
  hasDataLogs: { type: String, default: "" },
  placeholder: { type: String, default: "" },
  userPlaceholder: { type: String, default: "" },
  showDataLogs: { type: Boolean, default: true }
});

defineEmits(["update:queryString", "update:status", "update:userId", "update:hasDataLogs"]);

const searchPlaceholder = computed(() => props.placeholder || translate("Search by run, job, service, user, message, or result"));
</script>

<style scoped>
/* Same grid the Run History page uses, so the controls line up identically in both places. */
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacer-base);
}
</style>
