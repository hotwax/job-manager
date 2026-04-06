<template>
  <ion-page>
    <ion-header :translucent="true">
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
        <div class="header">
          <div class="title">
            <h1>{{ translate("Message Types") }}</h1>
            <p>{{ translate("Manage system message type configuration and inspect related traffic.") }}</p>
          </div>
        </div>

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
          <ion-card
            v-for="type in filteredTypes"
            :key="type.systemMessageTypeId"
            button
            @click="router.push(`/system-message-types/${type.systemMessageTypeId}`)"
          >
            <ion-card-header>
              <ion-card-title>{{ type.description || type.systemMessageTypeId }}</ion-card-title>
              <ion-note color="medium">{{ type.systemMessageTypeId }}</ion-note>
            </ion-card-header>
            <ion-card-content>
              <p v-if="type.parentTypeId"><strong>{{ translate("Parent") }}:</strong> {{ type.parentTypeId }}</p>
              <div class="counts">
                <ion-chip color="primary">{{ translate("Sent") }}: {{ getCounts(type).sent }}</ion-chip>
                <ion-chip color="danger">{{ translate("Error") }}: {{ getCounts(type).error }}</ion-chip>
                <ion-chip color="success">{{ translate("Consumed") }}: {{ getCounts(type).consumed }}</ion-chip>
              </div>
            </ion-card-content>
          </ion-card>
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
  IonChip,
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
import { useRouter } from "vue-router";

import { translate } from "@common";

import { useSystemMessageStore } from "@/store/systemMessage";

const router = useRouter();
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

const getCounts = (type: any) => store.getMessageTypeCounts(type.systemMessageTypeId);

onIonViewWillEnter(async () => {
  await store.fetchSystemMessageTypes();
  await store.fetchSystemMessages({ pageSize: 1 });
});
</script>

<style scoped>
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 16px;
}

.counts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.empty-state {
  margin-top: 32px;
  text-align: center;
  color: var(--ion-color-medium);
}
</style>
