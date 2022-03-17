import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { hasError } from '@/utils'
import { JobService } from '@/services/JobService'

const actions: ActionTree<JobState, RootState> = {

  async fetchPendingJobs({ commit, dispatch }){
    await JobService.fetchJobInformation({
      "inputFields": {
        "statusId": "SERVICE_PENDING"
      },
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName", "jobId" ],
      "entityName": "JobSandbox",
      "noConditionFind": "Y",
    }).then((resp) => {
      if (resp.status === 200 && !hasError(resp)) {
        if (resp.data.docs) {
          commit(types.JOB_PENDING_UPDATED,  resp.data.docs);
          const tempExprList = [] as any;
          resp.data.docs.map((item: any) => {
            tempExprList.push(item.tempExprId);
          })
          const payload = [...new Set(tempExprList)];
          dispatch('fetchTemporalExpression', payload);
        }
      }
    }).catch((err) => {
      console.error(err);
    })
  },
  async fetchTemporalExpression({ state, commit }, tempExprIds){
    const tempIds = [] as any;
    const cachedTempExprId = Object.keys(state.temporalExp);
    const tempExprFiltered = tempExprIds.reduce((filter: string, id: any) => {
      if(cachedTempExprId.includes(id)){
        return filter;
      }
      else{
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
  }

}
export default actions;