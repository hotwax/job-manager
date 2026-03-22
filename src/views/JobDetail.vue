<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/catalog"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ job?.jobName || translate('Job Details') }}</ion-title>
        <ion-buttons v-if="job" slot="end">
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
                <ion-item v-for="j in 3" :key="j">
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
        <div class="job-context-header ion-padding">
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

        <ion-segment v-model="activeTab">
          <ion-segment-button value="overview">
            <ion-label>{{ translate('Overview') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="parameters">
            <ion-label>{{ translate('Parameters') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history">
            <ion-label>{{ translate('History') }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div class="tabs-content">
        <div v-if="activeTab === 'overview'" class="dashboard-grid ion-padding">
          <!-- Technical Details Card -->
          <ion-card class="dashboard-card">
            <ion-card-header>
              <ion-card-title>{{ translate("Technical Details") }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label position="stacked">{{ translate('Service Name') }}</ion-label>
                  <ion-text class="break-word">{{ job.serviceName }}</ion-text>
                </ion-item>
                <ion-item v-if="job.topic">
                  <ion-label>
                    <p>{{ translate('Topic') }}</p>
                    <div>{{ job.topic }}</div>
                  </ion-label>
                </ion-item>
                <ion-item v-if="job.jobTypeEnumId">
                  <ion-label>
                    <p>{{ translate('Job Type') }}</p>
                    <div>{{ job.jobTypeEnumId }}</div>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Schedule Card -->
          <ion-card class="dashboard-card">
            <ion-card-header>
              <ion-card-title class="header-with-action">
                {{ translate("Schedule") }}
                <ion-button fill="clear" @click="editSchedule()">{{ translate('EDIT') }}</ion-button>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label position="stacked">{{ translate('Cron Expression') }}</ion-label>
                  <ion-text>
                    <div>{{ job.cronExpression || "-" }}</div>
                    <div>{{ getCronString(job.cronExpression) }}</div>
                  </ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate("Repeat Count") }}</ion-label>
                  <ion-text>{{ job.repeatCount === -1 ? "Infinite" : job.repeatCount || "-" }}</ion-text>
                </ion-item>
                <ion-item v-if="job.fromDate">
                  <ion-label position="stacked">{{ translate("Valid From") }}</ion-label>
                  <ion-text>{{ formatJobDate(job.fromDate) }}</ion-text>
                </ion-item>
                <ion-item v-if="job.thruDate">
                  <ion-label position="stacked">{{ translate("Valid To") }}</ion-label>
                  <ion-text>{{ formatJobDate(job.thruDate) }}</ion-text>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Execution Settings Card -->
          <ion-card class="dashboard-card">
            <ion-card-header>
              <ion-card-title>{{ translate("Execution Settings") }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label position="stacked">{{ translate("Priority") }}</ion-label>
                  <ion-text>{{ job.priority || "-" }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate("Transaction Timeout") }}</ion-label>
                  <ion-text>{{ job.transactionTimeout ? `${job.transactionTimeout} seconds` : "-" }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate("Retry & Locking") }}</ion-label>
                  <ion-text>
                    <div>Min Retry: {{ job.minRetryTime ? `${job.minRetryTime} min` : "-" }}</div>
                    <div>Lock Limit: {{ job.expireLockTime ? `${job.expireLockTime} min` : "-" }}</div>
                  </ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate("Local Only") }}</ion-label>
                  <ion-text>{{ job.localOnly === "Y" ? translate("Yes") : translate("No") }}</ion-text>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- System Metadata Card -->
          <ion-card class="dashboard-card">
            <ion-card-header>
              <ion-card-title>{{ translate("System Metadata") }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item v-if="job.instanceOfProductId">
                   <ion-label position="stacked">{{ translate("Product") }}</ion-label>
                   <ion-text>
                     <p v-if="product.productName">{{ product.productName }}</p>
                     <code>{{ job.instanceOfProductId }}</code>
                   </ion-text>
                 </ion-item>
                <ion-item v-if="job.parentJobName">
                  <ion-label position="stacked">{{ translate("Parent Job") }}</ion-label>
                  <ion-text>{{ job.parentJobName }}</ion-text>
                </ion-item>
                <ion-item v-if="job.permissionGroupId">
                  <ion-label position="stacked">{{ translate("Permission Group") }}</ion-label>
                  <ion-text>{{ job.permissionGroupId }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate("Created") }}</ion-label>
                  <ion-text>{{ formatJobDate(job.createdStamp) }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate("Updated") }}</ion-label>
                  <ion-text>{{ formatJobDate(job.lastUpdatedStamp) }}</ion-text>
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
                <ion-button v-if="!isEditingParameters" fill="clear" @click="toggleEditParameters()">
                  {{ translate(jobParameters.length ? "Edit" : "Add") }}
                </ion-button>
                <div v-else class="action-buttons">
                  <ion-button color="primary" @click="saveParameters()">
                    {{ translate("Save") }}
                  </ion-button>
                  <ion-button color="medium" @click="cancelEditParameters()">
                    {{ translate("Cancel") }}
                  </ion-button>
                </div>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list :lines="isEditingParameters ? 'none' : 'full'" v-if="isEditingParameters || jobParameters.length">
                <ion-item v-for="(param, index) in (isEditingParameters ? editableParametersList : jobParameters)" :key="index">
                  <template v-if="!isEditingParameters">
                    <ion-label>{{ param.parameterName }}</ion-label>
                    <ion-label slot="end">{{ param.parameterValue || "-" }}</ion-label>
                  </template>
                  <!-- <ion-label v-if="!isEditingParameters">
                    <h3>{{ param.parameterName }}</h3>
                    <p>{{ param.parameterValue || "-" }}</p>
                  </ion-label> -->
                  <div v-else class="parameter-edit-item">
                    <ion-input
                      v-model="param.parameterValue"
                      :label="param.parameterName"
                      label-placement="stacked"
                      fill="outline"
                    ></ion-input>
                  </div>
                </ion-item>
              </ion-list>
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
                  <p>{{ formatJobDate(run.startTime || run.lastUpdatedStamp) }}</p>
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
                      <strong>{{ run.endTime ? formatJobDate(run.endTime) : 'N/A' }}</strong>
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
                              <p v-if="log.fileSize">{{ getFileSize(log.fileSize) }}</p>
                            </ion-label>
                          </ion-item>
                          <ion-label>
                            <ion-chip v-if="log.statusId" :color="commonUtil.getStatusColor(log.statusId)">
                              {{ translate(getStatusDesc(log.statusId)) }}
                            </ion-chip>
                          </ion-label>
                          <ion-label>{{ log.createdByUserLogin || "-" }}</ion-label>
                          <ion-label>
                            {{ log.createdDate ? getDateTimeWithOrdinalSuffix(log.createdDate as any) : '-' }}
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
            <ion-title>{{ translate('Edit Schedule') }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeScheduleModal()">{{ translate('Close') }}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p class="ion-margin-bottom">
            {{ translate('Schedule operations are relative to your timezone:') }} <strong>{{ userTimeZone }}</strong>
          </p>
          <ion-list>
            <!-- <ion-item> -->
            <ion-input v-model="editScheduleData.cronExpression" :label="translate('Cron Expression')" label-placement="stacked" fill="outline"></ion-input>
            <!-- </ion-item> -->
            <!-- <ion-item class="ion-margin-top"> -->
            <ion-input class="ion-margin-top" type="number" v-model="editScheduleData.repeatCount" :label="translate('Repeat Count (-1 for infinite)')" label-placement="stacked" fill="outline" min="-1"></ion-input>
            <!-- </ion-item> -->
          </ion-list>
          <ion-button expand="block" class="ion-margin-top" @click="saveSchedule()">{{ translate('Save') }}</ion-button>
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
  IonText,
  IonIcon,
  IonButton,
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
  IonCardSubtitle,
  onIonViewWillEnter
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { DateTime } from 'luxon';
import { useUserStore } from '@/store/user';
import { 
  alertCircleOutline,
  calendarOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  documentOutline, 
  pauseOutline, 
  personOutline,
  playOutline,
  timeOutline
} from 'ionicons/icons';
import { translate, commonUtil } from '@common';
import { getCronString, getFileSize, getDateTimeWithOrdinalSuffix } from '@/utils';
import { getStatusDesc } from '@/utils/config';
import { mockJobRuns } from '@/mock/jobRuns';
import { mockJobParameters } from '@/mock/jobParameters';
import { serviceInParameters } from '@/mock/serviceInParameters';
import { mockDataManagerLogs } from '@/mock/dataManagerLogs';
import { useJobStore } from '@/store/jobs';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const jobStore = useJobStore();

const jobs = computed(() => jobStore.getJobs)
const categories = computed(() => jobStore.getCategories)
const categoryMembers = computed(() => jobStore.getCategoryMembers)
const products = computed(() => jobStore.getProducts)
const product = computed(() => products.value[job.value?.instanceOfProductId] || {})

const userTimeZone = computed(() => userStore.getUserTimeZone);
const jobName = computed(() => route.params.jobName as string);
// const job = computed(() => jobs.value.find((job: any) => job.jobName === jobName.value));
let job: any = ref({})
let runs: any = ref([])
const isLoading = ref(true)
const isRunsLoading = ref(false)
const hasLoadedRuns = ref(false)
const pageIndex = ref(0)
const pageSize = ref(10)
const hasMoreRuns = ref(true)

const activeTab = ref('overview');
const runsFilter = ref('all');

// Product & Category Context
const jobCategories = computed(() => {
  if (!job.value) return [];
  const memberRecords = categoryMembers.value.filter((member: any) => member.productId === job.value?.instanceOfProductId);
  const categoryIds = memberRecords.map((record: any) => record.productCategoryId);
  return categories.value.filter((category: any) => categoryIds.includes(category.productCategoryId));
});

// const runs = computed(() => {
//   return mockJobRuns.filter(r => r.jobName === jobName.value).map(run => ({
//     ...run,
//     logs: mockDataManagerLogs.filter(log => log.createdByJobId === run.jobRunId)
//   }));
// });

const jobParameters = computed(() => job.value.serviceJobParameters || []);

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

const formatJobDate = (date: string | number | null) => {
  if (!date) return '-';
  let dt = typeof date === 'number' ? DateTime.fromMillis(date) : DateTime.fromFormat(date as string, 'yyyy-MM-dd HH:mm:ss.SSS');
  if (!dt.isValid) dt = DateTime.fromSQL(date as string);
  if (!dt.isValid) dt = DateTime.fromISO(date as string);
  
  return dt.isValid ? dt.toLocaleString(DateTime.DATETIME_MED) : date.toString();
};

const isEditingParameters = ref(false);
const editableParametersList = ref<any[]>([]);

const toggleEditParameters = () => {
  if (!job.value) return;

  const availableParamNames = (job.value.serviceInParameters || []).map((param: any) => param.name);
  
  // Map all available parameters, pre-filling with saved values where they exist
  editableParametersList.value = availableParamNames.map((name: string) => {
    const savedParam = jobParameters.value.find((parameter: any) => parameter.parameterName === name);
    return {
      parameterName: name,
      parameterValue: savedParam?.parameterValue || ""
    };
  });

  // If no parameters defined in service, at least show what's currently saved
  if (!editableParametersList.value.length) {
    editableParametersList.value = JSON.parse(JSON.stringify(jobParameters.value));
  }

  isEditingParameters.value = true;
};

const saveParameters = () => {
  const otherJobsParams = job.value.serviceJobParameters || []
  const newParams = editableParametersList.value
    .filter(p => p.parameterValue.trim() !== '')
    .map(p => ({
      ...p,
      jobName: jobName.value,
      lastUpdatedStamp: new Date().toISOString(),
      _entity: 'moqui.service.job.ServiceJobParameter'
    }));
  
  mockJobParameters.length = 0;
  mockJobParameters.push(...otherJobsParams, ...newParams);
  
  isEditingParameters.value = false;
};

const cancelEditParameters = () => {
  isEditingParameters.value = false;
};

const togglePause = () => {
  job.value.paused = job.value.paused === 'N' ? 'Y' : 'N';
};

const editScheduleData = ref({ cronExpression: '', repeatCount: -1 });
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

const saveSchedule = () => {
  if (job.value) {
    job.value.cronExpression = editScheduleData.value.cronExpression;
    job.value.repeatCount = Number(editScheduleData.value.repeatCount);
  }
  isScheduleModalOpen.value = false;
};

const goToLogDetail = (logId: string | number) => {
  router.push({ name: 'FileDetail', params: { id: logId } });
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
  await loadJob()
  void loadRuns()
})

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
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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

@media (min-width: 992px) {
  .list-item.log {
    grid-template-columns: repeat(var(--columns-desktop), 1fr);
  }
}

</style>
