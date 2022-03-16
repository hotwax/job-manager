import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { JobService } from '@/services/JobService'
import { translate } from '@/i18n'

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
    const cachedEnum = payload.map((id: any) => state.enumIds[id]);
    const resp = await JobService.fetchJobInformation({
      "inputFields": {
        "enumId": enumIds,
        "enumId_op": "in"
      },
      "fieldList": ['enumId', 'description'],
      "entityName": "Enumeration",
      "noConditionFind": "Y",
      "viewSize": payload.length
    })
    if (resp.status === 200 && resp.data?.count > 0 && !hasError(resp)) {
      const enumDesc = resp.data.docs;
      if (resp.data.docs) {
        commit(types.JOB_DESCRIPTION_UPDATED, enumDesc);
      }
    }
    return resp;
  },

  async fetchPendingJobs({ commit, dispatch }, payload){
    await JobService.fetchJobInformation({
      "inputFields": {
        "productStoreId": payload.eComStoreId,
        "statusId": "SERVICE_PENDING"
      },
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId", "jobName" ],
      "entityName": "JobSandbox",
      "noConditionFind": "Y",
    }).then((resp) => {
      if (resp.status === 200 && resp.data.docs?.length > 0 && !hasError(resp)) {
        if (resp.data.docs) {
          commit(types.JOB_PENDING_UPDATED,  resp.data.docs);
          const tempExprList = [] as any;
          const enumIds = [] as any;
          resp.data.docs.map((item: any) => {
            enumIds.push(item.systemJobEnumId);
            tempExprList.push(item.tempExprId);
          })
          const payload = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', payload);
          dispatch('fetchJobDescription', enumIds);
        }
      } else {
        showToast(translate("Something went wrong"));
      }
    }).catch((err) => {
      console.error(err);
      showToast(translate("Something went wrong"));
    })
  },
  async fetchTemporalExpression({ state, commit }, tempExprIds){
    const tempIds = [] as any;
    const cachedTempExprId = Object.keys(state.temporalExp);
    const tempExprFiltered = tempExprIds.reduce((filter: string, id: any) => {
      if(cachedTempExprId.includes(id)){
        return filter;
      }
      else {
        if (filter !== '') filter += ' OR '
        tempIds.push(id);
        return filter += id;
      }
    }, "");
    if(tempExprFiltered === '') return tempExprIds.map((id: any) => state.temporalExp[id]);
    const cachedTempExpr = tempExprIds.map((id: any) => state.temporalExp[id]);
    const resp = await JobService.fetchJobInformation({
        "inputFields": {
        "tempExprId": [...tempIds],
        "temoExprId_op": "in"
      },
      "fieldList": [ "tempExprId", "description" ],
      "entityName": "TemporalExpression",
      "noConditionFind": "Y",
    })
    if (resp.status === 200 && !hasError(resp)) {
      const tempExpr = {} as any;
      resp.data.docs.map((item: any) => {
        tempExpr[item.tempExprId] = item.description;
      })
      if (resp.data.docs) {
        commit(types.JOB_TEMPORAL_EXPRESSION_UPDATED, tempExpr);
      }
      return [...cachedTempExpr, ...resp.data.docs]
    }
    return resp;
  },
  
  async fetchJobs ({ state, commit }, payload) {
    const resp = await JobService.fetchJobInformation({
      "inputFields":{
        "statusId": ['SERVICE_DRAFT', 'SERVICE_PENDING'],
        "statusId_op": "in",
        ...payload.inputFields
      },
      "entityName": "JobSandbox",
      "noConditionFind": "Y"
    })
    if (resp.status === 200 && !hasError(resp) && resp.data.docs) {
      const cached = JSON.parse(JSON.stringify(state.cached));

      resp.data.docs.filter((job: any) => job.statusId === 'SERVICE_PENDING').map((job: any) => {
        return cached[job.serviceName] = {
          ...job,
          id: job.jobId,
          frequency: job.tempExprId,
          enumId: job.systemJobEnumId,
          status: job.statusId
        }
      })  

      resp.data.docs.filter((job: any) => job.statusId === 'SERVICE_DRAFT').map((job: any) => {
        return cached[job.serviceName] = cached[job.serviceName] ? cached[job.serviceName] : {
          ...job,
          id: job.jobId,
          frequency: job.tempExprId,
          enumId: job.systemJobEnumId,
          status: job.statusId
        }
      })

      commit(types.JOB_UPDATED_BULK, cached);
    }
    return resp;
  },
  async updateJob ({ commit }, payload) {
    const resp = await JobService.updateJob(payload)
    if (resp.status === 200 && !hasError(resp) && resp.data.docs) {
      commit(types.JOB_UPDATED, { job: payload});
    }
    return resp;
  },

  async scheduleService({ commit }, payload) {
    const resp = await JobService.scheduleJob(payload);
    if (resp.status == 200 && !hasError(resp) && resp.data.docs) {
      commit(types.JOB_UPDATED, { job: payload })
    }
    return resp;
  },

  clearPendingJobs({commit}) {
    commit(types.JOB_PENDING_UPDATED, { });
  }

}
export default actions;