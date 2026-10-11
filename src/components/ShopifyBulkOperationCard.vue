<template>
  <ion-card class="operation-card">
    <ion-item lines="none">
      <ion-icon slot="start" :icon="statusDisplay.icon" :color="statusDisplay.color" />
      <ion-label class="ion-text-wrap">
        <p class="overline">
          #{{ operation.shopifyOperationId }}<span v-if="operation.shopName"> | {{ operation.shopName }}</span>
        </p>
        <h2>{{ hotwax?.description || hotwax?.systemMessageTypeId || translate("Bulk operation") }}</h2>
        <p>{{ translate(SHOPIFY_OPERATION_TYPE_LABELS[operation.type] || operation.type) }}</p>
      </ion-label>
      <ion-badge slot="end" :color="statusDisplay.color">
        {{ translate(SHOPIFY_STATUS_LABELS[operation.status] || operation.status) }}
      </ion-badge>
    </ion-item>

    <ion-card-content>
      <div class="operation-metrics">
        <ion-item v-for="metric in metrics" :key="metric.label" lines="none">
          <ion-icon slot="start" :icon="metric.icon" color="medium" />
          <ion-label>
            <p>{{ metric.label }}</p>
            {{ metric.value }}
          </ion-label>
        </ion-item>
      </div>

      <!-- The HotWax half of the story: which pipeline asked for this operation. -->
      <ion-item v-if="hotwax" lines="none" class="hotwax-link" button :detail="false" @click="$emit('view-system-message', hotwax.systemMessageId)">
        <ion-icon slot="start" :icon="pulseOutline" color="medium" />
        <ion-label class="ion-text-wrap">
          <p>{{ translate("HotWax job") }}</p>
          {{ hotwax.systemMessageTypeId }}
          <p v-if="hotwax.jobRunId">
            {{ translate("Job run") }}: #{{ hotwax.jobRunId }}
          </p>
          <!-- When HotWax consumed the result, to read against Shopify's Completed time above. -->
          <p>{{ translate("Processed") }}: {{ formatDate(hotwax.processedDate) }}</p>
        </ion-label>
        <ion-badge slot="end" :color="commonUtil.getStatusColor(hotwax.statusId)">
          {{ utilStore.getStatusItemDesc(hotwax.statusId) }}
        </ion-badge>
      </ion-item>
      <ion-item v-else-if="enrichmentAvailable" lines="none" class="hotwax-link">
        <ion-icon slot="start" :icon="helpCircleOutline" color="medium" />
        <ion-label class="ion-text-wrap">
          <p>{{ translate("HotWax job") }}</p>
          {{ translate("No HotWax message found for this operation") }}
        </ion-label>
      </ion-item>

      <ion-item v-if="operation.errorCode" lines="none">
        <ion-icon slot="start" :icon="alertCircleOutline" color="danger" />
        <ion-label class="ion-text-wrap">
          <p>{{ translate("Error code") }}</p>
          {{ operation.errorCode }}
        </ion-label>
      </ion-item>

      <div class="operation-actions">
        <ion-button v-if="operation.url" fill="outline" size="small" :href="operation.url" target="_blank" rel="noopener">
          <ion-icon slot="start" :icon="cloudDownloadOutline" />
          {{ translate("Result file") }}
        </ion-button>
        <ion-button v-if="operation.partialDataUrl" fill="outline" size="small" color="warning" :href="operation.partialDataUrl" target="_blank" rel="noopener">
          <ion-icon slot="start" :icon="cloudDownloadOutline" />
          {{ translate("Partial data") }}
        </ion-button>
        <ion-button fill="clear" size="small" @click="$emit('copy-id', operation.id)">
          <ion-icon slot="start" :icon="copyOutline" />
          {{ translate("Copy operation ID") }}
        </ion-button>
      </div>

      <ion-accordion-group v-if="operation.query">
        <ion-accordion value="query">
          <ion-item slot="header" lines="none">
            <ion-label>{{ translate("Query sent to Shopify") }}</ion-label>
          </ion-item>
          <div slot="content" class="accordion-content">
            <pre>{{ operation.query }}</pre>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { commonUtil, translate } from "@common";
import {
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonItem,
  IonLabel
} from "@ionic/vue";
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  cloudDownloadOutline,
  copyOutline,
  documentTextOutline,
  gitNetworkOutline,
  helpCircleOutline,
  hourglassOutline,
  layersOutline,
  playOutline,
  pulseOutline,
  timeOutline
} from "ionicons/icons";
import { DateTime } from "luxon";
import { computed } from "vue";
import { SHOPIFY_OPERATION_TYPE_LABELS, SHOPIFY_STATUS_LABELS } from "@/store/shopifyBulkOperation";
import { useUtilStore } from "@/store/util";
import { type ShopifyBulkOperation } from "@/types/ShopifyBulkOperation";
import { getDuration, getFileSize } from "@/utils";

const props = defineProps<{
  operation: ShopifyBulkOperation;
  enrichmentAvailable: boolean;
}>();

defineEmits<{
  (e: "view-system-message", systemMessageId: string): void;
  (e: "copy-id", id: string): void;
}>();

const hotwax = computed(() => props.operation.hotwaxMessage);

// Shopify statuses are not HotWax status ids, so commonUtil.getStatusColor does not cover them.
const STATUS_DISPLAY: Record<string, { color: string; icon: string }> = {
  COMPLETED: { color: "success", icon: checkmarkCircleOutline },
  FAILED: { color: "danger", icon: alertCircleOutline },
  CANCELED: { color: "medium", icon: closeCircleOutline },
  CANCELING: { color: "medium", icon: closeCircleOutline }
};

const statusDisplay = computed(() => STATUS_DISPLAY[props.operation.status] ?? { color: "primary", icon: hourglassOutline });

const utilStore = useUtilStore();

// Shopify sends ISO timestamps; HotWax sends epoch millis.
const formatDate = (value?: string | number) => {
  if(!value) {
    return "-";
  }

  return commonUtil.getDateTimeWithOrdinalSuffix(typeof value === "number" ? value : DateTime.fromISO(value).toMillis());
};

const metrics = computed(() => {
  const { createdAt, completedAt, objectCount, rootObjectCount, fileSize } = props.operation;

  return [
    { label: translate("Created"), icon: playOutline, value: formatDate(createdAt) },
    { label: translate("Completed"), icon: checkmarkCircleOutline, value: formatDate(completedAt) },
    {
      label: translate("Duration"),
      icon: timeOutline,
      value: createdAt && completedAt ? getDuration(DateTime.fromISO(createdAt).toMillis(), DateTime.fromISO(completedAt).toMillis()) : "-"
    },
    { label: translate("Objects"), icon: layersOutline, value: (objectCount ?? 0).toLocaleString() },
    { label: translate("Root objects"), icon: gitNetworkOutline, value: (rootObjectCount ?? 0).toLocaleString() },
    { label: translate("Result size"), icon: documentTextOutline, value: fileSize ? getFileSize(String(fileSize)) : "-" }
  ];
});
</script>

<style scoped>
.operation-card {
  margin-block-end: var(--spacer-base);
}

.operation-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacer-base);
}

.operation-metrics ion-item,
.hotwax-link {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.operation-actions {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  flex-wrap: wrap;
  margin-block-start: var(--spacer-base);
}

.accordion-content {
  padding: var(--spacer-base);
}

.accordion-content pre {
  overflow: auto;
  white-space: pre-wrap;
}
</style>
