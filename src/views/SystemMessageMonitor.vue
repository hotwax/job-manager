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
                <ion-item id="message-type-filter-trigger" button detail class="filter-modal-trigger">
                  <ion-label>
                    <p>{{ translate("Message Type") }}</p>
                    {{ selectedTypeLabel }}
                  </ion-label>
                </ion-item>
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

              <div class="filter-item">
                <ion-select
                  :label="translate('Direction')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedIsOutgoing"
                  @ionChange="selectedIsOutgoing = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                  <ion-select-option value="N">{{ translate("Inbound") }}</ion-select-option>
                  <ion-select-option value="Y">{{ translate("Outbound") }}</ion-select-option>
                </ion-select>
                <ion-button v-if="selectedIsOutgoing" fill="clear" class="clear-filter-btn" @click="selectedIsOutgoing = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-modal trigger="message-type-filter-trigger" @willPresent="initializeMessageTypeModal" @didDismiss="clearMessageTypeModal">
          <ion-header>
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button @click="closeMessageTypeModal" :title="translate('Close')">
                  <ion-icon slot="icon-only" :icon="closeOutline" />
                </ion-button>
              </ion-buttons>
              <ion-title>{{ translate("Select Message Type") }}</ion-title>
            </ion-toolbar>
            <ion-toolbar>
              <ion-searchbar
                :value="messageTypeQuery"
                @ionInput="messageTypeQuery = ($event as any).detail.value || ''"
                :debounce="200"
                :placeholder="translate('Search by type ID or description')"
              />
            </ion-toolbar>
          </ion-header>

          <ion-content>
            <ion-list>
              <ion-radio-group v-model="messageTypeModalSelection">
                <ion-item>
                  <ion-radio label-placement="end" justify="start" value="">
                    <ion-label>{{ translate("All") }}</ion-label>
                  </ion-radio>
                </ion-item>
                <ion-item v-for="type in filteredMessageTypes" :key="type.systemMessageTypeId">
                  <ion-radio label-placement="end" justify="start" :value="type.systemMessageTypeId">
                    <ion-label>
                      {{ type.description || type.systemMessageTypeId }}
                      <p v-if="type.description">{{ type.systemMessageTypeId }}</p>
                    </ion-label>
                  </ion-radio>
                </ion-item>
              </ion-radio-group>
            </ion-list>
            <p v-if="!filteredMessageTypes.length" class="empty-state">{{ translate("No message types found.") }}</p>

            <ion-fab vertical="bottom" horizontal="end" slot="fixed">
              <ion-fab-button @click="saveMessageTypeFilter">
                <ion-icon :icon="checkmarkOutline" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-modal>

        <div class="pagination">
          <ion-button fill="outline" :disabled="pageIndex === 0 || isLoading" @click="goToPreviousPage">
            {{ translate("Previous") }}
          </ion-button>
          <div class="page-input">
            <span>{{ translate("Page") }}</span>
            <input
              type="number"
              min="1"
              :max="pageCount"
              :value="pageIndex + 1"
              @keyup="validatePageInput($event)"
              @change="goToPage($event)"
              class="page-number-input"
            />
            <span>/ {{ pageCount }}</span>
          </div>
          <ion-button fill="outline" :disabled="pageIndex >= pageCount - 1" @click="goToNextPage">
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
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonModal,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  modalController,
  onIonViewWillEnter
} from "@ionic/vue";
import { checkmarkOutline, closeCircleOutline, closeOutline } from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { translate } from "@common";
import SystemMessageList from "@/components/SystemMessageList.vue";
import { useSystemMessageStore } from "@/store/systemMessage";
import { useUtilStore } from "@/store/util";
import router from "@/router";

const PAGE_SIZE = 25;

const store = useSystemMessageStore();
const utilStore = useUtilStore();
const route = router.currentRoute.value;

const queryString = ref("");
const selectedStatusId = ref("");
const selectedTypeId = ref("");
const selectedParentTypeId = ref("");
const selectedRemoteId = ref("");
const selectedIsOutgoing = ref("");
const pageIndex = ref(0);
const isInitialLoading = ref(true);
const messageTypeQuery = ref("");
const messageTypeModalSelection = ref("");

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

const selectedTypeLabel = computed(() => {
  if (!selectedTypeId.value) return translate("All");
  const selectedType = types.value.find((type: any) => type.systemMessageTypeId === selectedTypeId.value);
  return selectedType?.description || selectedType?.systemMessageTypeId || selectedTypeId.value;
});

const filteredMessageTypes = computed(() => {
  const query = messageTypeQuery.value.trim().toLowerCase();
  if (!query) return filteredTypes.value;

  return filteredTypes.value.filter((type: any) => {
    const description = (type.description || "").toLowerCase();
    const id = (type.systemMessageTypeId || "").toLowerCase();
    return description.includes(query) || id.includes(query);
  });
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

const initializeMessageTypeModal = () => {
  messageTypeQuery.value = "";
  messageTypeModalSelection.value = selectedTypeId.value;
};

const clearMessageTypeModal = () => {
  messageTypeQuery.value = "";
  messageTypeModalSelection.value = "";
};

const closeMessageTypeModal = () => {
  modalController.dismiss();
};

const saveMessageTypeFilter = () => {
  selectedTypeId.value = messageTypeModalSelection.value;
  closeMessageTypeModal();
};

const goToPreviousPage = () => {
  pageIndex.value -= 1;
};

const goToNextPage = () => {
  pageIndex.value += 1;
};

const validatePageInput = (event: any) => {
  const value = parseInt(event.target.value);
  if (value > pageCount.value) {
    event.target.value = pageCount.value;
  }
};

const goToPage = (event: any) => {
  const newPage = parseInt(event.target.value);
  if (newPage && newPage > 0 && newPage <= pageCount.value) {
    pageIndex.value = newPage - 1;
  } else {
    event.target.value = pageIndex.value + 1;
  }
};

watch([queryString, selectedStatusId, selectedTypeId, selectedParentTypeId, selectedRemoteId, selectedIsOutgoing], async () => {
  resetToFirstPage();
  await loadMessages();
});

watch(pageIndex, () => {
  if (!selectedIsOutgoing.value) {
    loadMessages();
  }
});

onIonViewWillEnter(async () => {
  isInitialLoading.value = true;
  await Promise.all([
    store.fetchSystemMessageTypes(),
    store.fetchSystemMessageRemotes(),
    store.fetchSystemMessageStatusMetadata()
  ]);

  const currentQuery = router.currentRoute.value.query;
  selectedStatusId.value = (currentQuery?.statusId as string) ?? "";
  selectedIsOutgoing.value = (currentQuery?.isOutgoing as string) ?? "";

  await loadMessages();
  isInitialLoading.value = false;
});
</script>

<style scoped>

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacer-lg, 16px);
}

.filter-item {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-item ion-select {
  flex: 1;
}

.filter-modal-trigger {
  flex: 1;
  min-width: 0;
  --padding-start: 0;
  --inner-padding-end: 0;
}

.filter-modal-trigger ion-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-filter-btn {
  --padding-start: 6px;
  --padding-end: 6px;
  flex-shrink: 0;
  margin-inline-start: 4px;
  height: 36px;
  width: 36px;
}

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

.page-input {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm, 8px);
}

.page-number-input {
  width: 50px;
  text-align: center;
  border: 1px solid var(--ion-color-medium);
  border-radius: 4px;
  padding: 4px;
}

.page-number-input::-webkit-outer-spin-button,
.page-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.page-number-input[type=number] {
  -moz-appearance: textfield;
}
</style>
