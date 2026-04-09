<template>
  <ion-list v-if="messages.length">

    <ion-card v-for="message in messages" :key="message.systemMessageId" class="list-item"
        @click="router.push(`/system-messages/${message.systemMessageId}`)">
      <ion-item lines="none">
        <ion-icon slot="start" :icon="message.isOutgoing === 'Y' ? sendOutline : downloadOutline" />
        <ion-label>
          {{ getTypeName(message.systemMessageTypeId) }} #{{ message.systemMessageId }}
        </ion-label>
      </ion-item>
      <p v-if="showRemote">{{ translate("Remote") }}: {{ message.systemMessageRemoteId }}</p>
      <div>
        <p>{{ translate("Started") }}: {{ getDateAndTime(message.initDate) }}</p>
        <p v-if="message.processedDate">{{ translate("Processed") }}: {{ getDateAndTime(message.processedDate) }}</p>
      </div>
      <div class="status">
        <ion-badge :color="commonUtil.getStatusColor(message.statusId)">
          {{ getStatusDescription(message.statusId) }}
        </ion-badge>
      </div>
    </ion-card>
  </ion-list>
  <div v-else class="empty-state">
    <p>{{ emptyMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonCard, IonIcon, IonItem, IonLabel, IonList } from "@ionic/vue";
import { downloadOutline, sendOutline } from "ionicons/icons";
import { translate } from "@common";
import { commonUtil } from "@common/utils/commonUtil"
import { useRouter } from "vue-router";
import { getDateAndTime } from "@/utils"
import { useSystemMessageStore } from "@/store/systemMessage";
import { useUtilStore } from "@/store/util";

withDefaults(defineProps<{
  messages: Record<string, any>[];
  emptyMessage?: string;
  showRemote?: boolean;
  showType?: boolean;
}>(), {
  emptyMessage: "No messages found.",
  showRemote: true,
  showType: true
});

const router = useRouter();
const store = useSystemMessageStore();
const utilStore = useUtilStore();

const getStatusDescription = (statusId: string) => utilStore.getStatusItemDesc(statusId);

const getTypeName = (typeId: string) => {
  const type = store.getSystemMessageTypes.find((t: any) => t.systemMessageTypeId === typeId);
  return type?.description || typeId;
};
</script>

<style scoped>
.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--ion-color-medium);
}

.list-item {
  --columns-desktop: 4;
  padding-inline-end: var(--spacer-sm);
}

ion-card {
  padding-block: var(--spacer-base);
}

.list-item .status {
  width: 15ch;
  text-align: end;
}
</style>
