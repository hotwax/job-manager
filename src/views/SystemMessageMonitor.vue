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

        <div class="pagination">
          <ion-button fill="outline" :disabled="pageIndex === 0" @click="goToPreviousPage">
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
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { translate } from "@common";
import { closeCircleOutline } from "ionicons/icons";
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

// When direction filter is active, all fetched records are filtered client-side
const filteredMessages = computed(() => {
  const all = store.getSystemMessages;
  if (!selectedIsOutgoing.value) return all;
  return all.filter((msg: any) => msg.isOutgoing === selectedIsOutgoing.value);
});

// Paginated slice of filteredMessages
const messages = computed(() => {
  if (!selectedIsOutgoing.value) return filteredMessages.value; // server already paginates
  const start = pageIndex.value * PAGE_SIZE;
  return filteredMessages.value.slice(start, start + PAGE_SIZE);
});

const total = computed(() => store.getSystemMessageTotal);
const types = computed(() => store.getSystemMessageTypes);
const parentTypes = computed(() => store.getSystemMessageParentTypes);
const remotes = computed(() => store.getSystemMessageRemotes);
const statuses = computed(() => utilStore.getStatusItemsByType("SystemMessage"));
const pageCount = computed(() => {
  if (selectedIsOutgoing.value) {
    return Math.max(Math.ceil(filteredMessages.value.length / PAGE_SIZE), 1);
  }
  return Math.max(Math.ceil(total.value / PAGE_SIZE), 1);
});

const filteredTypes = computed(() => {
  if (!selectedParentTypeId.value) return types.value;
  return types.value.filter((type: any) => type.parentTypeId === selectedParentTypeId.value);
});

const loadMessages = async () => {
  // When direction filter is active, fetch a large batch for client-side pagination
  // (the API does not support isOutgoing as a server-side filter)
  const isDirectionFiltered = !!selectedIsOutgoing.value;

  const payload = {
    pageIndex: isDirectionFiltered ? 0 : pageIndex.value,
    pageSize: isDirectionFiltered ? 500 : PAGE_SIZE,
  } as Record<string, any>

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

watch(pageIndex, loadMessages);

onIonViewWillEnter(async () => {
  await Promise.all([
    store.fetchSystemMessageTypes(),
    store.fetchSystemMessageRemotes(),
    store.fetchSystemMessageStatusMetadata()
  ]);

  const currentQuery = router.currentRoute.value.query;
  selectedStatusId.value = (currentQuery?.statusId as string) ?? "";
  selectedIsOutgoing.value = (currentQuery?.isOutgoing as string) ?? "";

  await loadMessages();
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
