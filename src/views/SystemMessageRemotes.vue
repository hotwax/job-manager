<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Remote Systems") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="hasPermission('COMMON_ADMIN')" @click="router.push('/system-message-remotes/new')">
            {{ translate("Create") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-searchbar
          :value="queryString"
          @ionInput="queryString = $event.detail.value || ''"
          :debounce="300"
          :placeholder="translate('Search by remote ID or description')"
        />

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
import { useUserStore } from "@/store/user";

const systemMessageStore = useSystemMessageStore();
const userStore = useUserStore();
const hasPermission = computed(() => (permissionId: string) => userStore.hasPermission(permissionId));
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

.empty-state {
  margin-top: 32px;
  text-align: center;
  color: var(--ion-color-medium);
}
</style>
