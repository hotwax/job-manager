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
                <ion-note :color="commonUtil.getStatusColor(currentLogInfo.statusId)">{{ getStatusDesc(currentLogInfo.statusId) }}</ion-note>
                <h1><ion-icon :icon="documentOutline" />{{ currentLogInfo.fileName }}</h1>
                <p>
                  {{ currentLogInfo.scriptTitle || currentLogInfo.description || currentLogInfo.configId }} 
                  <span class="separator">|</span> 
                  <ion-icon :icon="timeOutline" />{{ getDateTimeWithOrdinalSuffix(currentLogInfo.createdDate) }}
                </p>
              </div>
              <div class="score-card" v-if="currentLogInfo.failedRecordCount || currentLogInfo.totalRecordCount">
                <div class="badge success">
                  <span class="count">{{ currentLogInfo.successRecordCount }}</span>
                  <span class="label">{{ translate("SUCCESS") }}</span>
                </div>
                <div class="badge failed">
                  <span class="count">{{ currentLogInfo.failedRecordCount || 0 }}</span>
                  <span class="label">{{ translate("FAILED") }}</span>
                </div>
              </div>
            </div>
          </ion-card-header>

          <ion-card-content v-if="currentLogInfo.failedRecordCount">
            <div class="actions">
              <ion-item lines="none">
                <ion-icon :icon="warningOutline" slot="start" color="warning" />
                <ion-label>
                  <p>{{ translate("Download bad rows, fix, and re-upload.") }}</p>
                </ion-label>
              </ion-item>
              <div class="buttons">
                <ion-button fill="outline" color="dark" @click="downloadFailedRecords">
                  <ion-icon slot="start" :icon="downloadOutline" />
                  {{ translate("Download Failed Rows") }}
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Bottom Section: Error Log -->
        <ion-card v-if="currentLogInfo.failedRecordCount">
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
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardContent, IonIcon, IonButton, IonCardTitle, IonList, IonItem, IonLabel, onIonViewWillEnter } from '@ionic/vue';
import { translate, commonUtil } from '@common';
import { documentOutline, timeOutline, warningOutline, downloadOutline, bugOutline } from 'ionicons/icons';
import { saveAs } from 'file-saver';
import { getStatusDesc } from '@/utils/config';
import { useMdmLog } from '@/composables/mdmLogs';
import { getDateTimeWithOrdinalSuffix } from '@/utils';

const props = defineProps(["id"])
const { currentLogInfo, fetchLogDetails, errorLogs, errorCsvRecords } = useMdmLog();

function downloadFailedRecords() {
  const blob = new Blob([errorCsvRecords.value!], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, currentLogInfo.value.errorFileName ? currentLogInfo.value.errorFileName : "ErrorDataManagerContent.csv");
}

onIonViewWillEnter(async () => {
  await fetchLogDetails(props.id)
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
