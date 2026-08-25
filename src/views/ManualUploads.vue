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


        <ion-card>
          <ion-card-content>
            <ion-searchbar :value="queryString" @ionInput="queryString = ($event as any).detail.value || ''" :placeholder="translate('Search uploads')"></ion-searchbar>

            <div class="filter-grid">
              <div class="filter-item">
                <ion-select
                  :label="translate('Data Feed')"
                  label-placement="stacked"
                  interface="popover"
                  :placeholder="translate('All')"
                  :value="dataFeedFilter"
                  @ionChange="dataFeedFilter = $event.detail.value"
                >
                  <ion-select-option value="Y">{{ translate("Enabled") }}</ion-select-option>
                  <ion-select-option value="N">{{ translate("Disabled") }}</ion-select-option>
                </ion-select>
                <ion-button v-if="dataFeedFilter" fill="clear" class="clear-filter-btn" @click="dataFeedFilter = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

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
                <ion-badge slot="end" :color="isFeedOn(config) ? 'success' : 'medium'">
                  {{ isFeedOn(config) ? translate("Feed on") : translate("Feed off") }}
                </ion-badge>
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
import { IonSpinner, IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonSearchbar, IonLabel, IonItem, IonBadge, IonSelect, IonSelectOption, onIonViewWillEnter } from "@ionic/vue";
import { arrowForwardOutline, closeCircleOutline } from "ionicons/icons";
import router from "@/router";
import { translate } from "@common";
import { useMdmConfigStore } from "@/store/mdmConfig";

const queryString = ref("");
const dataFeedFilter = ref("");
const mdmStore = useMdmConfigStore();

// Mirrors the server-side isDataFeedEnabled() test: only an explicit "Y" counts as on, so the
// many pre-existing configs holding null read as off rather than as unknown.
const isFeedOn = (config: any) => config.enableDataFeed === "Y";

const configs = computed(() => mdmStore.getConfigs);
const isLoading = computed(() => mdmStore.getFetchStatus.configs === "pending");

const matchesFeedFilter = (config: any) => !dataFeedFilter.value ||
  (dataFeedFilter.value === "Y") === isFeedOn(config);

const importConfigs = computed(() => {
  const q = queryString.value.trim().toLowerCase();
  const matchesQuery = (config: any) => !q ||
    config.configId.toLowerCase().includes(q) ||
    config.scriptTitle?.toLowerCase().includes(q) ||
    config.description?.toLowerCase().includes(q);

  return configs.value.filter((config: any) => matchesFeedFilter(config) && matchesQuery(config));
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


.imports {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--spacer-xs);
  align-items: start;
}
</style>
