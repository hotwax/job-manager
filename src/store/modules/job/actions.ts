import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { JobService } from '@/services/JobService'
import { translate } from '@/i18n'
import { DateTime } from 'luxon';

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
        "systemJobEnumId_op": "not-empty"
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId", "cancelDateTime", "finishDateTime", "startDateTime" ],
      "entityName": "JobSandbox",
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

    if (payload.queryString) {
      params.inputFields["enumName_value"] = "%"+ payload.queryString + "%"
      params.inputFields["enumName_op"] = "like"
      params.inputFields["enumName_ic"] = "Y"
      params.inputFields["enumName_ic"] = "Y"
      params.inputFields["enumName_grp"] = "1" 
      params.inputFields["description_value"] = "%"+ payload.queryString + "%"
      params.inputFields["description_op"] = "like"
      params.inputFields["description_ic"] = "Y"
      params.inputFields["description_grp"] = "2"
    } 

    await JobService.fetchJobInformation(params).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs;
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.history.list.concat(resp.data.docs);
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
        "statusId_fld0_value": "SERVICE_RUNNING",
        "statusId_fld0_op": "equals",
        "statusId_fld0_grp": "1",
        "statusId_fld1_value": "SERVICE_QUEUED",
        "statusId_fld1_op": "equals",
        "statusId_fld1_grp": "2",
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "statusId" ],
      "entityName": "JobSandbox",
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

    if (payload.queryString) {
      params.inputFields["enumName_value"] = "%"+ payload.queryString + "%"
      params.inputFields["jobName_op"] = "like"
      params.inputFields["jobName_ic"] = "Y"
      params.inputFields["enumName_ic"] = "Y"
      params.inputFields["enumName_grp"] = "1" 
      params.inputFields["description_value"] = "%"+ payload.queryString + "%"
      params.inputFields["description_op"] = "like"
      params.inputFields["description_ic"] = "Y"
      params.inputFields["description_grp"] = "2"
    } 

    await JobService.fetchJobInformation(params).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          const total = resp.data.count;
          let jobs = resp.data.docs;
          if(payload.viewIndex && payload.viewIndex > 0){
            jobs = state.running.list.concat(resp.data.docs);
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
        "systemJobEnumId_op": "not-empty"
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId" ],
      "entityName": "JobSandbox",
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

    if (payload.queryString) {
      params.inputFields["enumName_value"] = "%"+ payload.queryString + "%"
      params.inputFields["enumName_op"] = "like"
      params.inputFields["enumName_ic"] = "Y"
      params.inputFields["enumName_grp"] = "1" 
      params.inputFields["description_value"] = "%"+ payload.queryString + "%"
      params.inputFields["description_op"] = "like"
      params.inputFields["description_ic"] = "Y"
      params.inputFields["description_grp"] = "2"
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
            jobs = state.pending.list.concat(resp.data.docs);
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
    const params = {
      "inputFields": {
        "statusId_fld0_value": "SERVICE_DRAFT",
        "statusId_fld0_op": "equals",
        "statusId_fld0_grp": "1",
        "statusId_fld1_value": "SERVICE_PENDING",
        "statusId_fld1_op": "equals",
        "statusId_fld1_grp": "2",
        "productStoreId_fld0_value": this.state.user.currentEComStore.productStoreId,
        "productStoreId_fld0_op": "equals",
        "productStoreId_fld0_grp": "2",
        ...payload.inputFields
      },
      "entityName": "JobSandbox",
      "noConditionFind": "Y",
      "viewSize": (payload.inputFields?.systemJobEnumId?.length * 3)
    } as any

    if (payload?.orderBy) {
      params['orderBy'] = payload.orderBy
    }
    const resp = await JobService.fetchJobInformation(params)

    if (resp.status === 200 && !hasError(resp) && resp.data.docs) {
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
        cached[batchBrokeringJobEnum] = resp.data.docs.filter((job: any) => job.systemJobEnumId === batchBrokeringJobEnum).reduce((batchBrokeringJobs: any, job: any) => {
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
      resp.data.docs.filter((job: any) => !batchJobEnumIds.includes(job.systemJobEnumId) && job.statusId === 'SERVICE_PENDING').reduce((cached: any, job: any) => {
        cached[job.systemJobEnumId] = {
          ...job,
          id: job.jobId,
          frequency: job.tempExprId,
          enumId: job.systemJobEnumId,
          status: job.statusId
        }
        return cached;
      }, cached)  

      resp.data.docs.filter((job: any) => job.statusId === 'SERVICE_DRAFT').map((job: any) => {
        return cached[job.systemJobEnumId] = cached[job.systemJobEnumId] ? cached[job.systemJobEnumId] : {
          ...job,
          id: job.jobId,
          frequency: job.tempExprId,
          enumId: job.systemJobEnumId,
          status: job.statusId
        }
      });

      // fetching temp expressions
      const tempExpr = Object.values(cached).map((job: any) => job.tempExprId)
      await dispatch('fetchTemporalExpression', tempExpr)

      commit(types.JOB_UPDATED_BULK, cached);
    }
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
        let jobs = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': payload.systemJobEnumId,
            'systemJobEnumId_op': 'equals'
          }
        })
        if(jobs.status === 200 && !hasError(jobs) && jobs.data?.docs.length) {
          jobs = jobs.data?.docs;
          const job = jobs.find((job: any) => job?.jobId === payload.jobId);
          commit(types.JOB_CURRENT_UPDATED, job);
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

  async scheduleService({ dispatch, commit, rootGetters }, job) {
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
      'shopifyConfigId': rootGetters['user/getShopifyConfigId'],
      'statusId': "SERVICE_PENDING",
      'systemJobEnumId': job.systemJobEnumId
    } as any

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
        if(jobs.status === 200 && !hasError(jobs) && jobs.data?.docs?.length) {
          const job = jobs.data?.docs[0];
          commit(types.JOB_CURRENT_UPDATED, job);
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
  },

  async skipJob({ commit, dispatch, getters }, job) {
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
    if (resp.status === 200 && !hasError(resp) && resp.data?.successMessage) {
      let jobs = await dispatch('fetchJobs', {
        inputFields: {
          'systemJobEnumId': job.systemJobEnumId,
          'systemJobEnumId_op': 'equals'
        }
      })
      if (jobs.status === 200 && !hasError(jobs) && jobs.data?.docs.length) {
        jobs = jobs.data?.docs;
        const currentJob = jobs.find((currentJob: any) => currentJob?.jobId === job?.jobId);
        commit(types.JOB_CURRENT_UPDATED, currentJob);
      }
      commit(types.JOB_UPDATED, { job });
    }

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
    return resp;
  },

  async runServiceNow({ dispatch, rootGetters }, job) {
    let resp;

    const payload = {
      'JOB_NAME': job.jobName,
      'SERVICE_NAME': job.serviceName,
      'SERVICE_COUNT': '0',
      'SERVICE_TEMP_EXPR': job.jobStatus,
      'jobFields': {
        'productStoreId': this.state.user.currentEComStore.productStoreId,
        'systemJobEnumId': job.systemJobEnumId,
        'tempExprId': job.jobStatus, // Need to remove this as we are passing frequency in SERVICE_TEMP_EXPR, currently kept it for backward compatibility
        'parentJobId': job.parentJobId,
        'recurrenceTimeZone': this.state.user.current.userTimeZone
      },
      'shopifyConfigId': rootGetters['user/getShopifyConfigId'],
      'statusId': "SERVICE_PENDING",
      'systemJobEnumId': job.systemJobEnumId
    } as any

    // checking if the runtimeData has productStoreId, and if present then adding it on root level
    job?.runtimeData?.productStoreId?.length >= 0 && (payload['productStoreId'] = this.state.user.currentEComStore.productStoreId)
    job?.priority && (payload['SERVICE_PRIORITY'] = job.priority.toString())
    job?.sinceId && (payload['sinceId'] = job.sinceId)
    job?.runTime && (payload['SERVICE_TIME'] = job.runTime.toString())

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
      resp = await JobService.updateJob({
        jobId: job.jobId,
        systemJobEnumId: job.systemJobEnumId,
        statusId: "SERVICE_CANCELLED",
        recurrenceTimeZone: this.state.user.current.userTimeZone,
        cancelDateTime: DateTime.now().toMillis()
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

        let jobs = await dispatch('fetchJobs', {
          inputFields: {
            'systemJobEnumId': job.systemJobEnumId,
            'systemJobEnumId_op': 'equals'
          }
        })
        if (jobs.status === 200 && !hasError(jobs) && jobs.data?.docs.length) {
          jobs = jobs.data?.docs;
          const currentJob = jobs.find((currentJob: any) => currentJob?.systemJobEnumId === job?.systemJobEnumId);
          commit(types.JOB_CURRENT_UPDATED, currentJob);
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
        "fieldList": ["systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName", "currentRetryCount", "statusId"],
        "entityName": "JobSandbox",
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
  }
}
export default actions;