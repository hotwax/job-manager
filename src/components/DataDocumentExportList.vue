<template>
  <ion-list v-if="messages.length">
    <ion-card
      v-for="message in messages"
      :key="message.systemMessageId"
      class="list-item"
      @click="router.push(`/system-messages/${message.systemMessageId}`)"
    >
      <ion-item lines="none">
        <ion-icon slot="start" :icon="cloudDownloadOutline" />
        <ion-label>
          <h2>{{ message.fileName || message.systemMessageId }}</h2>
          <p>
            {{ translate("System Message") }}: {{ message.systemMessageId }}
            <template v-if="message.dataDocumentId"> · {{ message.dataDocumentId }}</template>
          </p>
        </ion-label>
        <ion-button
          slot="end"
          fill="clear"
          :aria-label="translate('Download export')"
          :disabled="!canDownload(message)"
          @click.stop="downloadDataDocumentExport(message)"
        >
          <ion-icon slot="icon-only" :icon="downloadOutline" />
        </ion-button>
      </ion-item>

      <div class="meta">
        <p>{{ translate("Started") }}: {{ getDateAndTime(message.initDate) }}</p>
        <p v-if="message.processedDate">{{ translate("Processed") }}: {{ getDateAndTime(message.processedDate) }}</p>
        <p v-if="message.startedBy">{{ translate("Started By") }}: {{ message.startedBy }}</p>
        <p v-if="message.recordCount != null">{{ message.recordCount }} {{ translate("records") }}</p>
        <p v-if="message.errorSummary" class="error-text">{{ message.errorSummary }}</p>
      </div>

      <div class="status">
        <ion-badge :color="getExportStatus(message).color">{{ translate(getExportStatus(message).label) }}</ion-badge>
      </div>
    </ion-card>
  </ion-list>
  <div v-else class="empty-state">
    <p>{{ emptyMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonCard, IonIcon, IonItem, IonLabel, IonList } from "@ionic/vue";
import { cloudDownloadOutline, downloadOutline } from "ionicons/icons";

import { translate } from "@common";
import router from "@/router";
import { downloadDataDocumentExport, getDateAndTime, getExportStatus } from "@/utils";

defineProps<{
  messages: Record<string, any>[];
  emptyMessage: string;
}>();

const canDownload = (message: any) => message.statusId === "SmsgSent" && message.messageText;
</script>

<style scoped>
/* Mirror the Message History list: a responsive row-grid card (.list-item) with the
   primary info on the left, supporting detail in the middle, and a status pill on the right. */
.list-item {
  --columns-desktop: 3;
  padding-inline-end: var(--spacer-sm);
}

ion-card {
  padding-block: var(--spacer-base);
}

.list-item .meta p {
  margin: 2px 0;
}

.list-item .meta .error-text {
  color: var(--ion-color-danger);
}

.list-item .status {
  width: 15ch;
  text-align: end;
}
</style>
