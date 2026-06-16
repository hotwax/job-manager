<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/data-document-feeds" />
        </ion-buttons>
        <ion-title>{{ translate("Data Feed") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="!feed?.dataFeedId" @click="router.push('/data-document-feeds')">
            {{ translate("All Feeds") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main v-if="feed">
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ feed.feedName || feed.dataFeedId }}</ion-card-title>
            <ion-card-subtitle>{{ feed.dataFeedId }}</ion-card-subtitle>
          </ion-card-header>
          <ion-list>
            <ion-item v-if="feed.dataFeedTypeEnumId">
              <ion-icon slot="start" :icon="gitNetworkOutline" />
              <ion-label>
                <p>{{ translate("Type") }}</p>
                {{ feed.dataFeedTypeEnumId }}
              </ion-label>
            </ion-item>
            <ion-item v-if="feed.feedReceiveServiceName">
              <ion-label>
                <p>{{ translate("Receive Service") }}</p>
                {{ feed.feedReceiveServiceName }}
              </ion-label>
            </ion-item>
            <ion-item v-if="feed.feedDeleteServiceName">
              <ion-label>
                <p>{{ translate("Delete Service") }}</p>
                {{ feed.feedDeleteServiceName }}
              </ion-label>
            </ion-item>
            <ion-item v-if="feed.indexOnStartEmpty">
              <ion-label>
                <p>{{ translate("Index On Empty Start") }}</p>
                {{ feed.indexOnStartEmpty }}
              </ion-label>
            </ion-item>
            <ion-item v-if="feed.lastFeedStamp">
              <ion-label>
                <p>{{ translate("Last Feed") }}</p>
                {{ feed.lastFeedStamp }}
              </ion-label>
            </ion-item>
          </ion-list>
        </ion-card>

        <ion-segment scrollable :value="activeSection" @ionChange="activeSection = String($event.detail.value || 'documents')">
          <ion-segment-button value="documents" layout="icon-start">
            <ion-icon :icon="documentTextOutline" />
            <ion-label>{{ translate("Documents") }} ({{ documents.length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="services" layout="icon-start">
            <ion-icon :icon="optionsOutline" />
            <ion-label>{{ translate("Services") }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <ion-list v-if="activeSection === 'documents'">
          <ion-item
            v-for="document in documents"
            :key="getDocumentId(document)"
            button
            @click="openDocument(document)"
          >
            <ion-icon slot="start" :icon="documentTextOutline" />
            <ion-label>
              <h2>{{ document.documentName || getDocumentId(document) || translate("Document") }}</h2>
              <p>{{ getDocumentId(document) }}</p>
              <p v-if="document.primaryEntityName">{{ document.primaryEntityName }}</p>
              <p v-if="document.indexName">{{ translate("Index") }}: {{ document.indexName }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="!documents.length">
            <ion-label>{{ translate("No documents are attached to this feed.") }}</ion-label>
          </ion-item>
        </ion-list>

        <ion-list v-else>
          <ion-item>
            <ion-label>
              <p>{{ translate("Receive Service") }}</p>
              {{ feed.feedReceiveServiceName || translate("Not configured") }}
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>{{ translate("Delete Service") }}</p>
              {{ feed.feedDeleteServiceName || translate("Not configured") }}
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>{{ translate("Index Route") }}</p>
              /moqui/dataDocuments/feeds/{{ feed.dataFeedId }}/index
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
              <p>{{ translate("Documents Route") }}</p>
              /moqui/dataDocuments/feeds/{{ feed.dataFeedId }}/documents
            </ion-label>
          </ion-item>
        </ion-list>
      </main>

      <ion-card v-else>
        <ion-card-content>
          <ion-text color="medium">{{ translate("Data feed not found.") }}</ion-text>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
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
import { documentTextOutline, gitNetworkOutline, optionsOutline } from "ionicons/icons";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { translate } from "@common";
import { useDataDocumentStore } from "@/store/dataDocuments";

const router = useRouter();
const store = useDataDocumentStore();
const activeSection = ref("documents");

const feed = computed(() => store.getCurrentFeed);
const documents = computed(() => store.getFeedDocuments);

const getDocumentId = (document: any) => document.dataDocumentId || document.document?.dataDocumentId || document.documentId || "";

const openDocument = (document: any) => {
  const dataDocumentId = getDocumentId(document);
  if (dataDocumentId) router.push(`/data-documents/${dataDocumentId}/graph`);
};

onIonViewWillEnter(async () => {
  await store.fetchDataFeed(router.currentRoute.value.params.id as string);
});
</script>
