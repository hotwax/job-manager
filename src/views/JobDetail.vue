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
      <template v-if="job.jobName || job.instanceOfProductId">
        <!-- Product Context Header -->
        <div class="header-with-action">
          <div v-if="job" class="job-context-header ion-padding">
            <p class="overline">{{ job.paused === "Y" ? "Disabled" : "Enabled" }}</p>
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

          <ion-button size="small" fill="clear" @click="runNow">
            <ion-icon slot="start" :icon="flashOutline" />
            {{ translate("Run Now") }}
          </ion-button>
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
                    <ion-text>{{ getDateTimeWithOrdinalSuffix(job.fromDate) }}</ion-text>
                  </ion-item>
                  <ion-item v-if="job.thruDate">
                    <ion-label position="stacked">{{ translate("Valid To") }}</ion-label>
                    <ion-text>{{ getDateTimeWithOrdinalSuffix(job.thruDate) }}</ion-text>
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
                    <ion-label position="stacked">{{ translate("Instance Of Product ID") }}</ion-label>
                    <ion-text>{{ job.instanceOfProductId }}</ion-text>
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
                    <ion-text>{{ getDateTimeWithOrdinalSuffix(job.createdStamp) }}</ion-text>
                  </ion-item>
                  <ion-item>
                    <ion-label position="stacked">{{ translate("Updated") }}</ion-label>
                    <ion-text>{{ getDateTimeWithOrdinalSuffix(job.lastUpdatedStamp) }}</ion-text>
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
            <template v-if="runs.length">
              <ion-card v-for="run in runs" :key="run.jobRunId" class="run-card">
                <ion-card-header>
                  <ion-card-title>
                    <ion-badge :color="run.hasError === 'Y' ? 'danger' : 'success'" class="ion-margin-end">
                      {{ run.hasError === 'Y' ? translate('Failed') : translate('Success') }}
                    </ion-badge>
                    <ion-label>#{{ run.jobRunId }}</ion-label>
                  </ion-card-title>
                  <ion-card-subtitle>{{ run.startTime }}</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <div class="run-stats">
                    <div><strong>{{ translate("Duration") }}:</strong> {{ calculateDuration(run.startTime, run.endTime) }}</div>
                    <div><strong>{{ translate("User") }}:</strong> {{ run.userId || "N/A" }}</div>
                    <div class="host-info"><strong>{{ translate("Host") }}:</strong> {{ run.hostName }} ({{ run.hostAddress }})</div>
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
            </template>
            <p v-else class="ion-padding ion-text-center">
              {{ translate("No run history available") }}
            </p>
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
              <!-- <ion-item> -->
              <ion-input v-model="editScheduleData.cronExpression" :label="translate('Cron Expression')" label-placement="stacked" fill="outline"></ion-input>
              <!-- </ion-item> -->
              <!-- <ion-item class="ion-margin-top"> -->
              <ion-input class="ion-margin-top" type="number" v-model="editScheduleData.repeatCount" :label="translate('Repeat Count (-1 for infinite)')" label-placement="stacked" fill="outline" min="-1"></ion-input>
              <!-- </ion-item> -->
            </ion-list>
            <ion-button expand="block" class="ion-margin-top" @click="saveSchedule()">{{ translate("Save") }}</ion-button>
          </ion-content>
        </ion-modal>
      </template>
      <p v-else class="empty-state">
        {{ translate("Failed to fetch job information") }}
      </p>
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
  IonCardSubtitle,
  onIonViewWillEnter,
  alertController
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';
import { documentOutline, flashOutline, pauseOutline, playOutline } from 'ionicons/icons';
import { translate, commonUtil, logger } from '@common';
import { getCronString, getFileSize, getDateTimeWithOrdinalSuffix, showToast } from '@/utils';
import { getStatusDesc } from '@/utils/config';
import { mockJobParameters } from '@/mock/jobParameters';
import { useJobStore } from '@/store/jobs';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const jobStore = useJobStore();

const categories = computed(() => jobStore.getCategories)
const categoryMembers = computed(() => jobStore.getCategoryMembers)
const currentProductStore = computed(() => userStore.getCurrentProductStore)

const userTimeZone = computed(() => userStore.getUserTimeZone);
const jobName = computed(() => route.params.jobName as string);
// const job = computed(() => jobs.value.find((job: any) => job.jobName === jobName.value));
let job: any = ref({})
let runs: any = ref([])

const activeTab = ref("overview");

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

const jobParameters = computed(() => job.value.serviceJobParameters);

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

const isEditingParameters = ref(false);
const editableParametersList = ref<any[]>([]);

const toggleEditParameters = () => {
  const availableParamNames = job.value.serviceInParameters.map((param: any) => param.name) || [];
  
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

const saveParameters = async () => {
  // const jobParams = job.value.serviceJobParameters

  // const updatedParams = editableParametersList.value.reduce((params: any, param: any) => {
  //   params[param.parameterName] = param.parameterValue.trim() !== ""
  //   return params
  // })

  // jobParams.map((param: any) => {
  //   if(updatedParams[param.parameterName]) {
  //     param[param.parameterName] = param
  //   }
  // })
  job.value.serviceJobParameters = editableParametersList;

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
    await updateJobInfo(payload)
  }
  isScheduleModalOpen.value = false;
};

const goToLogDetail = (logId: string | number) => {
  router.push({ name: "FileDetail", params: { id: logId } });
};

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
                  if(parameter.parameterName === "productStoreIds") {
                    parameter.parameterValue = currentProductStore.value.productStoreId
                    return true;
                  }
                  return false;
                })

                resp = await jobStore.updateJob({
                  jobName: clonedJob.jobName,
                  serviceJobParameters: clonedJob.serviceJobParameters
                })
                if(!commonUtil.hasError(resp)) {
                  jobName = clonedJob.jobName
                  // TODO: check if this change is required
                  // await this.store.dispatch("maargJob/updateMaargJob", { jobEnumId: clonedJob.jobTypeEnumId, job: clonedJob })
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

// defined this method as we need to convert values to string for trimming and correctly parse the data
const convertToString = (parameter: any) => {
  const value = parameter.value;

  if(!value) {
    return ""
  }

  try {
    if(parameter.type === "Map" || parameter.type === "List" || parameter.type === "Object") {
      return JSON.stringify(value)
    } else if(parameter.type === "String") {
      return value
    } else {
      return "" + value;
    }
  } catch {
    logger.error("Unable to parse the defined value", value)
    return value;
  }
}

const generateMaargJobCustomOptions = (job: any) => {
  let inputParameters = job?.serviceInParameters ? JSON.parse(JSON.stringify(job?.serviceInParameters)) : []
  const optionalParameters: Array<any> = [];
  const requiredParameters: Array<any> = [];

  // removing some fields that we don't want user to edit, and for which the values will be added programatically
  const excludeParameters = ["productStoreIds"]
  inputParameters = inputParameters.filter((parameter: any) =>!excludeParameters.includes(parameter.name))

  inputParameters.map((parameter: any) => {
    if(parameter.required === "true") {
      requiredParameters.push({
        name: parameter.name,
        value: job?.parameterValues && job?.parameterValues[parameter.name] && job?.parameterValues[parameter.name] !== 'null' ? convertToString({ value: job?.parameterValues[parameter.name], type: parameter.type }) : '',   // added check for null as we don't want to pass null as a value in the params
        type: parameter.type,
        default: parameter.default
      })
    } else {
      optionalParameters.push({
        name: parameter.name,
        value: job?.parameterValues && job?.parameterValues[parameter.name] && job?.parameterValues[parameter.name] !== 'null' ? convertToString({ value: job?.parameterValues[parameter.name], type: parameter.type }) : '',   // added check for null as we don't want to pass null as a value in the params
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
    clonedJob.serviceJobParameters.find((parameter: any) => {
      if(parameter.parameterName === "productStoreIds") {
        parameter.parameterValue = userStore.getCurrentProductStore.productStoreId
        return true;
      }
      return false;
    })
    job.value = clonedJob
  }

  // const paramValues = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, {});

  // Object.keys(paramValues).map((paramName: any) => {
  //   const existingParameter = job.serviceJobParameters.find((parameter: any) => parameter.parameterName === paramName);

  //   if(existingParameter) {
  //     existingParameter.parameterValue = paramValues[paramName]
  //   } else {
  //     job.serviceJobParameters.push({
  //       parameterName: paramName,
  //       parameterValue: paramValues[paramName],
  //       jobName: job.jobName
  //     })
  //   }
  // })

  const updatedJob = {
    ...job.value,
    // paused: "N",
    // cronExpression: this.selectedCronExpression
  }

  const payload = { 
    jobName: updatedJob.jobName,
    paused: updatedJob.paused,
    cronExpression: updatedJob.cronExpression
  } as any;

  // if(this.currentMaargJob.paused === "Y") payload["paused"] = "N"
  // if(this.isCronExpressionUpdated()) payload["cronExpression"] = this.selectedCronExpression
  // const isParametersUpdated = updatedJob.serviceJobParameters.some((parameter: any) => parameter.parameterValue !== this.currentMaargJob.parameterValues[parameter.parameterName])
  // if(isParametersUpdated) payload["serviceJobParameters"] = updatedJob.serviceJobParameters

  await updateJobInfo(payload)
}

async function updateJobInfo(payload: any) {
  try {
    const resp = await jobStore.updateJob(payload)
    if(!commonUtil.hasError(resp)) {
      showToast(translate("Service updated successfully"))
      // this.store.dispatch("maargJob/updateMaargJob", this.currentMaargJob.isDraftJob ? { jobEnumId: job.jobTypeEnumId, job: updatedJob } : { jobEnumId: job.jobTypeEnumId })
    } else {
      throw resp.data
    }
  } catch(err) {
    showToast(translate("Failed to update service"))
    logger.error(err)
  }
}

onIonViewWillEnter(async () => {
  Promise.allSettled([jobStore.fetchCategories(), jobStore.fetchCategoryRollup()])
  job.value = await jobStore.fetchJobDetail(route.params.jobName as string)
  if(job.value.instanceOfProductId) {
    runs.value = await jobStore.fetchJobRuns(route.params.jobName as string)
  } 
})
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

.run-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacer-sm, 8px);
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
