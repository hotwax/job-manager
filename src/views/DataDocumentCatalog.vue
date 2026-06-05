<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Data Documents") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/data-documents/new/graph')">
            <ion-icon slot="start" :icon="gitBranchOutline" />
            {{ translate("Graph") }}
          </ion-button>
          <ion-button @click="router.push('/data-documents/new')">
            <ion-icon slot="start" :icon="addOutline" />
            {{ translate("Create") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>{{ translate("Documents") }}</h1>
            <p>{{ translate("Browse saved Moqui Data Document definitions.") }}</p>
          </div>
        </div>

        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="queryString = $event.detail.value || ''"
              :debounce="300"
              :placeholder="translate('Search by document name, document id or feed id')"
            />

            <div class="filter-grid">
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
            </div>
          </ion-card-content>
        </ion-card>

        <div v-if="documents.length" class="catalog-grid">
          <div v-for="document in documents" :key="document.dataDocumentId">
            <ion-card>
              <ion-item lines="none" detail button @click="router.push(`/data-documents/${document.dataDocumentId}`)">
                <ion-icon slot="start" :icon="documentTextOutline" />
                <ion-label>
                  <h2>{{ document.documentName || document.dataDocumentId }}</h2>
                  <p>{{ document.dataDocumentId }}</p>
                  <p>{{ document.primaryEntityName }}</p>
                </ion-label>
              </ion-item>
              <ion-list>
                <ion-item v-if="document.documentTitle" lines="none">
                  <ion-label>
                    <p class="overline">{{ translate("Title") }}</p>
                    {{ document.documentTitle }}
                  </ion-label>
                </ion-item>
                <ion-item v-if="document.relatedFeeds?.length" lines="none">
                  <ion-label>
                    <p class="overline">{{ translate("Feeds") }}</p>
                    {{ document.relatedFeeds.join(", ") }}
                  </ion-label>
                </ion-item>
                <ion-item v-if="document.relatedJobs?.length" lines="none">
                  <ion-label>
                    <p class="overline">{{ translate("Jobs") }}</p>
                    {{ document.relatedJobs.join(", ") }}
                  </ion-label>
                </ion-item>
              </ion-list>
              <ion-card-content>
                <ion-button fill="clear" @click="router.push(`/data-documents/${document.dataDocumentId}/run`)">
                  <ion-icon slot="start" :icon="playOutline" />
                  {{ translate("Run") }}
                </ion-button>
                <ion-button fill="clear" @click="router.push(`/data-documents/${document.dataDocumentId}/graph`)">
                  <ion-icon slot="start" :icon="gitBranchOutline" />
                  {{ translate("Graph") }}
                </ion-button>
              </ion-card-content>
            </ion-card>
          </div>
        </div>

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
import { addOutline, documentTextOutline, gitBranchOutline, playOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import router from "../router"

import { translate } from "@common";
import { useDataDocumentStore } from "@/store/dataDocuments";

const dataDocumentStore = useDataDocumentStore();
const queryString = ref("");
const selectedEntity = ref("");
const selectedFeed = ref("");

const documents = computed(() => dataDocumentStore.getDataDocuments);
const primaryEntities = computed(() => dataDocumentStore.getAvailablePrimaryEntities);
const dataFeeds = computed(() => dataDocumentStore.getAvailableFeeds);

const loadDocuments = async () => {
  await dataDocumentStore.fetchDataDocuments({
    queryString: queryString.value.trim(),
    primaryEntityName: selectedEntity.value,
    dataFeedId: selectedFeed.value,
    pageSize: 500,
    pageIndex: 0
  });
};

watch([queryString, selectedEntity, selectedFeed], loadDocuments);

onIonViewWillEnter(loadDocuments);
</script>
