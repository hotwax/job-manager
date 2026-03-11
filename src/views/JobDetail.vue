<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/catalog"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ job?.jobName || translate('Job Details') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="job" @click="togglePause" :color="job.paused === 'Y' ? 'warning' : 'success'">
            <ion-icon :icon="job.paused === 'Y' ? playOutline : pauseOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Product Context Header -->
      <div v-if="job" class="job-context-header ion-padding">
        <h1 class="ion-no-margin">{{ job.jobName }}</h1>
        <p class="ion-text-wrap text-medium ion-margin-bottom">{{ job.description || translate('No description available') }}</p>
        <div class="category-chips">
          <ion-chip v-for="cat in jobCategories" :key="cat.productCategoryId" color="medium" outline>
            {{ cat.categoryName }}
          </ion-chip>
          <ion-chip v-if="jobCategories.length === 0" color="medium" outline>
            {{ translate('Uncategorized') }}
          </ion-chip>
        </div>
      </div>

      <div class="sticky-segments">
        <ion-segment v-model="activeTab" mode="md">
          <ion-segment-button value="overview">
            <ion-label>{{ translate('OVERVIEW') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="parameters">
            <ion-label>{{ translate('PARAMETERS') }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history">
            <ion-label>{{ translate('HISTORY') }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <div v-if="job">
        <div v-if="activeTab === 'overview'" class="dashboard-grid ion-padding">
          <!-- Technical Details Card -->
        <ion-card class="dashboard-card">
          <ion-card-header>
            <ion-card-title>{{ translate('Technical Details') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="none">
              <ion-item>
                <ion-label position="stacked">{{ translate('Service Name') }}</ion-label>
                <ion-text>{{ job.serviceName }}</ion-text>
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
            <ion-card-header class="header-with-action">
              <ion-card-title>{{ translate('Schedule') }}</ion-card-title>
              <ion-button fill="clear" @click="editSchedule()">{{ translate('EDIT') }}</ion-button>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label position="stacked">{{ translate('Cron Expression') }}</ion-label>
                  <ion-text>
                    <div>{{ job.cronExpression }}</div>
                    <div><strong>{{ getCronString(job.cronExpression) }}</strong></div>
                  </ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate('Run Times') }}</ion-label>
                  <ion-text>{{ translate('Repeat Count') }}: {{ job.repeatCount === -1 ? 'Infinite' : job.repeatCount }}</ion-text>
                </ion-item>
                <ion-item v-if="job.fromDate">
                  <ion-label position="stacked">{{ translate('Valid From') }}</ion-label>
                  <ion-text>{{ formatJobDate(job.fromDate) }}</ion-text>
                </ion-item>
                <ion-item v-if="job.thruDate">
                  <ion-label position="stacked">{{ translate('Valid To') }}</ion-label>
                  <ion-text>{{ formatJobDate(job.thruDate) }}</ion-text>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Execution Settings Card -->
          <ion-card class="dashboard-card">
            <ion-card-header>
              <ion-card-title>{{ translate('Execution Settings') }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label position="stacked">{{ translate('Priority') }}</ion-label>
                  <ion-text>{{ job.priority || '-' }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate('Transaction Timeout') }}</ion-label>
                  <ion-text>{{ job.transactionTimeout ? `${job.transactionTimeout} seconds` : '-' }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate('Retry & Locking') }}</ion-label>
                  <ion-text>
                    <div>Min Retry: {{ job.minRetryTime ? `${job.minRetryTime} min` : '-' }}</div>
                    <div>Lock Limit: {{ job.expireLockTime ? `${job.expireLockTime} min` : '-' }}</div>
                  </ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate('Local Only') }}</ion-label>
                  <ion-text>{{ job.localOnly === 'Y' ? translate('Yes') : translate('No') }}</ion-text>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- System Metadata Card -->
          <ion-card class="dashboard-card">
            <ion-card-header>
              <ion-card-title>{{ translate('System Metadata') }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item v-if="job.instanceOfProductId">
                  <ion-label position="stacked">{{ translate('Instance Of Product ID') }}</ion-label>
                  <ion-text>{{ job.instanceOfProductId }}</ion-text>
                </ion-item>
                <ion-item v-if="job.parentJobName">
                  <ion-label position="stacked">{{ translate('Parent Job') }}</ion-label>
                  <ion-text>{{ job.parentJobName }}</ion-text>
                </ion-item>
                <ion-item v-if="job.permissionGroupId">
                  <ion-label position="stacked">{{ translate('Permission Group') }}</ion-label>
                  <ion-text>{{ job.permissionGroupId }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate('Created') }}</ion-label>
                  <ion-text>{{ formatJobDate(job.createdStamp) }}</ion-text>
                </ion-item>
                <ion-item>
                  <ion-label position="stacked">{{ translate('Updated') }}</ion-label>
                  <ion-text>{{ formatJobDate(job.lastUpdatedStamp) }}</ion-text>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- PARAMETERS TAB -->
        <div v-if="activeTab === 'parameters'">
          <ion-card>
            <ion-card-header class="header-with-action">
              <ion-card-title>{{ translate('Custom Parameters') }}</ion-card-title>
              <ion-button v-if="!isEditingParameters" fill="clear" @click="toggleEditParameters()">
                {{ translate(jobParameters.length > 0 ? 'Edit' : 'Add') }}
              </ion-button>
              <div v-if="isEditingParameters" class="action-buttons">
                <ion-button color="primary" @click="saveParameters()">
                  {{ translate('Save') }}
                </ion-button>
                <ion-button color="medium" @click="cancelEditParameters()">
                  {{ translate('Cancel') }}
                </ion-button>
              </div>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="full" v-if="isEditingParameters || jobParameters.length > 0">
                <ion-item v-for="(param, index) in (isEditingParameters ? editableParametersList : jobParameters)" :key="index">
                  <ion-label v-if="!isEditingParameters">
                    <h3>{{ param.parameterName }}</h3>
                    <p>{{ param.parameterValue }}</p>
                  </ion-label>
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
                <p>{{ translate('No custom parameters set for this job.') }}</p>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- HISTORY TAB -->
        <div v-if="activeTab === 'history'">
          <div v-if="runs.length > 0">
            <ion-card v-for="run in runs" :key="run.jobRunId" class="run-card">
              <ion-card-header>
                <div class="run-header">
                  <ion-card-title>
                    <ion-badge :color="run.hasError === 'Y' ? 'danger' : 'success'" class="ion-margin-end">
                      {{ run.hasError === 'Y' ? translate('Failed') : translate('Success') }}
                    </ion-badge>
                    <span>#{{ run.jobRunId }}</span>
                  </ion-card-title>
                  <ion-card-subtitle>{{ run.startTime }}</ion-card-subtitle>
                </div>
              </ion-card-header>
              <ion-card-content>
                <div class="run-stats">
                  <div><strong>{{ translate('Duration') }}:</strong> {{ calculateDuration(run.startTime, run.endTime) }}</div>
                  <div><strong>{{ translate('User') }}:</strong> {{ run.userId }}</div>
                  <div class="host-info"><strong>{{ translate('Host') }}:</strong> {{ run.hostName }} ({{ run.hostAddress }})</div>
                </div>
                <div v-if="run.messages" class="run-messages ion-margin-top">
                  <p>{{ run.messages }}</p>
                </div>
                
                <ion-accordion-group class="ion-margin-top">
                  <ion-accordion v-if="run.logs && run.logs.length > 0" value="logs">
                    <ion-item slot="header">
                      <ion-label>{{ translate('Data Logs') }}</ion-label>
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
                      <ion-label>{{ translate('Technical Details') }}</ion-label>
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
          </div>
          <div v-else class="ion-padding ion-text-center">
            <p>{{ translate('No run history available') }}</p>
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
          <p class="ion-margin-bottom text-medium">
            {{ translate('Schedule operations are relative to your timezone:') }} <strong>{{ userTimeZone }}</strong>
          </p>
          <ion-list>
            <ion-item>
              <ion-input v-model="editScheduleData.cronExpression" :label="translate('Cron Expression')" label-placement="stacked" fill="outline"></ion-input>
            </ion-item>
            <ion-item class="ion-margin-top">
              <ion-input type="number" v-model="editScheduleData.repeatCount" :label="translate('Repeat Count (-1 for infinite)')" label-placement="stacked" fill="outline"></ion-input>
            </ion-item>
          </ion-list>
          <ion-button expand="block" class="ion-margin-top" @click="saveSchedule()">{{ translate('Save') }}</ion-button>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
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
  IonCardSubtitle
} from '@ionic/vue';
import { defineComponent, computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { DateTime } from 'luxon';
import { useUserStore } from '@/store/user';
import { documentOutline, pauseOutline, playOutline } from 'ionicons/icons';
import { translate, commonUtil } from '@common';
import { getCronString, getFileSize, getDateTimeWithOrdinalSuffix } from '@/utils';
import { getStatusDesc } from '@/utils/config';
import { mockJobs } from '@/mock/jobs';
import { mockJobRuns } from '@/mock/jobRuns';
import { mockJobParameters } from '@/mock/jobParameters';
import { serviceInParameters } from '@/mock/serviceInParameters';
import { mockDataManagerLogs } from '@/mock/dataManagerLogs';
import { mockCategoryMembers, mockCategories } from '@/mock/categories';

export default defineComponent({
  name: 'JobDetail',
  components: {
    IonAccordion,
    IonAccordionGroup,
    IonBackButton,
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
    IonPage,
    IonTitle,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonModal,
    IonText
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const userStore = useUserStore();
    
    const userTimeZone = computed(() => userStore.getUserTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    const jobName = computed(() => route.params.jobName as string);
    const activeTab = ref('overview');

    const job = computed(() => {
      return mockJobs.find(j => j.jobName === jobName.value);
    });

    // Product & Category Context
    const jobCategories = computed(() => {
      if (!job.value) return [];
      // Assuming jobName is used as productId for category mapping
      const memberRecords = mockCategoryMembers.filter(member => member.productId === job.value?.jobName);
      const categoryIds = memberRecords.map(m => m.productCategoryId);
      return mockCategories.filter(cat => categoryIds.includes(cat.productCategoryId));
    });

    const runs = computed(() => {
      return mockJobRuns.filter(r => r.jobName === jobName.value).map(run => ({
        ...run,
        logs: mockDataManagerLogs.filter(log => log.createdByJobId === run.jobRunId)
      }));
    });
 
    const jobParameters = computed(() => {
      const decodedJobName = decodeURIComponent(jobName.value);
      return mockJobParameters.filter(p => p.jobName === jobName.value || p.jobName === decodedJobName);
    });

    const calculateDuration = (start: string | null, end: string | null) => {
      if (!start || !end) return 'N/A';
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diff = endDate.getTime() - startDate.getTime();
      
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      }
      return `${seconds}s`;
    };

    const formatJobDate = (dateString: string) => {
      if (!dateString) return '-';
      return DateTime.fromFormat(dateString, 'yyyy-MM-dd HH:mm:ss.SSS').toLocaleString(DateTime.DATETIME_MED);
    };

    const isEditingParameters = ref(false);
    const editableParametersList = ref<any[]>([]);

    const toggleEditParameters = () => {
      if (!job.value) return;

      const availableParamNames = serviceInParameters[job.value.serviceName] || [];
      
      // Map all available parameters, pre-filling with saved values where they exist
      editableParametersList.value = availableParamNames.map(name => {
        const savedParam = jobParameters.value.find(p => p.parameterName === name);
        return {
          parameterName: name,
          parameterValue: savedParam ? savedParam.parameterValue : ''
        };
      });

      // If no parameters defined in service, at least show what's currently saved
      if (editableParametersList.value.length === 0) {
        editableParametersList.value = JSON.parse(JSON.stringify(jobParameters.value));
      }

      isEditingParameters.value = true;
    };

    const saveParameters = () => {
      const otherJobsParams = mockJobParameters.filter(p => p.jobName !== jobName.value);
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
      if (job.value) {
        job.value.paused = job.value.paused === 'N' ? 'Y' : 'N';
      }
    };

    const editScheduleData = ref({ cronExpression: '', repeatCount: -1 });
    const isScheduleModalOpen = ref(false);

    const editSchedule = () => {
      if (job.value) {
        editScheduleData.value = {
          cronExpression: job.value.cronExpression || '',
          repeatCount: job.value.repeatCount || -1
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


    return {
      activeTab,
      calculateDuration,
      job,
      jobName,
      runs,
      translate,
      getCronString,
      jobParameters,
      isEditingParameters,
      editableParametersList,
      toggleEditParameters,
      saveParameters,
      cancelEditParameters,
      togglePause,
      isScheduleModalOpen,
      editScheduleData,
      editSchedule,
      closeScheduleModal,
      saveSchedule,
      goToLogDetail,
      documentOutline,
      pauseOutline,
      playOutline,
      commonUtil,
      getStatusDesc,
      getFileSize,
      getDateTimeWithOrdinalSuffix,
      jobCategories,
      formatJobDate,
      userTimeZone
    };
  }
});
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
}

.run-header {
  display: flex;
  flex-direction: column;
}

.run-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacer-sm, 8px);
}

.run-messages {
  background: var(--ion-color-light);
  padding: var(--spacer-sm, 8px);
  border-radius: 4px;
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

@media (min-width: 992px) {
  .list-item.log {
    grid-template-columns: repeat(var(--columns-desktop), 1fr);
  }
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

.technical-details pre {
  background: var(--ion-color-light);
  padding: var(--spacer-sm, 8px);
  overflow-x: auto;
  border-radius: 4px;
}
</style>
