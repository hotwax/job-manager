<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-title>{{ translate("Dashboard") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="isLoading" @click="refreshData">
            <ion-spinner v-if="isLoading" name="crescent" slot="icon-only" />
            <ion-icon v-else slot="icon-only" :icon="syncOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>


        <!-- KPI Metrics Grid -->
        <div class="metrics-grid ion-margin-bottom">
          <!-- Jobs Card -->
          <ion-card>
            <ion-card-header>
              <div class="kpi-header">
                <ion-card-subtitle>{{ translate("Job Schedules") }}</ion-card-subtitle>
                <ion-badge color="primary">{{ translate("Active") }}</ion-badge>
              </div>
              <ion-card-title>{{ scheduledJobsCount }} / {{ totalJobsCount }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="kpi-subtext">
                <ion-chip outline button @click="router.push('/catalog?status=PAUSED')">
                  <ion-label>{{ pausedJobsCount }} {{ translate("Paused") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="router.push('/catalog?status=NO_SCHEDULE')">
                  <ion-label>{{ noScheduleJobsCount }} {{ translate("No Schedule") }}</ion-label>
                </ion-chip>
                <ion-chip v-if="stuckJobsCount > 0" outline color="danger">
                  <ion-label>{{ stuckJobsCount }} {{ translate("Stuck") }}</ion-label>
                </ion-chip>
                <ion-chip v-if="failedJobsCount > 0" outline color="danger">
                  <ion-label>{{ failedJobsCount }} {{ translate("Failed Runs") }}</ion-label>
                </ion-chip>
                <ion-chip v-if="slowJobsCount > 0" outline color="warning">
                  <ion-label>{{ slowJobsCount }} {{ translate("Slow") }}</ion-label>
                </ion-chip>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- High-Priority Ingestion Card -->
          <ion-card>
            <ion-card-header>
              <div class="kpi-header">
                <ion-card-subtitle>
                  {{ translate("High-Priority Ingestion") }}
                  <span v-if="highPriorityLogsTimeSpan">
                    ({{ translate("Latest") }}<span v-if="highPriorityLogsTimeSpan">, {{ translate("since") }} {{ highPriorityLogsTimeSpan }}</span>)
                  </span>
                </ion-card-subtitle>
                <ion-badge :color="highPriorityFailedCount > 0 ? 'warning' : 'success'">
                  {{ highPriorityFailedCount > 0 ? translate("Warnings") : translate("Healthy") }}
                </ion-badge>
              </div>
              <ion-card-title>{{ highPriorityFailedCount }} {{ translate("Failed") }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="kpi-subtext">
                <ion-chip outline button @click="router.push('/file-history?statusId=DmlsPending,DmlsQueued,DmlsRunning&priority=HIGH')">
                  <ion-label>{{ highPriorityPendingCount }} {{ translate("Pending") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="router.push('/file-history?statusId=DmlsFinished&priority=HIGH')">
                  <ion-label>{{ highPrioritySuccessCount }} {{ translate("Finished") }}</ion-label>
                </ion-chip>
              </div>
              <div class="avg-time-display">
                <ion-icon :icon="timeOutline" />
                <span>{{ translate("Avg. Speed") }}: <strong>{{ highPriorityAvgTime }}</strong></span>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Standard Ingestion Card -->
          <ion-card>
            <ion-card-header>
              <div class="kpi-header">
                <ion-card-subtitle>
                  {{ translate("Standard Ingestion") }}
                  <span v-if="standardLogsTimeSpan">
                    ({{ translate("Latest") }}<span v-if="standardLogsTimeSpan">, {{ translate("since") }} {{ standardLogsTimeSpan }}</span>)
                  </span>
                </ion-card-subtitle>
                <ion-badge :color="standardFailedCount > 0 ? 'warning' : 'success'">
                  {{ standardFailedCount > 0 ? translate("Warnings") : translate("Healthy") }}
                </ion-badge>
              </div>
              <ion-card-title>{{ standardFailedCount }} {{ translate("Failed") }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="kpi-subtext">
                <ion-chip outline button @click="router.push('/file-history?statusId=DmlsPending,DmlsQueued,DmlsRunning&priority=NORMAL')">
                  <ion-label>{{ standardPendingCount }} {{ translate("Pending") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="router.push('/file-history?statusId=DmlsFinished&priority=NORMAL')">
                  <ion-label>{{ standardSuccessCount }} {{ translate("Finished") }}</ion-label>
                </ion-chip>
              </div>
              <div class="avg-time-display">
                <ion-icon :icon="timeOutline" />
                <span>{{ translate("Avg. Speed") }}: <strong>{{ standardAvgTime }}</strong></span>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Incoming Messages Card -->
          <ion-card>
            <ion-card-header>
              <div class="kpi-header">
                <ion-card-subtitle>
                  {{ translate("Incoming Messages") }}
                  <span v-if="incomingTimeSpan">
                    ({{ translate("Latest") }}<span v-if="incomingTimeSpan">, {{ translate("since") }} {{ incomingTimeSpan }}</span>)
                  </span>
                </ion-card-subtitle>
                <ion-badge :color="incomingErrorCount > 0 ? 'danger' : 'success'">
                  {{ incomingErrorCount > 0 ? translate("Action Required") : translate("Healthy") }}
                </ion-badge>
              </div>
              <ion-card-title>{{ incomingErrorCount }} {{ translate("Errors") }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="kpi-subtext">
                <ion-chip outline button @click="router.push('/system-messages?statusId=SmsgProduced&isOutgoing=N')">
                  <ion-label>{{ incomingPendingCount }} {{ translate("Queued") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="router.push('/system-messages?statusId=SmsgConsumed&isOutgoing=N')">
                  <ion-label>{{ incomingSuccessCount }} {{ translate("Consumed") }}</ion-label>
                </ion-chip>
              </div>
              <div class="avg-time-display">
                <ion-icon :icon="timeOutline" />
                <span>{{ translate("Avg. Speed") }}: <strong>{{ incomingAvgTime }}</strong></span>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Outgoing Payloads Card -->
          <ion-card>
            <ion-card-header>
              <div class="kpi-header">
                <ion-card-subtitle>
                  {{ translate("Outgoing Payloads") }}
                  <span v-if="outgoingTimeSpan">
                    ({{ translate("Latest") }}<span v-if="outgoingTimeSpan">, {{ translate("since") }} {{ outgoingTimeSpan }}</span>)
                  </span>
                </ion-card-subtitle>
                <ion-badge :color="outgoingErrorCount > 0 ? 'danger' : 'success'">
                  {{ outgoingErrorCount > 0 ? translate("Action Required") : translate("Healthy") }}
                </ion-badge>
              </div>
              <ion-card-title>{{ outgoingErrorCount }} {{ translate("Errors") }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="kpi-subtext">
                <ion-chip outline button @click="router.push('/system-messages?statusId=SmsgProduced&isOutgoing=Y')">
                  <ion-label>{{ outgoingPendingCount }} {{ translate("Queued") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="router.push('/system-messages?statusId=SmsgSent&isOutgoing=Y')">
                  <ion-label>{{ outgoingSuccessCount }} {{ translate("Sent") }}</ion-label>
                </ion-chip>
              </div>
              <div class="avg-time-display">
                <ion-icon :icon="timeOutline" />
                <span>{{ translate("Avg. Speed") }}: <strong>{{ outgoingAvgTime }}</strong></span>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Operational Queues Visualizer -->
        <ion-card class="ion-margin-bottom">
          <ion-card-header>
            <ion-card-title>{{ translate("Queue Operations Map") }}</ion-card-title>
            <ion-card-subtitle>{{ translate("Operational layout of file ingestion flows and message synchronization queues.") }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-grid class="ion-no-padding">
              <ion-row>
                <!-- Column 1: Bulk File Ingestion (MDM) -->
                <ion-col size="12" size-lg="6">
                  <div class="visualizer-section">
                    <h4>{{ translate("Bulk File Ingestion (MDM)") }}</h4>
                    <div class="visualizer-row">
                      <ion-item button detail @click="router.push('/file-history?priority=HIGH')" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="cloudUploadOutline" color="secondary" />
                        <ion-label>
                          {{ translate("High-Priority Queue") }}
                          <p>{{ highPriorityPendingCount }} {{ translate("Pending Files") }}</p>
                        </ion-label>
                      </ion-item>
                      <div class="arrow-container">
                        <ion-icon :icon="arrowForwardOutline" color="medium" />
                      </div>
                      <ion-item button detail @click="router.push('/file-history?priority=NORMAL')" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="cloudUploadOutline" color="medium" />
                        <ion-label>
                          {{ translate("Standard Queue") }}
                          <p>{{ standardPendingCount }} {{ translate("Pending Files") }}</p>
                        </ion-label>
                      </ion-item>
                    </div>
                  </div>
                </ion-col>

                <!-- Column 2: System Message Sync (Inbound/Outbound) -->
                <ion-col size="12" size-lg="6">
                  <div class="visualizer-section">
                    <h4>{{ translate("Message Synchronization Queue") }}</h4>
                    <div class="visualizer-row">
                      <ion-item button detail @click="router.push('/system-messages?isOutgoing=N')" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="documentOutline" color="success" />
                        <ion-label>
                          {{ translate("Inbound Queue") }}
                          <p>{{ incomingPendingCount }} {{ translate("Queued Inbound") }}</p>
                        </ion-label>
                      </ion-item>
                      <div class="arrow-container">
                        <ion-icon :icon="arrowForwardOutline" color="medium" />
                      </div>
                      <ion-item button detail @click="router.push('/system-messages?isOutgoing=Y')" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="cloudDownloadOutline" color="primary" />
                        <ion-label>
                          {{ translate("Outbound Queue") }}
                          <p>{{ outgoingPendingCount }} {{ translate("Queued Outbound") }}</p>
                        </ion-label>
                      </ion-item>
                    </div>
                  </div>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-card-content>
        </ion-card>

        <!-- Columns Split Panel -->
        <div class="columns-grid">
          <!-- Column 1: Actionable Alert Center (60%) -->
          <div class="alert-center">
            <!-- Service Jobs Diagnostics -->
            <ion-card v-if="stuckJobsCount > 0 || failedJobsCount > 0 || slowJobsCount > 0 || configErrorJobs.length > 0">
              <ion-card-header>
                <ion-card-title color="danger">{{ translate("Service Jobs Diagnostics") }}</ion-card-title>
                <ion-card-subtitle>{{ translate("Operational warnings, execution anomalies, and configuration issues.") }}</ion-card-subtitle>
              </ion-card-header>
              <ion-list lines="full">
                <!-- Stuck Executions -->
                <template v-if="stuckJobsCount > 0">
                  <ion-list-header>
                    <ion-label color="danger">{{ translate("Stuck Executions") }}</ion-label>
                  </ion-list-header>
                  <ion-item v-for="job in stuckJobs" :key="job.jobName">
                    <ion-icon slot="start" :icon="alertCircleOutline" color="danger" />
                    <ion-label class="ion-text-wrap">
                      {{ job.jobName }}
                      <p>{{ translate("Service") }}: {{ job.serviceName }}</p>
                      <p>
                        <ion-badge color="danger">
                          {{ translate("Active Duration") }}: {{ job.currentDuration }}
                        </ion-badge>
                        <ion-badge color="medium" class="ion-margin-start">
                          {{ translate("Avg. Duration") }}: {{ job.avgDuration }}
                        </ion-badge>
                      </p>
                      <p class="error-text ion-text-wrap" v-if="job.runMessage">{{ translate("Run Message") }}: {{ job.runMessage }}</p>
                      <p class="result-text ion-text-wrap" v-if="job.runResults">{{ translate("Run Results") }}: {{ formatJobResult(job.runResults) }}</p>
                    </ion-label>
                    <ion-buttons slot="end">
                      <ion-button fill="outline" color="primary" size="small" @click="router.push(`/job/${job.jobName}`)">
                        {{ translate("Edit") }}
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                </template>

                <!-- Failed Runs -->
                <template v-if="failedJobsCount > 0">
                  <ion-list-header>
                    <ion-label color="danger">{{ translate("Failed Runs") }}</ion-label>
                  </ion-list-header>
                  <ion-item v-for="job in failedRunJobs" :key="job.jobName">
                    <ion-icon slot="start" :icon="alertCircleOutline" color="danger" />
                    <ion-label class="ion-text-wrap">
                      {{ job.jobName }}
                      <p>{{ translate("Service") }}: {{ job.serviceName }}</p>
                      <p class="error-text ion-text-wrap" v-if="job.runMessage">{{ translate("Message") }}: {{ job.runMessage }}</p>
                      <p class="result-text ion-text-wrap" v-if="job.runResults">{{ translate("Results") }}: {{ formatJobResult(job.runResults) }}</p>
                    </ion-label>
                    <ion-buttons slot="end">
                      <ion-button fill="outline" color="primary" size="small" @click="router.push(`/job/${job.jobName}`)">
                        {{ translate("Edit") }}
                      </ion-button>
                      <ion-button fill="solid" color="success" size="small" @click="triggerJobRun(job.jobName)">
                        {{ translate("Run Now") }}
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                </template>

                <!-- Slow Executions -->
                <template v-if="slowJobsCount > 0">
                  <ion-list-header>
                    <ion-label color="warning">{{ translate("Slow Executions") }}</ion-label>
                  </ion-list-header>
                  <ion-item v-for="job in slowJobs" :key="job.jobName">
                    <ion-icon slot="start" :icon="timeOutline" color="warning" />
                    <ion-label class="ion-text-wrap">
                      {{ job.jobName }}
                      <p>{{ translate("Service") }}: {{ job.serviceName }}</p>
                      <p>
                        <ion-badge color="warning">
                          {{ translate("Last Duration") }}: {{ job.latestDuration }}
                        </ion-badge>
                        <ion-badge color="medium" class="ion-margin-start">
                          {{ translate("Avg. Duration") }}: {{ job.avgDuration }}
                        </ion-badge>
                      </p>
                      <p class="result-text ion-text-wrap" v-if="job.runResults">{{ translate("Results") }}: {{ formatJobResult(job.runResults) }}</p>
                    </ion-label>
                    <ion-buttons slot="end">
                      <ion-button fill="outline" color="primary" size="small" @click="router.push(`/job/${job.jobName}`)">
                        {{ translate("Edit") }}
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                </template>

                <!-- Configuration Errors -->
                <template v-if="configErrorJobs.length > 0">
                  <ion-list-header>
                    <ion-label color="danger">{{ translate("Configuration Errors") }}</ion-label>
                  </ion-list-header>
                  <ion-item v-for="job in configErrorJobs" :key="job.jobName">
                    <ion-icon slot="start" :icon="alertCircleOutline" color="danger" />
                    <ion-label class="ion-text-wrap">
                      {{ job.jobName }}
                      <p>{{ translate("Service") }}: {{ job.serviceName }}</p>
                      <p class="error-text ion-text-wrap" v-if="job.runtimeData?._ERROR_MESSAGE_">{{ translate("Runtime Error") }}: {{ job.runtimeData._ERROR_MESSAGE_ }}</p>
                    </ion-label>
                    <ion-buttons slot="end">
                      <ion-button fill="outline" color="primary" size="small" @click="router.push(`/job/${job.jobName}`)">
                        {{ translate("Edit") }}
                      </ion-button>
                    </ion-buttons>
                  </ion-item>
                </template>
              </ion-list>
            </ion-card>

            <!-- Errored System Messages Checklist -->
            <ion-card v-if="erroredMessages.length > 0">
              <ion-card-header>
                <ion-card-title color="danger">{{ translate("System Message Errors") }}</ion-card-title>
              </ion-card-header>
              <ion-list lines="full">
                <ion-item v-for="msg in erroredMessages" :key="msg.systemMessageId">
                  <ion-icon slot="start" :icon="alertCircleOutline" color="danger" />
                  <ion-label class="ion-text-wrap">
                    {{ getSystemMessageTypeName(msg.systemMessageTypeId) }}
                    <p>#{{ msg.systemMessageId }} | {{ translate("Remote") }}: {{ msg.systemMessageRemoteId || "-" }}</p>
                    <p class="error-text ion-text-wrap" v-if="msg.errorSummary">{{ msg.errorSummary }}</p>
                  </ion-label>
                  <ion-buttons slot="end">
                    <ion-button fill="outline" color="primary" size="small" @click="router.push(`/system-messages/${msg.systemMessageId}`)">
                      {{ translate("Detail") }}
                    </ion-button>
                  </ion-buttons>
                </ion-item>
              </ion-list>
            </ion-card>

            <!-- Crashed/Failed Ingestion Logs -->
            <ion-card v-if="erroredLogs.length > 0">
              <ion-card-header>
                <ion-card-title color="danger">{{ translate("Failed File Imports") }}</ion-card-title>
              </ion-card-header>
              <ion-list lines="full">
                <ion-item v-for="log in erroredLogs" :key="log.logId">
                  <ion-icon
                    slot="start"
                    :icon="log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0 ? warningOutline : alertCircleOutline"
                    :color="log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0 ? 'warning' : 'danger'"
                  />
                  <ion-label class="ion-text-wrap">
                    {{ log.fileName }}
                    <p>ID: {{ log.logId }} | {{ translate("Uploaded By") }}: {{ log.createdByUserLogin || "-" }}</p>
                    <p>
                      <span class="size-text">{{ getFileSize(log.fileSize) }}</span>
                      <span v-if="log.totalRecordCount != null" style="margin-left: var(--spacer-xs);">
                        | {{ translate("Failed") }}: {{ log.failedRecordCount || 0 }} / {{ translate("Total") }}: {{ log.totalRecordCount }}
                      </span>
                    </p>
                    <p>
                      <ion-badge :color="log.statusId === 'DmlsFinished' ? 'warning' : 'danger'" style="display: inline-flex; align-items: center; gap: 4px;">
                        <ion-icon :icon="log.statusId === 'DmlsFinished' ? warningOutline : alertCircleOutline" />
                        {{ log.statusId === 'DmlsFinished' ? translate('Finished with errors') : (utilStore.getStatusItemDesc(log.statusId) || log.statusId) }}
                      </ion-badge>
                    </p>
                  </ion-label>
                  <ion-buttons slot="end">
                    <ion-button fill="outline" color="primary" size="small" @click="router.push({ name: 'FileHistoryDetail', params: { id: log.logId } })">
                      {{ translate("View") }}
                    </ion-button>
                    <ion-button v-if="log.statusId === 'DmlsPending'" fill="clear" color="danger" size="small" @click="cancelDataManagerLog(log.configId, log.logId)">
                      {{ translate("Cancel") }}
                    </ion-button>
                  </ion-buttons>
                </ion-item>
              </ion-list>
            </ion-card>

            <!-- All Healthy State -->
            <ion-card v-if="stuckJobsCount === 0 && failedJobsCount === 0 && slowJobsCount === 0 && configErrorJobs.length === 0 && erroredMessages.length === 0 && erroredLogs.length === 0" class="ion-text-center">
              <ion-card-content class="ion-padding">
                <ion-icon :icon="checkmarkCircleOutline" color="success" style="font-size: 48px; margin-bottom: var(--spacer-xs);" />
                <h2>{{ translate("System is Healthy") }}</h2>
                <p>{{ translate("There are no errored system messages, failed ingestion logs, or failed integration jobs requiring immediate attention.") }}</p>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- Column 2: Chronological Activity Feed (40%) -->
          <div class="activity-feed">
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ translate("Recent Activity") }}</ion-card-title>
                <ion-card-subtitle>{{ translate("Timeline of recent operations and payload processing.") }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content class="ion-no-padding">
                <!-- Loading state -->
                <div v-if="isLoading && activityTimeline.length === 0" class="ion-text-center ion-padding">
                  <ion-spinner name="crescent" />
                  <p>{{ translate("Loading events...") }}</p>
                </div>
                <!-- Empty Timeline -->
                <div v-else-if="activityTimeline.length === 0" class="ion-text-center ion-padding">
                  <p>{{ translate("No recent activity found.") }}</p>
                </div>
                <!-- Events list -->
                <ion-list v-else>
                  <ion-list-header>
                    <ion-label color="medium">
                      {{ translate("Last Refreshed") }}: {{ lastRefreshedRelative }}
                    </ion-label>
                  </ion-list-header>
                  <ion-item v-for="event in activityTimeline" :key="event.id" button @click="handleEventClick(event)">
                    <ion-icon slot="start" :icon="event.icon" :color="event.statusColor" />
                    <ion-label class="ion-text-wrap">
                      <p class="overline">{{ event.timeRelative }}</p>
                      {{ event.title }}
                      <p>{{ event.description }}</p>
                    </ion-label>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </div>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButtons,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenuButton,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  onIonViewWillLeave,
  IonGrid,
  IonRow,
  IonCol,
  IonBadge
} from "@ionic/vue";
import {
  syncOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  documentOutline,
  cloudUploadOutline,
  cloudDownloadOutline,
  arrowForwardOutline,
  timeOutline,
  warningOutline
} from "ionicons/icons";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { DateTime } from "luxon";
import router from "@/router";
import { translate, emitter } from "@common";
import { useJobStore } from "@/store/jobs";
import { useSystemMessageStore } from "@/store/systemMessage";
import { useMdmConfigStore } from "@/store/mdmConfig";
import { useUtilStore } from "@/store/util";
import { getFileSize, showToast } from "@/utils";

const jobStore = useJobStore();
const systemMessageStore = useSystemMessageStore();
const mdmStore = useMdmConfigStore();
const utilStore = useUtilStore();

const isLoading = ref(false);

// Job stats
const jobs = computed(() => jobStore.getJobs);
const totalJobsCount = computed(() => jobs.value.length);
const scheduledJobsCount = computed(() => jobs.value.filter((job: any) => job.paused === 'N' && !!job.cronExpression).length);
const pausedJobsCount = computed(() => jobs.value.filter((job: any) => job.paused === 'Y').length);
const noScheduleJobsCount = computed(() => jobs.value.filter((job: any) => !job.cronExpression).length);

// Detailed run-based jobs diagnostics
const jobRunsMap = ref<Record<string, any[]>>({});

// Last refreshed delta tracking
const lastRefreshed = ref<DateTime>(DateTime.now());
const now = ref<DateTime>(DateTime.now());

const lastRefreshedRelative = computed(() => {
  return lastRefreshed.value.toRelative({ base: now.value }) || translate("Just now");
});

let refreshIntervalId: any = null;

onMounted(() => {
  refreshIntervalId = setInterval(() => {
    now.value = DateTime.now();
  }, 10000);
});

onUnmounted(() => {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
});

// Helper to calculate run duration in seconds
const getRunDuration = (run: any) => {
  if (!run.startTime || !run.endTime) return 0;
  const startDt = typeof run.startTime === 'number' ? DateTime.fromMillis(run.startTime) : DateTime.fromISO(run.startTime);
  const endDt = typeof run.endTime === 'number' ? DateTime.fromMillis(run.endTime) : DateTime.fromISO(run.endTime);
  if (!startDt.isValid || !endDt.isValid) return 0;
  const diff = endDt.diff(startDt, 'seconds').seconds;
  return diff > 0 ? diff : 0;
};

// Helper to calculate average duration of completed runs in the last day
const getJobLastDayAverageDuration = (jobName: string) => {
  const runs = jobRunsMap.value[jobName] || [];
  const completedRuns = runs.filter((run: any) => run.startTime && run.endTime);
  if (completedRuns.length === 0) return 0;

  const oneDayAgo = DateTime.now().minus({ days: 1 });
  const lastDayRuns = completedRuns.filter((run: any) => {
    const end = typeof run.endTime === 'number' ? DateTime.fromMillis(run.endTime) : DateTime.fromISO(run.endTime);
    return end.isValid && end >= oneDayAgo;
  });

  const targetRuns = lastDayRuns.length > 0 ? lastDayRuns : completedRuns;
  const total = targetRuns.reduce((sum, run) => sum + getRunDuration(run), 0);
  return total / targetRuns.length;
};

const formatJobResult = (results: any) => {
  if (!results) return "";
  const str = typeof results === 'object' ? JSON.stringify(results) : String(results);
  return str.length > 180 ? str.substring(0, 180) + "..." : str;
};

// 1. Stuck Executions (active run exceeds 3x average duration or > 2 hours)
const stuckJobs = computed(() => {
  const stuckList: any[] = [];
  const activeJobs = jobs.value.filter((job: any) => job.paused === 'N' && !!job.cronExpression);

  activeJobs.forEach((job: any) => {
    const runs = jobRunsMap.value[job.jobName] || [];
    const activeRun = runs.find((run: any) => run.startTime && !run.endTime);
    if (!activeRun) return;

    const startDt = typeof activeRun.startTime === 'number' ? DateTime.fromMillis(activeRun.startTime) : DateTime.fromISO(activeRun.startTime);
    if (!startDt.isValid) return;

    const currentDuration = DateTime.now().diff(startDt, 'seconds').seconds;
    const avgDuration = getJobLastDayAverageDuration(job.jobName);

    const isStuck = (avgDuration > 10 && currentDuration > Math.max(300, avgDuration * 3)) || currentDuration > 7200;

    if (isStuck) {
      stuckList.push({
        ...job,
        activeRunId: activeRun.jobRunId,
        currentDuration: formatDuration(currentDuration),
        avgDuration: formatDuration(avgDuration),
        runMessage: activeRun.messages,
        runResults: activeRun.results
      });
    }
  });
  return stuckList;
});

// 2. Slow Executions (latest completed run duration is > 1.5x average)
const slowJobs = computed(() => {
  const slowList: any[] = [];
  const activeJobs = jobs.value.filter((job: any) => job.paused === 'N' && !!job.cronExpression);

  activeJobs.forEach((job: any) => {
    if (stuckJobs.value.some((sj: any) => sj.jobName === job.jobName)) return;

    const runs = jobRunsMap.value[job.jobName] || [];
    const completedRuns = runs.filter((run: any) => run.startTime && run.endTime);
    if (completedRuns.length === 0) return;

    const latestRun = completedRuns[0];
    const latestDuration = getRunDuration(latestRun);

    const otherRuns = completedRuns.slice(1);
    if (otherRuns.length === 0) return;

    const total = otherRuns.reduce((sum, run) => sum + getRunDuration(run), 0);
    const avgDuration = total / otherRuns.length;

    const isSlow = latestDuration > 60 && avgDuration > 10 && latestDuration > avgDuration * 1.5;

    if (isSlow) {
      slowList.push({
        ...job,
        latestRunId: latestRun.jobRunId,
        latestDuration: formatDuration(latestDuration),
        avgDuration: formatDuration(avgDuration),
        runMessage: latestRun.messages,
        runResults: latestRun.results
      });
    }
  });
  return slowList;
});

// 3. Failed Executions (latest run has error)
const failedRunJobs = computed(() => {
  const failedList: any[] = [];
  const activeJobs = jobs.value.filter((job: any) => job.paused === 'N' && !!job.cronExpression);

  activeJobs.forEach((job: any) => {
    const runs = jobRunsMap.value[job.jobName] || [];
    const completedRuns = runs.filter((run: any) => run.startTime && run.endTime);
    if (completedRuns.length === 0) return;

    const latestRun = completedRuns[0];
    if (latestRun.hasError === 'Y') {
      failedList.push({
        ...job,
        latestRunId: latestRun.jobRunId,
        runMessage: latestRun.messages,
        runResults: latestRun.results,
        runErrors: latestRun.errors
      });
    }
  });
  return failedList;
});

// 4. Configuration/Definition Errors
const configErrorJobs = computed(() => {
  return jobs.value.filter((job: any) => job.runtimeData?._ERROR_MESSAGE_ || job.serviceName === '_NA_');
});

const stuckJobsCount = computed(() => stuckJobs.value.length);
const slowJobsCount = computed(() => slowJobs.value.length);
const failedJobsCount = computed(() => failedRunJobs.value.length);

// MDM Logs priority grouping (High priority has config.priority > 6)
const logs = computed(() => mdmStore.getLogs);

const getLogPriority = (log: any) => {
  const config = mdmStore.getConfigs.find((c: any) => c.configId === log.configId);
  return config?.priority ? Number(config.priority) : 0;
};

const highPriorityLogs = computed(() => logs.value.filter((log: any) => getLogPriority(log) > 6));
const standardLogs = computed(() => logs.value.filter((log: any) => getLogPriority(log) <= 6));

// Queue Depths (Pending / Queued / Running)
const highPriorityPendingCount = computed(() => highPriorityLogs.value.filter((log: any) => ['DmlsPending', 'DmlsQueued', 'DmlsRunning'].includes(log.statusId)).length);
const standardPendingCount = computed(() => standardLogs.value.filter((log: any) => ['DmlsPending', 'DmlsQueued', 'DmlsRunning'].includes(log.statusId)).length);

// Ingestion throughput in latest 50
const highPrioritySuccessCount = computed(() => highPriorityLogs.value.filter((log: any) => log.statusId === 'DmlsFinished').length);
const standardSuccessCount = computed(() => standardLogs.value.filter((log: any) => log.statusId === 'DmlsFinished').length);
const highPriorityFailedCount = computed(() => highPriorityLogs.value.filter((log: any) => ['DmlsCrashed', 'DmlsFailed'].includes(log.statusId) || (log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0)).length);
const standardFailedCount = computed(() => standardLogs.value.filter((log: any) => ['DmlsCrashed', 'DmlsFailed'].includes(log.statusId) || (log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0)).length);

// Ingestion Average Processing Time (Luxon end date - start date)
const getAvgProcessingTime = (logsList: any[]) => {
  const finishedLogs = logsList.filter((log: any) => log.statusId === 'DmlsFinished');
  if (finishedLogs.length === 0) return 0;
  const totalSeconds = finishedLogs.reduce((acc, log) => {
    const start = log.createdDate;
    const end = log.finishDateTime || log.lastUpdatedTxStamp;
    if (!start || !end) return acc;
    const startDt = typeof start === 'number' ? DateTime.fromMillis(start) : DateTime.fromISO(start);
    const endDt = typeof end === 'number' ? DateTime.fromMillis(end) : DateTime.fromISO(end);
    if (!startDt.isValid || !endDt.isValid) return acc;
    const diff = endDt.diff(startDt, 'seconds').seconds;
    return acc + (diff > 0 ? diff : 0);
  }, 0);
  return totalSeconds / finishedLogs.length;
};

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

const highPriorityAvgTime = computed(() => formatDuration(getAvgProcessingTime(highPriorityLogs.value)));
const standardAvgTime = computed(() => formatDuration(getAvgProcessingTime(standardLogs.value)));

// Errored Ingestion Logs checklist
const erroredLogs = computed(() => logs.value.filter((log: any) => ['DmlsCrashed', 'DmlsFailed'].includes(log.statusId) || (log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0)));
const failedLogsCount = computed(() => erroredLogs.value.length);
const pendingLogsCount = computed(() => logs.value.filter((log: any) => ['DmlsPending', 'DmlsQueued', 'DmlsRunning'].includes(log.statusId)).length);

// System Messages (Incoming vs Outgoing)
const systemMessages = computed(() => systemMessageStore.getSystemMessages);

const incomingMessages = computed(() => systemMessages.value.filter((msg: any) => msg.isOutgoing !== 'Y'));
const outgoingMessages = computed(() => systemMessages.value.filter((msg: any) => msg.isOutgoing === 'Y'));

// Incoming Stats
const incomingPendingCount = computed(() => incomingMessages.value.filter((msg: any) => ['SmsgProduced', 'SmsgCreated', 'SmsgSending'].includes(msg.statusId) && !(msg.statusId === 'SmsgProduced' && Number(msg.failCount) > 0)).length);
const incomingSuccessCount = computed(() => incomingMessages.value.filter((msg: any) => ['SmsgSent', 'SmsgConsumed', 'SmsgConfirmed'].includes(msg.statusId)).length);
const incomingErrorCount = computed(() => incomingMessages.value.filter((msg: any) => msg.statusId === 'SmsgError' || (msg.statusId === 'SmsgProduced' && Number(msg.failCount) > 0)).length);

// Outgoing Stats
const outgoingPendingCount = computed(() => outgoingMessages.value.filter((msg: any) => ['SmsgProduced', 'SmsgCreated', 'SmsgSending'].includes(msg.statusId) && !(msg.statusId === 'SmsgProduced' && Number(msg.failCount) > 0)).length);
const outgoingSuccessCount = computed(() => outgoingMessages.value.filter((msg: any) => ['SmsgSent', 'SmsgConsumed', 'SmsgConfirmed'].includes(msg.statusId)).length);
const outgoingErrorCount = computed(() => outgoingMessages.value.filter((msg: any) => msg.statusId === 'SmsgError' || (msg.statusId === 'SmsgProduced' && Number(msg.failCount) > 0)).length);

const erroredMessages = computed(() => systemMessages.value.filter((msg: any) => msg.statusId === 'SmsgError' || (msg.statusId === 'SmsgProduced' && Number(msg.failCount) > 0)));
const erroredMessagesCount = computed(() => erroredMessages.value.length);
const pendingMessagesCount = computed(() => systemMessages.value.filter((msg: any) => ['SmsgProduced', 'SmsgCreated', 'SmsgSending'].includes(msg.statusId) && !(msg.statusId === 'SmsgProduced' && Number(msg.failCount) > 0)).length);
const successMessagesCount = computed(() => systemMessages.value.filter((msg: any) => msg.statusId === 'SmsgSent' || msg.statusId === 'SmsgConsumed' || msg.statusId === 'SmsgConfirmed').length);

// Inbound/Outbound Message Average Processing Time
// Inbound/Outbound Message Average Processing Time
const getAvgMessageProcessingTime = (messagesList: any[]) => {
  const finishedMessages = messagesList.filter((msg: any) => ['SmsgSent', 'SmsgConsumed', 'SmsgConfirmed'].includes(msg.statusId));
  if (finishedMessages.length === 0) return 0;
  const measurableMessages = finishedMessages.filter((msg: any) => msg.initDate && msg.processedDate);
  if (measurableMessages.length === 0) return 0;
  const totalSeconds = measurableMessages.reduce((acc, msg) => {
    const start = msg.initDate;
    const end = msg.processedDate;
    const startDt = typeof start === 'number' ? DateTime.fromMillis(start) : DateTime.fromISO(start);
    const endDt = typeof end === 'number' ? DateTime.fromMillis(end) : DateTime.fromISO(end);
    if (!startDt.isValid || !endDt.isValid) return acc;
    const diff = endDt.diff(startDt, 'seconds').seconds;
    return acc + (diff > 0 ? diff : 0);
  }, 0);
  return totalSeconds / measurableMessages.length;
};


const incomingAvgTime = computed(() => formatDuration(getAvgMessageProcessingTime(incomingMessages.value)));
const outgoingAvgTime = computed(() => formatDuration(getAvgMessageProcessingTime(outgoingMessages.value)));

// Time span bounds helper
const getRelativeTimeSpan = (list: any[], timeFieldGetter: (item: any) => any) => {
  if (list.length === 0) return "";
  const dates = list
    .map(timeFieldGetter)
    .filter(Boolean)
    .map((time: any) => typeof time === "number" ? DateTime.fromMillis(time) : DateTime.fromISO(time))
    .filter((dt: DateTime) => dt.isValid);
  if (dates.length === 0) return "";
  const oldest = DateTime.min(...dates);
  return oldest ? oldest.toRelative() : "";
};

const incomingTimeSpan = computed(() => getRelativeTimeSpan(incomingMessages.value, (msg) => msg.initDate));
const outgoingTimeSpan = computed(() => getRelativeTimeSpan(outgoingMessages.value, (msg) => msg.initDate));
const highPriorityLogsTimeSpan = computed(() => getRelativeTimeSpan(highPriorityLogs.value, (log) => log.createdDate));
const standardLogsTimeSpan = computed(() => getRelativeTimeSpan(standardLogs.value, (log) => log.createdDate));

const getSystemMessageTypeName = (typeId: string) => {
  const type = systemMessageStore.getSystemMessageTypes.find((t: any) => t.systemMessageTypeId === typeId);
  return type?.description || typeId;
};

// Activity feed chronology
const activityTimeline = computed(() => {
  const list: any[] = [];

  // Parse System Messages
  systemMessages.value.forEach((msg: any) => {
    const time = msg.lastAttemptDate || msg.initDate;
    if (!time) return;
    const date = typeof time === "number" ? DateTime.fromMillis(time) : DateTime.fromISO(time);
    
    let icon = documentOutline;
    let color = "primary";
    if (msg.statusId === "SmsgError") {
      icon = alertCircleOutline;
      color = "danger";
    } else if (msg.statusId === "SmsgSent" || msg.statusId === "SmsgConsumed") {
      icon = checkmarkCircleOutline;
      color = "success";
    }

    list.push({
      id: `msg-${msg.systemMessageId}`,
      type: "message",
      targetId: msg.systemMessageId,
      title: `${getSystemMessageTypeName(msg.systemMessageTypeId)} (${msg.isOutgoing === 'Y' ? translate('Outbound') : translate('Inbound')})`,
      description: `#${msg.systemMessageId} | Remote: ${msg.systemMessageRemoteId || "Internal"} | Status: ${utilStore.getStatusItemDesc(msg.statusId) || msg.statusId}`,
      date,
      timeRelative: date.toRelative(),
      icon,
      statusColor: color
    });
  });

  // Parse Ingestion Logs
  logs.value.forEach((log: any) => {
    const time = log.createdDate;
    if (!time) return;
    const date = typeof time === "number" ? DateTime.fromMillis(time) : DateTime.fromISO(time);

    const hasErrorRecords = Number(log.failedRecordCount || 0) > 0;

    let icon = cloudUploadOutline;
    let color = "secondary";
    let statusText = utilStore.getStatusItemDesc(log.statusId) || log.statusId;

    if (["DmlsFailed", "DmlsCrashed"].includes(log.statusId)) {
      icon = alertCircleOutline;
      color = "danger";
    } else if (log.statusId === "DmlsFinished") {
      if (hasErrorRecords) {
        icon = warningOutline;
        color = "warning";
        statusText = translate("Finished with errors");
      } else {
        icon = checkmarkCircleOutline;
        color = "success";
      }
    }

    const priorityVal = getLogPriority(log);
    const queueName = priorityVal > 6 ? translate("High-Priority") : translate("Standard");

    let recordStats = "";
    if (log.totalRecordCount != null) {
      recordStats = ` | ${translate("Failed")}: ${log.failedRecordCount || 0} / ${translate("Total")}: ${log.totalRecordCount}`;
    }

    list.push({
      id: `log-${log.logId}`,
      type: "log",
      targetId: log.logId,
      title: `${log.fileName} (${queueName})`,
      description: `File processed: ${getFileSize(log.fileSize)}${recordStats} | Status: ${statusText}`,
      date,
      timeRelative: date.toRelative(),
      icon,
      statusColor: color
    });
  });

  // Sort newest first
  return list.sort((a, b) => b.date.toMillis() - a.date.toMillis()).slice(0, 15);
});

const handleEventClick = (event: any) => {
  if (event.type === "message") {
    router.push(`/system-messages/${event.targetId}`);
  } else if (event.type === "log") {
    router.push({ name: "FileHistoryDetail", params: { id: event.targetId } });
  }
};

const triggerJobRun = async (jobName: string) => {
  try {
    await jobStore.runNow(jobName);
    showToast(translate("Job execution triggered successfully."));
    await refreshData();
  } catch (error) {
    showToast(translate("Failed to execute job."));
  }
};

const cancelDataManagerLog = async (configId: string, logId: string) => {
  try {
    await mdmStore.cancelDataManagerLog(configId, logId);
    showToast(translate("Data manager log cancelled."));
    await refreshData();
  } catch (error) {
    showToast(translate("Failed to cancel data manager log."));
  }
};

const refreshData = async () => {
  isLoading.value = true;
  try {
    await Promise.allSettled([
      jobStore.fetchJobs(),
      systemMessageStore.fetchSystemMessages({ pageSize: 50 }),
      systemMessageStore.fetchSystemMessageTypes(),
      mdmStore.fetchDataManagerLogs({ pageSize: 50 }),
      mdmStore.fetchConfigs(),
      utilStore.fetchStatusItemsByType("SystemMessage"),
      utilStore.fetchStatusItemsByType("DataManagerLog")
    ]);

    // Fetch run history for active scheduled jobs in parallel to diagnose stuck/slow run anomalies
    const activeJobs = jobs.value.filter((job: any) => job.paused === 'N' && !!job.cronExpression);
    if (activeJobs.length > 0) {
      await Promise.allSettled(
        activeJobs.map(async (job: any) => {
          try {
            const runs = await jobStore.fetchJobRuns(job.jobName, { pageSize: 15, pageIndex: 0 });
            jobRunsMap.value[job.jobName] = runs;
          } catch (err) {
            console.error(`Failed to fetch run history for ${job.jobName}`, err);
          }
        })
      );
    }
  } catch (err) {
    console.error("Dashboard refresh failed", err);
  } finally {
    lastRefreshed.value = DateTime.now();
    now.value = DateTime.now();
    isLoading.value = false;
  }
};

onIonViewWillEnter(async () => {
  emitter.on("productStoreUpdated", refreshData);
  await refreshData();
});

onIonViewWillLeave(() => {
  emitter.off("productStoreUpdated", refreshData);
});
</script>

<style scoped>


.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacer-sm);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacer-2xs);
  gap: var(--spacer-xs);
}

.kpi-header ion-badge {
  flex-shrink: 0;
  white-space: nowrap;
}

.kpi-subtext {
  display: flex;
  gap: var(--spacer-xs);
  margin-top: var(--spacer-xs);
  flex-wrap: wrap;
}

.avg-time-display {
  display: flex;
  align-items: center;
  margin-top: var(--spacer-xs);
  font-size: 13px;
  color: var(--ion-color-medium);
}

.avg-time-display ion-icon {
  margin-right: var(--spacer-2xs);
  font-size: 16px;
}

.visualizer-section {
  padding: var(--spacer-xs);
}

.visualizer-section h4 {
  margin: 0 0 var(--spacer-xs) 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-medium);
}

.visualizer-row {
  display: flex;
  align-items: center;
  gap: var(--spacer-xs);
}

.visualizer-item {
  flex: 1;
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
}

.arrow-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacer-2xs);
}

.columns-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacer-sm);
}

.error-text {
  color: var(--ion-color-danger);
}

@media (min-width: 991px) {
  .columns-grid {
    grid-template-columns: 3fr 2fr;
  }
}
</style>
