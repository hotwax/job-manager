<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Data Documents") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/data-documents/new')">
            <ion-icon slot="start" :icon="addOutline" />
            {{ translate("Create") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ translate("Documents") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Browse saved Moqui Data Document definitions.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="queryString = $event.detail.value || ''"
              :debounce="300"
              :placeholder="translate('Search by document, entity, field, feed, or job')"
            />
            <ion-list>
              <ion-item>
                <ion-select
                  :label="translate('Primary Entity')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedEntity"
                  @ionChange="selectedEntity = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All entities") }}</ion-select-option>
                  <ion-select-option v-for="entity in primaryEntities" :key="entity" :value="entity">
                    {{ entity }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
              <ion-item>
                <ion-select
                  :label="translate('Related Feed')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedFeed"
                  @ionChange="selectedFeed = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All feeds") }}</ion-select-option>
                  <ion-select-option v-for="feed in dataFeeds" :key="feed" :value="feed">
                    {{ feed }}
                  </ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-list v-if="documents.length">
          <ion-item v-for="document in documents" :key="document.dataDocumentId" button @click="router.push(`/data-documents/${document.dataDocumentId}`)">
            <ion-icon slot="start" :icon="documentTextOutline" />
            <ion-label>
              <h2>{{ document.documentName || document.dataDocumentId }}</h2>
              <p>{{ document.dataDocumentId }}</p>
              <p>{{ document.primaryEntityName }}</p>
              <p>{{ document.documentTitle }}</p>
              <p>
                {{ translate("Fields") }}: {{ document.fieldCount || 0 }}
                {{ translate("Conditions") }}: {{ document.conditionCount || 0 }}
              </p>
              <p v-if="document.relatedFeeds?.length">{{ translate("Feeds") }}: {{ document.relatedFeeds.join(", ") }}</p>
              <p v-if="document.relatedJobs?.length">{{ translate("Jobs") }}: {{ document.relatedJobs.join(", ") }}</p>
            </ion-label>
            <ion-button fill="clear" slot="end" @click.stop="router.push(`/data-documents/${document.dataDocumentId}/run`)">
              <ion-icon slot="icon-only" :icon="playOutline" />
            </ion-button>
          </ion-item>
        </ion-list>

        <ion-card v-else>
          <ion-card-content>
            <ion-text color="medium">{{ translate("No data documents found.") }}</ion-text>
          </ion-card-content>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
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
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { addOutline, documentTextOutline, playOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { translate } from "@common";
import { useDataDocumentStore } from "@/store/dataDocuments";

const store = useDataDocumentStore();
const router = useRouter();
const queryString = ref("");
const selectedEntity = ref("");
const selectedFeed = ref("");

const documents = computed(() => store.getDataDocuments);
const primaryEntities = computed(() => store.getAvailablePrimaryEntities);
const dataFeeds = computed(() => store.getAvailableFeeds);

const loadDocuments = async () => {
  await store.fetchDataDocuments({
    queryString: queryString.value.trim(),
    primaryEntityName: selectedEntity.value,
    dataFeedId: selectedFeed.value
  });
};

watch([queryString, selectedEntity, selectedFeed], loadDocuments);

onIonViewWillEnter(loadDocuments);
</script>
