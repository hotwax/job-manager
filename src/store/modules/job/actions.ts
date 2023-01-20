import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { hasError, showToast, generateFrequencyOptions } from '@/utils'
import { JobService } from '@/services/JobService'
import { translate } from '@/i18n'
import { DateTime } from 'luxon';
import store from '@/store'

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
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "cancelDateTime", "finishDateTime", "startDateTime" , "enumTypeId" ],
      "noConditionFind": "Y",
      "viewSize": payload.viewSize,
      "viewIndex": payload.viewIndex,
      "orderBy": "runTime DESC"
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
          dispatch('fetchJobDescription', enumIds);
        }
      } else {
        commit(types.JOB_HISTORY_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_HISTORY_UPDATED, { jobs: [], total: 0 });
      console.error(err);
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
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "enumTypeId" ],
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
          dispatch('fetchJobDescription', enumIds);
        }
      } else {
        commit(types.JOB_RUNNING_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_RUNNING_UPDATED, { jobs: [], total: 0 });
      console.error(err);
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
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId", "productStoreId", "runtimeDataId", "shopId", "description", "enumTypeId" ],
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
              'status': job?.statusId
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
          dispatch('fetchJobDescription', enumIds);
        }
      } else {
        commit(types.JOB_PENDING_UPDATED, { jobs: [], total: 0 });
      }
    }).catch((err) => {
      commit(types.JOB_PENDING_UPDATED, { jobs: [], total: 0 });
      console.error(err);
      showToast(translate("Something went wrong"));
    })
  },
  async fetchMiscellaneousJobs({ commit, dispatch, state }, payload){
    const params = {
      "inputFields": {
        "enumTypeId": "MISC_SYS_JOB",
        "statusId": ["SERVICE_PENDING", "SERVICE_DRAFT"],
        "statusId_op": "in",
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

    try {
      const resp = await JobService.fetchJobInformation(params)
      if (resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0) {
        const total = resp.data.count;
        let jobs = resp.data.docs.map((job: any) => {
          return {
            ...job,
            'status': job?.statusId
          }
        })
        if(payload.viewIndex && payload.viewIndex > 0){
          jobs = state.miscellaneous.list.concat(jobs);
        }
        commit(types.JOB_MISCELLANEOUS_UPDATED, { jobs, total });
        const tempExprList = [] as any;
        const enumIds = [] as any;
        resp.data.docs.map((item: any) => {
          enumIds.push(item.systemJobEnumId);
          tempExprList.push(item.tempExprId);
        })
        const tempExpr = [...new Set(tempExprList)];
        dispatch('fetchTemporalExpression', tempExpr);
        dispatch('fetchJobDescription', enumIds);
      } else {
        commit(types.JOB_MISCELLANEOUS_UPDATED, { jobs: [], total: 0 });
      }
    } catch (err) {
      commit(types.JOB_MISCELLANEOUS_UPDATED, { jobs: [], total: 0 });
      console.error(err);
      showToast(translate("Something went wrong"));
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
    if(tempIds.length <= 0) return tempExprIds.map((id: any) => state.temporalExp[id]);
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
      commit(types.JOB_TEMPORAL_EXPRESSION_UPDATED, resp.data.docs);
    }
    return resp;
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

    // added condition to store multiple pending jobs in the state for order batch jobs,
    // getting job with status Service draft as well, as this information will be needed when scheduling
    // a new batch
    // TODO: this needs to be updated when we will be storing the draft and pending jobs separately
    const batchJobEnums = JSON.parse(process.env?.VUE_APP_BATCH_JOB_ENUMS as string)
    let batchJobEnumIds = Object.values(batchJobEnums)?.map((job: any) => job.id);
    // If query is for single systemJobEnumId only update it 
    if (typeof payload.inputFields.systemJobEnumId === "string" && batchJobEnumIds.includes(payload.inputFields.systemJobEnumId)) {
      batchJobEnumIds = [ payload.inputFields.systemJobEnumId ];
    } else if (typeof payload.inputFields.systemJobEnumId === "object") {
      batchJobEnumIds = batchJobEnumIds.filter((batchJobEnumId: any) => payload.inputFields.systemJobEnumId.includes(batchJobEnumId));
    }
    batchJobEnumIds.map((batchBrokeringJobEnum: any) => {
      cached[batchBrokeringJobEnum] = responseJobs.filter((job: any) => job.systemJobEnumId === batchBrokeringJobEnum).reduce((batchBrokeringJobs: any, job: any) => {
        batchBrokeringJobs.push({
          ...job,
          id: job.jobId,
          frequency: job.tempExprId,
          enumId: job.systemJobEnumId,
          status: job.statusId
        })
        return batchBrokeringJobs;
      }, [])
    })
    
    // added condition to store multiple pending jobs in the state for order batch jobs  
    responseJobs.filter((job: any) => !batchJobEnumIds.includes(job.systemJobEnumId) && job.statusId === 'SERVICE_PENDING').reduce((cached: any, job: any) => {
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
      return cached[job.systemJobEnumId] = cached[job.systemJobEnumId] ? cached[job.systemJobEnumId] : {
        ...job,
        id: job.jobId,
        frequency: job.tempExprId,
        enumId: job.systemJobEnumId,
        status: job.statusId,
        runTime: ""
      }
    });

    // fetching temp expressions
    const tempExpr = Object.values(cached).map((job: any) => job.tempExprId)
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
      'statusId': "SERVICE_PENDING"
    } as any

    job?.runTime && (payload['runTime'] = job.runTime)
    job?.sinceId && (payload['sinceId'] = job.sinceId)
    job?.jobName && (payload['jobName'] = job.jobName)

    try {
      resp = await JobService.updateJob(payload)
      if (resp.status === 200 && !hasError(resp) && resp.data.successMessage) {
        const jobs = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': payload.systemJobEnumId,
            'systemJobEnumId_op': 'equals'
          }
        })
        const fetchJobsResponse = jobs.find((job: any) => job?.jobId === payload.jobId);
        if(fetchJobsResponse.status === 200 && !hasError(fetchJobsResponse) && fetchJobsResponse.data?.docs.length) {
          // We are using status field everywhere so whenever we fetch job again status field needs to be updated
          // TODO Check why status field is used instead of statusId
          commit(types.JOB_CURRENT_UPDATED, fetchJobsResponse.data.docs[0]);
        }
        showToast(translate('Service updated successfully'))
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      console.error(err)
    }
    return resp;
  },

  async scheduleService({ dispatch, commit }, job) {
    let resp;

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
        'recurrenceTimeZone': this.state.user.current.userTimeZone
      },
      'statusId': "SERVICE_PENDING",
      'systemJobEnumId': job.systemJobEnumId
    } as any
    
    if(job?.runtimeData?.shopifyConfigId) {
      const shopifyConfig = this.state.user.currentShopifyConfig
      payload['shopifyConfigId'] = shopifyConfig?.shopifyConfigId
      payload['jobFields']['shopId'] = shopifyConfig?.shopId
    }

    // checking if the runtimeData has productStoreId, and if present then adding it on root level
    job?.runtimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = this.state.user.currentEComStore.productStoreId)
    job?.priority && (payload['SERVICE_PRIORITY'] = job.priority.toString())
    job?.runTime && (payload['SERVICE_TIME'] = job.runTime.toString())

    // assigning '' (empty string) to all the runtimeData properties whose value is "null"
    job.runtimeData && Object.keys(job.runtimeData).map((key: any) => {
      if (job.runtimeData[key] === 'null' ) job.runtimeData[key] = ''
    })

    try {
      resp = await JobService.scheduleJob({ ...job.runtimeData, ...payload });
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate('Service has been scheduled'));
        const jobs = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': payload.systemJobEnumId,
            'systemJobEnumId_op': 'equals',
            'statusId': "SERVICE_PENDING",
            'statusId_op': 'equals'
          },
          orderBy: "runTime ASC"
        })
        const fetchJobsResponse = jobs[0];
        if(fetchJobsResponse.status === 200 && !hasError(fetchJobsResponse) && fetchJobsResponse.data?.docs?.length) {
          commit(types.JOB_CURRENT_UPDATED, fetchJobsResponse.data?.docs[0]);
          return job;
        }
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      console.error(err)
    }
    return {};
  },

  clearJobState({commit}) {
    commit(types.JOB_PENDING_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_HISTORY_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_RUNNING_UPDATED, {jobs: [], total: 0});
    commit(types.JOB_UPDATED_BULK, {})
    commit(types.JOB_BULK_CLEARED)
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
      'statusId': "SERVICE_PENDING"
    } as any

    const resp = await JobService.updateJob(payload)
    // Fetch and update current only when there is object in current
    // Skip job can be performed from pipeline page too causing side effects
    if (state.current && Object.keys(state.current).length) {
    let jobs = await dispatch('fetchJobs', {
      inputFields: {
        'systemJobEnumId': payload.systemJobEnumId,
        'systemJobEnumId_op': 'equals'
      }
    })
    if (jobs.status === 200 && !hasError(jobs) && jobs.data?.docs?.length) {
      jobs = jobs.data?.docs;
      const currentJob = jobs.find((currentJob: any) => currentJob?.jobId === job?.jobId);
      commit(types.JOB_CURRENT_UPDATED, currentJob);
    }
    }
    // This is done for batch jobs
    commit(types.JOB_UPDATED, { job });

    return resp;
  },

  async runServiceNow({ dispatch }, job) {
    let resp;

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
        'shopId': job.runtimeData?.shopifyConfigId && job.status === "SERVICE_PENDING" ? job.shopId : this.state.user.currentShopifyConfig.shopId,
      },
      'shopifyConfigId': job.runtimeData?.shopifyConfigId && job.status === "SERVICE_PENDING" ? job.runtimeData?.shopifyConfigId : this.state.user.currentShopifyConfig.shopifyConfigId,
      'statusId': "SERVICE_PENDING",
      'systemJobEnumId': job.systemJobEnumId
    } as any
    // checking if the runtimeData has productStoreId, and if present then adding it on root level
    job?.runtimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = job.status === "SERVICE_PENDING" ? job.productStoreId : this.state.user.currentEComStore.productStoreId)
    job?.priority && (payload['SERVICE_PRIORITY'] = job.priority.toString())
    job?.sinceId && (payload['sinceId'] = job.sinceId)
    job?.runTime && job.status !== "SERVICE_PENDING" && (payload['SERVICE_TIME'] = job.runTime.toString())

    // assigning '' (empty string) to all the runtimeData properties whose value is "null"
    job.runtimeData && Object.keys(job.runtimeData).map((key: any) => {
      if (job.runtimeData[key] === 'null' ) job.runtimeData[key] = ''
    })

    try {
      resp = await JobService.scheduleJob({ ...job.runtimeData, ...payload });
      if (resp.status == 200 && !hasError(resp)) {
        showToast(translate('Service has been scheduled'))
        // TODO: need to check if we actually need to call fetchJobs when running a service now
        // becuase when scheduling a service for run now, then the service goes in pending state for a small
        // time and thus fetchJob api gets the info of that service as well, and when service is exceuted
        // it is no more in pending state, but on app level we still have that service info with status
        // pending
        dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': payload.systemJobEnumId,
            'systemJobEnumId_op': 'equals'
          }
        })
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      console.error(err)
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
        // TODO: When we are trying to cancel the job from pipeline page those jobs are not in the cached state, so we need to
        // handle this case because we were getting error :- "can not set status and statusId for pending jobs in cached state".
        const cachedJob = state.cached[job?.systemJobEnumId]
        if(cachedJob) {
          cachedJob.statusId = 'SERVICE_DRAFT'
          cachedJob.status = 'SERVICE_DRAFT'
          // deleting the enum from cached job as we will not store the job with cancelled status
          // TODO: remove the code to change the status to SERVICE_DRAFT after verifying the flow
          delete state.cached[job?.systemJobEnumId]

          commit(types.JOB_UPDATED, { cachedJob });
        }

        // Fetch and update current only when there is object in current
        // Cancel job can be performed from pipeline page too causing side effects
        if (state.current && Object.keys(state.current).length) {
        const jobs = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': job.systemJobEnumId,
            'systemJobEnumId_op': 'equals'
          }
        })
        const fetchJobsResponse = jobs[0];
        if (fetchJobsResponse.status === 200 && !hasError(fetchJobsResponse) && fetchJobsResponse.data?.docs.length) {
          commit(types.JOB_CURRENT_UPDATED, fetchJobsResponse);
        }
        }
        showToast(translate('Service updated successfully'))
      } else {
        showToast(translate('Something went wrong'))
      }
    } catch (err) {
      showToast(translate('Something went wrong'))
      console.error(err)
    }
    return resp;
  },
  async updateCurrentJob({ commit, state, dispatch }, payload) {
    const cachedJobs = state.cached;
    const pendingJobs = state.pending.list;

    if(payload?.job) {
      commit(types.JOB_CURRENT_UPDATED, payload.job);
      return payload?.job;
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
        "fieldList": ["systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId", "description"],
        "noConditionFind": "Y"
      }
      resp = await JobService.fetchJobInformation(params);
      if(resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        const currentJob = {
          ...resp.data.docs[0],
          'status': resp.data.docs[0]?.statusId 
        }
        commit(types.JOB_CURRENT_UPDATED, currentJob);

        const enumIds = resp.data.docs.map((item: any) => {
          return item.systemJobEnumId
        })
        await dispatch('fetchJobDescription', enumIds);

        return currentJob;
      }
    } catch (err) {
      console.error(err);
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
  addToBulkScheduler({ commit, state }, payload) {
    const enums = {
      ...JSON.parse(process.env?.VUE_APP_ODR_JOB_ENUMS as string) as any,
      ...JSON.parse(process.env?.VUE_APP_PRODR_JOB_ENUMS as string) as any,
      ...JSON.parse(process.env?.VUE_APP_PRD_JOB_ENUMS as string) as any,
      ...JSON.parse(process.env?.VUE_APP_INV_JOB_ENUMS as string) as any,
      ...JSON.parse(process.env?.VUE_APP_INITIAL_JOB_ENUMS as string) as any,
    }
    
    let appJobEnumId = '' as any, freqType = '';
    appJobEnumId = Object.keys(enums).find((jobId: string) => enums[jobId] === payload.jobId)

    const jobFrequencyType = JSON.parse(process.env?.VUE_APP_JOB_FREQUENCY_TYPE as string);
    freqType = jobFrequencyType[appJobEnumId];

    payload.frequency = state.bulk.frequency;
    if(freqType) {
      payload.freqType = freqType;
      if(freqType === 'slow') showToast(translate("This job has slow frequency type, hence, feasible frequency will be set automatically"))
    }
    payload.runTime = state.bulk.runtime;
    // set the maximum slow frequency for slow type jobs if global frequnecy is set
    payload.frequency = (state.bulk.frequency && freqType === 'slow') ? (generateFrequencyOptions('slow') as any).pop().value : state.bulk.frequency;
    
    const bulkJobs = JSON.parse(JSON.stringify(state.bulk.jobs));
    bulkJobs.push(payload)
    commit(types.JOB_BULK_UPDATED, bulkJobs);
  },
  async scheduleBulkJobs({ dispatch }, payload) {
    // TODO: handle case for bulk jobs which are already scheduled. 
    // As of now, the job will get scheduled again even if it is pending
    const jobParams = [] as any;
    let failedJobs = 0;
    payload.shopifyConfigs.reduce((jobParams: any, shopId: string) => {
      return payload.jobs.reduce((jobParams: any, job: any) => {
        const params = {
          'JOB_NAME': job.jobName,
          'SERVICE_NAME': job.serviceName,
          'SERVICE_COUNT': '0',
          'SERVICE_TIME': job.runTime.toString(),
          'SERVICE_TEMP_EXPR': job.frequency,
          'SERVICE_RUN_AS_SYSTEM': 'Y',
          'jobFields': {
            'productStoreId': payload.eComStoreId,
            'systemJobEnumId': job.systemJobEnumId,
            'tempExprId': job.frequency, // Need to remove this as we are passing frequency in SERVICE_TEMP_EXPR, currently kept it for backward compatibility
            'maxRecurrenceCount': '-1',
            'parentJobId': job.parentJobId,
            'runAsUser': 'system', //default system, but empty in run now.  TODO Need to remove this as we are using SERVICE_RUN_AS_SYSTEM, currently kept it for backward compatibility
            'recurrenceTimeZone': this.state.user.current.userTimeZone
          },
          'statusId': "SERVICE_PENDING",
          'systemJobEnumId': job.systemJobEnumId
        } as any

        
        if (job?.runtimeData?.shopifyConfigId) {
          const shopifyConfig = this.state.user.shopifyConfigs.find((config: any) => {
            return config.shopId === shopId;
          })

          params['shopifyConfigId'] = shopifyConfig.shopifyConfigId;
          params['jobFields']['shopId'] = shopId;
        }

        // checking if the runtimeData has productStoreId, and if present then adding it on root level
        job?.runtimeData?.productStoreId?.length >= 0 && (params['productStoreId'] = payload.eComStoreId)
        job?.priority && (params['SERVICE_PRIORITY'] = job.priority.toString())

        // assigning '' (empty string) to all the runtimeData properties whose value is "null"
        job.runtimeData && Object.keys(job.runtimeData).map((key: any) => {
          if (job.runtimeData[key] === 'null') job.runtimeData[key] = ''
        })
        jobParams.push({ ...job.runtimeData, ...params });
        return jobParams;
      }, jobParams)
    }, jobParams)

    const scheduledJobs = [] as Array<string>;
    await Promise.allSettled(jobParams.map(async (param: any) => {
      const resp: any = await JobService.scheduleJob(param);
      if(resp.status === 200 && !hasError(resp)){
        // Removing the scheduled job
        scheduledJobs.push(param.systemJobEnumId);
        return Promise.resolve(resp);
      } else {
        failedJobs++;
        return Promise.reject(resp);
      }
    }))
    dispatch('removeBulkJobs', scheduledJobs);
    if(failedJobs > 0) {
      return showToast(translate("Failed to schedule service(s)", {count: failedJobs}))
    } else {
      return showToast(translate('Services have been scheduled in bulk'))
    }
  },
  setBulkJobGlobalRuntime({ commit, state }, payload) {
    const bulkJobs = JSON.parse(JSON.stringify(state.bulk.jobs));
    commit(types.JOB_BULK_RUNTIME_UPDATED, { runtime: payload.runtime });
    bulkJobs.forEach((job: any) => { job.runTime = state.bulk.runtime });
    commit(types.JOB_BULK_UPDATED, bulkJobs);
  },
  setBulkJobGlobalFrequency({ commit, state }, payload) {
    let bulkJobs = JSON.parse(JSON.stringify(state.bulk.jobs));
    commit(types.JOB_BULK_FREQUENCY_UPDATED, { frequency: payload.frequency });
    const hasSlowJob = bulkJobs.some((job: any) => job.freqType === 'slow');
    let slowFreqs = [];
    let slowFrequency = payload.frequency;
    if (hasSlowJob) {
      slowFreqs = generateFrequencyOptions('slow').map((obj: any) => obj.value)
      if (!slowFreqs.includes(payload.frequency)) {
        slowFrequency = slowFreqs.pop();
        showToast(translate("Some jobs have slow frequency type, hence, feasible frequency will be set automatically"))
      }
    }
    bulkJobs = bulkJobs.map((job: any) => {
      job.frequency = job.freqType === 'slow' ? slowFrequency : payload.frequency;
      return job;
    });
    commit(types.JOB_BULK_UPDATED, bulkJobs);
  },
  setBulkJobRuntime({ commit, state }, payload) {
    const bulkJobs = JSON.parse(JSON.stringify(state.bulk.jobs));
    bulkJobs.forEach((job: any) => { if (job.jobId === payload.jobId) { job.runTime = payload.runtime }});
    commit(types.JOB_BULK_UPDATED, bulkJobs);
  },
  setBulkJobFrequency({commit, state}, payload) {
    const bulkJobs = JSON.parse(JSON.stringify(state.bulk.jobs));
    bulkJobs.forEach((job: any) => { if (job.jobId === payload.jobId) { job.frequency = payload.frequency }});
    commit(types.JOB_BULK_UPDATED, bulkJobs);
  },
  removeBulkJob({ commit, state }, systemJobEnumId) {
    // Updating bulk jobs in state by removing the given job using jobId 
    const bulkJobs = JSON.parse(JSON.stringify(state.bulk.jobs)).filter((job: any) => (job.systemJobEnumId !== systemJobEnumId));
    commit(types.JOB_BULK_UPDATED, bulkJobs);
  },
  removeBulkJobs({ commit, state }, scheduledJobs) {
    const bulkJobs = JSON.parse(JSON.stringify(state.bulk.jobs)).filter((job: any) => !scheduledJobs.includes(job.systemJobEnumId));
    commit(types.JOB_BULK_UPDATED, bulkJobs);
  }
}
export default actions;
