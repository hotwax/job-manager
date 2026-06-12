<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Data Document Export History") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Export History") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Review Data Document export System Messages.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list>
            <ion-item>
              <ion-select
                :label="translate('Document')"
                label-placement="stacked"
                interface="popover"
                :value="selectedDocumentId"
                @ionChange="selectedDocumentId = $event.detail.value"
              >
                <ion-select-option value="">{{ translate("All documents") }}</ion-select-option>
                <ion-select-option v-for="document in documents" :key="document.dataDocumentId" :value="document.dataDocumentId">
                  {{ document.documentName || document.dataDocumentId }}
                </ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-select
                :label="translate('Status')"
                label-placement="stacked"
                interface="popover"
                :value="selectedStatusId"
                @ionChange="selectedStatusId = $event.detail.value"
              >
                <ion-select-option value="">{{ translate("All statuses") }}</ion-select-option>
                <ion-select-option value="SmsgProduced">{{ translate("Produced") }}</ion-select-option>
                <ion-select-option value="SmsgSending">{{ translate("Sending") }}</ion-select-option>
                <ion-select-option value="SmsgSent">{{ translate("Sent") }}</ion-select-option>
                <ion-select-option value="SmsgError">{{ translate("Error") }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item>
              <ion-input v-model="startedBy" :label="translate('Started By')" label-placement="stacked" />
            </ion-item>
            <ion-item>
              <ion-input v-model="fromDate" type="date" :label="translate('From Date')" label-placement="stacked" />
            </ion-item>
            <ion-item>
              <ion-input v-model="thruDate" type="date" :label="translate('Thru Date')" label-placement="stacked" />
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-list v-if="messages.length">
          <ion-item v-for="message in messages" :key="message.systemMessageId" button @click="router.push(`/system-messages/${message.systemMessageId}`)">
            <ion-icon slot="start" :icon="cloudDownloadOutline" />
            <ion-label>
              <h2>{{ message.fileName || message.systemMessageId }}</h2>
              <p>{{ translate("System Message") }}: {{ message.systemMessageId }}</p>
              <p>{{ translate("Document") }}: {{ message.dataDocumentId }}</p>
              <p v-if="message.presetName">{{ translate("Preset") }}: {{ message.presetName }}</p>
              <p>{{ translate("Started By") }}: {{ message.startedBy }}</p>
              <p>{{ translate("Init Date") }}: {{ getDateAndTime(message.initDate) }}</p>
              <p v-if="message.processedDate">{{ translate("Processed Date") }}: {{ getDateAndTime(message.processedDate) }}</p>
              <p>{{ translate("Status") }}: {{ message.statusId }}</p>
              <p v-if="message.recordCount !== undefined">{{ translate("Records") }}: {{ message.recordCount }}</p>
              <p v-if="message.errorSummary">{{ translate("Error") }}: {{ message.errorSummary }}</p>
            </ion-label>
            <ion-button
              v-if="message.statusId === 'SmsgSent' && message.messageText"
              fill="clear"
              slot="end"
              @click.stop="downloadDataDocumentExport(message)"
            >
              <ion-icon slot="icon-only" :icon="downloadOutline" />
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-card v-else>
          <ion-card-content>
            <ion-text color="medium">{{ translate("No data document exports found.") }}</ion-text>
          </ion-card-content>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { cloudDownloadOutline, downloadOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { translate } from "@common";
import { downloadDataDocumentExport, getDateAndTime } from "@/utils";
import { useDataDocumentStore } from "@/store/dataDocuments";

const store = useDataDocumentStore();
const router = useRouter();
const selectedDocumentId = ref("");
const selectedStatusId = ref("");
const startedBy = ref("");
const fromDate = ref("");
const thruDate = ref("");

const documents = computed(() => store.getDataDocuments);
const messages = computed(() => store.getExportHistory);

const loadHistory = async () => {
  await store.fetchExportHistory({
    dataDocumentId: selectedDocumentId.value,
    statusId: selectedStatusId.value,
    startedBy: startedBy.value.trim(),
    fromDate: fromDate.value,
    thruDate: thruDate.value
  });
};

watch([selectedDocumentId, selectedStatusId, startedBy, fromDate, thruDate], loadHistory);

onIonViewWillEnter(async () => {
  await store.fetchDataDocuments();
  await loadHistory();
});
</script>
