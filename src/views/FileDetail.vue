<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/file-history"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ translate("File Detail") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <!-- Top Section: File Info -->
        <ion-card>
          <ion-card-header>
            <div class="file-header">
              <div class="file-info">
                <h1><ion-icon :icon="documentOutline" />{{ importedLog.fileName }}</h1>
                <p>
                  <!-- TODO -->
                  <ion-icon :icon="briefcaseOutline" />{{ importType }} 
                  <span class="separator">|</span> 
                  <ion-icon :icon="timeOutline" />{{ importedLog.createdDate }}
                </p>
              </div>
              <div class="score-card">
                <div class="badge success">
                  <span class="count">{{ getSuccessRecordCount }}</span>
                  <span class="label">{{ translate("SUCCESS") }}</span>
                </div>
                <div class="badge failed">
                  <span class="count">{{ importedLog.failedRecordCount || 0 }}</span>
                  <span class="label">{{ translate("FAILED") }}</span>
                </div>
              </div>
            </div>
          </ion-card-header>

          <ion-card-content v-if="importedLog.failedRecordCount">
            <div class="actions">
              <ion-item lines="none">
                <ion-icon :icon="warningOutline" slot="start" color="warning" />
                <ion-label>
                  <p>{{ translate("Download bad rows, fix, and re-upload.") }}</p>
                </ion-label>
              </ion-item>
              <div class="buttons">
                <ion-button :disabled="!errorLogs.length" fill="outline" color="dark" @click="downloadFailedRecords">
                  <ion-icon slot="start" :icon="downloadOutline" />
                  {{ translate("Download Failed Rows") }}
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Bottom Section: Error Log -->
        <ion-card v-if="importedLog.failedRecordCount">
          <ion-card-header>
             <ion-card-title>
               <ion-icon :icon="bugOutline" color="danger" />
               {{ translate("Error Log") }}
             </ion-card-title>
          </ion-card-header>
          <ion-list>
            <div class="list-item table-header error-log">
              <ion-label>{{ translate("Row") }}</ion-label>
              <ion-label>{{ translate("Record ID") }}</ion-label>
              <ion-label>{{ translate("Description") }}</ion-label>
            </div>
            <div class="list-item error-log" v-for="error in errorLogs" :key="error['_recordNumber']">
              <ion-label>{{ error["_recordNumber"] }}</ion-label>
              <ion-label>{{ error["_recordNumber"] }}</ion-label>
              <ion-label>{{ error["_ERROR_MESSAGE_"] }}</ion-label>
            </div>
          </ion-list>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonIcon,
  IonButton,
  IonCardTitle,
  IonList,
  IonItem,
  IonLabel,
  onIonViewWillEnter
} from '@ionic/vue';
import { api, translate } from '@common';
import { 
  documentOutline, 
  briefcaseOutline, 
  timeOutline, 
  warningOutline, 
  downloadOutline,
  bugOutline
} from 'ionicons/icons';
import { computed, ref } from 'vue';
import { useMdmConfigStore } from '@/store/mdmConfig';
import logger from '@/logger';
import { showToast } from '@/utils';
import { saveAs } from 'file-saver';

const props = defineProps(["id"])

const importType = ref("Import Sales Orders (NS)");

const mdmStore = useMdmConfigStore();
const logs = computed(() => mdmStore.getLogById(props.id))
const getSuccessRecordCount = computed(() => {
  const total = Number(importedLog.value.totalRecordCount) || 0
  const failed = Number(importedLog.value.failedRecordCount) || 0
  return total - failed
})

const importedLog = computed(() => logs.value.find((log: any) => log.logContentTypeEnumId === "DmcntImported"))
const errorContent = computed(() => logs.value.filter((log: any) => log.logContentTypeEnumId === "DmcntError"))

let errorLogs = ref([])
let errorCsvRecords = ref(null)

async function fetchFailedRecords() {
  try {
    const resp = await api({
      url: "admin/dataManager/downloadDataManagerFile",
      method: "GET",
      params: {
        configId: importedLog.value.configId,
        logContentId: errorContent.value[0].logContentId
      }
    })

    errorCsvRecords.value = resp?.data?.csvData || resp.data;
    errorLogs.value = JSON.parse(errorCsvRecords.value!)
  } catch(err) {
    logger.error("Failed to download the error records", err)
    showToast(translate("Failed to download the error records"))
  }
}

function downloadFailedRecords() {
  const blob = new Blob([errorCsvRecords.value!], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, errorContent.value[0].fileName ? errorContent.value[0].fileName : "ErrorDataManagerContent.json");
}

onIonViewWillEnter(async () => {
  await mdmStore.fetchDataManagerLogById(props.id)
  if(errorContent.value[0]?.logContentId) {
    await fetchFailedRecords();
  }
})
</script>

<style scoped>
.file-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.file-info {
  flex: 1;
}

.file-info h1 {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  margin: 0 0 0.5rem;
}

.file-info p {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  color: var(--ion-color-medium);
  margin: 0;
}

.score-card {
  display: flex;
  gap: var(--spacer-sm);
}

.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacer-xs) var(--spacer-sm);
  border-radius: 8px;
  min-width: 80px;
}

.badge.success {
  background-color: rgba(var(--ion-color-success-rgb), 0.1);
  color: var(--ion-color-success);
}

.badge.failed {
  background-color: rgba(var(--ion-color-danger-rgb), 0.1);
  color: var(--ion-color-danger);
}

.badge .count {
  font-size: 1.5rem;
  font-weight: bold;
}

.badge .label {
  font-size: 0.75rem;
  text-transform: uppercase;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacer-base);
  margin-top: var(--spacer-sm);
  border-top: 1px solid var(--ion-color-light);
  padding-top: var(--spacer-sm);
}

.actions ion-item {
 flex: 1;
}

.buttons {
  display: flex;
  gap: var(--spacer-xs);
}

.list-item.error-log {
  --columns-desktop: 4;
  padding: var(--spacer-sm);
  border-bottom: 1px solid var(--ion-color-light);
}

.list-item.error-log:last-child {
  border-bottom: none;
}
</style>
