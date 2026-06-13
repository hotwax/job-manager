<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/file-history" slot="start"></ion-back-button>
        <ion-title>{{ translate("File Details") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <main v-if="log">
        <div class="header-section">
          <h2>{{ log.fileName }}</h2>
          <p class="subtitle">{{ log.logId }} &bull; {{ getFileSize(log.fileSize) }}</p>
        </div>

        <div class="expanded-details">
          <div class="details-section">
            <h4><ion-icon :icon="hardwareChipOutline" class="section-icon"/> {{ translate("Execution Details") }}</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">{{ translate("Log ID") }}</span>
                <span class="detail-value">{{ log.logId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ translate("Config ID") }}</span>
                <span class="detail-value">{{ log.configId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ translate("Execution Mode") }}</span>
                <span class="detail-value">
                  <ion-chip outline color="tertiary" class="small-chip">{{ log.executionModeId || 'N/A' }}</ion-chip>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ translate("Log Type") }}</span>
                <span class="detail-value">
                  <ion-chip outline color="secondary" class="small-chip">{{ log.logTypeEnumId || log.logContentTypeEnumId || 'N/A' }}</ion-chip>
                </span>
              </div>
              <div class="detail-item" v-if="log.runByInstanceId">
                <span class="detail-label">{{ translate("Run Instance") }}</span>
                <span class="detail-value">{{ log.runByInstanceId }}</span>
              </div>
              <div class="detail-item" v-if="log.importServiceName">
                <span class="detail-label">{{ translate("Service Name") }}</span>
                <span class="detail-value service-name" :title="log.importServiceName">{{ log.importServiceName.split('.').pop() }}</span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h4><ion-icon :icon="timeOutline" class="section-icon"/> {{ translate("Timeline") }}</h4>
            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">{{ translate("Created At") }}</span>
                <span class="detail-value">{{ log.createdDate ? commonUtil.getDateTimeWithOrdinalSuffix(log.createdDate) : '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ translate("Started At") }}</span>
                <span class="detail-value">{{ log.startDateTime ? commonUtil.getDateTimeWithOrdinalSuffix(log.startDateTime) : '-' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ translate("Finished At") }}</span>
                <span class="detail-value">{{ log.finishDateTime || log.lastUpdatedTxStamp ? commonUtil.getDateTimeWithOrdinalSuffix(log.finishDateTime || log.lastUpdatedTxStamp) : '-' }}</span>
              </div>
              <div class="detail-item" v-if="log.createdDate && (log.finishDateTime || log.lastUpdatedTxStamp)">
                <span class="detail-label">{{ translate("Duration") }}</span>
                <span class="detail-value">
                  <ion-chip outline color="primary" class="small-chip">{{ getDuration(log.createdDate, log.finishDateTime || log.lastUpdatedTxStamp) }}</ion-chip>
                </span>
              </div>
              <div class="detail-item" v-if="log.runThread">
                <span class="detail-label">{{ translate("Run Thread") }}</span>
                <span class="detail-value">{{ log.runThread }}</span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <div class="json-header">
              <h4><ion-icon :icon="codeWorkingOutline" class="section-icon"/> {{ translate("Raw Payload") }}</h4>
              <ion-button fill="clear" size="small" @click="copyToClipboard(log)">
                <ion-icon slot="start" :icon="copyOutline"/>
                {{ translate("Copy JSON") }}
              </ion-button>
            </div>
            <div class="raw-json-container">
              <pre><code>{{ JSON.stringify(log, null, 2) }}</code></pre>
            </div>
          </div>
        </div>
      </main>
      <div v-else class="loading-state">
        <ion-spinner name="crescent"></ion-spinner>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonChip,
  IonButton,
  IonSpinner,
  onIonViewWillEnter
} from '@ionic/vue';
import { ref } from 'vue';
import { translate, commonUtil } from '@common';
import { useMdmConfigStore } from '@/store/mdmConfig';
import { getFileSize, showToast, getDuration } from '@/utils';
import { hardwareChipOutline, timeOutline, codeWorkingOutline, copyOutline } from 'ionicons/icons';

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const mdmStore = useMdmConfigStore();
const logId = props.id;

const log = ref<any>(null);

onIonViewWillEnter(async () => {
  if (logId) {
    const fetchedLog = await mdmStore.fetchDataManagerLogById(logId);
    if (fetchedLog) {
      log.value = fetchedLog;
    } else {
      showToast(translate("Log details not found"));
    }
  }
});


const copyToClipboard = async (logData: any) => {
  commonUtil.copyToClipboard(JSON.stringify(logData, null, 2), "Copied to clipboard");
};
</script>

<style scoped>
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacer-lg);
}

.header-section {
  margin-bottom: var(--spacer-lg);
}

.header-section h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ion-color-dark);
}

.header-section .subtitle {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: var(--ion-color-medium);
}

.expanded-details {
  background: var(--ion-background-color, #fff);
  padding: 24px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.details-section h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--ion-color-step-100, #f0f0f0);
  padding-bottom: 8px;
}

.section-icon {
  font-size: 1.25rem;
}

.json-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--ion-color-step-100, #f0f0f0);
  padding-bottom: 8px;
}

.json-header h4 {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.json-header ion-button {
  margin: 0;
  --padding-top: 4px;
  --padding-bottom: 4px;
}

.raw-json-container {
  background: var(--ion-color-step-50, #f9f9f9);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  border: 1px solid var(--ion-color-step-150, #e2e2e2);
}

.raw-json-container pre {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--ion-color-dark);
  font-family: 'Courier New', Courier, monospace;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ion-color-medium);
}

.detail-value {
  font-size: 1rem;
  font-weight: 500;
  color: var(--ion-color-dark);
}

.detail-value.service-name {
  word-break: break-all;
}

.small-chip {
  min-height: 24px;
  font-size: 0.75rem;
  margin: 0;
  padding: 0 8px;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}
</style>
