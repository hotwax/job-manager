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
              <ion-card-title><AnimatedNumber :value="stats.total" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Successful") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="stats.successful" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Failed") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="stats.failed" /></ion-card-title>
            </ion-card-header>
          </ion-card>
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>{{ translate("Running") }}</ion-card-subtitle>
              <ion-card-title><AnimatedNumber :value="stats.running" /></ion-card-title>
            </ion-card-header>
          </ion-card>
        </div>

        <ion-card>
          <ion-card-content>
            <ion-searchbar
              :value="queryString"
              @ionInput="handleQueryInput"
              :debounce="300"
              :placeholder="translate('Search by run id, job, service, or user')"
            />

            <div class="filter-grid">
              <div class="filter-item">
                <ion-select
                  :label="translate('Status')"
                  label-placement="stacked"
                  interface="popover"
                  :value="selectedStatus"
                  @ionChange="selectedStatus = $event.detail.value"
                >
                  <ion-select-option value="">{{ translate("All") }}</ion-select-option>
                  <ion-select-option value="RUNNING">{{ translate("Running") }}</ion-select-option>
                  <ion-select-option value="SUCCESSFUL">{{ translate("Successful") }}</ion-select-option>
                  <ion-select-option value="FAILED">{{ translate("Failed") }}</ion-select-option>
                  <ion-select-option value="TERMINATED">{{ translate("Terminated") }}</ion-select-option>
                </ion-select>
                <ion-button v-if="selectedStatus" fill="clear" class="clear-filter-btn" @click="selectedStatus = ''" :title="translate('Clear')">
                  <ion-icon slot="icon-only" :icon="closeCircleOutline" />
                </ion-button>
              </div>

              <div class="filter-item">
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

              <div class="filter-item">
                <ion-input
                  :value="selectedUsername"
                  :label="translate('User')"
                  label-placement="stacked"
                  fill="outline"
                  :placeholder="translate('Any user')"
                  :debounce="300"
                  @ionInput="selectedUsername = $event.detail.value || ''"
                />
                <ion-button v-if="selectedUsername" fill="clear" class="clear-filter-btn" @click="selectedUsername = ''" :title="translate('Clear')">
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

        <div v-if="isLoading" class="loading-state">
          <ion-spinner name="crescent" />
          <p>{{ translate("Loading") }}</p>
        </div>

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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
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
  alertCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  personOutline,
  playOutline,
  timeOutline
} from "ionicons/icons";
import { computed, ref, watch } from "vue";
import { commonUtil, translate } from "@common";
import AnimatedNumber from "@/components/AnimatedNumber.vue";
import router from "@/router";
import { useJobStore } from "@/store/jobs";
import { getDateAndTime, getTimeInMillis } from "@/utils";

const PAGE_SIZE = 25;

const route = router.currentRoute.value;
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
const isLoading = computed(() => jobStore.isLoading);
const pageCount = computed(() => Math.max(Math.ceil(total.value / PAGE_SIZE), 1));

const jobOptions = computed(() => {
  return [...jobs.value].sort((first: any, second: any) => first.jobName.localeCompare(second.jobName));
});

// Picks the first candidate with visible text. A stored value can be blank rather than null, and a blank string is
// truthy, so it would win a plain || chain and then render as nothing.
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

const handleQueryInput = (event: CustomEvent) => {
  queryString.value = (event as any).detail.value || "";
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

const loadRuns = () => jobStore.fetchJobRunHistory(getSearchPayload());

const loadStats = () => jobStore.fetchJobRunHistoryStats(getSearchPayload());

// The search service joins the user account, so the full name comes with the run itself.
const getRunUserName = (run: any) => firstNonBlank(run.userFullName, run.username, run.userId) || "-";

const goToPreviousPage = () => {
  pageIndex.value -= 1;
};

const goToNextPage = () => {
  pageIndex.value += 1;
};

const goToJob = (jobName: string) => {
  router.push({ name: "JobDetail", params: { jobName } });
};

let isFilterResetting = false;

// A filter change goes back to the first page and invalidates the status counts, a page change needs neither
watch([queryString, selectedStatus, selectedJobName, selectedUsername], async () => {
  if (pageIndex.value !== 0) {
    // The page reset triggers the pageIndex watcher, which must not fire a second fetch for the same filters
    isFilterResetting = true;
    pageIndex.value = 0;
  }
  await Promise.all([loadRuns(), loadStats()]);
});

watch(pageIndex, async () => {
  if (isFilterResetting) {
    isFilterResetting = false;
    return;
  }
  await loadRuns();
});

onIonViewWillEnter(async () => {
  if (route.query.queryString) queryString.value = route.query.queryString as string;
  if (route.query.status) selectedStatus.value = route.query.status as string;
  if (route.query.jobName) selectedJobName.value = route.query.jobName as string;
  if (route.query.username) selectedUsername.value = route.query.username as string;

  // Only needed to populate the Job filter options
  await jobStore.fetchJobs();
  await Promise.all([loadRuns(), loadStats()]);
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

.run-card {
  margin-block-end: var(--spacer-base);
}

.run-metrics ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

.accordion-content {
  padding: var(--spacer-base);
}

.accordion-content pre {
  overflow: auto;
  white-space: pre-wrap;
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
