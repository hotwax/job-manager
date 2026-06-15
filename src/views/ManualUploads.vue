<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Manual Uploads") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="header-section">
          <h1>{{ translate("Manual Uploads") }}</h1>
          <p>{{ translate("Ingest CSV or JSON files manually for processing.") }}</p>
        </div>

        <ion-searchbar :value="queryString" @ionInput="queryString = ($event as any).detail.value || ''" :placeholder="translate('Search uploads')"></ion-searchbar>

        <div class="empty-state" v-if="isLoading">
          <ion-item lines="none">
            <ion-spinner color="secondary" name="crescent" slot="start" />
            {{ translate("Fetching configs") }}
          </ion-item>
        </div>
        <div class="imports" v-else-if="importConfigs.length">
          <ion-card v-for="config in importConfigs" :key="config.configId">
            <ion-card-content>
              <ion-item lines="none">
                <ion-label>
                  <p class="overline">{{ config.configId }}</p>
                  {{ config.scriptTitle }}
                  <p>{{ config.description }}</p>
                </ion-label>
              </ion-item>
              
              <ion-item lines="none">
                <ion-button slot="end" fill="clear" @click="startImport(config.configId)">
                  {{ translate("Start Import") }}
                  <ion-icon slot="end" :icon="arrowForwardOutline" />
                </ion-button>
              </ion-item>
            </ion-card-content>
          </ion-card>
        </div>
        <p class="empty-state" v-else>
          {{ translate("No configs found") }}
        </p>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { IonSpinner, IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonSearchbar, IonLabel, IonItem, onIonViewWillEnter } from "@ionic/vue";
import { arrowForwardOutline } from "ionicons/icons";
import router from "@/router";
import { translate } from "@common";
import { useMdmConfigStore } from "@/store/mdmConfig";

const queryString = ref("");
const mdmStore = useMdmConfigStore();

const configs = computed(() => mdmStore.getConfigs);
const isLoading = computed(() => mdmStore.getFetchStatus.configs === "pending");

const importConfigs = computed(() => {
  const q = queryString.value.trim().toLowerCase();
  if (!q) return configs.value;
  return configs.value.filter((config: any) =>
    config.configId.toLowerCase().includes(q) ||
    config.scriptTitle?.toLowerCase().includes(q) ||
    config.description?.toLowerCase().includes(q)
  );
});

onIonViewWillEnter(async () => {
  if (!mdmStore.getConfigs.length) {
    await mdmStore.fetchConfigs();
  }
});

const startImport = (typeId: string) => {
  router.push({ name: "ImportDetail", params: { type: typeId }});
};
</script>

<style scoped>
.header-section {
  padding: var(--spacer-sm) var(--spacer-xs);
  margin-bottom: var(--spacer-sm);
}

.imports {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--spacer-xs);
  align-items: start;
}
</style>
