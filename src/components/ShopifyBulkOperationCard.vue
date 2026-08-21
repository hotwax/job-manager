<template>
  <ion-card class="operation-card">
    <ion-item lines="none">
      <ion-icon slot="start" :icon="display.statusIcon" :color="display.statusColor" />
      <ion-label class="ion-text-wrap">
        <p class="overline">
          #{{ display.shopifyOperationId }}
        </p>
        <h2>{{ display.title }}</h2>
        <p>{{ display.type }}</p>
      </ion-label>
      <ion-badge slot="end" :color="display.statusColor">
        {{ display.statusLabel }}
      </ion-badge>
    </ion-item>

    <ion-card-content>
      <div class="operation-metrics">
        <ion-item lines="none">
          <ion-icon slot="start" :icon="playOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Created") }}</p>
            {{ display.createdAt }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="checkmarkCircleOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Completed") }}</p>
            {{ display.completedAt }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="timeOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Duration") }}</p>
            {{ display.duration }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="layersOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Objects") }}</p>
            {{ display.objectCount }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="gitNetworkOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Root objects") }}</p>
            {{ display.rootObjectCount }}
          </ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="documentTextOutline" color="medium" />
          <ion-label>
            <p>{{ translate("Result size") }}</p>
            {{ display.fileSize }}
          </ion-label>
        </ion-item>
      </div>

      <!-- The HotWax half of the story: which pipeline asked for this operation. -->
      <ion-item v-if="display.hasHotwaxMessage" lines="none" class="hotwax-link" button :detail="false" @click="$emit('view-system-message', display.systemMessageId)">
        <ion-icon slot="start" :icon="pulseOutline" color="medium" />
        <ion-label class="ion-text-wrap">
          <p>{{ translate("HotWax job") }}</p>
          {{ display.systemMessageTypeId }}
          <p v-if="display.jobRunId">
            {{ translate("Job run") }}: #{{ display.jobRunId }}
          </p>
        </ion-label>
        <ion-badge slot="end" :color="display.hotwaxStatusColor">
          {{ display.hotwaxStatusLabel }}
        </ion-badge>
      </ion-item>
      <ion-item v-else-if="enrichmentAvailable" lines="none" class="hotwax-link">
        <ion-icon slot="start" :icon="helpCircleOutline" color="medium" />
        <ion-label class="ion-text-wrap">
          <p>{{ translate("HotWax job") }}</p>
          {{ translate("No HotWax message found for this operation") }}
        </ion-label>
      </ion-item>

      <ion-item v-if="display.errorCode" lines="none">
        <ion-icon slot="start" :icon="alertCircleOutline" color="danger" />
        <ion-label class="ion-text-wrap">
          <p>{{ translate("Error code") }}</p>
          {{ display.errorCode }}
        </ion-label>
      </ion-item>

      <div class="operation-actions">
        <ion-button v-if="display.url" fill="outline" size="small" :href="display.url" target="_blank" rel="noopener">
          <ion-icon slot="start" :icon="cloudDownloadOutline" />
          {{ translate("Result file") }}
        </ion-button>
        <ion-button v-if="display.partialDataUrl" fill="outline" size="small" color="warning" :href="display.partialDataUrl" target="_blank" rel="noopener">
          <ion-icon slot="start" :icon="cloudDownloadOutline" />
          {{ translate("Partial data") }}
        </ion-button>
        <ion-button fill="clear" size="small" @click="$emit('copy-id', display.id)">
          <ion-icon slot="start" :icon="copyOutline" />
          {{ translate("Copy operation ID") }}
        </ion-button>
      </div>

      <ion-accordion-group v-if="display.query">
        <ion-accordion value="query">
          <ion-item slot="header" lines="none">
            <ion-label>{{ translate("Query sent to Shopify") }}</ion-label>
          </ion-item>
          <div slot="content" class="accordion-content">
            <pre>{{ display.query }}</pre>
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
import { getDuration, getFileSize } from "@/utils";
import { getStatusDesc } from "@/utils/config";
import { type ShopifyBulkOperation } from "@/store/shopifyBulkOperation";

export interface OperationDisplayModel {
  id: string;
  shopifyOperationId: string;
  title: string;
  type: string;
  statusLabel: string;
  statusColor: string;
  statusIcon: string;
  createdAt: string;
  completedAt: string;
  duration: string;
  objectCount: string;
  rootObjectCount: string;
  fileSize: string;
  hasHotwaxMessage: boolean;
  systemMessageId?: string;
  systemMessageTypeId?: string;
  jobRunId?: string;
  hotwaxStatusColor: string;
  hotwaxStatusLabel: string;
  errorCode?: string;
  url?: string;
  partialDataUrl?: string;
  query?: string;
}

const props = defineProps<{
  operation: ShopifyBulkOperation;
  enrichmentAvailable: boolean;
}>();

defineEmits<{
  (e: 'view-system-message', systemMessageId: string): void;
  (e: 'copy-id', id: string): void;
}>();

const toTitleCase = (value: string) => {
  if(!value) return "";
  return value.charAt(0) + value.slice(1).toLowerCase();
};

const getShopifyStatusColor = (status: string) => {
  if(status === "COMPLETED") return "success";
  if(status === "FAILED") return "danger";
  if(status === "CANCELED" || status === "CANCELING") return "medium";
  return "primary";
};

const getStatusIcon = (status: string) => {
  if(status === "COMPLETED") return checkmarkCircleOutline;
  if(status === "FAILED") return alertCircleOutline;
  if(status === "CANCELED" || status === "CANCELING") return closeCircleOutline;
  return hourglassOutline;
};

const formatDate = (value: string) => (value ? commonUtil.getDateTimeWithOrdinalSuffix(DateTime.fromISO(value).toMillis()) : "-");

const display = computed<OperationDisplayModel>(() => {
  const op = props.operation;
  const status = op.status || "";
  const type = op.type || "";
  const hotwax = op.hotwaxMessage;

  return {
    id: op.id,
    shopifyOperationId: op.shopifyOperationId,
    title: hotwax?.description || hotwax?.systemMessageTypeId || translate("Bulk operation"),
    type: translate(toTitleCase(type)),
    statusLabel: translate(toTitleCase(status)),
    statusColor: getShopifyStatusColor(status),
    statusIcon: getStatusIcon(status),

    createdAt: formatDate(op.createdAt),
    completedAt: formatDate(op.completedAt),
    duration: (op.createdAt && op.completedAt)
      ? getDuration(DateTime.fromISO(op.createdAt).toMillis(), DateTime.fromISO(op.completedAt).toMillis())
      : "-",
    objectCount: (op.objectCount ?? 0).toLocaleString(),
    rootObjectCount: (op.rootObjectCount ?? 0).toLocaleString(),
    fileSize: op.fileSize ? getFileSize(String(op.fileSize)) : "-",

    hasHotwaxMessage: !!hotwax,
    systemMessageId: hotwax?.systemMessageId,
    systemMessageTypeId: hotwax?.systemMessageTypeId,
    jobRunId: hotwax?.jobRunId,
    hotwaxStatusColor: hotwax ? commonUtil.getStatusColor(hotwax.statusId) : "",
    hotwaxStatusLabel: hotwax ? translate(getStatusDesc(hotwax.statusId) || hotwax.statusId) : "",

    errorCode: op.errorCode,
    url: op.url,
    partialDataUrl: op.partialDataUrl,
    query: op.query
  };
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
