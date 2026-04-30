<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/data-documents" />
        </ion-buttons>
        <ion-title>{{ translate("Data Document") }}</ion-title>
        <ion-buttons slot="end" v-if="document">
          <ion-button @click="router.push(`/data-documents/${document.dataDocumentId}/graph`)">
            <ion-icon slot="start" :icon="gitBranchOutline" />
            {{ translate("Graph") }}
          </ion-button>
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

        <ion-segment scrollable :value="activeSection" @ionChange="activeSection = String($event.detail.value || 'fields')">
          <ion-segment-button value="fields" layout="icon-start">
            <ion-icon :icon="listOutline" />
            <ion-label>{{ translate("Fields") }} ({{ fields.length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="conditions" layout="icon-start">
            <ion-icon :icon="filterOutline" />
            <ion-label>{{ translate("Conditions") }} ({{ conditions.length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="presets" layout="icon-start">
            <ion-icon :icon="bookmarkOutline" />
            <ion-label>{{ translate("Saved Presets") }} ({{ presets.length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="usage" layout="icon-start">
            <ion-icon :icon="gitBranchOutline" />
            <ion-label>{{ translate("Usage") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="exports" layout="icon-start">
            <ion-icon :icon="cloudDownloadOutline" />
            <ion-label>{{ translate("Recent Exports") }} ({{ exportHistory.length }})</ion-label>
          </ion-segment-button>
        </ion-segment>

        <template v-if="activeSection === 'fields'">
          <ion-card v-for="group in fieldGroups" :key="group.entityPath">
            <ion-card-header>
              <ion-card-title>{{ group.entityLabel }}</ion-card-title>
              <ion-card-subtitle>{{ group.entityPath }}</ion-card-subtitle>
            </ion-card-header>
            <ion-list>
              <ion-item v-for="field in group.fields" :key="field.fieldSeqId || field.fieldPath">
                <ion-label>
                  <h2>{{ field.fieldNameAlias || field.fieldPath }}</h2>
                  <p>{{ field.fieldPath }}</p>
                  <p>{{ translate("Default display") }}: {{ field.defaultDisplay === "Y" ? translate("Yes") : translate("No") }}</p>
                  <p v-if="field.functionName">{{ translate("Function") }}: {{ field.functionName }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card>
        </template>

        <ion-list v-else-if="activeSection === 'conditions'">
          <ion-item v-for="condition in conditions" :key="condition.conditionSeqId">
            <ion-label>
              <h2>{{ getConditionExpression(condition) }}</h2>
              <p v-if="condition.conditionSeqId">{{ translate("Sequence") }}: {{ condition.conditionSeqId }}</p>
              <p v-if="getConditionValue(condition) !== ''">{{ translate("Field Value") }}: {{ getConditionValue(condition) }}</p>
              <p v-if="condition.toFieldNameAlias">{{ translate("To Field") }}: {{ condition.toFieldNameAlias }}</p>
              <p v-if="condition.postQuery">{{ translate("Post Query") }}: {{ condition.postQuery }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="!conditions.length">
            <ion-label>{{ translate("No conditions.") }}</ion-label>
          </ion-item>
        </ion-list>

        <ion-list v-else-if="activeSection === 'presets'">
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

        <ion-list v-else-if="activeSection === 'usage'">
          <ion-item-divider>
            <ion-label>{{ translate("Related feeds") }}</ion-label>
          </ion-item-divider>
          <ion-item
            v-for="feed in relatedFeeds"
            :key="feed.dataFeedId || feed.dataDocumentId"
            button
            @click="openFeed(feed)"
          >
            <ion-label>{{ feed.dataFeedId || feed.feedName || feed.dataDocumentId }}</ion-label>
          </ion-item>
          <ion-item-divider>
            <ion-label>{{ translate("Related jobs") }}</ion-label>
          </ion-item-divider>
          <ion-item v-for="job in relatedJobs" :key="job.jobName || job.jobId">
            <ion-label>{{ job.jobName || job.jobId }}</ion-label>
          </ion-item>
        </ion-list>

        <template v-else>
          <DataDocumentExportList :messages="exportHistory" :empty-message="translate('No recent exports.')" />
          <ion-list>
            <ion-item button @click="router.push('/data-document-export-history')">
              <ion-label>{{ translate("View export history") }}</ion-label>
            </ion-item>
          </ion-list>
        </template>
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
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, bookmarkOutline, cloudDownloadOutline, createOutline, filterOutline, gitBranchOutline, listOutline, playOutline } from "ionicons/icons";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { translate } from "@common";
import DataDocumentExportList from "@/components/DataDocumentExportList.vue";
import { useDataDocumentStore } from "@/store/dataDocuments";

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
const activeSection = ref("fields");

const getPathLabel = (path: string) => {
  const hashIndex = path.lastIndexOf("#");
  const normalizedPath = hashIndex > -1 ? path.slice(hashIndex + 1) : path;
  const pieces = normalizedPath.split(".");
  return pieces[pieces.length - 1] || normalizedPath || translate("Primary Entity");
};

const getFieldEntityPath = (field: any) => {
  const pathSegments = String(field.fieldPath || "").split(":");
  pathSegments.pop();
  return pathSegments.join(":") || document.value?.primaryEntityName || translate("Primary Entity");
};

const getConditionValue = (condition: any) => {
  const value = condition.fieldValue ?? condition.value ?? condition.toFieldNameAlias ?? "";
  return value === null || value === undefined ? "" : String(value);
};

const getConditionExpression = (condition: any) => {
  return [condition.fieldNameAlias, condition.operator, getConditionValue(condition)]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" ");
};

const openFeed = (feed: any) => {
  const dataFeedId = feed.dataFeedId || feed.feedName || feed;
  if (dataFeedId) router.push(`/data-document-feeds/${encodeURIComponent(dataFeedId)}`);
};

const fieldGroups = computed(() => {
  const groups = new Map<string, any[]>();
  fields.value.forEach((field: any) => {
    const entityPath = getFieldEntityPath(field);
    groups.set(entityPath, (groups.get(entityPath) || []).concat(field));
  });
  return Array.from(groups.entries()).map(([entityPath, groupFields]) => ({
    entityPath,
    entityLabel: getPathLabel(entityPath.split(":").pop() || entityPath),
    fields: groupFields
  }));
});

onIonViewWillEnter(async () => {
  await store.fetchDataDocument(route.params.id as string);
});
</script>
