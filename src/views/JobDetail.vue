<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/catalog"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ job?.jobName || translate('Job Details') }}</ion-title>
        <ion-buttons v-if="job.paused" slot="end">
          <ion-button @click="togglePause" :color="job.paused === 'Y' ? 'warning' : 'success'">
            <ion-icon :icon="job.paused === 'Y' ? playOutline : pauseOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Loading State -->
      <div v-if="isLoading">
        <div class="job-context-header ion-padding">
          <ion-skeleton-text animated style="width: 50%; height: 32px;" class="ion-no-margin" />
          <p><ion-skeleton-text animated style="width: 80%;" /></p>
          <div class="category-chips">
            <ion-skeleton-text animated style="width: 60px; height: 26px; border-radius: 13px;" v-for="i in 2" :key="i" />
          </div>
        </div>

        <div class="sticky-segments">
          <ion-segment mode="md">
            <ion-segment-button value="1"><ion-label><ion-skeleton-text animated style="width: 60px" /></ion-label></ion-segment-button>
            <ion-segment-button value="2"><ion-label><ion-skeleton-text animated style="width: 60px" /></ion-label></ion-segment-button>
            <ion-segment-button value="3"><ion-label><ion-skeleton-text animated style="width: 60px" /></ion-label></ion-segment-button>
          </ion-segment>
        </div>

        <div class="dashboard-grid ion-padding">
          <ion-card class="dashboard-card" v-for="i in 4" :key="i">
            <ion-card-header>
              <ion-card-title><ion-skeleton-text animated style="width: 40%" /></ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item v-for="j in 2" :key="j">
                  <ion-label>
                    <p><ion-skeleton-text animated style="width: 30%" /></p>
                    <ion-skeleton-text animated style="width: 70%" />
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <div v-else-if="job && job.jobName">
        <!-- Original Header content -->
        <div class="header-with-action">
          <div class="job-context-header ion-padding">
            <p class="overline">{{ job.paused === "Y" ? translate("Paused") : translate("Enabled") }}</p>
            <h1 class="ion-no-margin">{{ job.jobName }}</h1>
            <p class="ion-text-wrap text-medium ion-margin-bottom">{{ job.description || translate("No description available") }}</p>
            <div class="category-chips">
              <ion-chip v-for="category in jobCategories" :key="category.productCategoryId" color="medium" outline>
                {{ category.categoryName }}
              </ion-chip>
              <ion-chip v-if="!jobCategories.length" color="medium" outline>
                {{ translate("Uncategorized") }}
              </ion-chip>
            </div>
          </div>

          <div class="metadata">
            <ion-badge color="dark" v-if="job.paused === 'N' && job?.nextExecutionDateTime">{{ translate("running") }} {{ timeTillJob(job.nextExecutionDateTime) }}</ion-badge>
            <ion-button size="small" fill="clear" @click="runNow">
              <ion-icon slot="start" :icon="flashOutline" />
              {{ translate("Run Now") }}
            </ion-button>
          </div>
        </div>

        <ion-segment v-model="activeTab">
          <ion-segment-button value="overview">
            <ion-label>{{ translate("Overview") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="parameters">
            <ion-label>{{ translate("Parameters") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history">
            <ion-label>{{ translate("History") }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div class="tabs-content">
          <div v-if="activeTab === 'overview'" class="dashboard-grid ion-padding">
            <!-- Technical Details Card -->
            <ion-card class="dashboard-card">
              <ion-card-header>
                <ion-card-title>{{ translate("Job Info") }}</ion-card-title>
              </ion-card-header>
              <ion-card-content class="ion-no-padding">
                <ion-list lines="none">
                  <ion-list-header color="light">
                    <ion-label>{{ translate("Technical Details") }}</ion-label>
                  </ion-list-header>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Service Name')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.serviceName"
                    />
                  </ion-item>
                  <ion-item v-if="job.topic">
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Topic')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.topic"
                    />
                  </ion-item>
                  <ion-item v-if="job.jobTypeEnumId">
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Job Type')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.jobTypeEnumId"
                    />
                  </ion-item>

                  <ion-list-header color="light">
                    <ion-label>{{ translate("Execution Settings") }}</ion-label>
                  </ion-list-header>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Priority')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.priority"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Transaction Timeout')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.transactionTimeout ? `${job.transactionTimeout} ${translate('seconds')}` : '-'"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Min Retry')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.minRetryTime ? `${job.minRetryTime} ${translate('min')}` : '-'"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Lock Limit')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.expireLockTime ? `${job.expireLockTime} ${translate('min')}` : '-'"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Local Only')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.localOnly === 'Y' ? translate('Yes') : translate('No')"
                    />
                  </ion-item>

                  <ion-list-header color="light">
                    <ion-label>{{ translate("System Metadata") }}</ion-label>
                  </ion-list-header>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Product Id')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.instanceOfProductId"
                    />
                  </ion-item>
                  <ion-item v-if="job.instanceOfProductId">
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Product')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="product.productName"
                    />
                  </ion-item>
                  <ion-item v-if="job.parentJobName">
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Parent Job')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.parentJobName"
                    />
                  </ion-item>
                  <ion-item v-if="job.permissionGroupId">
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Permission Group')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.permissionGroupId"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Created')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="getDateAndTime(job.createdStamp)"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Updated')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="getDateAndTime(job.lastUpdatedStamp)"
                    />
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>

            <!-- Schedule Card -->
            <ion-card class="dashboard-card">
              <ion-card-header>
                <ion-card-title class="header-with-action">
                  {{ translate("Schedule") }}
                  <ion-button fill="clear" @click="editSchedule()">{{ translate("EDIT") }}</ion-button>
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none">
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Cron Expression')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.cronExpression || '-'"
                      :helper-text="getCronString(job.cronExpression)"
                    />
                  </ion-item>
                  <ion-item>
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Repeat Count')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="job.repeatCount === -1 ? translate('Infinite') : job.repeatCount || '-'"
                    />
                  </ion-item>
                  <ion-item v-if="job.fromDate">
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Valid From')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="getDateAndTime(job.fromDate)"
                    />
                  </ion-item>
                  <ion-item v-if="job.thruDate">
                    <ion-input
                      class="job-info"
                      type="text"
                      :label="translate('Valid To')"
                      label-placement="stacked"
                      fill="outline"
                      readonly
                      :value="getDateAndTime(job.thruDate)"
                    />
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- PARAMETERS TAB -->
          <div v-if="activeTab === 'parameters'">
            <ion-card>
              <ion-card-header>
                <ion-card-title class="header-with-action">
                  {{ translate("Custom Parameters") }}
                  <template v-if="requiredParams.length || optionalParams.length">
                    <ion-button v-if="!isEditingParameters" fill="clear" @click="toggleEditParameters()">
                      {{ translate(generateJobCustomParameters(requiredParams, optionalParams).length ? "Edit" : "Add") }}
                    </ion-button>
                    <div v-else class="action-buttons">
                      <ion-button color="primary" :disabled="isRequiredParametersMissing" @click="saveParameters()">
                        {{ translate("Save") }}
                      </ion-button>
                      <ion-button color="medium" @click="cancelEditParameters()">
                        {{ translate("Cancel") }}
                      </ion-button>
                    </div>
                  </template>
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list :lines="isEditingParameters ? 'none' : 'full'" v-if="generateJobCustomParameters(requiredParams, optionalParams).length || (isEditingParameters && editableParametersList.length)">
                  <ion-item v-for="(param, index) in (isEditingParameters ? editableParametersList : generateJobCustomParameters(requiredParams, optionalParams))" :key="index">
                    <template v-if="!isEditingParameters">
                      <ion-label>{{ param.name }}</ion-label>
                      <ion-label slot="end">{{ param.value || "-" }}</ion-label>
                    </template>
                    <div v-else class="parameter-edit-item">
                      <ion-input
                        :class="{'requiredParam': param.required && !param.value}"
                        v-model="param.value"
                        :label="param.name"
                        label-placement="stacked"
                        fill="outline"
                        :helper-text="param.type"
                      ></ion-input>
                    </div>
                  </ion-item>
                </ion-list>
                <div v-else-if="!editableParametersList.length" class="ion-text-center ion-padding">
                  <p>{{ translate("No parameters available for this job.") }}</p>
                </div>
                <div v-else class="ion-text-center ion-padding">
                  <p>{{ translate("No custom parameters set for this job.") }}</p>
                </div>
              </ion-card-content>
            </ion-card>
          </div>

          <!-- HISTORY TAB -->
          <div v-if="activeTab === 'history'">
            <div class="filter-toolbar ion-padding-horizontal">
              <ion-chip :outline="runsFilter !== 'all'" :color="runsFilter === 'all' ? 'primary' : 'medium'" @click="runsFilter = 'all'; updateRunsFilter()">
                <ion-label>{{ translate("All") }}</ion-label>
              </ion-chip>
              <ion-chip :outline="runsFilter !== 'error'" :color="runsFilter === 'error' ? 'primary' : 'medium'" @click="runsFilter = 'error'; updateRunsFilter()">
                <ion-icon :icon="alertCircleOutline" v-if="runsFilter === 'error'"></ion-icon>
                <ion-label>{{ translate("Errors") }}</ion-label>
              </ion-chip>
            </div>
            <div v-if="isRunsLoading" class="runs-state ion-padding ion-text-center">
              <ion-spinner name="crescent" />
              <p>{{ translate("Loading") }}</p>
            </div>
            <template v-else-if="runs.length">
              <ion-card v-for="run in runs" :key="run.jobRunId" class="run-card">
                <ion-item lines="none">
                  <ion-icon slot="start" :icon="run.hasError === 'Y' ? closeCircleOutline : checkmarkCircleOutline" :color="run.hasError === 'Y' ? 'danger' : (run.startTime ? 'success' : 'warning')"></ion-icon>
                  <ion-label>
                    <h2>#{{ run.jobRunId }}</h2>
                    <p>{{ getDateAndTime(run.startTime || run.lastUpdatedStamp) }}</p>
                  </ion-label>
                  <ion-badge slot="end" :color="run.hasError === 'Y' ? 'danger' : (run.startTime ? 'success' : 'warning')">
                    {{ run.hasError === 'Y' ? translate('Failed') : (run.startTime ? translate('Success') : translate('Terminated')) }}
                  </ion-badge>
                </ion-item>
                <ion-card-content>
                  <div class="run-stats-grid">
                    <div class="stat-item">
                      <ion-icon :icon="timeOutline" color="medium"></ion-icon>
                      <ion-label>
                        <p>{{ translate("Duration") }}</p>
                        <strong>{{ calculateDuration(run.startTime, run.endTime) }}</strong>
                      </ion-label>
                    </div>
                    <div class="stat-item">
                      <ion-icon :icon="personOutline" color="medium"></ion-icon>
                      <ion-label>
                        <p>{{ translate("User") }}</p>
                        <strong>{{ run.userId || "N/A" }}</strong>
                      </ion-label>
                    </div>
                    <div class="stat-item">
                      <ion-icon :icon="calendarOutline" color="medium"></ion-icon>
                      <ion-label>
                        <p>{{ translate("Completed") }}</p>
                        <strong>{{ run.endTime ? getDateAndTime(run.endTime) : 'N/A' }}</strong>
                      </ion-label>
                    </div>
                  </div>
                  <div v-if="run.messages" class="run-messages ion-margin-top">
                    <p>{{ run.messages }}</p>
                  </div>
                  
                  <ion-accordion-group class="ion-margin-top">
                    <ion-accordion v-if="run.logs?.length" value="logs">
                      <ion-item slot="header">
                        <ion-label>{{ translate("Data Logs") }}</ion-label>
                      </ion-item>
                      <div slot="content">
                        <ion-list class="log-list">
                          <div class="list-item table-header log">
                            <ion-label>{{ translate("Log Id") }}</ion-label>
                            <ion-label class="file-name">{{ translate("File name") }}</ion-label>
                            <ion-label>{{ translate("Status") }}</ion-label>
                            <ion-label>{{ translate("Uploaded By") }}</ion-label>
                            <ion-label>{{ translate("Uploaded") }}</ion-label>
                          </div>
                          <div v-for="log in run.logs" :key="log.logId" class="list-item log" @click="goToLogDetail(log.logId)">
                            <ion-label>{{ log.logId }}</ion-label>
                            <ion-item lines="none" class="file-name">
                              <ion-icon slot="start" :icon="documentOutline" />
                              <ion-label class="ion-text-wrap">
                                {{ log.fileName || translate('File') }}
                                <p>
                                  <span v-if="log.fileSize">{{ getFileSize(log.fileSize) }}</span>
                                  <span v-if="log.totalRecordCount != null" style="margin-left: var(--spacer-xs);">
                                    | {{ translate("Failed") }}: {{ log.failedRecordCount || 0 }} / {{ translate("Total") }}: {{ log.totalRecordCount }}
                                  </span>
                                </p>
                              </ion-label>
                            </ion-item>
                            <ion-label>
                              <ion-chip
                                v-if="log.statusId"
                                :color="log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0 ? 'warning' : commonUtil.getStatusColor(log.statusId)"
                                style="display: inline-flex; align-items: center;"
                              >
                                <ion-icon
                                  v-if="log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0"
                                  :icon="warningOutline"
                                  style="margin-inline-end: 4px;"
                                />
                                <ion-icon
                                  v-else-if="['DmlsFailed', 'DmlsCrashed'].includes(log.statusId)"
                                  :icon="alertCircleOutline"
                                  style="margin-inline-end: 4px;"
                                />
                                <ion-label>
                                  {{ log.statusId === 'DmlsFinished' && Number(log.failedRecordCount || 0) > 0 ? translate('Finished with errors') : translate(getStatusDesc(log.statusId)) }}
                                </ion-label>
                              </ion-chip>
                            </ion-label>
                            <ion-label>{{ log.createdByUserLogin || "-" }}</ion-label>
                            <ion-label>
                              {{ log.createdDate ? commonUtil.getDateTimeWithOrdinalSuffix(log.createdDate as any) : '-' }}
                            </ion-label>
                          </div>
                        </ion-list>
                      </div>
                    </ion-accordion>

                    <ion-accordion value="details">
                      <ion-item slot="header">
                        <ion-label>{{ translate("Technical Details") }}</ion-label>
                      </ion-item>
                      <div class="ion-padding technical-details" slot="content">
                        <div v-if="run.parameters">
                          <h3>{{ translate('Parameters') }}</h3>
                          <pre><code>{{ run.parameters }}</code></pre>
                        </div>
                        <div v-if="run.results">
                          <h3>{{ translate('Results') }}</h3>
                          <pre><code>{{ run.results }}</code></pre>
                        </div>
                        <div v-if="run.errors">
                          <h3>{{ translate('Errors') }}</h3>
                          <pre><code>{{ run.errors }}</code></pre>
                        </div>
                      </div>
                    </ion-accordion>
                  </ion-accordion-group>
                </ion-card-content>
              </ion-card>
              <ion-infinite-scroll @ionInfinite="loadMoreRuns($event)" :disabled="!hasMoreRuns">
                <ion-infinite-scroll-content loading-spinner="crescent"></ion-infinite-scroll-content>
              </ion-infinite-scroll>
            </template>
            <p v-else-if="hasLoadedRuns" class="ion-padding ion-text-center">
              {{ translate("No run history available") }}
            </p>
          </div>
        </div>
      </div>
      <div v-else class="ion-padding ion-text-center">
        <p>{{ translate('Job not found') }}</p>
        <ion-button fill="clear" router-link="/catalog">{{ translate('Back to Catalog') }}</ion-button>
      </div>

      <!-- Edit Schedule Modal -->
      <ion-modal :is-open="isScheduleModalOpen" @didDismiss="closeScheduleModal()">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ translate("Edit Schedule") }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeScheduleModal()">{{ translate("Close") }}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="ion-margin-bottom">
            {{ translate("Schedule operations are relative to your timezone:") }} <strong>{{ userTimeZone }}</strong>
          </p>
          <ion-list>
            <ion-item lines="none">
              <ion-input class="job-info" v-model="editScheduleData.cronExpression" :label="translate('Cron Expression')" label-placement="stacked" fill="outline"></ion-input>
            </ion-item>
            <ion-item lines="none">
              <ion-input class="job-info" type="number" v-model="editScheduleData.repeatCount" :label="translate('Repeat Count (-1 for infinite)')" label-placement="stacked" fill="outline" min="-1"></ion-input>
            </ion-item>
          </ion-list>
          <ion-button expand="block" class="ion-margin-top" @click="saveSchedule()">{{ translate("Save") }}</ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonButton,
  IonListHeader,
  IonInput,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonModal,
  IonBadge,
  IonAccordionGroup,
  IonAccordion,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
  IonSpinner,
  onIonViewWillEnter,
  alertController,
  onIonViewWillLeave
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import router from "../router"
import { useUserStore } from '@/store/user';
import { translate, commonUtil, logger, emitter } from '@common';
import { getCronString, getFileSize, getDateAndTime, showToast } from '@/utils';
import { 
  alertCircleOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  flashOutline,
  documentOutline, 
  pauseOutline, 
  personOutline,
  playOutline,
  timeOutline,
  warningOutline
} from 'ionicons/icons';
import { getStatusDesc } from '@/utils/config';
import { useJobStore } from '@/store/jobs';
import { DateTime } from 'luxon';

const route = router.currentRoute.value;
const userStore = useUserStore();
const jobStore = useJobStore();

const categories = computed(() => jobStore.getCategories)
const categoryMembers = computed(() => jobStore.getCategoryMembers)
const currentProductStore = computed(() => userStore.getCurrentProductStore)
const products = computed(() => jobStore.getProducts)
const product = computed(() => products.value[job.value?.instanceOfProductId] || {})
const userTimeZone = computed(() => userStore.getUserTimeZone);
const isRequiredParametersMissing = computed(() => requiredParams.value.some((param: any) => !param.value))

let job: any = ref({})
let runs: any = ref([])
const isLoading = ref(true)
const isRunsLoading = ref(false)
const hasLoadedRuns = ref(false)
const pageIndex = ref(0)
const pageSize = ref(10)
const hasMoreRuns = ref(true)

let optionalParams = ref([]) as any
let requiredParams = ref([]) as any

const activeTab = ref('overview');
const runsFilter = ref('all');

// Product & Category Context
const jobCategories = computed(() => {
  if (!job.value) return [];
  const memberRecords = categoryMembers.value.filter((member: any) => member.productId === job.value?.instanceOfProductId);
  const categoryIds = memberRecords.map((record: any) => record.productCategoryId);
  return categories.value.filter((category: any) => categoryIds.includes(category.productCategoryId));
});

const calculateDuration = (start: string | number | null, end: string | number | null) => {
  if (!start || !end) return 'N/A';
  
  let startDt = typeof start === 'number' ? DateTime.fromMillis(start) : DateTime.fromFormat(start as string, 'yyyy-MM-dd HH:mm:ss.SSS');
  if (!startDt.isValid) startDt = DateTime.fromSQL(start as string);
  if (!startDt.isValid) startDt = DateTime.fromISO(start as string);
  
  let endDt = typeof end === 'number' ? DateTime.fromMillis(end) : DateTime.fromFormat(end as string, 'yyyy-MM-dd HH:mm:ss.SSS');
  if (!endDt.isValid) endDt = DateTime.fromSQL(end as string);
  if (!endDt.isValid) endDt = DateTime.fromISO(end as string);

  if (!startDt.isValid || !endDt.isValid) return 'N/A';

  const diff = endDt.diff(startDt, ['minutes', 'seconds']).toObject();
  const minutes = Math.floor(diff.minutes || 0);
  const seconds = Math.floor(diff.seconds || 0);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const isEditingParameters = ref(false);
const editableParametersList = ref<any[]>([]);

const toggleEditParameters = () => {
  editableParametersList.value = requiredParams.value.concat(optionalParams.value)

  isEditingParameters.value = true;
};

const saveParameters = async () => {
  const params = editableParametersList.value.map((param: any) => ({
    parameterName: param.name,
    parameterValue: param.value,
    jobName: job.jobName
  }))
  job.value.serviceJobParameters = params;

  const payload = {
    jobName: job.value.jobName,
    serviceJobParameters: job.value.serviceJobParameters
  } as any;

  await updateJobInfo(payload)

  isEditingParameters.value = false;
};

const cancelEditParameters = () => {
  isEditingParameters.value = false;
};

async function togglePause() {
  job.value.paused = job.value.paused === "N" ? "Y" : "N";
  await scheduleJob()
};

const editScheduleData = ref({ cronExpression: "", repeatCount: -1 });
const isScheduleModalOpen = ref(false);

const editSchedule = () => {
  if (job.value) {
    editScheduleData.value = {
      cronExpression: job.value.cronExpression || "",
      repeatCount: job.value.repeatCount
    };
    isScheduleModalOpen.value = true;
  }
};

const closeScheduleModal = () => {
  isScheduleModalOpen.value = false;
};

const saveSchedule = async () => {
  if (job.value) {
    job.value.cronExpression = editScheduleData.value.cronExpression;
    job.value.repeatCount = Number(editScheduleData.value.repeatCount);

    const payload = { 
      jobName: job.value.jobName,
      cronExpression: job.value.cronExpression,
      repeatCount: job.value.repeatCount
    } as any;
    // TODO: Do not update the template job
    await updateJobInfo(payload).then(() => {
      if(job.value.isDraftJob) {
        router.replace(`/job/${job.value.jobName}`)
      }
    })
  }
  isScheduleModalOpen.value = false;
};

const goToLogDetail = (logId: string | number) => {
  router.push({ name: "FileHistoryDetail", params: { id: logId } });
};

const loadJob = async () => {
  isLoading.value = true
  runs.value = []
  hasLoadedRuns.value = false
  pageIndex.value = 0
  hasMoreRuns.value = true
  pageSize.value = 10
  try {
    job.value = await jobStore.fetchJobDetail(route.params.jobName as string)
  } catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

const loadRuns = async () => {
  if (!job.value?.jobName) {
    return
  }

  isRunsLoading.value = true
  pageIndex.value = 0
  hasMoreRuns.value = true
  pageSize.value = 10
  try {
    const payload = { pageSize: pageSize.value, pageIndex: pageIndex.value } as any
    if (runsFilter.value === 'error') payload.hasError = 'Y'

    const resp = await jobStore.fetchJobRuns(route.params.jobName as string, payload)
    runs.value = Array.isArray(resp) ? resp : []
    hasMoreRuns.value = Array.isArray(resp) && resp.length === pageSize.value
    hasLoadedRuns.value = true
  } catch (err) {
    console.error(err)
  } finally {
    isRunsLoading.value = false
    pageSize.value = 20
  }
}

onIonViewWillEnter(async () => {
  emitter.on("productStoreUpdated", init)
  Promise.allSettled([jobStore.fetchCategories(), jobStore.fetchCategoryRollup()])
  await init()
})

onIonViewWillLeave(() => {
  emitter.off("productStoreUpdated", init)
})

const init = async () => {
  await loadJob()
  void loadRuns()
  
  if(job.value.jobName) {
    const params = generateJobCustomOptions(job.value)
    optionalParams.value = params.optionalParameters
    requiredParams.value = params.requiredParameters
  }
}

const updateRunsFilter = async () => {
  if (!hasLoadedRuns.value && activeTab.value !== 'history') {
    return
  }
  await loadRuns()
}

watch(activeTab, async (tab) => {
  if (tab === 'history' && !hasLoadedRuns.value && !isRunsLoading.value) {
    await loadRuns()
  }
})

const loadMoreRuns = async (event: any) => {
  pageIndex.value++
  try {
    const payload = { pageSize: pageSize.value, pageIndex: pageIndex.value } as any
    if (runsFilter.value === 'error') payload.hasError = 'Y'

    const resp = await jobStore.fetchJobRuns(route.params.jobName as string, payload)
    if (Array.isArray(resp) && resp.length > 0) {
      runs.value.push(...resp)
    }
    hasMoreRuns.value = Array.isArray(resp) && resp.length === pageSize.value
  } catch (err) {
    console.error(err)
  } finally {
    event.target.complete()
  }
}

async function cloneJob() {
  const newJobName = `${job.value.jobName.startsWith("template_") ? job.value.jobName.replace("template_", "") : job.value.jobName}_${currentProductStore.value.productStoreId}`
  try {
    const resp = await jobStore.cloneMaargJob({
      jobName: job.value.jobName,
      newJobName,
      copyParameters: true
    })

    if(!commonUtil.hasError(resp)) {
      const updatedJob = JSON.parse(JSON.stringify(job.value));
      updatedJob["jobName"] = newJobName;
      updatedJob["paused"] = "Y"
      updatedJob["isDraftJob"] = false
      updatedJob.serviceJobParameters.map((parameter: any) => {
        parameter.jobName = newJobName
      })
      return updatedJob
    } else {
      throw resp.data;
    }
  } catch(error) {
    logger.error(error);
    return {};
  }
}

async function runNow() {
  const jobAlert = await alertController
    .create({
      header: translate("Run now"),
      message: translate("Running this job now will not replace this job. A copy of this job will be created and run immediately. You may not be able to reverse this action.", { space: "<br/><br/>" }),
      buttons: [
        {
          text: translate("Cancel"),
          role: "cancel",
        },
        {
          text: translate("Run now"),
          handler: async () => {
            try {
              let resp: any;
              let jobName = job.value?.jobName

              if(job.value.isDraftJob) {
                const clonedJob = await cloneJob();
                if(!clonedJob.jobName) {
                  showToast(translate("Failed to schedule service"));
                  return;
                }
                clonedJob.serviceJobParameters.find((parameter: any) => {
                  if(parameter.parameterName === "productStoreIds" || parameter.parameterName === "productStoreId") {
                    parameter.parameterValue = currentProductStore.value.productStoreId
                    return true;
                  }
                  if(parameter.parameterName === "systemMessageRemoteId") {
                    parameter.parameterValue = useUserStore().getSelectedSystemMessageRemoteId
                    return true;
                  }
                  return false;
                })

                resp = await jobStore.updateJob({
                  jobName: clonedJob.jobName,
                  serviceJobParameters: clonedJob.serviceJobParameters
                })
                showToast(translate("Redirecting to cloned service"));
                router.replace(`/job/${clonedJob.jobName}`)
                if(!commonUtil.hasError(resp)) {
                  jobName = clonedJob.jobName
                } else {
                  throw resp.data;
                }
              }

              resp = await jobStore.runNow(jobName)
              if(!commonUtil.hasError(resp) && resp.data.jobRunId) {
                showToast(translate("Service has been scheduled"))
              } else {
                throw resp.data
              }
            } catch(err) {
              showToast(translate("Failed to schedule service"))
              logger.error(err)
            }
          }
        }
      ]
    });

  return jobAlert.present();
}

async function scheduleJob() {
  if(!job.value.cronExpression) {
    showToast(translate("Please select a scheduling for job"))
    logger.error("Please select a scheduling for job")
    return;
  }

  if(job.value.isDraftJob) {
    const clonedJob = await cloneJob();
    if(!clonedJob.jobName) {
      showToast(translate("Failed to update service"));
      return;
    }
    clonedJob.paused = job.value.paused
    clonedJob.serviceJobParameters.find((parameter: any) => {
      if(parameter.parameterName === "productStoreIds" || parameter.parameterName === "productStoreId") {
        parameter.parameterValue = currentProductStore.value.productStoreId
        return true;
      }
      if(parameter.parameterName === "systemMessageRemoteId") {
        parameter.parameterValue = useUserStore().getSelectedSystemMessageRemoteId
        return true;
      }
      return false;
    })
    job.value = clonedJob
  }

  const payload = { 
    jobName: job.value.jobName,
    paused: job.value.paused,
    cronExpression: job.value.cronExpression,
    serviceJobParameters: job.value.serviceJobParameters
  } as any;

  await updateJobInfo(payload)

  router.replace(`/job/${job.value.jobName}`)
  showToast(translate("Redirecting to the cloned job"))
}

async function updateJobInfo(payload: any): Promise<any> {
  try {
    const resp = await jobStore.updateJob(payload)
    if(!commonUtil.hasError(resp)) {
      showToast(translate("Service updated successfully"))
      return Promise.resolve(resp)
    } else {
      throw resp.data
    }
  } catch(err) {
    showToast(translate("Failed to update service"))
    logger.error(err)
    return Promise.reject({
      error: err
    })
  }
}


// defined this method as we need to convert values to string for trimming and correctly parse the data
const convertToString = (parameter: any) => {
  const value = parameter.value;

  if(!value) {
    return ''
  }

  try {
    if(parameter.type === 'Map' || parameter.type === 'List' || parameter.type === 'Object') {
      return JSON.stringify(value)
    } else if(parameter.type === 'String') {
      return value
    } else {
      return '' + value;
    }
  } catch {
    logger.error('Unable to parse the defined value', value)
    return value;
  }
}

// preparing the parameters for the job, by checking whether the job has supported making
// changes in the custom parameters or not
const generateJobCustomParameters = (requiredParameters: any, optionalParameters: any) => {
  // preparing the custom parameters those needs to passed with the job
  const jobCustomParameters = [] as any;

  requiredParameters.map((parameter: any) => {
    jobCustomParameters.push(parameter)
  })

  optionalParameters.map((parameter: any) => {
    // added this check to not show those optional params in the configuration card whose value is left empty in the parameter modal
    if(parameter.value && parameter.value.toString().trim()) {
      jobCustomParameters.push(parameter)
    }
  })
  return jobCustomParameters;
}

const generateJobCustomOptions = (job: any) => {
  let inputParameters = job?.serviceInParameters ? JSON.parse(JSON.stringify(job?.serviceInParameters)) : []
  const optionalParameters: Array<any> = [];
  const requiredParameters: Array<any> = [];

  // removing some fields that we don't want user to edit, and for which the values will be added programatically
  const excludeParameters = JSON.parse(import.meta.env.VITE_PRT_STR_DEP_SER_JOB_IDENTIFIER)
  inputParameters = inputParameters.filter((parameter: any) =>!excludeParameters.includes(parameter.name))

  const paramValues = {} as any;

  job.serviceJobParameters.forEach((parameter: any) => {
    paramValues[parameter.parameterName] = parameter.parameterValue
  })

  inputParameters.forEach((parameter: any) => {
    if(parameter.required === "true") {
      requiredParameters.push({
        name: parameter.name,
        value: paramValues && paramValues[parameter.name] && paramValues[parameter.name] !== 'null' ? convertToString({ value: paramValues[parameter.name], type: parameter.type }) : '',   // added check for null as we don't want to pass null as a value in the params
        type: parameter.type,
        default: parameter.default,
        required: true
      })
    } else {
      optionalParameters.push({
        name: parameter.name,
        value: paramValues && paramValues[parameter.name] && paramValues[parameter.name] !== 'null' ? convertToString({ value: paramValues[parameter.name], type: parameter.type }) : '',   // added check for null as we don't want to pass null as a value in the params
        type: parameter.type,
        default: parameter.default
      })
    }
  })

  return {
    optionalParameters,
    requiredParameters
  }
}

const timeTillJob = (time: any) => {
  const timeDiff = DateTime.fromMillis(time).diff(DateTime.local());
  return DateTime.local().plus(timeDiff).toRelative();
}
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--spacer-base, 16px);
  align-items: start;
}

.header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: var(--spacer-xs, 4px);
}

.parameter-edit-item {
  width: 100%;
  padding-top: var(--spacer-sm, 8px);
  padding-bottom: var(--spacer-sm, 8px);
}

.run-card {
  margin-bottom: var(--spacer-base, 16px);
  border: 1px solid var(--ion-color-step-150, #d7d8da);
  box-shadow: none;
  transition: box-shadow 0.3s ease;
}

.run-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.filter-toolbar {
  display: flex;
  gap: var(--spacer-sm, 8px);
  overflow-x: auto;
  padding-bottom: var(--spacer-base, 16px);
}

.run-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacer-base, 16px);
  padding: var(--spacer-sm, 8px) 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacer-sm, 8px);
}

.stat-item ion-icon {
  font-size: 24px;
}

.stat-item ion-label p {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-item ion-label strong {
  display: block;
  font-size: 14px;
}

.log-list {
  padding: 0;
}

.list-item.log {
  --columns-desktop: 7;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: var(--spacer-base, 16px);
  align-items: center;
  padding: var(--spacer-sm, 8px) var(--spacer-base, 16px);
  border-bottom: 1px solid var(--ion-color-step-150, #d7d8da);
  cursor: pointer;
}

.list-item.table-header {
  font-weight: bold;
  background: var(--ion-color-light);
  border-bottom: 2px solid var(--ion-color-step-150, #d7d8da);
}

.file-name {
  grid-column: span 2;
  justify-self: start;
  width: 100%;
  --inner-padding-end: 0;
}

.technical-details pre, .run-messages {
  background: var(--ion-color-light);
  padding: var(--spacer-sm, 8px);
  overflow-x: auto;
  border-radius: 4px;
}

.break-word {
  word-break: break-all;
}

ion-input.job-info {
  margin-top: var(--margin-top, 10px);
  margin-bottom: var(--margin-bottom, 10px);
}

.requiredParam {
  --border-color: var(--ion-color-danger)
}

.metadata {
  display: flex;
  flex-direction: column;
  margin-right: 10px;
  align-items: end;
}

@media (min-width: 992px) {
  .list-item.log {
    grid-template-columns: repeat(var(--columns-desktop), 1fr);
  }
}

</style>
