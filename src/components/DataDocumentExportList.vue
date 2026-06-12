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
      <ion-button fill="clear" :disabled="!canDownload(message)" @click.stop="downloadDataDocumentExport(message)">
        <ion-icon slot="icon-only" :icon="downloadOutline" />
      </ion-button>
    </ion-card>
  </ion-list>
  <p v-else class="empty-state">{{ emptyMessage }}</p>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonIcon, IonList } from "@ionic/vue";
import { downloadOutline } from "ionicons/icons";
import { useRouter } from "vue-router";

import { translate } from "@common";
import { downloadDataDocumentExport, getDateAndTime } from "@/utils";

defineProps<{
  messages: Record<string, any>[];
  emptyMessage: string;
}>();

const router = useRouter();

const canDownload = (message: any) => message.statusId === "SmsgSent" && message.messageText;
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
