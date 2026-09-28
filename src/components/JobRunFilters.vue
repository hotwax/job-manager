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
        :label="translate('Status')"
        label-placement="stacked"
        interface="popover"
        :value="status"
        @ionChange="$emit('update:status', $event.detail.value)"
      >
        <ion-select-option value="">{{ translate("All") }}</ion-select-option>
        <ion-select-option value="RUNNING">{{ translate("Running") }}</ion-select-option>
        <ion-select-option value="SUCCESSFUL">{{ translate("Successful") }}</ion-select-option>
        <ion-select-option value="FAILED">{{ translate("Failed") }}</ion-select-option>
        <ion-select-option value="TERMINATED">{{ translate("Terminated") }}</ion-select-option>
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
        :placeholder="translate('Any user')"
        :debounce="300"
        @ionInput="$emit('update:userId', ($event as any).detail.value || '')"
      />
      <ion-button v-if="userId" fill="clear" class="clear-filter-btn" @click="$emit('update:userId', '')" :title="translate('Clear')">
        <ion-icon slot="icon-only" :icon="closeCircleOutline" />
      </ion-button>
    </div>

    <div class="filter-item">
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
  userId: { type: String, default: "" },
  hasDataLogs: { type: String, default: "" },
  placeholder: { type: String, default: "" }
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
