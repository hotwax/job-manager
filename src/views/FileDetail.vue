<template>
  <ion-page>
    <ion-header :translucent="true">
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
                <h1><ion-icon :icon="documentOutline" /> {{ fileName }}</h1>
                <p>
                  <ion-icon :icon="briefcaseOutline" /> {{ importType }} 
                  <span class="separator">|</span> 
                  <ion-icon :icon="timeOutline" /> {{ uploadTime }}
                </p>
              </div>
              <div class="score-card">
                <div class="badge success">
                  <span class="count">{{ successCount }}</span>
                  <span class="label">{{ translate("SUCCESS") }}</span>
                </div>
                <div class="badge failed">
                  <span class="count">{{ failedCount }}</span>
                  <span class="label">{{ translate("FAILED") }}</span>
                </div>
              </div>
            </div>
          </ion-card-header>

          <ion-card-content>
            <div class="actions">
              <ion-item lines="none">
                <ion-icon :icon="warningOutline" slot="start" color="warning" />
                <ion-label>
                  <p>{{ translate("Download bad rows, fix, and re-upload.") }}</p>
                </ion-label>
              </ion-item>
              <div class="buttons">
                <ion-button fill="outline" color="dark">
                  <ion-icon slot="start" :icon="downloadOutline" />
                  {{ translate("Download Failed Rows") }}
                </ion-button>
                <ion-button color="primary">
                  <ion-icon slot="start" :icon="refreshOutline" />
                  {{ translate("Retry File") }}
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Bottom Section: Error Log -->
        <ion-card>
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
            <div class="list-item error-log" v-for="(error, index) in errorLogs" :key="index">
              <ion-label>Row {{ error.row }}</ion-label>
              <ion-label>{{ error.recordId }}</ion-label>
              <ion-label>{{ error.description }}</ion-label>
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
  IonBadge,
  IonCardTitle,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/vue';
import { translate } from '@hotwax/dxp-components';
import { 
  documentOutline, 
  briefcaseOutline, 
  timeOutline, 
  warningOutline, 
  downloadOutline, 
  refreshOutline,
  bugOutline
} from 'ionicons/icons';
import { ref } from 'vue';

// Mock Data
const fileName = ref("IMP_ORD_NS_20231024_001.csv");
const importType = ref("Import Sales Orders (NS)");
const uploadTime = ref("Oct 27, 10:42 AM");
const successCount = ref(142);
const failedCount = ref(8);

const errorLogs = ref([
  {
    row: 14,
    recordId: "ORD-10294",
    errorCode: "MISSING_SKU",
    description: "Product SKU \"TSHIRT-BLK-L\" not found in HotWax."
  }
]);
</script>

<style scoped>


.file-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
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
