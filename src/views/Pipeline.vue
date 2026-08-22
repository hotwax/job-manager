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
                <ion-chip outline button @click="router.push('/catalog?status=DRAFT')">
                  <ion-label>{{ draftJobsCount }} {{ translate("Draft") }}</ion-label>
                </ion-chip>
                <ion-chip v-if="stuckJobsCount > 0" outline color="danger" :button="stuckJobs.length === 1" @click="openSingleJobRun(stuckJobs, 'activeRunId')">
                  <ion-label>{{ stuckJobsCount }} {{ translate("Stuck") }}</ion-label>
                </ion-chip>
                <ion-chip v-if="failedJobsCount > 0" outline color="danger" :button="failedRunJobs.length === 1" @click="openSingleJobRun(failedRunJobs, 'latestRunId')">
                  <ion-label>{{ failedJobsCount }} {{ translate("Failed Runs") }}</ion-label>
                </ion-chip>
                <ion-chip v-if="slowJobsCount > 0" outline color="warning" :button="slowJobs.length === 1" @click="openSingleJobRun(slowJobs, 'latestRunId')">
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
                <ion-chip v-if="highPriorityFailedCount > 0" outline button color="warning" @click="openFailedFileHistory('HIGH', highPriorityWindowStart)">
                  <ion-icon :icon="warningOutline" />
                  <ion-label>{{ translate("View") }} {{ highPriorityFailedCount }} {{ translate("Failed") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="openFileHistory({ statusId: MDM_PENDING_STATUSES.join(','), priority: 'HIGH' })">
                  <ion-label>{{ highPriorityPendingCount }} {{ translate("Pending") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="openFileHistory({ statusId: 'DmlsFinished', priority: 'HIGH' })">
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
                <ion-chip v-if="standardFailedCount > 0" outline button color="warning" @click="openFailedFileHistory('NORMAL', standardWindowStart)">
                  <ion-icon :icon="warningOutline" />
                  <ion-label>{{ translate("View") }} {{ standardFailedCount }} {{ translate("Failed") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="openFileHistory({ statusId: MDM_PENDING_STATUSES.join(','), priority: 'NORMAL' })">
                  <ion-label>{{ standardPendingCount }} {{ translate("Pending") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="openFileHistory({ statusId: 'DmlsFinished', priority: 'NORMAL' })">
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
                <ion-chip outline button @click="openSystemMessages({ statusId: 'SmsgProduced', isOutgoing: 'N' })">
                  <ion-label>{{ incomingPendingCount }} {{ translate("Queued") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="openSystemMessages({ statusId: 'SmsgConsumed', isOutgoing: 'N' })">
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
                <ion-chip outline button @click="openSystemMessages({ statusId: 'SmsgProduced', isOutgoing: 'Y' })">
                  <ion-label>{{ outgoingPendingCount }} {{ translate("Queued") }}</ion-label>
                </ion-chip>
                <ion-chip outline button @click="openSystemMessages({ statusId: 'SmsgSent', isOutgoing: 'Y' })">
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
            <div class="visualizer-grid">
                <!-- Column 1: Bulk File Ingestion (MDM) -->
                  <div class="visualizer-section">
                    <h4>{{ translate("Bulk File Ingestion (MDM)") }}</h4>
                    <div class="visualizer-row">
                      <ion-item button detail @click="openFileHistory({ statusId: MDM_PENDING_STATUSES.join(','), priority: 'HIGH' })" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="cloudUploadOutline" color="secondary" />
                        <ion-label>
                          {{ translate("High-Priority Queue") }}
                          <p>{{ highPriorityPendingCount }} {{ translate("Pending Files") }}</p>
                        </ion-label>
                      </ion-item>
                      <div class="arrow-container">
                        <ion-icon :icon="arrowForwardOutline" color="medium" />
                      </div>
                      <ion-item button detail @click="openFileHistory({ statusId: MDM_PENDING_STATUSES.join(','), priority: 'NORMAL' })" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="cloudUploadOutline" color="medium" />
                        <ion-label>
                          {{ translate("Standard Queue") }}
                          <p>{{ standardPendingCount }} {{ translate("Pending Files") }}</p>
                        </ion-label>
                      </ion-item>
                    </div>
                  </div>

                <!-- Column 2: System Message Sync (Inbound/Outbound) -->
                  <div class="visualizer-section">
                    <h4>{{ translate("Message Synchronization Queue") }}</h4>
                    <div class="visualizer-row">
                      <ion-item button detail @click="openSystemMessages({ statusId: 'SmsgProduced', isOutgoing: 'N' })" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="documentOutline" color="success" />
                        <ion-label>
                          {{ translate("Inbound Queue") }}
                          <p>{{ incomingPendingCount }} {{ translate("Queued Inbound") }}</p>
                        </ion-label>
                      </ion-item>
                      <div class="arrow-container">
                        <ion-icon :icon="arrowForwardOutline" color="medium" />
                      </div>
                      <ion-item button detail @click="openSystemMessages({ statusId: 'SmsgProduced', isOutgoing: 'Y' })" lines="none" class="visualizer-item">
                        <ion-icon slot="start" :icon="cloudDownloadOutline" color="primary" />
                        <ion-label>
                          {{ translate("Outbound Queue") }}
                          <p>{{ outgoingPendingCount }} {{ translate("Queued Outbound") }}</p>
                        </ion-label>
                      </ion-item>
                    </div>
                  </div>
            </div>
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
                      <ion-button fill="outline" color="primary" size="small" @click="openJobRunHistory(job.jobName, job.activeRunId)">
                        {{ translate("View run") }}
                      </ion-button>
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
                      <ion-button fill="outline" color="primary" size="small" @click="openJobRunHistory(job.jobName, job.latestRunId)">
                        {{ translate("View run") }}
                      </ion-button>
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
                      <ion-button fill="outline" color="primary" size="small" @click="openJobRunHistory(job.jobName, job.latestRunId)">
                        {{ translate("View run") }}
                      </ion-button>
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
                    <p v-if="getLogRunTimeRelative(log)" class="overline" :title="getLogRunTimeExact(log)">
                      {{ getLogRunTimeLabel(log) }} {{ getLogRunTimeRelative(log) }}
                    </p>
                    {{ getLogFileName(log) }}
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
import { translate, emitter, commonUtil } from "@common";
import { useJobStore } from "@/store/jobs";
import { useSystemMessageStore } from "@/store/systemMessage";
import { useMdmConfigStore } from "@/store/mdmConfig";
import { useUtilStore } from "@/store/util";
import { MDM_PENDING_STATUSES, getFileSize, getLogFileName, showToast } from "@/utils";
import { useDashboardProjections, formatJobResult, getRelativeTimeSpan } from "@/composables/useDashboardProjections";

const jobStore = useJobStore();
const systemMessageStore = useSystemMessageStore();
const mdmStore = useMdmConfigStore();
const utilStore = useUtilStore();

const isLoading = ref(false);

// Job stats
const jobs = computed(() => jobStore.getJobs);


// Detailed run-based jobs diagnostics
const jobRunsMap = ref<Record<string, any[]>>({});

// Last refreshed delta tracking
const lastRefreshed = ref<DateTime>(DateTime.now());
const now = ref<DateTime>(DateTime.now());

const lastRefreshedRelative = computed(() => {
  return lastRefreshed.value.toRelative({ base: now.value }) || translate("Just now");
});

let refreshIntervalId: any = null;


const {
  jobProjections,
  logProjections,
  messageProjections,
  activityTimeline,
  getSystemMessageTypeName
} = useDashboardProjections(
  computed(() => jobStore.getJobs),
  jobRunsMap,
  computed(() => mdmStore.getLogs),
  computed(() => mdmStore.getConfigs),
  computed(() => systemMessageStore.getSystemMessages),
  computed(() => systemMessageStore.getSystemMessageTypes),
  (statusId) => utilStore.getStatusItemDesc(statusId)
);

const totalJobsCount = computed(() => jobProjections.value.totalJobsCount);
const scheduledJobsCount = computed(() => jobProjections.value.scheduledJobsCount);
const pausedJobsCount = computed(() => jobProjections.value.pausedJobsCount);
const noScheduleJobsCount = computed(() => jobProjections.value.noScheduleJobsCount);
const draftJobsCount = computed(() => jobProjections.value.draftJobsCount);

const stuckJobs = computed(() => jobProjections.value.stuckJobs);
const slowJobs = computed(() => jobProjections.value.slowJobs);
const failedRunJobs = computed(() => jobProjections.value.failedRunJobs);
const configErrorJobs = computed(() => jobProjections.value.configErrorJobs);
const stuckJobsCount = computed(() => jobProjections.value.stuckJobsCount);
const slowJobsCount = computed(() => jobProjections.value.slowJobsCount);
const failedJobsCount = computed(() => jobProjections.value.failedJobsCount);

const highPriorityPendingCount = computed(() => logProjections.value.highPriorityPendingCount);
const standardPendingCount = computed(() => logProjections.value.standardPendingCount);
const highPrioritySuccessCount = computed(() => logProjections.value.highPrioritySuccessCount);
const standardSuccessCount = computed(() => logProjections.value.standardSuccessCount);
const highPriorityFailedCount = computed(() => logProjections.value.highPriorityFailedCount);
const standardFailedCount = computed(() => logProjections.value.standardFailedCount);
const highPriorityAvgTime = computed(() => logProjections.value.highPriorityAvgTime);
const standardAvgTime = computed(() => logProjections.value.standardAvgTime);
const erroredLogs = computed(() => logProjections.value.erroredLogs);
const failedLogsCount = computed(() => logProjections.value.failedLogsCount);
const pendingLogsCount = computed(() => logProjections.value.pendingLogsCount);
const highPriorityWindowStart = computed(() => logProjections.value.highPriorityWindowStart);
const standardWindowStart = computed(() => logProjections.value.standardWindowStart);

const incomingPendingCount = computed(() => messageProjections.value.incomingPendingCount);
const incomingSuccessCount = computed(() => messageProjections.value.incomingSuccessCount);
const incomingErrorCount = computed(() => messageProjections.value.incomingErrorCount);
const outgoingPendingCount = computed(() => messageProjections.value.outgoingPendingCount);
const outgoingSuccessCount = computed(() => messageProjections.value.outgoingSuccessCount);
const outgoingErrorCount = computed(() => messageProjections.value.outgoingErrorCount);
const erroredMessages = computed(() => messageProjections.value.erroredMessages);
const erroredMessagesCount = computed(() => messageProjections.value.erroredMessagesCount);
const pendingMessagesCount = computed(() => messageProjections.value.pendingMessagesCount);
const successMessagesCount = computed(() => messageProjections.value.successMessagesCount);
const incomingAvgTime = computed(() => messageProjections.value.incomingAvgTime);
const outgoingAvgTime = computed(() => messageProjections.value.outgoingAvgTime);
onMounted(() => {
  refreshIntervalId = setInterval(() => {
    now.value = DateTime.now();
  }, 10000);
});

onUnmounted(() => {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
});





// Helper to calculate average duration of completed runs in the last day





// Every dashboard number is a drill-down: the chip or tile shows a count and the
// destination list has to answer "which ones?" with the same filter that produced
// the count. The status groups and route builders below are the single definition
// both sides use, so a count can never drift from the list it links to.
const openFileHistory = (query: Record<string, string>) => router.push({ name: "FileHistory", query });

const openSystemMessages = (query: Record<string, string>) => router.push({ name: "SystemMessageMonitor", query });

// A chip counting anomalous jobs can only drill in when it resolves to a single job.
// With several, the diagnostics list below enumerates them with their own run links.
const openSingleJobRun = (anomalousJobs: any[], runIdField: string) => {
  if (anomalousJobs.length !== 1) return;
  openJobRunHistory(anomalousJobs[0].jobName, anomalousJobs[0][runIdField]);
};

// Opens the job straight on its run history. A jobRunId narrows that history to
// the single run behind the count the user clicked.
const openJobRunHistory = (jobName: string, jobRunId?: string) => router.push({
  name: "JobDetail",
  params: { jobName },
  query: { tab: "history", ...(jobRunId ? { jobRunId } : {}) }
});

// MDM Logs priority grouping (High priority has config.priority > 6)
const logs = computed(() => mdmStore.getLogs);

const getLogPriority = (log: any) => {
  const config = mdmStore.getConfigs.find((c: any) => c.configId === log.configId);
  return config?.priority ? Number(config.priority) : 0;
};



// Imports report their run window in millis. The finish stamp is the definitive
// "when did this run", falling back to the start stamp and then the upload stamp
// for imports that failed before they began.
const getLogRunTimeStamp = (log: any) => log.finishDateTime || log.startDateTime || log.createdDate;

const getLogRunTimeLabel = (log: any) => {
  if (log.finishDateTime) return translate("Finished");
  if (log.startDateTime) return translate("Started");
  return translate("Uploaded");
};

// Based on the ticking `now` so the age stays accurate without a data refetch.
const getLogRunTimeRelative = (log: any) => {
  const stamp = getLogRunTimeStamp(log);
  if (!stamp) return "";
  const date = typeof stamp === "number" ? DateTime.fromMillis(stamp) : DateTime.fromISO(stamp);
  return date.isValid ? (date.toRelative({ base: now.value }) || "") : "";
};

const getLogRunTimeExact = (log: any) => {
  const stamp = getLogRunTimeStamp(log);
  return stamp ? commonUtil.getDateTimeWithOrdinalSuffix(stamp) : "";
};

// System Messages (Incoming vs Outgoing)
const systemMessages = computed(() => systemMessageStore.getSystemMessages);



// The dashboard only holds the newest slice of logs and messages, so every count on it
// is really "within this window". getOldestMillis exposes that boundary once: the card
// subtitle states it, and the drill-down link carries it as a filter.




const incomingTimeSpan = computed(() => getRelativeTimeSpan(messageProjections.value.incomingMessages, (msg) => msg.initDate, now.value));
const outgoingTimeSpan = computed(() => getRelativeTimeSpan(messageProjections.value.outgoingMessages, (msg) => msg.initDate, now.value));
const highPriorityLogsTimeSpan = computed(() => getRelativeTimeSpan(logProjections.value.highPriorityLogs, (log) => log.createdDate, now.value));

const openFailedFileHistory = (priority: string, windowStart: number) => openFileHistory({
  hasError: "Y",
  priority,
  ...(windowStart ? { createdDateFrom: String(windowStart) } : {})
});
const standardLogsTimeSpan = computed(() => getRelativeTimeSpan(logProjections.value.standardLogs, (log) => log.createdDate, now.value));



// Activity feed chronology


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

/* The two flows sit side by side while each still has room for a readable pair, and drop
   to block flow before that. min(100%, …) keeps the track from overflowing a narrow phone. */
.visualizer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: var(--spacer-sm);
}

.visualizer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacer-xs);
}

/* A real flex-basis rather than flex: 1 (basis 0), which let the queue boxes shrink until
   their labels broke one word per line. Below the basis the pair wraps and each box takes
   the full row instead of being squeezed. */
.visualizer-item {
  flex: 1 1 180px;
  border: 1px solid var(--ion-color-light);
  border-radius: 8px;
}

.arrow-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--spacer-2xs);
}

/* minmax(0, …) rather than a bare fr: a grid item's default min-width is auto, so the
   track cannot shrink below its content's min-content width. The diagnostics column
   carries unbreakable strings (service names like
   co.hotwax.rule.DecisionRuleServices.run#RuleGroup, file names, message ids) whose
   min-content ran to 691px, which overflowed the row and left ion-content clipping the
   activity feed off the right edge. */
.columns-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--spacer-sm);
}

.error-text {
  color: var(--ion-color-danger);
}

@media (min-width: 991px) {
  .columns-grid {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }
}
</style>
