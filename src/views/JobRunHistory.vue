<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Service Job Run History") }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <p>{{ translate("History includes all stores. Newest activity first.") }}</p>
        <div class="kpi-grid">
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Total runs") }}</ion-card-subtitle>
              <ion-card-title><span v-if="isLoading || historyError || total === null">—</span><AnimatedNumber v-else :value="stats.total" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Successful") }}</ion-card-subtitle>
              <ion-card-title><span v-if="isLoading || historyError || statsLoading || statsError">—</span><AnimatedNumber v-else :value="stats.successful" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Failed") }}</ion-card-subtitle>
              <ion-card-title><span v-if="isLoading || historyError || statsLoading || statsError">—</span><AnimatedNumber v-else :value="stats.failed" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card v-for="status in [{ key: 'running', label: 'Running' }, { key: 'terminated', label: 'Terminated' }]" :key="status.key">
            <ion-card-header>
              <ion-card-subtitle>{{ translate(status.label) }}</ion-card-subtitle>
              <ion-card-title><span v-if="isLoading || historyError || statsLoading || statsError">—</span><AnimatedNumber v-else :value="stats[status.key]" /></ion-card-title>
            </ion-card-header>
          </ion-card>
        </div>

        <ion-card>
          <ion-card-content>
            <JobRunFilters
              v-model:queryString="queryString"
              v-model:status="selectedStatus"
              v-model:userId="selectedUserId"
              :show-data-logs="false"
              :placeholder="translate(searchField === 'jobRunId' ? 'Exact run ID' : 'Search selected field')"
              :user-placeholder="translate('Exact user ID')"
            >
              <template #scope>
                <div class="filter-item">
                  <ion-select :label="translate('Search field')" label-placement="stacked" interface="popover" :value="searchField" @ionChange="searchField = $event.detail.value">
                    <ion-select-option value="jobRunId">{{ translate("Run ID") }}</ion-select-option>
                    <ion-select-option value="messages">{{ translate("Message") }}</ion-select-option>
                    <ion-select-option value="results">{{ translate("Results") }}</ion-select-option>
                    <ion-select-option value="errors">{{ translate("Errors") }}</ion-select-option>
                  </ion-select>
                </div>
                <div class="filter-item job-filter">
                  <ion-input :label="translate('Job')" label-placement="stacked" fill="outline" :placeholder="translate('Exact job name')" :value="selectedJobName" :debounce="300" @ionInput="selectedJobName = $event.detail.value || ''" />
                  <ion-button v-if="selectedJobName" fill="clear" class="clear-filter-btn" @click="selectedJobName = ''" :title="translate('Clear')"><ion-icon slot="icon-only" :icon="closeCircleOutline" /></ion-button>
                </div>
              </template>
            </JobRunFilters>
          </ion-card-content>
        </ion-card>

        <ion-item v-if="statsError && !historyError && !isLoading" lines="none" data-testid="run-history-counts-error">
          <ion-label>{{ translate(statsError) }}</ion-label>
          <ion-button slot="end" @click="loadRuns(true)">{{ translate("Retry") }}</ion-button>
        </ion-item>

        <div v-if="!historyError" class="pagination">
          <ion-button fill="outline" :disabled="pageIndex === 0 || isLoading" @click="goToPreviousPage">
            {{ translate("Previous") }}
          </ion-button>
          <ion-note color="medium">{{ translate("Page") }} {{ pageIndex + 1 }}<template v-if="total !== null"> / {{ pageCount }}</template></ion-note>
          <ion-button fill="outline" :disabled="!hasMore || isLoading" @click="goToNextPage">
            {{ translate("Next") }}
          </ion-button>
        </div>

        <div v-if="isLoading" class="loading-state">
          <ion-spinner name="crescent" />
          <p>{{ translate("Loading") }}</p>
        </div>

        <ion-card v-else-if="historyError" data-testid="run-history-error" role="alert">
          <ion-card-content>
            <p>{{ translate(historyError) }}</p>
            <ion-button @click="loadRuns(true)">{{ translate("Retry") }}</ion-button>
          </ion-card-content>
        </ion-card>

        <ion-list v-else-if="runs.length">
          <ion-card v-for="run in runs" :key="`${run.jobName}-${run.jobRunId}`" class="run-card" button @click="goToJob(run.jobName)">
            <ion-item lines="none">
              <ion-icon slot="start" :icon="getStatusIcon(run)" :color="commonUtil.getStatusColor(run.runStatus)" />
              <ion-label class="ion-text-wrap">
                <p class="overline">#{{ run.jobRunId }}</p>
                <h2>{{ run.jobName }}</h2>
                <p v-if="run.serviceName">{{ run.serviceName }}</p>
                <p v-if="getRunProductLabel(run)">{{ translate("Product") }}: {{ getRunProductLabel(run) }}</p>
              </ion-label>
              <ion-badge slot="end" :color="commonUtil.getStatusColor(run.runStatus)">
                {{ translate(getStatusLabel(run)) }}
              </ion-badge>
            </ion-item>

            <ion-card-content>
              <div class="run-metrics">
                <ion-item lines="none">
                  <ion-icon slot="start" :icon="playOutline" color="medium" />
                  <ion-label>
                    <p>{{ translate("Started") }}</p>
                    {{ getRunDate(run.startTime) }}
                  </ion-label>
                </ion-item>
                <ion-item lines="none">
                  <ion-icon slot="start" :icon="checkmarkCircleOutline" color="medium" />
                  <ion-label>
                    <p>{{ translate("Completed") }}</p>
                    {{ getRunDate(run.endTime) }}
                  </ion-label>
                </ion-item>
                <ion-item lines="none">
                  <ion-icon slot="start" :icon="timeOutline" color="medium" />
                  <ion-label>
                    <p>{{ translate("Duration") }}</p>
                    {{ getRunDuration(run) }}
                  </ion-label>
                </ion-item>
                <ion-item lines="none">
                  <ion-icon slot="start" :icon="personOutline" color="medium" />
                  <ion-label>
                    <p>{{ translate("User") }}</p>
                    {{ getRunUserName(run) }}
                    <p v-if="run.userId && getRunUserName(run) !== run.userId">{{ run.userId }}</p>
                  </ion-label>
                </ion-item>
              </div>

              <ion-accordion-group v-if="run.messages || hasResults(run) || run.errors || run.parameters" @click.stop>
                <ion-accordion v-if="run.messages" value="message">
                  <ion-item slot="header">
                    <ion-label>{{ translate("Message") }}</ion-label>
                  </ion-item>
                  <div slot="content" class="accordion-content">
                    <p>{{ run.messages }}</p>
                  </div>
                </ion-accordion>

                <ion-accordion v-if="run.errors" value="errors">
                  <ion-item slot="header">
                    <ion-label>{{ translate("Errors") }}</ion-label>
                  </ion-item>
                  <div slot="content" class="accordion-content">
                    <pre><code>{{ run.errors }}</code></pre>
                  </div>
                </ion-accordion>

                <ion-accordion v-if="hasResults(run)" value="results">
                  <ion-item slot="header">
                    <ion-label>{{ translate("Results") }}</ion-label>
                  </ion-item>
                  <div slot="content" class="accordion-content">
                    <pre><code>{{ run.results }}</code></pre>
                  </div>
                </ion-accordion>

                <ion-accordion v-if="run.parameters" value="parameters">
                  <ion-item slot="header">
                    <ion-label>{{ translate("Parameters") }}</ion-label>
                  </ion-item>
                  <div slot="content" class="accordion-content">
                    <pre><code>{{ run.parameters }}</code></pre>
                  </div>
                </ion-accordion>
              </ion-accordion-group>

            </ion-card-content>
          </ion-card>
        </ion-list>

        <p v-else class="empty-state">{{ translate("No service job runs found for the selected filters.") }}</p>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
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
  IonMenuButton,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewDidLeave,
  onIonViewWillEnter
} from "@ionic/vue";
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  personOutline,
  playOutline,
  timeOutline
} from "ionicons/icons";
import { computed, nextTick, ref, watch } from "vue";
import { commonUtil, translate } from "@common";
import AnimatedNumber from "@/components/AnimatedNumber.vue";
import JobRunFilters from "@/components/JobRunFilters.vue";
import router from "@/router";
import { useJobStore } from "@/store/jobs";
import { useUserStore } from "@/store/user";
import { getDateAndTime, getTimeInMillis } from "@/utils";

const PAGE_SIZE = 25;

const jobStore = useJobStore();
const userStore = useUserStore();

const queryString = ref("");
const selectedStatus = ref("");
const selectedJobName = ref("");
const selectedUserId = ref("");
const searchField = ref("jobRunId");
const pageIndex = ref(0);

// Enrich only for display. Cached jobs may be store-scoped or absent for historical runs.
const cachedJobs = computed(() => new Map(jobStore.getJobs.map((job: any) => [job.jobName, job])));
const runs = computed(() => jobStore.getJobRunHistory.map((run: any) => {
  const job = cachedJobs.value.get(run.jobName) as any;
  return {
    ...run,
    serviceName: job?.serviceName,
    instanceOfProductId: job?.instanceOfProductId,
    productName: jobStore.getProducts[job?.instanceOfProductId]?.productName
  };
}));
const total = computed(() => jobStore.getJobRunHistoryTotal);
const stats = computed(() => jobStore.getJobRunHistoryStats);
const hasMore = computed(() => jobStore.jobRunHistoryHasMore);
const isLoading = computed(() => isInitializing.value || jobStore.jobRunHistoryLoading);
const historyError = computed(() => jobStore.jobRunHistoryError);
const statsLoading = computed(() => !jobStore.jobRunStatsLoaded || jobStore.jobRunStatsLoading);
const statsError = computed(() => jobStore.jobRunStatsError);
const pageCount = computed(() => Math.max(Math.ceil((total.value || 0) / PAGE_SIZE), 1));

// Ignore whitespace-only labels when selecting a display name.
const firstNonBlank = (...values: Array<any>) =>
  values.map((value: any) => String(value ?? "").trim()).find((value: string) => value) || "";

const getRunProductLabel = (run: any) => firstNonBlank(run.productName, run.instanceOfProductId);

const formatDuration = (milliseconds: number) => {
  if (!milliseconds || milliseconds < 0) return "-";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

const getRunDuration = (run: any) => {
  const start = getTimeInMillis(run.startTime);
  const end = getTimeInMillis(run.endTime);
  if (!start || !end) return "-";
  return formatDuration(end - start);
};

const getRunDate = (value: any) => value ? getDateAndTime(value) : "-";

const hasResults = (run: any) => {
  const results = run.results;
  if (results === undefined || results === null) return false;

  if (typeof results === "string") {
    const trimmed = results.trim();
    return !!trimmed && trimmed !== "{}" && trimmed !== "[]";
  }

  if (Array.isArray(results)) return results.length > 0;
  if (typeof results === "object") return Object.keys(results).length > 0;

  return true;
};

const getStatusLabel = (run: any) => {
  if (run.runStatus === "FAILED") return "Failed";
  if (run.runStatus === "RUNNING") return "Running";
  if (run.runStatus === "SUCCESSFUL") return "Successful";
  return "TERMINATED";
};

const getStatusIcon = (run: any) => {
  if (run.runStatus === "FAILED") return closeCircleOutline;
  if (run.runStatus === "RUNNING") return timeOutline;
  if (run.runStatus === "SUCCESSFUL") return checkmarkCircleOutline;
  return alertCircleOutline;
};


// Filters are applied by the entity-list endpoint before paging.
const getSearchPayload = () => {
  const payload = {
    pageIndex: pageIndex.value,
    pageSize: PAGE_SIZE
  } as Record<string, any>;

  if (queryString.value.trim()) payload.queryString = queryString.value.trim();
  if (selectedStatus.value) payload.status = selectedStatus.value;
  if (selectedJobName.value) payload.jobName = selectedJobName.value;
  if (selectedUserId.value.trim()) payload.userId = selectedUserId.value.trim();
  payload.searchField = searchField.value;

  return payload;
};

let currentLoad = 0;
const loadRuns = async (refreshStats = false) => {
  const requestId = ++currentLoad;
  const payload = getSearchPayload();
  if(refreshStats) jobStore.invalidateJobRunHistoryStats();
  const loaded = await jobStore.fetchJobRunHistory(payload);
  if(loaded && requestId === currentLoad) {
    // Resolve only the current page; the user store caches and deduplicates IDs.
    void userStore.resolveUserFullNames(runs.value.map((run: any) => run.userId).filter(Boolean));
  }
  if(loaded && requestId === currentLoad && refreshStats) {
    await jobStore.fetchJobRunHistoryStats(payload);
  }
};

// The entity list supplies the initiating user ID.
const getRunUserName = (run: any) => firstNonBlank(userStore.getUserFullName(run.userId), run.userId) || "-";

const goToPreviousPage = () => {
  if (pageIndex.value > 0) {
    pageIndex.value -= 1;
  }
};

const goToNextPage = () => {
  if (hasMore.value && !isLoading.value) {
    pageIndex.value += 1;
  }
};

const goToJob = (jobName: string) => {
  router.push({ name: "JobDetail", params: { jobName } });
};

let isFilterResetting = false;
const isInitializing = ref(true);
let isActive = false;

// A filter change goes back to the first page and invalidates the status counts, a page change needs neither
watch([queryString, selectedStatus, selectedJobName, selectedUserId, searchField], async () => {
  if(isInitializing.value) return;
  if (pageIndex.value !== 0) {
    // The page reset triggers the pageIndex watcher, which must not fire a second fetch for the same filters
    isFilterResetting = true;
    pageIndex.value = 0;
  }
  await loadRuns(true);
});

watch(pageIndex, async () => {
  if (isFilterResetting) {
    isFilterResetting = false;
    return;
  }
  await loadRuns();
});

onIonViewWillEnter(async () => {
  isInitializing.value = true;
  isActive = true;
  const route = router.currentRoute.value;
  if (route.query.queryString) queryString.value = route.query.queryString as string;
  if (["SUCCESSFUL", "FAILED", "RUNNING", "TERMINATED"].includes(String(route.query.status))) selectedStatus.value = route.query.status as string;
  if (route.query.jobName) selectedJobName.value = route.query.jobName as string;
  if (route.query.userId) selectedUserId.value = route.query.userId as string;

  // Flush route filters before enabling their watcher.
  await nextTick();
  if(!isActive) return;
  isInitializing.value = false;
  await loadRuns(true);
});
onIonViewDidLeave(() => {
  isActive = false;
  currentLoad++;
  jobStore.cancelJobRunHistory();
});
</script>

<style scoped>
.kpi-grid,
.filter-grid,
.run-metrics {
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

.pagination,
.run-summary,
.run-actions,
.log-actions {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm);
  flex-wrap: wrap;
}

.pagination {
  justify-content: flex-end;
  padding: var(--spacer-base);
}

.run-card {
  margin-block-end: var(--spacer-base);
}

.run-metrics ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.run-summary,
.run-actions {
  margin-block-start: var(--spacer-base);
}

.accordion-content {
  padding: var(--spacer-base);
}

.accordion-content pre {
  overflow: auto;
  white-space: pre-wrap;
}

.job-filter ion-select {
  min-width: 0;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: var(--spacer-lg);
}

@media (max-width: 600px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pagination ion-button {
    width: 100%;
  }

  .pagination {
    justify-content: stretch;
  }
}
</style>
