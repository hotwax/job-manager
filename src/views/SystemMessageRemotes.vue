<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Remote Systems") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/system-message-remotes/new')">
            {{ translate("Create") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header">
          <div class="title">
            <h1>{{ translate("Remote Systems") }}</h1>
            <p>{{ translate("Manage remote endpoints, credentials, and related message traffic.") }}</p>
          </div>
        </div>

        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="queryString = $event.detail.value || ''"
              :debounce="300"
              :placeholder="translate('Search by remote ID or description')"
            />
          </ion-card-content>
        </ion-card>

        <div class="catalog-grid">
          <div v-for="remote in filteredRemotes" :key="remote.systemMessageRemoteId">
            <ion-card
              button
              @click="router.push(`/system-message-remotes/${remote.systemMessageRemoteId}`)"
            >
              <ion-card-header>
                <ion-card-title>{{ remote.description || remote.systemMessageRemoteId }}</ion-card-title>
                <ion-note color="medium">{{ remote.systemMessageRemoteId }}</ion-note>
              </ion-card-header>
              <ion-card-content>
                <p v-if="remote.sendUrl">
                  <strong>{{ translate("Send URL") }}: </strong>
                  {{ remote.sendUrl }}
                </p>
              </ion-card-content>
            </ion-card>
          </div>
        </div>

        <div v-if="!filteredRemotes.length" class="empty-state">
          <p>{{ translate("No remote systems found.") }}</p>
        </div>
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
  IonCardTitle,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { computed, ref } from "vue";
import router from "../router";

import { translate } from "@common";

import { useSystemMessageStore } from "@/store/systemMessage";

const systemMessageStore = useSystemMessageStore();
const queryString = ref("");

const remotes = computed(() => systemMessageStore.getSystemMessageRemotes);
const filteredRemotes = computed(() => {
  const query = queryString.value.trim().toLowerCase();
  if (!query) return remotes.value;

  return remotes.value.filter((remote: any) =>
    remote.systemMessageRemoteId?.toLowerCase().includes(query) ||
    remote.description?.toLowerCase().includes(query)
  );
});

onIonViewWillEnter(async () => {
  await systemMessageStore.fetchSystemMessageRemotes();
  await systemMessageStore.fetchSystemMessages({ pageSize: 1 });
});
</script>

<style scoped>
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 16px;
}

.empty-state {
  margin-top: 32px;
  text-align: center;
  color: var(--ion-color-medium);
}
</style>
