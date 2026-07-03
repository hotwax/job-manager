<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Data Documents") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>


        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="queryString = $event.detail.value || ''"
              :debounce="300"
              :placeholder="translate('Search by feed, document, type, or index')"
            />
          </ion-card-content>
        </ion-card>

        <div v-if="filteredFeeds.length" class="catalog-grid">
          <div v-for="feed in filteredFeeds" :key="feed.dataFeedId">
            <ion-card>
              <ion-item lines="none" button @click="openFeed(feed)">
                <ion-icon slot="start" :icon="gitNetworkOutline" />
                <ion-label>
                  {{ feed.feedName || feed.dataFeedId }}
                  <p>{{ feed.dataFeedId }}</p>
                  <p v-if="feed.dataFeedTypeEnumId">{{ feed.dataFeedTypeEnumId }}</p>
                </ion-label>
              </ion-item>
              <ion-list>
                <ion-item lines="none">
                  <ion-label>
                    <p class="overline">{{ translate("Documents") }}</p>
                    {{ feed.documents.length }}
                  </ion-label>
                </ion-item>
                <ion-item v-if="feed.lastFeedStamp" lines="none">
                  <ion-label>
                    <p class="overline">{{ translate("Last Feed") }}</p>
                    {{ feed.lastFeedStamp }}
                  </ion-label>
                </ion-item>
              </ion-list>
              <ion-card-content>
                <ion-list>
                  <ion-item
                    v-for="document in feed.documents"
                    :key="document.dataDocumentId"
                    button
                    lines="none"
                    @click="router.push(`/data-documents/${document.dataDocumentId}/graph`)"
                  >
                    <ion-icon slot="start" :icon="documentTextOutline" />
                    <ion-label>
                      {{ document.documentName || document.dataDocumentId }}
                      <p>{{ document.dataDocumentId }}</p>
                      <p>{{ document.primaryEntityName }}</p>
                    </ion-label>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </div>
        </div>

        <ion-card v-else>
          <ion-card-content>
            <ion-text color="medium">{{ translate("No data feeds found.") }}</ion-text>
          </ion-card-content>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
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
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { documentTextOutline, gitNetworkOutline } from "ionicons/icons";
import { computed, onMounted, ref } from "vue";
import router from "@/router";
import { translate } from "@common";
import { useDataDocumentStore } from "@/store/dataDocuments";

const store = useDataDocumentStore();

const queryString = ref("");

const feeds = computed(() => store.getDataFeeds);
const filteredFeeds = computed(() => {
  const query = queryString.value.trim().toLowerCase();
  if (!query) return feeds.value;
  return feeds.value.filter((feed: any) => {
    return [feed.dataFeedId, feed.feedName, feed.dataFeedTypeEnumId]
      .some((value) => String(value || "").toLowerCase().includes(query)) ||
      feed.documents.some((document: any) => [
        document.dataDocumentId,
        document.documentName,
        document.documentTitle,
        document.primaryEntityName,
        document.indexName
      ].some((value) => String(value || "").toLowerCase().includes(query)));
  });
});

const loadFeeds = async () => {
  await store.fetchDataFeeds();
};

const openFeed = (feed: any) => {
  if (feed.dataFeedId) router.push(`/data-document-feeds/${encodeURIComponent(feed.dataFeedId)}`);
};

onMounted(loadFeeds);
onIonViewWillEnter(loadFeeds);
</script>
