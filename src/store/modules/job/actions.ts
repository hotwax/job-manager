import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { isCustomRunTime, generateAllowedFrequencies, hasError, showToast } from '@/utils'
import { JobService } from '@/services/JobService'
import { translate } from '@hotwax/dxp-components'
import { DateTime } from 'luxon';
import store from '@/store'
import logger from "@/logger";

const actions: ActionTree<JobState, RootState> = {

  async fetchJobDescription({ commit, state }, payload){
    const enumIds = [] as any;
    const cachedEnumIds = Object.keys(state.enumIds);
    payload.map((id: any) => {
      if(!cachedEnumIds.includes(id) && id){
        enumIds.push(id);
      }
    });
    if(enumIds.length <= 0) return enumIds.map((id: any) => state.enumIds[id]);
 
    const resp = await JobService.fetchJobDescription({
      "inputFields": {
        "enumId": enumIds,
        "enumId_op": "in"
      },
      "fieldList": ['enumId', 'description', 'enumName'],
      "entityName": "Enumeration",
      "noConditionFind": "Y",
      "viewSize": payload.length
    })
    if (resp.status === 200 && resp.data?.count > 0 && !hasError(resp)) {
      const enumInformation = resp.data.docs;
      if (resp.data.docs) {
        commit(types.JOB_DESCRIPTION_UPDATED, enumInformation);
      }
    }
    return resp;
  },

  async fetchJobHistory({ commit, dispatch, state }, payload){ 
    const params = {
      "inputFields": {
        "statusId": ["SERVICE_CANCELLED", "SERVICE_CRASHED", "SERVICE_FAILED", "SERVICE_FINISHED"],
        "statusId_op": "in",
        "systemJobEnumId_op": "not-empty",
        "shopId_fld0_value": store.state.user.currentShopifyConfig?.shopId,
        "shopId_fld0_grp": "1",
        "shopId_fld0_op": "equals",
        "shopId_fld1_grp": "2",
        "shopId_fld1_op": "empty"
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "jobResult", "statusId", "cancelDateTime", "finishDateTime", "startDateTime" , "enumTypeId", "enumName", "description", "runtimeDataId", "createdByUserLogin", "lastModifiedByUserLogin", "createdDate", "lastUpdatedStamp", "recurrenceTimeZone" ],
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
      "orderBy": "lastUpdatedStamp DESC | runTime DESC"
    }

    if(payload.statusId.length > 0) {
      params.inputFields["statusId"] = payload.statusId;
    } 

    if(payload.systemJobEnumId && payload.systemJobEnumId.length > 0) {
      params.inputFields["systemJobEnumId"] = payload.systemJobEnumId
      params.inputFields["systemJobEnumId_op"] = "in"
    }

    if (payload.eComStoreId) {
      params.inputFields["productStoreId"] = payload.eComStoreId
    } else {
      params.inputFields["productStoreId_op"] = "empty"
    }

    if(payload.enumTypeId && payload.enumTypeId.length > 0) {
      params.inputFields["enumTypeId"] = payload.enumTypeId;
      params.inputFields["enumTypeId_op"] = "in"
    } 
    
    if (payload.queryString) {
      params.inputFields["description_value"] = payload.queryString
      params.inputFields["description_op"] = "contains"
      params.inputFields["description_ic"] = "Y"
    } 

    await JobService.fetchJobInformation(params).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs;
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.history.list.concat(jobs);
          }
          jobs.map((job: any) => {
            job['statusDesc'] = this.state.util.statusDesc[job.statusId];
          })          
          commit(types.JOB_HISTORY_UPDATED, { jobs, total });
          const tempExprList = [] as any;
          const enumIds = [] as any;
          resp.data.docs.map((item: any) => {
            enumIds.push(item.systemJobEnumId);
            tempExprList.push(item.tempExprId);
          })
          const tempExpr = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', tempExpr);
        }
      } else {
        commit(types.JOB_HISTORY_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_HISTORY_UPDATED, { jobs: [], total: 0 });
      logger.error(err);
      showToast(translate("Something went wrong"));
    }) 
  },

  async fetchRunningJobs({ commit, dispatch, state }, payload){

    const params = {
      "inputFields": {
        "systemJobEnumId_op": "not-empty",
        "statusId": ["SERVICE_RUNNING", "SERVICE_QUEUED"],
        "statusId_op": "in",
        "shopId_fld0_value": store.state.user.currentShopifyConfig?.shopId,
        "shopId_fld0_grp": "1",
        "shopId_fld0_op": "equals",
        "shopId_fld1_grp": "2",
        "shopId_fld1_op": "empty"
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "enumTypeId", "enumName", "description", "runtimeDataId", "startDateTime" ],
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
      "orderBy": "runTime DESC"
    }

    if(payload.systemJobEnumId && payload.systemJobEnumId.length > 0) {
      params.inputFields["systemJobEnumId"] = payload.systemJobEnumId
      params.inputFields["systemJobEnumId_op"] = "in"
    }

    if (payload.eComStoreId) {
      params.inputFields["productStoreId"] = payload.eComStoreId
    } else {
      params.inputFields["productStoreId_op"] = "empty"
    }

    if(payload.enumTypeId && payload.enumTypeId.length > 0) {
      params.inputFields["enumTypeId"] = payload.enumTypeId;
      params.inputFields["enumTypeId_op"] = "in"
    } 

    if (payload.queryString) {
      params.inputFields["description_value"] = payload.queryString
      params.inputFields["description_op"] = "contains"
      params.inputFields["description_ic"] = "Y"
    } 

    await JobService.fetchJobInformation(params).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs;
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.running.list.concat(jobs);
          }
          jobs.map((job: any) => {
            job['statusDesc'] = this.state.util.statusDesc[job.statusId];
          })
          commit(types.JOB_RUNNING_UPDATED, { jobs, total });
          const tempExprList = [] as any;
          const enumIds = [] as any;
          resp.data.docs.map((item: any) => {
            enumIds.push(item.systemJobEnumId);
            tempExprList.push(item.tempExprId);
          })
          const tempExpr = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', tempExpr);
        }
      } else {
        commit(types.JOB_RUNNING_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_RUNNING_UPDATED, { jobs: [], total: 0 });
      logger.error(err);
      showToast(translate("Something went wrong"));
    }) 
  },

  async fetchPendingJobs({ commit, dispatch, state }, payload){
    const params = {
      "inputFields": {
        "statusId": "SERVICE_PENDING",
        "systemJobEnumId_op": "not-empty",
        "shopId_fld0_value": store.state.user.currentShopifyConfig?.shopId,
        "shopId_fld0_grp": "1",
        "shopId_fld0_op": "equals",
        "shopId_fld1_grp": "2",
        "shopId_fld1_op": "empty",
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId", "productStoreId", "runtimeDataId", "shopId", "description", "enumTypeId", "enumName" ],
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
      "orderBy": "runTime ASC"
    }

    if(payload.systemJobEnumId && payload.systemJobEnumId.length > 0) {
      params.inputFields["systemJobEnumId"] = payload.systemJobEnumId
      params.inputFields["systemJobEnumId_op"] = "in"
    }
    
    if(payload.eComStoreId) {
      params.inputFields["productStoreId"] = payload.eComStoreId
    } else {
      params.inputFields["productStoreId_op"] = "empty"
    }

    if(payload.enumTypeId && payload.enumTypeId.length > 0) {
      params.inputFields["enumTypeId"] = payload.enumTypeId;
      params.inputFields["enumTypeId_op"] = "in"
    } 

    if (payload.queryString) {
      params.inputFields["description_value"] = payload.queryString
      params.inputFields["description_op"] = "contains"
      params.inputFields["description_ic"] = "Y"
    }
    await JobService.fetchJobInformation(params).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs.map((job: any) => {
            return {
              ...job,
              'status': job?.statusId,
            }
          })
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.pending.list.concat(jobs);
          }
          commit(types.JOB_PENDING_UPDATED, { jobs, total });
          const tempExprList = [] as any;
          const enumIds = [] as any;
          resp.data.docs.map((item: any) => {
            enumIds.push(item.systemJobEnumId);
            tempExprList.push(item.tempExprId);
          })
          const tempExpr = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', tempExpr);
        }
      } else {
        commit(types.JOB_PENDING_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_PENDING_UPDATED, { jobs: [], total: 0 });
      logger.error(err);
      showToast(translate("Something went wrong"));
    })
  },

  async fetchDataManagerLogs({ commit }, jobId) {
    commit(types.JOB_DATA_MANAGER_LOGS_UPDATED, []);
    let logs = [] as any
    const payload = {
      "inputFields":  {
        "systemJobEnumId_op": "not-empty",
        "createdByJobId": jobId
      },
      "fieldList": ["statusId", "logId", "createdDate", "startDateTime", "finishDateTime", "logFileContentId", "errorRecordContentId", "contentName", "dataResourceId"],
      "noConditionFind": "Y",
      "viewSize": 250,
      "entityName": "DataManagerLogAndContent",
    }

    try {
      const resp = await JobService.fetchDataManagerLogs(payload);
      if (resp.data.docs?.length > 0 && !hasError(resp)) {
        logs = resp.data.docs;
      } else {
        throw resp.data;
      }
    } catch (err) {
      logger.error(err);
    }
    commit(types.JOB_DATA_MANAGER_LOGS_UPDATED, logs);
    return logs;
  },

  async fetchDataResource({ commit }, logs) {
    // Extract logFileContentId and errorRecordContentId from logs
    const contentIds = [].concat(...logs.map((log: any) => [log.logFileContentId, log.errorRecordContentId].filter(id => id)));
  
    const payload = {
      "inputFields": {
        "coContentId": contentIds,
        "coContentId_op": "in"
      },
      "fieldList": ["coContentId", "coDataResourceId", "coContentName"], 
      "noConditionFind": "Y",
      "viewSize": 250,
      "entityName": "DataResourceContentView"
    }
  
    try {
      const resp = await JobService.fetchDataResource(payload);
      if (resp.data.docs?.length > 0 && !hasError(resp)) {
        logs.forEach((log: any) => {
          const logFileDataResource = resp.data.docs.find((doc: any) => doc.coContentId === log.logFileContentId);
          if (logFileDataResource) {
            log.logFileDataResourceId = logFileDataResource.coDataResourceId;
            log.logFileContentName = logFileDataResource.coContentName;
          }
  
          const errorRecordDataResource = resp.data.docs.find((doc: any) => doc.coContentId === log.errorRecordContentId);
          if (errorRecordDataResource) {
            log.errorRecordDataResourceId = errorRecordDataResource.coDataResourceId;
            log.errorRecordContentName = errorRecordDataResource.coContentName;
          }
        });
      }
    } catch (err) {
      logger.error(err);
    }
    commit(types.JOB_DATA_MANAGER_LOGS_UPDATED, logs);
  },
  async fetchMiscellaneousJobs({ commit, dispatch, state }, payload){
    const fetchJobRequests = [];
    const params = {
      "inputFields": {
        "enumTypeId": "MISC_SYS_JOB",
        "statusId": "SERVICE_DRAFT",
        "systemJobEnumId_op": "not-empty",
        "shopId_fld0_value": store.state.user.currentShopifyConfig?.shopId,
        "shopId_fld0_grp": "1",
        "shopId_fld0_op": "equals",
        "shopId_fld1_grp": "2",
        "shopId_fld1_op": "empty"
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId", "productStoreId", "runtimeDataId", "enumName", "shopId", "description" ],
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
    }

    fetchJobRequests.push(JobService.fetchJobInformation(JSON.parse(JSON.stringify(params))).catch((err) => {
      return err;
    }))

    params.inputFields.statusId = "SERVICE_PENDING";
    if (payload.eComStoreId) {
      params.inputFields["productStoreId"] = payload.eComStoreId
    } else {
      params.inputFields["productStoreId_op"] = "empty"
    }

    fetchJobRequests.push(JobService.fetchJobInformation(JSON.parse(JSON.stringify(params))).catch((err) => {
      return err;
    }))

    let jobs = [], total = 0;
    try {
      const resp = await Promise.all(fetchJobRequests)
      const responseJobs = resp.reduce((responseJobs: any, response: any) => {
        response.status === 200 && !hasError(response) && response.data.docs?.length > 0 && (total += +response.data.count, responseJobs = [...responseJobs, ...response.data.docs]);
        return responseJobs;
      }, [])

      jobs = responseJobs.map((job: any) => {
        if (job.statusId === 'SERVICE_DRAFT') delete job.runTime;
        return { ...job, 'status': job.statusId }
      })

      if (payload.viewIndex > 0) jobs = state.miscellaneous.list.concat(jobs);

      const tempExprList = [] as any;
      const enumIds = [] as any;

      responseJobs.map((job: any) => {
        enumIds.push(job.systemJobEnumId);
        tempExprList.push(job.tempExprId);
      })

      const tempExpr = [...new Set(tempExprList)];
      dispatch('fetchTemporalExpression', tempExpr);
      dispatch('fetchJobDescription', enumIds);
    } catch (err) {
      logger.error(err);
      showToast(translate("Something went wrong"));
    } finally {
      commit(types.JOB_MISCELLANEOUS_UPDATED, { jobs: jobs, total: total ? total : 0 });
    }
  },
  async fetchTemporalExpression({ state, commit }, tempExprIds){
    const tempIds = [] as any;
    const cachedTempExprId = Object.keys(state.temporalExp);
    tempExprIds.map((id: any) => {
      if(!cachedTempExprId.includes(id) && id){
        tempIds.push(id);
      }
    });
    if(tempIds.length == 0) return state.temporalExp;
    const resp = await JobService.fetchTemporalExpression({
        "inputFields": {
        "tempExprId": tempIds,
        "temoExprId_op": "in"
      },
      "viewSize": tempIds.length,
      "fieldList": [ "tempExprId", "description","integer1", "integer2" ],
      "entityName": "TemporalExpression",
      "noConditionFind": "Y",
    })
    if (resp.status === 200 && !hasError(resp)) {
      resp.data.docs.forEach((temporalExpression: any) => {
        state.temporalExp[temporalExpression.tempExprId] = temporalExpression;
      })
      commit(types.JOB_TEMPORAL_EXPRESSION_UPDATED, state.temporalExp);
    }
    return state.temporalExp;
  },
  async findTemporalExpression({ commit, state }){
    let temporalExpressions = [];
    const resp = await JobService.fetchTemporalExpression({
      "inputFields": {
        "tempExprTypeId": "FREQUENCY",
      },
      "viewSize": 100,
      "fieldList": [ "tempExprId", "description","integer1", "integer2" ],
      "entityName": "TemporalExpression",
      "noConditionFind": "Y",
    })
    if (resp.status === 200 && !hasError(resp)) {
      temporalExpressions = resp.data.docs;
      temporalExpressions.forEach((temporalExpression: any) => {
        state.temporalExp[temporalExpression.tempExprId] = temporalExpression;
      })
      // Caching it for other uses
      commit(types.JOB_TEMPORAL_EXPRESSION_UPDATED, state.temporalExp);
    }
    return temporalExpressions;
  },
  
  async fetchJobs ({ state, commit, dispatch }, payload) {
    // We are fetching the draft and pending jobs separately as we could only have single OR condition in query
    // Earlier we were having ORing on status only, but now we want to add condition for shopId as well
    // Instead of complicating the query, we have made 2 separate call with status conditions and merged them

    // Fetching the draft jobs first
    const fetchJobRequests = [];
    let params = {
      "inputFields": {
        "statusId": "SERVICE_DRAFT",
        "shopId_fld0_value": this.state.user.currentShopifyConfig?.shopId,
        "shopId_fld0_grp": "1",
        "shopId_fld0_op": "equals",
        "shopId_fld1_grp": "2",
        "shopId_fld1_op": "empty",
        ...payload.inputFields
      },
      "noConditionFind": "Y",
      "viewSize": (payload.inputFields?.systemJobEnumId?.length * 3) || 50
    } as any

    if (payload?.orderBy) {
      params['orderBy'] = payload.orderBy
    }
    fetchJobRequests.push(JobService.fetchJobInformation(params).catch((err) => {
      return err;
    }))

    // Deep cloning in order to avoid mutating the same reference causing side effects
    params =  JSON.parse(JSON.stringify(params));

    // Fetching pending jobs
    params.inputFields.statusId = "SERVICE_PENDING";
    params.inputFields.productStoreId = this.state.user.currentEComStore.productStoreId;
    params.inputFields.tempExprId_op = "not-empty";
    fetchJobRequests.push(JobService.fetchJobInformation(params).catch((err) => {
      return err;
    }))

    const resp = await Promise.all(fetchJobRequests)
    const responseJobs = resp.reduce((responseJobs: any, response: any) => {
      response.status === 200 && !hasError(response) && response.data.docs && (responseJobs = [...responseJobs, ...response.data.docs]);
      return responseJobs;
    }, [])

    // TODO Fix Indentation
    const cached = JSON.parse(JSON.stringify(state.cached));

    // If individual job is fetched, this might be the case for update and cancel of job
    // Old job should be removed and fetched again, in order to replace last pending one with draft job
    if (payload.inputFields.systemJobEnumId && payload.inputFields.systemJobEnumId_op === "equals") {
      delete cached[payload.inputFields.systemJobEnumId];
    }

    
    // added condition to store multiple pending jobs in the state for order batch jobs  
    responseJobs.filter((job: any) => job.statusId === 'SERVICE_PENDING').reduce((cached: any, job: any) => {
      cached[job.systemJobEnumId] = {
        ...job,
        id: job.jobId,
        frequency: job.tempExprId,
        enumId: job.systemJobEnumId,
        status: job.statusId
      }
      return cached;
    }, cached)

    responseJobs.filter((job: any) => job.statusId === 'SERVICE_DRAFT').map((job: any) => {
      delete job.runTime;
      return cached[job.systemJobEnumId] = cached[job.systemJobEnumId] ? cached[job.systemJobEnumId] : {
        ...job,
        id: job.jobId,
        frequency: job.tempExprId,
        enumId: job.systemJobEnumId,
        status: job.statusId
      }
    });

    // fetching temp expressions
    // added check to loop over cachedJob (in else part), as in case of batch job same enum contains multiple jobs as an array
    // and thus tempExprId is not available by default on the root
    // Before looping over cachedJob, checking whether the tempExprId is directly available on the root or not,
    // if tempExprId is available on root it simply means that we have a single job against the enum
    const tempExpr = Object.values(cached).reduce((tempExprIds: any, cachedJob: any) => {
      if(cachedJob.tempExprId && !tempExprIds.includes(cachedJob.tempExprId)) {
        tempExprIds.push(cachedJob.tempExprId)
      } else if(Array.isArray(cachedJob)) {
        cachedJob.map((job: any) => {
          if(job.tempExprId && !tempExprIds.includes(job.tempExprId)) {
            tempExprIds.push(job.tempExprId)
          }
        });
      }

      return tempExprIds;
    }, [])
    await dispatch('fetchTemporalExpression', tempExpr)

    commit(types.JOB_UPDATED_BULK, cached);
    return resp;
  },
  async updateJob ({ commit, dispatch }, job) {
    let resp;

    const payload = {
      'jobId': job.jobId,
      'systemJobEnumId': job.systemJobEnumId,
      'recurrenceTimeZone': this.state.user.current.userTimeZone,
      'tempExprId': job.jobStatus,
      'statusId': "SERVICE_PENDING",
      'runTimeEpoch': '',  // when updating a job clearning the epoch time, as job honors epoch time as runTime and the new job created also uses epoch time as runTime
      'lastModifiedByUserLogin': this.state.user.current.userLoginId
    } as any

    job?.runTime && (payload['runTime'] = job.runTime)
    job?.sinceId && (payload['sinceId'] = job.sinceId)
    job?.jobName && (payload['jobName'] = job.jobName)

    try {
      resp = await JobService.updateJob(payload)
      if (resp.status === 200 && !hasError(resp) && resp.data.successMessage) {
        const fetchJobResponses = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': payload.systemJobEnumId,
            'systemJobEnumId_op': 'equals'
          }
        })
        // As we are getting both draft and pending jobs in response, we are using find
        const jobResponse = fetchJobResponses.find((response: any) => response.status === 200 && !hasError(response) && response.data?.docs.length && response.data.docs[0].jobId === payload.jobId);
        if(jobResponse) {
          // We are using status field everywhere so whenever we fetch job again status field needs to be updated
          // TODO Check why status field is used instead of statusId
          commit(types.JOB_CURRENT_UPDATED, jobResponse.data.docs[0]);
        }
        showToast(translate('Service updated successfully'))
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      logger.error(err)
    }
    return resp;
  },

  async scheduleService({ dispatch, commit }, params) {
    let resp;

    const job = params.job

    const payload = {
      'JOB_NAME': job.jobName,
      'SERVICE_NAME': job.serviceName,
      'SERVICE_COUNT': '0',
      'SERVICE_TEMP_EXPR': job.jobStatus,
      'SERVICE_RUN_AS_SYSTEM':'Y',
      'jobFields': {
        'productStoreId': this.state.user.currentEComStore.productStoreId,
        'systemJobEnumId': job.systemJobEnumId,
        'tempExprId': job.jobStatus, // Need to remove this as we are passing frequency in SERVICE_TEMP_EXPR, currently kept it for backward compatibility
        'maxRecurrenceCount': '-1',
        'parentJobId': job.parentJobId,
        'runAsUser': 'system', //default system, but empty in run now.  TODO Need to remove this as we are using SERVICE_RUN_AS_SYSTEM, currently kept it for backward compatibility
        'recurrenceTimeZone': this.state.user.current.userTimeZone,
        'createdByUserLogin': this.state.user.current.userLoginId,
        'lastModifiedByUserLogin': this.state.user.current.userLoginId,
      },
      'statusId': "SERVICE_PENDING",
      'systemJobEnumId': job.systemJobEnumId,
      ...params.jobCustomParameters
    } as any
    
    const jobRunTimeDataKeys = job?.runtimeData ? Object.keys(job?.runtimeData) : [];
    if (jobRunTimeDataKeys.includes('shopifyConfigId') || jobRunTimeDataKeys.includes('shopId')) {
      const shopifyConfig = this.state.user.currentShopifyConfig
      if (Object.keys(shopifyConfig).length == 0) {
        showToast(translate('Shopify configuration not found. Scheduling failed.'))
        return;
      }

      jobRunTimeDataKeys.includes('shopifyConfigId') && (payload['shopifyConfigId'] = shopifyConfig?.shopifyConfigId);
      jobRunTimeDataKeys.includes('shopId') && (payload['shopId'] = shopifyConfig?.shopId);
      payload['jobFields']['shopId'] = shopifyConfig?.shopId;
    }

    // checking if the runtimeData has productStoreId, and if present then adding it on root level
    job?.runtimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = this.state.user.currentEComStore.productStoreId)
    job?.priority && (payload['SERVICE_PRIORITY'] = job.priority.toString())
    job?.runTime && (payload['SERVICE_TIME'] = job.runTime.toString())
    job?.sinceId && (payload['sinceId'] = job.sinceId)

    try {
      resp = await JobService.scheduleJob({ ...payload });
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate('Service has been scheduled'));
        const fetchJobsResponses = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': payload.systemJobEnumId,
            'systemJobEnumId_op': 'equals',
          },
          orderBy: "runTime ASC"
        })
        const fetchJobsResponse = fetchJobsResponses.find((fetchJobsResponse: any) => {
          return !hasError(fetchJobsResponse) &&
              fetchJobsResponse.data?.docs?.length &&
              fetchJobsResponse.data?.docs[0].statusId == "SERVICE_PENDING";
        });
        if(fetchJobsResponse) {
          commit(types.JOB_CURRENT_UPDATED, fetchJobsResponse.data.docs[0]);
          return job;
        }
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      logger.error(err)
    }
    return {};
  },

  clearJobState({commit}) {
    commit(types.JOB_PENDING_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_HISTORY_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_RUNNING_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_UPDATED_BULK, {})
  },

  async skipJob({ state, commit, dispatch, getters }, job) {
    let skipTime = {};
    const integer1 = getters['getTemporalExpr'](job.tempExprId)?.integer1;
    const integer2 = getters['getTemporalExpr'](job.tempExprId)?.integer2
    if(integer1 === 12) {
      skipTime = { minutes: integer2 }
    } else if (integer1 === 10) {
      skipTime = { hours: integer2 }
    } else if (integer1 === 5) {
      skipTime = { days: integer2 }
    } else {
      showToast(translate("This job schedule cannot be skipped"));
      return;
    }
    const time = DateTime.fromMillis(job.runTime).diff(DateTime.local()).plus(skipTime);
    const updatedRunTime = time.toMillis() + DateTime.local().toMillis()
    const payload = {
      'jobId': job.jobId,
      'runTime': updatedRunTime,
      'systemJobEnumId': job.systemJobEnumId,
      'recurrenceTimeZone': this.state.user.current.userTimeZone,
      'statusId': "SERVICE_PENDING",
      'runTimeEpoch': ''
    } as any

    const resp = await JobService.updateJob(payload)
    const fetchJobsResponses = await dispatch('fetchJobs', {
      inputFields: {
        'systemJobEnumId': payload.systemJobEnumId,
        'systemJobEnumId_op': 'equals'
      }
    })
    // Fetch and update current only when there is object in current
    // Skip job can be performed from pipeline page too causing side effects
    if (state.current && Object.keys(state.current).length) {
      const fetchJobsResponse = fetchJobsResponses.find((fetchJobsResponse: any) => {
        return !hasError(fetchJobsResponse) && 
            fetchJobsResponse.data?.docs?.length && 
            fetchJobsResponse.data?.docs[0].statusId == "SERVICE_PENDING";
      });
      const jobs = fetchJobsResponse.data?.docs;
      const currentJob = jobs.find((currentJob: any) => currentJob?.jobId === job?.jobId);
      commit(types.JOB_CURRENT_UPDATED, currentJob);
    }

    return resp;
  },

  async runServiceNow({ dispatch }, params) {
    let resp;

    const job = params.job

    const payload = {
      'JOB_NAME': job.jobName,
      'SERVICE_NAME': job.serviceName,
      'SERVICE_COUNT': '0',
      'SERVICE_TEMP_EXPR': job.jobStatus,
      'jobFields': {
        'productStoreId': job.status === "SERVICE_PENDING" ? job.productStoreId : this.state.user.currentEComStore.productStoreId,
        'systemJobEnumId': job.systemJobEnumId,
        'tempExprId': job.jobStatus, // Need to remove this as we are passing frequency in SERVICE_TEMP_EXPR, currently kept it for backward compatibility
        'parentJobId': job.parentJobId,
        'recurrenceTimeZone': this.state.user.current.userTimeZone,
        'createdByUserLogin': this.state.user.current.userLoginId,
        'lastModifiedByUserLogin': this.state.user.current.userLoginId
      },
      'statusId': "SERVICE_PENDING",
      'systemJobEnumId': job.systemJobEnumId,
      ...params.jobCustomParameters
    } as any
    // checking if the runtimeData has productStoreId, and if present then adding it on root level
    job?.runtimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = job.status === "SERVICE_PENDING" ? job.productStoreId : this.state.user.currentEComStore.productStoreId)
    job?.priority && (payload['SERVICE_PRIORITY'] = job.priority.toString())
    job?.sinceId && (payload['sinceId'] = job.sinceId)

    // ShopifyConfig and ShopifyShop should be set based upon runtime data
    // If existing job is run now, copy as is else set the current shop of user
    const jobRunTimeDataKeys = job?.runtimeData ? Object.keys(job?.runtimeData) : [];
    if (jobRunTimeDataKeys.includes('shopifyConfigId') || jobRunTimeDataKeys.includes('shopId')) {
      const shopifyConfig = this.state.user.currentShopifyConfig
      if (job.status !== "SERVICE_PENDING" && Object.keys(shopifyConfig).length == 0) {
        showToast(translate('Shopify configuration not found. Scheduling failed.'))
        return;
      }

      jobRunTimeDataKeys.includes('shopifyConfigId') && (payload['shopifyConfigId'] = job.status === "SERVICE_PENDING" ? job.runtimeData?.shopifyConfigId : shopifyConfig?.shopifyConfigId);
      jobRunTimeDataKeys.includes('shopId') && (payload['shopId'] = job.status === "SERVICE_PENDING" ? job.runtimeData?.shopId : shopifyConfig?.shopId);
      payload['jobFields']['shopId'] = job.status === "SERVICE_PENDING" ? job.shopId : shopifyConfig?.shopId;
    }

    try {
      resp = await JobService.scheduleJob({ ...payload });
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate('Service has been scheduled'))
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      logger.error(err)
    }
    return resp;
  },

  async cancelJob({ commit, dispatch, state }, job) {
    let resp;

    try {
      resp = await JobService.cancelJob({
        jobId: job.jobId
      });
      if (resp.status == 200 && !hasError(resp)) {

        const fetchJobsResponses = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': job.systemJobEnumId,
            'systemJobEnumId_op': 'equals'
          }
        })
        // Fetch and update current only when there is object in current
        // Cancel job can be performed from pipeline page too causing side effects
        if (state.current && Object.keys(state.current).length) {  
          const fetchJobsResponse = fetchJobsResponses[0];
          if (fetchJobsResponse.status === 200 && !hasError(fetchJobsResponse) && fetchJobsResponse.data?.docs.length) {
            commit(types.JOB_CURRENT_UPDATED, fetchJobsResponse.data.docs[0]);
          }
        }
        showToast(translate('Service updated successfully'))
      } else {
        showToast(translate('Something went wrong'))
        return Promise.reject('Something went wrong' + resp.data);
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      logger.error(err)
      return Promise.reject('Something went wrong' + err);
    }
    return resp;
  },
  async updateCurrentJob({ commit, state }, payload) {
    const cachedJobs = state.cached;
    const pendingJobs = state.pending.list;

    if(payload?.job) {
      commit(types.JOB_CURRENT_UPDATED, payload.job);
      return payload?.job;
    }

    if(!payload.jobId) {
      commit(types.JOB_CURRENT_UPDATED, {});
      return;
    }

    let currentJob = pendingJobs.find((job: any) => job.jobId === payload.jobId);
    currentJob = currentJob ? currentJob : cachedJobs[payload?.jobId];

    if(currentJob) {
      commit(types.JOB_CURRENT_UPDATED, currentJob);
      return currentJob;
    }

    let resp;
    try {
      const params = {
        "inputFields": {
          "jobId": payload?.jobId
        } as any,
        "viewSize": 1,
        "fieldList": ["systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId", "description", "enumName", "runtimeDataId"],
        "noConditionFind": "Y"
      }
      resp = await JobService.fetchJobInformation(params);
      if(resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        const currentJob = {
          ...resp.data.docs[0],
          'status': resp.data.docs[0]?.statusId 
        }
        if (currentJob.statusId === 'SERVICE_DRAFT') delete currentJob.runTime;
        commit(types.JOB_CURRENT_UPDATED, currentJob);

        return currentJob;
      }
    } catch (err) {
      logger.error(err);
    }
  },
  setPipelineFilters({ commit, state }, payload) {
    const pipelineFilters = JSON.parse(JSON.stringify(state.pipelineFilters));
    const pipelineFilter = (pipelineFilters as any)[payload.type]
    pipelineFilter.includes(payload.value) 
    ? pipelineFilter.splice(pipelineFilter.indexOf(payload.value), 1) 
    : pipelineFilter.push(payload.value);

    commit(types.JOB_PIPELINE_FILTERS_UPDATED, { pipelineFilters });
  },
  clearPipelineFilters({ commit }) {
    commit(types.JOB_PIPELINE_FILTERS_CLEARED);
  },
}
export default actions;
