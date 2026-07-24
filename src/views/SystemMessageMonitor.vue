<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Message history") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="handleQueryInput"
              :debounce="300"
              :placeholder="translate('Search by message or parent type')"
            />

            <div class="filter-grid">
              <div class="filter-item">
                <ion-select
                  :label="translate('Status')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedStatusId"
                  @ionChange="selectedStatusId = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                  <ion-select-option
                    v-for="status in statuses"
                    :key="status.statusId"
                    :value="status.statusId"
                  >
                    {{ status.description }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedStatusId" fill="clear" class="clear-filter-btn" @click="selectedStatusId = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-select
                  :label="translate('Parent Type')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedParentTypeId"
                  @ionChange="handleParentTypeChange($event)"
                >
                  <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                  <ion-select-option
                    v-for="parent in parentTypes"
                    :key="parent.id"
                    :value="parent.id"
                  >
                    {{ parent.description }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedParentTypeId" fill="clear" class="clear-filter-btn" @click="selectedParentTypeId = ''; selectedTypeId = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-select
                  :label="translate('Message Type')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedTypeId"
                  @ionChange="selectedTypeId = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                  <ion-select-option
                    v-for="type in filteredTypes"
                    :key="type.systemMessageTypeId"
                    :value="type.systemMessageTypeId"
                  >
                    {{ type.description || type.systemMessageTypeId }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedTypeId" fill="clear" class="clear-filter-btn" @click="selectedTypeId = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-select
                  :label="translate('Remote System')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedRemoteId"
                  @ionChange="selectedRemoteId = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                  <ion-select-option
                    v-for="remote in remotes"
                    :key="remote.systemMessageRemoteId"
                    :value="remote.systemMessageRemoteId"
                  >
                    {{ remote.description || remote.systemMessageRemoteId }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedRemoteId" fill="clear" class="clear-filter-btn" @click="selectedRemoteId = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <div class="pagination">
          <ion-button fill="outline" :disabled="pageIndex === 0 || isLoading" @click="goToPreviousPage">
            {{ translate("Previous") }}
          </ion-button>
          <ion-note color="medium">{{ translate("Page") }} {{ pageIndex + 1 }} / {{ pageCount }}</ion-note>
          <ion-button fill="outline" :disabled="pageIndex >= pageCount - 1 || isLoading" @click="goToNextPage">
            {{ translate("Next") }}
          </ion-button>
        </div>
        <SystemMessageList
          :messages="messages"
          :is-loading="isLoading"
          :empty-message="translate('No system messages found for the selected filters.')"
        />
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { closeCircleOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { translate } from "@common";
import SystemMessageList from "@/components/SystemMessageList.vue";
import { useSystemMessageStore } from "@/store/systemMessage";
import { useUtilStore } from "@/store/util";
import router from "@/router";

const PAGE_SIZE = 25;

const route = useRoute();
const store = useSystemMessageStore();
const utilStore = useUtilStore();

const queryString = ref("");
const selectedStatusId = ref("");
const selectedTypeId = ref("");
const selectedParentTypeId = ref("");
const selectedRemoteId = ref("");
const selectedIsOutgoing = ref("");
const pageIndex = ref(0);
const isInitialLoading = ref(true);

const messages = computed(() => store.getSystemMessages);

const total = computed(() => store.getSystemMessageTotal);
const types = computed(() => store.getSystemMessageTypes);
const parentTypes = computed(() => store.getSystemMessageParentTypes);
const remotes = computed(() => store.getSystemMessageRemotes);
const statuses = computed(() => utilStore.getStatusItemsByType("SystemMessage"));
const pageCount = computed(() => Math.max(Math.ceil(total.value / PAGE_SIZE), 1));
const isLoading = computed(() => isInitialLoading.value || store.isFetchingMessages);

const filteredTypes = computed(() => {
  if (!selectedParentTypeId.value) return types.value;
  return types.value.filter((type: any) => type.parentTypeId === selectedParentTypeId.value);
});

const loadMessages = async () => {
  const payload = {
    pageIndex: pageIndex.value,
    pageSize: PAGE_SIZE,
  } as Record<string, any>;

  if(queryString.value.trim()) {
    payload["queryString"] = queryString.value.trim()
  }

  if(selectedStatusId.value) {
    payload["statusId"] = selectedStatusId.value
  }

  if(selectedTypeId.value) {
    payload["systemMessageTypeId"] = selectedTypeId.value
  }

  if(selectedParentTypeId.value) {
    payload["parentTypeId"] = selectedParentTypeId.value
  }

  if(selectedRemoteId.value) {
    payload["systemMessageRemoteId"] = selectedRemoteId.value
  }

  if(selectedIsOutgoing.value) {
    payload["isOutgoing"] = selectedIsOutgoing.value
  }

  await store.fetchSystemMessages(payload);
};

const resetToFirstPage = () => {
  pageIndex.value = 0;
};

const handleQueryInput = (event: CustomEvent) => {
  queryString.value = event.detail.value || "";
};

const handleParentTypeChange = (event: CustomEvent) => {
  selectedParentTypeId.value = event.detail.value;
  selectedTypeId.value = "";
};

const goToPreviousPage = () => {
  pageIndex.value -= 1;
};

const goToNextPage = () => {
  pageIndex.value += 1;
};

watch([queryString, selectedStatusId, selectedTypeId, selectedParentTypeId, selectedRemoteId, selectedIsOutgoing], async () => {
  resetToFirstPage();
  await loadMessages();
});

watch(pageIndex, () => {
  loadMessages();
});

onIonViewWillEnter(async () => {
  isInitialLoading.value = true;
  if (route.query?.statusId) {
    selectedStatusId.value = route.query.statusId as string;
  } else {
    selectedStatusId.value = "";
  }
  try {
    await Promise.all([
      store.fetchSystemMessageTypes(),
      store.fetchSystemMessageRemotes(),
      store.fetchSystemMessageStatusMetadata()
    ]);
    await loadMessages();
  } finally {
    isInitialLoading.value = false;
  }
});
</script>

<style scoped>

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
</style>
