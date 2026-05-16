<template>
  <ion-list v-if="messages.length">
    <ion-card
      v-for="message in messages"
      :key="message.systemMessageId"
      class="list-item export"
      @click="router.push(`/system-messages/${message.systemMessageId}`)"
    >
      <div>
        <p>{{ translate("File") }}</p>
        <h2>{{ message.fileName || message.systemMessageId }}</h2>
        <p>{{ message.systemMessageId }}</p>
      </div>
      <div>
        <p>{{ translate("Status") }}</p>
        <h2>{{ message.statusId || "-" }}</h2>
        <p v-if="message.errorSummary">{{ message.errorSummary }}</p>
      </div>
      <div>
        <p>{{ translate("Started") }}</p>
        <h2>{{ getDateAndTime(message.initDate) }}</h2>
        <p v-if="message.processedDate">{{ translate("Processed") }}: {{ getDateAndTime(message.processedDate) }}</p>
      </div>
      <div>
        <p>{{ translate("Records") }}</p>
        <h2>{{ message.recordCount ?? "-" }}</h2>
        <p v-if="message.startedBy">{{ translate("Started By") }}: {{ message.startedBy }}</p>
      </div>
      <ion-button fill="clear" :disabled="!canDownload(message)" @click.stop="download(message)">
        <ion-icon slot="icon-only" :icon="downloadOutline" />
      </ion-button>
    </ion-card>
  </ion-list>
  <p v-else class="empty-state">{{ emptyMessage }}</p>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonIcon, IonList, IonText } from "@ionic/vue";
import { downloadOutline } from "ionicons/icons";
import { saveAs } from "file-saver";
import { useRouter } from "vue-router";

import { translate } from "@common";
import { useDataDocumentStore } from "@/store/dataDocuments";
import { getDateAndTime, showToast } from "@/utils";

defineProps<{
  messages: Record<string, any>[];
  emptyMessage: string;
}>();

const router = useRouter();
const dataDocumentStore = useDataDocumentStore();

const canDownload = (message: any) => message.statusId === "SmsgSent" && message.messageText;

function extractFilename(message: any) {
  if(message?.messageText) {
    const parts = message?.messageText.split("/")
    return parts[parts.length - 1] || ""
  }
  return ""
}

const download = async (message: any) => {
  try {
    const resp = await dataDocumentStore.downloadExport(message.systemMessageId);
    const csvData = resp?.data?.csvData;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, extractFilename(message) || `${message.systemMessageId}.csv`);
  } catch (error) {
    showToast(translate("Failed to download linked file."));
  }
};
</script>

<style scoped>
.list-item.export {
  --columns-desktop: 5;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacer-base);
  align-items: center;
  padding: var(--spacer-sm) var(--spacer-base);
  cursor: pointer;
}

@media (min-width: 992px) {
  .list-item.export {
    grid-template-columns: repeat(var(--columns-desktop), 1fr);
  }
}
</style>
