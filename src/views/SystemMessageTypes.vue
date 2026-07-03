<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Message Types") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="router.push('/system-message-types/new')">
            {{ translate("Create") }}
          </ion-button>
        </ion-buttons>
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
              :placeholder="translate('Search by type ID or description')"
            />
          </ion-card-content>
        </ion-card>

        <div class="catalog-grid">
          <div v-for="type in filteredTypes" :key="type.systemMessageTypeId">
            <ion-card
              button
              @click="router.push(`/system-message-types/${type.systemMessageTypeId}`)"
            >
              <ion-card-header>
                <ion-card-title>{{ type.description || type.systemMessageTypeId }}</ion-card-title>
                <ion-note color="medium">{{ type.systemMessageTypeId }}</ion-note>
              </ion-card-header>
              <ion-card-content>
                <p v-if="type.parentTypeId"><strong>{{ translate("Parent") }}: </strong>{{ type.parentTypeId }}</p>
              </ion-card-content>
            </ion-card>
          </div>
        </div>

        <div v-if="!filteredTypes.length" class="empty-state">
          <p>{{ translate("No message types found.") }}</p>
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

const store = useSystemMessageStore();
const queryString = ref("");

const types = computed(() => store.getSystemMessageTypes);
const filteredTypes = computed(() => {
  const query = queryString.value.trim().toLowerCase();
  if (!query) return types.value;

  return types.value.filter((type: any) =>
    type.systemMessageTypeId?.toLowerCase().includes(query) ||
    type.description?.toLowerCase().includes(query)
  );
});

onIonViewWillEnter(async () => {
  await store.fetchSystemMessageTypes();
});
</script>

<style scoped>

.empty-state {
  margin-top: 32px;
  text-align: center;
  color: var(--ion-color-medium);
}
</style>
