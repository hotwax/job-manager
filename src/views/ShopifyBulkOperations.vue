<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Shopify Bulk Operations") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <div class="kpi-grid">
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Operations") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="stats.total" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("In flight") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="stats.inFlight" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Completed") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="stats.completed" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Failed") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="stats.failed" /></ion-card-title>
            </ion-card-header>
          </ion-card>
        </div>

        <!-- Shopify connections do not report a total, so the tiles have to say what they counted. -->
        <ion-note color="medium" class="stats-scope">
          {{ statsScope }}
        </ion-note>

        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              :debounce="300"
              :placeholder="translate('Filter this page by operation ID, job type, or description')"
              @ion-input="queryString = ($event as any).detail.value || ''"
            />

            <div class="filter-grid">
              <div class="filter-item">
                <ion-select
                  :label="translate('Shopify status')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedStatus"
                  @ion-change="selectedStatus = $event.detail.value"
                >
                  <ion-select-option value="">
                    {{ translate("All") }}
                  </ion-select-option>
                  <ion-select-option v-for="status in shopifyStatuses" :key="status" :value="status">
                    {{ translate(toTitleCase(status)) }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedStatus" fill="clear" class="clear-filter-btn" :title="translate('Clear')" @click="selectedStatus = ''">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-select
                  :label="translate('Operation type')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedType"
                  @ion-change="selectedType = $event.detail.value"
                >
                  <ion-select-option value="">
                    {{ translate("All") }}
                  </ion-select-option>
                  <ion-select-option value="QUERY">
                    {{ translate("Query") }}
                  </ion-select-option>
                  <ion-select-option value="MUTATION">
                    {{ translate("Mutation") }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedType" fill="clear" class="clear-filter-btn" :title="translate('Clear')" @click="selectedType = ''">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
                <ion-input
                  :value="createdAfter"
                  type="date"
                  :label="translate('Created after')"
                  label-placement="stacked"
                  fill="outline"
                  @ion-input="createdAfter = ($event as any).detail.value || ''"
                />
                <ion-button v-if="createdAfter" fill="clear" class="clear-filter-btn" :title="translate('Clear')" @click="createdAfter = ''">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div v-if="enrichmentAvailable" class="filter-item">
                <ion-select
                  :label="translate('HotWax link')"
                  label-placement="stacked"
                  interface="popover"
                  :value="linkFilter"
                  @ion-change="linkFilter = $event.detail.value"
                >
                  <ion-select-option value="">
                    {{ translate("All") }}
                  </ion-select-option>
                  <ion-select-option value="linked">
                    {{ translate("Linked to a job") }}
                  </ion-select-option>
                  <ion-select-option value="unlinked">
                    {{ translate("No HotWax record") }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="linkFilter" fill="clear" class="clear-filter-btn" :title="translate('Clear')" @click="linkFilter = ''">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Cursor paging: Shopify returns cursors and has-next/has-previous, never a page count. -->
        <div class="pagination">
          <ion-button fill="outline" :disabled="!pageInfo.hasPreviousPage || isFetchingOperations" @click="goToPreviousPage">
            {{ translate("Previous") }}
          </ion-button>
          <ion-button fill="outline" :disabled="!pageInfo.hasNextPage || isFetchingOperations" @click="goToNextPage">
            {{ translate("Next") }}
          </ion-button>
        </div>

        <div v-if="isFetchingOperations" class="loading-state">
          <ion-spinner name="crescent" />
          <p>{{ translate("Loading") }}</p>
        </div>

        <div v-else-if="lastError" class="empty-state">
          <p>{{ lastError }}</p>
        </div>

        <ion-list v-else-if="visibleOperations.length">
          <ion-list-header>
            <ion-label>{{ resultsSummary }}</ion-label>
            <BulkOperationSortPopover
              v-model="sort"
              :options="sortOptions"
              trigger-id="bulk-operation-sort-trigger"
            />
          </ion-list-header>

          <ShopifyBulkOperationCard
            v-for="operation in visibleOperations"
            :key="operation.id"
            :operation="operation"
            :enrichment-available="enrichmentAvailable"
            @view-system-message="goToSystemMessage"
            @copy-id="copyValue"
          />
        </ion-list>

        <div v-else class="empty-state">
          <p>{{ translate("No bulk operations found") }}</p>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from "@common";
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter
} from "@ionic/vue";
import {
  closeCircleOutline
} from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { type ShopifyBulkOperation } from "@/types/ShopifyBulkOperation";
import AnimatedNumber from "@/components/AnimatedNumber.vue";
import ShopifyBulkOperationCard from "@/components/ShopifyBulkOperationCard.vue";
import BulkOperationSortPopover from "@/components/BulkOperationSortPopover.vue";
import router from "@/router";
import {
  BULK_OPERATION_SORT_OPTIONS,
  BULK_OPERATION_SORT_QUERY,
  DEFAULT_BULK_OPERATION_SORT,
  SHOPIFY_STATUSES,
  useShopifyBulkOperationStore
} from "@/store/shopifyBulkOperation";
import { useUserStore } from "@/store/user";
import { showToast } from "@/utils";

const bulkOperationStore = useShopifyBulkOperationStore();
const userStore = useUserStore();

const queryString = ref("");
const selectedStatus = ref("");
const selectedType = ref("");
const createdAfter = ref("");
const linkFilter = ref("");
const sort = ref(DEFAULT_BULK_OPERATION_SORT);
const cursor = ref("");
const direction = ref("");

const shopifyStatuses = SHOPIFY_STATUSES;
const sortOptions = BULK_OPERATION_SORT_OPTIONS;

const stats = computed(() => bulkOperationStore.getStats);
const pageInfo = computed(() => bulkOperationStore.getPageInfo);
const isFetchingOperations = computed(() => bulkOperationStore.isFetchingOperations);
const lastError = computed(() => bulkOperationStore.lastError);
const enrichmentAvailable = computed(() => bulkOperationStore.enrichmentAvailable);

// The shop's system message remote is what the OMS passthrough uses to pick the Shopify
// credentials, so every request on this page is scoped to the selected product store.
const systemMessageRemoteId = computed(() => userStore.getSelectedSystemMessageRemoteId);

const operations = computed(() => bulkOperationStore.getEnrichedOperations);

// Search and the HotWax-link facet refine the page Shopify already returned. Shopify cannot
// filter on HotWax fields, so these stay local and the searchbar label says "this page".
const visibleOperations = computed<ShopifyBulkOperation[]>(() => {
  const search = queryString.value.trim().toLowerCase();

  return operations.value.filter((operation: ShopifyBulkOperation) => {
    if(enrichmentAvailable.value && linkFilter.value === "linked" && !operation.hotwaxMessage) {return false;}
    if(enrichmentAvailable.value && linkFilter.value === "unlinked" && operation.hotwaxMessage) {return false;}
    if(!search) {return true;}

    return [
      operation.shopifyOperationId,
      operation.hotwaxMessage?.systemMessageTypeId,
      operation.hotwaxMessage?.description,
      operation.hotwaxMessage?.jobRunId
    ].some(value => String(value || "").toLowerCase().includes(search));
  });
});

// Shopify never reports a connection total, and it also returns fewer nodes than asked for
// when its query-cost budget is low, so the window these tiles counted has to be named
// rather than implied.
const statsScope = computed(() => {
  if(!stats.value.windowSize) {
    return translate("No operations to summarise");
  }

  return stats.value.truncated
    ? `${translate("Counts cover the")} ${stats.value.windowSize} ${translate("most recent operations, not all history")}`
    : `${translate("Counts cover all")} ${stats.value.windowSize} ${translate("operations Shopify returned for this shop")}`;
});

// Shopify connections carry no total, so the summary counts what is on this page only.
const resultsSummary = computed(() => {
  const count = visibleOperations.value.length;

  return `${count} ${count === 1 ? translate("operation") : translate("operations")}`;
});

const toTitleCase = (value: string) => {
  if(!value) {return "";}

  return value.charAt(0) + value.slice(1).toLowerCase();
};

const copyValue = async (value: string) => {
  await navigator.clipboard.writeText(value);
  showToast(translate("Copied to clipboard"));
};

const goToSystemMessage = (systemMessageId: string) => {
  router.push(`/system-messages/${systemMessageId}`);
};

const buildPayload = (overrides: Record<string, any> = {}) => ({
  systemMessageRemoteId: systemMessageRemoteId.value,
  status: selectedStatus.value,
  operationType: selectedType.value,
  createdAfter: createdAfter.value,
  sortKey: (BULK_OPERATION_SORT_QUERY[sort.value] || {}).sortKey,
  sortReverse: (BULK_OPERATION_SORT_QUERY[sort.value] || {}).reverse,
  ...overrides
});

const loadOperations = async () => {
  await bulkOperationStore.fetchOperations(buildPayload({ cursor: cursor.value, direction: direction.value }));
  // Enrichment is keyed off whatever Shopify just returned, so it has to follow the list.
  await bulkOperationStore.fetchEnrichmentFor(bulkOperationStore.operations);
};

const loadAll = async () => {
  await Promise.all([loadOperations(), bulkOperationStore.fetchStats(buildPayload())]);
};

const goToNextPage = async () => {
  cursor.value = pageInfo.value.endCursor;
  direction.value = "next";
  await loadOperations();
};

const goToPreviousPage = async () => {
  cursor.value = pageInfo.value.startCursor;
  direction.value = "previous";
  await loadOperations();
};

// A changed Shopify-side facet invalidates the cursor, so paging restarts from the newest page.
watch([selectedStatus, selectedType, createdAfter, sort], async () => {
  cursor.value = "";
  direction.value = "";
  await Promise.all([loadOperations(), bulkOperationStore.fetchStats(buildPayload())]);
});

watch(systemMessageRemoteId, async (value) => {
  cursor.value = "";
  direction.value = "";
  if(value) {await loadAll();} else {bulkOperationStore.clearOperations();}
});

onIonViewWillEnter(async () => {
  cursor.value = "";
  direction.value = "";
  await loadAll();
});
</script>

<style scoped>
.kpi-grid,
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacer-base);
}

.kpi-grid {
  margin-block-end: var(--spacer-base);
}

.kpi-grid ion-card {
  margin: 0;
}

.stats-scope {
  display: block;
  padding-inline: var(--spacer-base);
  padding-block-end: var(--spacer-base);
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  flex-wrap: wrap;
}

.pagination {
  justify-content: flex-end;
  padding: var(--spacer-base);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: var(--spacer-lg);
}

@media (max-width: 600px) {
  .pagination ion-button {
    width: 100%;
  }

  .pagination {
    justify-content: stretch;
  }
}
</style>
