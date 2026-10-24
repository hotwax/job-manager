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
        <div class="kpi-grid">
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Total runs") }}</ion-card-subtitle>
              <ion-card-title><span v-if="isLoading || historyError">—</span><AnimatedNumber v-else :value="stats.total" /></ion-card-title>
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
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Running") }}</ion-card-subtitle>
              <ion-card-title><span v-if="isLoading || historyError || statsLoading || statsError">—</span><AnimatedNumber v-else :value="stats.running" /></ion-card-title>
            </ion-card-header>
          </ion-card>
        </div>

        <ion-card>
          <ion-card-content>
            <JobRunFilters
              v-model:queryString="queryString"
              v-model:status="selectedStatus"
              v-model:userId="selectedUsername"
              :show-data-logs="false"
              :placeholder="translate('Search by run id, job, service, or user')"
              :user-placeholder="translate('Exact username')"
            >
              <template #scope>
              <div class="filter-item job-filter">
                <ion-select
                  :label="translate('Job')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedJobName"
                  @ionChange="selectedJobName = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                  <ion-select-option v-for="job in jobOptions" :key="job.jobName" :value="job.jobName">
                    {{ job.jobName }}
                  </ion-select-option>
                </ion-select>
                <ion-button v-if="selectedJobName" fill="clear" class="clear-filter-btn" @click="selectedJobName = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
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
          <ion-note color="medium">{{ translate("Page") }} {{ pageIndex + 1 }} / {{ pageCount }}</ion-note>
          <ion-button fill="outline" :disabled="pageIndex >= pageCount - 1 || isLoading" @click="goToNextPage">
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
                <p>{{ run.serviceName || translate("Service unavailable") }}</p>
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
                    {{ getRunDate(run.startTime || run.lastUpdatedStamp) }}
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
import { getDateAndTime, getTimeInMillis } from "@/utils";

const PAGE_SIZE = 25;

const jobStore = useJobStore();

const queryString = ref("");
const selectedStatus = ref("");
const selectedJobName = ref("");
const selectedUsername = ref("");
const pageIndex = ref(0);

const runs = computed(() => jobStore.getJobRunHistory);
const total = computed(() => jobStore.getJobRunHistoryTotal);
const stats = computed(() => jobStore.getJobRunHistoryStats);
const jobs = computed(() => jobStore.getJobs);
const isLoading = computed(() => isInitializing.value || jobStore.jobRunHistoryLoading);
const historyError = computed(() => jobStore.jobRunHistoryError);
const statsLoading = computed(() => !jobStore.jobRunStatsLoaded || jobStore.jobRunStatsLoading);
const statsError = computed(() => jobStore.jobRunStatsError);
const pageCount = computed(() => Math.max(Math.ceil(total.value / PAGE_SIZE), 1));

const jobOptions = computed(() => {
  return [...jobs.value].sort((first: any, second: any) => first.jobName.localeCompare(second.jobName));
});

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


// The search service takes every filter, so a page change only refetches that page and the status counts stay put.
const getSearchPayload = () => {
  const payload = {
    pageIndex: pageIndex.value,
    pageSize: PAGE_SIZE
  } as Record<string, any>;

  if (queryString.value.trim()) payload.queryString = queryString.value.trim();
  if (selectedStatus.value) payload.status = selectedStatus.value;
  if (selectedJobName.value) payload.jobName = selectedJobName.value;
  if (selectedUsername.value.trim()) payload.username = selectedUsername.value.trim();

  return payload;
};

let currentLoad = 0;
const loadRuns = async (refreshStats = false) => {
  const requestId = ++currentLoad;
  const payload = getSearchPayload();
  if(refreshStats) jobStore.invalidateJobRunHistoryStats();
  const loaded = await jobStore.fetchJobRunHistory(payload);
  if(loaded && requestId === currentLoad && refreshStats) {
    await jobStore.fetchJobRunHistoryStats(payload);
  }
};

// The search service joins the user account, so the full name comes with the run itself.
const getRunUserName = (run: any) => firstNonBlank(run.userFullName, run.username, run.userId) || "-";

const goToPreviousPage = () => {
  if (pageIndex.value > 0) {
    pageIndex.value -= 1;
  }
};

const goToNextPage = () => {
  if (pageIndex.value < pageCount.value - 1) {
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
watch([queryString, selectedStatus, selectedJobName, selectedUsername], async () => {
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
  if (route.query.status) selectedStatus.value = route.query.status as string;
  if (route.query.jobName) selectedJobName.value = route.query.jobName as string;
  if (route.query.username) selectedUsername.value = route.query.username as string;

  // Only needed to populate the Job filter options. Flush route filters before enabling their watcher.
  await nextTick();
  await jobStore.fetchJobs();
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
