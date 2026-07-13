<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Data Document Export History") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="queryString = $event.detail.value || ''"
              :debounce="200"
              :placeholder="translate('Search by file, document or message ID')"
            />

            <div class="filter-grid">
              <div class="filter-item">
                <ion-select
                  :label="translate('Document')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedDocumentId"
                  @ionChange="selectedDocumentId = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All documents") }}</ion-select-option>
                  <ion-select-option v-for="document in documents" :key="document.dataDocumentId" :value="document.dataDocumentId">
                    {{ document.documentName || document.dataDocumentId }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedDocumentId" fill="clear" class="clear-filter-btn" @click="selectedDocumentId = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <!-- Status is filtered client-side using the same getExportStatus vocabulary the
                   badges render, so the options match what's shown on each row (and "Failed",
                   which is SmsgProduced + failCount > 0, can actually be isolated). -->
              <div class="filter-item">
                <ion-select
                  :label="translate('Status')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedStatus"
                  @ionChange="selectedStatus = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All statuses") }}</ion-select-option>
                  <ion-select-option value="ready">{{ translate("Ready") }}</ion-select-option>
                  <ion-select-option value="processing">{{ translate("Processing") }}</ion-select-option>
                  <ion-select-option value="sending">{{ translate("Sending") }}</ion-select-option>
                  <ion-select-option value="failed">{{ translate("Failed") }}</ion-select-option>
                </ion-select>
                <ion-button v-if="selectedStatus" fill="clear" class="clear-filter-btn" @click="selectedStatus = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-input
                  :value="startedBy"
                  @ionInput="startedBy = $event.detail.value || ''"
                  :label="translate('Started By')"
                  label-placement="stacked"
                />
                <ion-button v-if="startedBy" fill="clear" class="clear-filter-btn" @click="startedBy = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-input
                  :value="fromDate"
                  @ionInput="fromDate = $event.detail.value || ''"
                  type="date"
                  :label="translate('From Date')"
                  label-placement="stacked"
                />
                <ion-button v-if="fromDate" fill="clear" class="clear-filter-btn" @click="fromDate = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-input
                  :value="thruDate"
                  @ionInput="thruDate = $event.detail.value || ''"
                  type="date"
                  :label="translate('Thru Date')"
                  label-placement="stacked"
                />
                <ion-button v-if="thruDate" fill="clear" class="clear-filter-btn" @click="thruDate = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <div class="pagination" v-if="filteredMessages.length">
          <ion-button fill="outline" :disabled="pageIndex === 0" @click="pageIndex -= 1">
            {{ translate("Previous") }}
          </ion-button>
          <ion-note color="medium">{{ translate("Page") }} {{ pageIndex + 1 }} / {{ pageCount }}</ion-note>
          <ion-button fill="outline" :disabled="pageIndex >= pageCount - 1" @click="pageIndex += 1">
            {{ translate("Next") }}
          </ion-button>
        </div>

        <DataDocumentExportList
          :messages="pagedMessages"
          :empty-message="translate('No data document exports found.')"
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
  IonInput,
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

import { translate } from "@common";
import { getExportStatus } from "@/utils";
import { useDataDocumentStore } from "@/store/dataDocuments";
import DataDocumentExportList from "@/components/DataDocumentExportList.vue";

const PAGE_SIZE = 25;

const store = useDataDocumentStore();
const selectedDocumentId = ref("");
const selectedStatus = ref("");
const startedBy = ref("");
const fromDate = ref("");
const thruDate = ref("");
const queryString = ref("");
const pageIndex = ref(0);

const documents = computed(() => store.getDataDocuments);
const messages = computed(() => store.getExportHistory);

// Search + status run client-side over the fetched results so the status options match the
// row badges exactly (both come from getExportStatus) and free-text search works on file
// name / message id / document.
const filteredMessages = computed(() => {
  const query = queryString.value.trim().toLowerCase();
  return messages.value.filter((message: any) => {
    const matchesStatus = !selectedStatus.value || getExportStatus(message).key === selectedStatus.value;
    const matchesQuery = !query || [message.fileName, message.systemMessageId, message.dataDocumentId]
      .some((field) => String(field || "").toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  });
});

const pageCount = computed(() => Math.max(Math.ceil(filteredMessages.value.length / PAGE_SIZE), 1));
const pagedMessages = computed(() => filteredMessages.value.slice(pageIndex.value * PAGE_SIZE, (pageIndex.value + 1) * PAGE_SIZE));

const loadHistory = async () => {
  await store.fetchExportHistory({
    dataDocumentId: selectedDocumentId.value,
    startedBy: startedBy.value.trim(),
    fromDate: fromDate.value,
    thruDate: thruDate.value
  });
};

// Server-side filters refetch; all filter/search changes reset to the first page.
watch([selectedDocumentId, startedBy, fromDate, thruDate], async () => {
  pageIndex.value = 0;
  await loadHistory();
});
watch([queryString, selectedStatus], () => { pageIndex.value = 0; });

// Keep pageIndex in range whenever the result set shrinks — including out-of-band updates to
// the shared store (e.g. a background export poll) on this cached Ionic page — so we never
// strand on an empty page past the end.
watch(pageCount, (count) => {
  if (pageIndex.value > count - 1) pageIndex.value = Math.max(0, count - 1);
});

onIonViewWillEnter(async () => {
  await store.fetchDataDocuments();
  await loadHistory();
});
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
</style>
