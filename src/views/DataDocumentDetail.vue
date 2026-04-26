<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/data-documents" />
        </ion-buttons>
        <ion-title>{{ translate("Data Document") }}</ion-title>
        <ion-buttons slot="end" v-if="document">
          <ion-button @click="router.push(`/data-documents/${document.dataDocumentId}/edit`)">
            <ion-icon slot="start" :icon="createOutline" />
            {{ translate("Edit") }}
          </ion-button>
          <ion-button @click="router.push(`/data-documents/${document.dataDocumentId}/run`)">
            <ion-icon slot="start" :icon="playOutline" />
            {{ translate("Run") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="document">
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ document.documentName || document.dataDocumentId }}</ion-card-title>
            <ion-card-subtitle>{{ document.dataDocumentId }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list>
            <ion-item>
              <ion-label>
                <p>{{ translate("Primary Entity") }}</p>
                {{ document.primaryEntityName }}
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-label>
                <p>{{ translate("Document Title") }}</p>
                {{ document.documentTitle }}
              </ion-label>
            </ion-item>
            <ion-item v-if="document.description">
              <ion-label>
                <p>{{ translate("Description") }}</p>
                {{ document.description }}
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-accordion-group>
          <ion-accordion value="fields">
            <ion-item slot="header">
              <ion-icon slot="start" :icon="listOutline" />
              <ion-label>{{ translate("Fields") }}</ion-label>
              <ion-badge slot="end">{{ fields.length }}</ion-badge>
            </ion-item>
            <ion-list slot="content">
              <ion-item v-for="field in fields" :key="field.fieldSeqId">
                <ion-label>
                  <h2>{{ field.fieldNameAlias || field.fieldPath }}</h2>
                  <p>{{ field.fieldPath }}</p>
                  <p>{{ translate("Default display") }}: {{ field.defaultDisplay === "Y" ? translate("Yes") : translate("No") }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-accordion>

          <ion-accordion value="conditions">
            <ion-item slot="header">
              <ion-icon slot="start" :icon="filterOutline" />
              <ion-label>{{ translate("Conditions") }}</ion-label>
              <ion-badge slot="end">{{ conditions.length }}</ion-badge>
            </ion-item>
            <ion-list slot="content">
              <ion-item v-for="condition in conditions" :key="condition.conditionSeqId">
                <ion-label>
                  <h2>{{ condition.fieldNameAlias }}</h2>
                  <p>{{ condition.operator }} {{ condition.value }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-accordion>

          <ion-accordion value="presets">
            <ion-item slot="header">
              <ion-icon slot="start" :icon="bookmarkOutline" />
              <ion-label>{{ translate("Saved Presets") }}</ion-label>
              <ion-badge slot="end">{{ presets.length }}</ion-badge>
            </ion-item>
            <ion-list slot="content">
              <ion-item v-for="preset in presets" :key="preset.presetId" button @click="router.push(`/data-documents/${document.dataDocumentId}/presets/${preset.presetId}`)">
                <ion-label>
                  <h2>{{ preset.presetName }}</h2>
                  <p>{{ preset.presetId }}</p>
                </ion-label>
              </ion-item>
              <ion-item button @click="router.push(`/data-documents/${document.dataDocumentId}/presets/new`)">
                <ion-icon slot="start" :icon="addOutline" />
                <ion-label>{{ translate("Create query preset") }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-accordion>

          <ion-accordion value="usage">
            <ion-item slot="header">
              <ion-icon slot="start" :icon="gitBranchOutline" />
              <ion-label>{{ translate("Usage") }}</ion-label>
            </ion-item>
            <ion-list slot="content">
              <ion-item-divider>
                <ion-label>{{ translate("Related feeds") }}</ion-label>
              </ion-item-divider>
              <ion-item v-for="feed in relatedFeeds" :key="feed.dataFeedId || feed.dataDocumentId">
                <ion-label>{{ feed.dataFeedId || feed.feedName || feed.dataDocumentId }}</ion-label>
              </ion-item>
              <ion-item-divider>
                <ion-label>{{ translate("Related jobs") }}</ion-label>
              </ion-item-divider>
              <ion-item v-for="job in relatedJobs" :key="job.jobName || job.jobId">
                <ion-label>{{ job.jobName || job.jobId }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-accordion>

          <ion-accordion value="exports">
            <ion-item slot="header">
              <ion-icon slot="start" :icon="cloudDownloadOutline" />
              <ion-label>{{ translate("Recent Exports") }}</ion-label>
              <ion-badge slot="end">{{ exportHistory.length }}</ion-badge>
            </ion-item>
            <ion-list slot="content">
              <ion-item v-for="message in exportHistory" :key="message.systemMessageId" button @click="router.push(`/system-messages/${message.systemMessageId}`)">
                <ion-label>
                  <h2>{{ message.fileName || message.systemMessageId }}</h2>
                  <p>{{ message.statusId }}</p>
                  <p>{{ getDateAndTime(message.initDate) }}</p>
                </ion-label>
              </ion-item>
              <ion-item button @click="router.push('/data-document-export-history')">
                <ion-label>{{ translate("View export history") }}</ion-label>
              </ion-item>
            </ion-list>
          </ion-accordion>
        </ion-accordion-group>
      </main>

      <ion-card v-else>
        <ion-card-content>
          <ion-text color="medium">{{ translate("Data document not found.") }}</ion-text>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, bookmarkOutline, cloudDownloadOutline, createOutline, filterOutline, gitBranchOutline, listOutline, playOutline } from "ionicons/icons";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { translate } from "@common";
import { useDataDocumentStore } from "@/store/dataDocuments";
import { getDateAndTime } from "@/utils";

const route = useRoute();
const router = useRouter();
const store = useDataDocumentStore();

const document = computed(() => store.getCurrentDocument);
const fields = computed(() => store.getFields);
const conditions = computed(() => store.getConditions);
const relatedFeeds = computed(() => store.getRelatedFeeds);
const relatedJobs = computed(() => store.getRelatedJobs);
const presets = computed(() => store.getPresets);
const exportHistory = computed(() => store.getExportHistory);

onIonViewWillEnter(async () => {
  await store.fetchDataDocument(route.params.id as string);
});
</script>
