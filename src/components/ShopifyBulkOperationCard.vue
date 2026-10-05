<template>
  <ion-card class="operation-card">
    <ion-item lines="none">
      <ion-icon slot="start" :icon="statusIcon" :color="statusColor" />
      <ion-label class="ion-text-wrap">
        <p class="overline">
          #{{ operation.shopifyOperationId }}<span v-if="operation.shopName"> | {{ operation.shopName }}</span>
        </p>
        <h2>{{ hotwax?.description || hotwax?.systemMessageTypeId || translate("Bulk operation") }}</h2>
        <p>{{ translate(SHOPIFY_OPERATION_TYPE_LABELS[operation.type] || operation.type) }}</p>
      </ion-label>
      <ion-badge slot="end" :color="statusColor">
        {{ translate(SHOPIFY_STATUS_LABELS[operation.status] || operation.status) }}
      </ion-badge>
    </ion-item>

    <ion-card-content>
      <div class="operation-metrics">
        <ion-item lines="none">
          <ion-icon slot="start" :icon="playOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Created") }}</p>
            {{ formatDate(operation.createdAt) }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="checkmarkCircleOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Completed") }}</p>
            {{ formatDate(operation.completedAt) }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="timeOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Duration") }}</p>
            {{ duration }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="layersOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Objects") }}</p>
            {{ (operation.objectCount ?? 0).toLocaleString() }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="gitNetworkOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Root objects") }}</p>
            {{ (operation.rootObjectCount ?? 0).toLocaleString() }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="documentTextOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Result size") }}</p>
            {{ operation.fileSize ? getFileSize(String(operation.fileSize)) : "-" }}
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
        </ion-label>
        <ion-badge slot="end" :color="commonUtil.getStatusColor(hotwax.statusId)">
          {{ translate(getStatusDesc(hotwax.statusId) || hotwax.statusId) }}
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
import { type ShopifyBulkOperation } from "@/types/ShopifyBulkOperation";
import { getDuration, getFileSize } from "@/utils";
import { getStatusDesc } from "@/utils/config";

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
const statusColor = computed(() => {
  const status = props.operation.status;
  if(status === "COMPLETED") {return "success";}
  if(status === "FAILED") {return "danger";}
  if(status === "CANCELED" || status === "CANCELING") {return "medium";}

  return "primary";
});

const statusIcon = computed(() => {
  const status = props.operation.status;
  if(status === "COMPLETED") {return checkmarkCircleOutline;}
  if(status === "FAILED") {return alertCircleOutline;}
  if(status === "CANCELED" || status === "CANCELING") {return closeCircleOutline;}

  return hourglassOutline;
});

const duration = computed(() => {
  const { createdAt, completedAt } = props.operation;

  return createdAt && completedAt
    ? getDuration(DateTime.fromISO(createdAt).toMillis(), DateTime.fromISO(completedAt).toMillis())
    : "-";
});

const formatDate = (value?: string) => (value ? commonUtil.getDateTimeWithOrdinalSuffix(DateTime.fromISO(value).toMillis()) : "-");
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
