<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("File history") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>{{ translate("Processed Files") }}</h1>
            <p>{{ translate("View history of processed files") }}</p>
          </div>
          <ion-segment v-model="filterStatus" class="filter-segment" @ionChange="fetchLogs()">
            <ion-segment-button value="all">
              <ion-label>{{ translate("All") }}</ion-label>
            </ion-segment-button>
            <ion-segment-button value="error">
              <ion-label>{{ translate("Problems") }}</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <ion-list>
          <div class="list-item table-header log">
            <ion-label>{{ translate("Log Id") }}</ion-label>
            <ion-label class="file-name">{{ translate("File name") }}</ion-label>
            <ion-label>{{ translate("Status") }}</ion-label>
            <ion-label>{{ translate("Origin") }}</ion-label>
            <ion-label>{{ translate("Uploaded") }}</ion-label>
          </div>
          <div v-for="(log, logId) in logs" :key="logId" class="list-item log" @click="router.push({ name: 'FileDetail', params: { id: logId } })">
            <ion-label>{{ logId }}</ion-label>
            <ion-item lines="none" class="file-name">
              <ion-icon slot="start" :icon="documentOutline" />
              <ion-label class="ion-text-wrap">
                {{ log[0].fileName }}
                <p>{{ getFileSize(log[0].fileSize) }}</p>
              </ion-label>
            </ion-item>
            <ion-label>
              <ion-chip :color="getStatusColor(log[0].statusId)">
                {{ translate(statusDesc[log[0].statusId]) }}
              </ion-chip>
            </ion-label>
            <ion-label>{{ log[0].origin || "-" }}</ion-label>
            <ion-label>
              {{ log[0].createdDate }}
            </ion-label>
            <ion-button v-if="log[0].statusId === 'DmlsPending'" color="danger" fill="clear" slot="icon-only" @click.stop="mdmStore.cancelDataManagerLog(log[0].configId, log[0].logId)">
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </div>
        </ion-list>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
  IonMenuButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonChip
} from '@ionic/vue';
import { translate } from '@common';
import { closeOutline, documentOutline } from 'ionicons/icons';
import { ref, computed, onMounted } from 'vue';
import router from '@/router';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { getFileSize } from '@/utils';
import { getStatusColor } from '@common/utils/commonUtil';

const mdmStore = useMdmConfigStore();

const filterStatus = ref('all');
const logs = computed(() => mdmStore.getLogs)

const statusDesc: Record<string, string> = {
  "DmlsCancelled": "Cancelled",
  "DmlsCrashed": "Crashed",
  "DmlsFailed": "Failed",
  "DmlsFinished": "Finished",
  "DmlsPending": "Pending",
  "DmlsQueued": "Queued",
  "DmlsRunning": "Running"
}

async function fetchLogs() {
  const params = filterStatus.value === "error" ? { statusId: "DmlsFailed" } : {}
  await mdmStore.fetchDataManagerLogs(params);
}

onMounted(async () => {
  await fetchLogs();
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacer-base);
}

.filter-segment {
  width: auto;
  min-width: 200px;
}

.list-item.log {
  --columns-desktop: 7;
  padding: var(--spacer-sm) var(--spacer-base);
  cursor: pointer;
}

.file-name {
  grid-column: span 2;
  justify-self: start;
}
</style>
