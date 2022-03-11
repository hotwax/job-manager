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
      "fieldList": [ "systemJobEnumId", "runTime", "tempExprId", "parentJobId", "serviceName" ],
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
  async fetchTemporalExpression({ state, commit }, payload){
    const cashedTempExprId = Object.keys(state.temporalExp);
    payload.map(async (tempExprId: any) => {
      if(!cashedTempExprId.includes(tempExprId)){
        const resp = await JobService.fetchJobInformation({
          "inputFields": {
            "tempExprId": [...payload],
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
        }
        return resp;
      }
    })
  },
  async fetchJobs ( { commit }, payload) {
    const resp = await JobService.fetchJobInformation({
      "inputFields":{
        "statusId": [ 'SERVICE_DRAFT', 'SERVICE_PENDING'],
        "statusId_op": "in",
      ...payload.inputFields
      },
      "fieldList": ["jobId", "systemJobEnumId", "statusId", "tempExprId"],
      "entityName": "JobSandbox",
      "noConditionFind": "Y",
    })
    if (resp.status === 200 && !hasError(resp)) {
      if (resp.data.docs) {
        commit(types.JOB_UPDATED_BULK, {
          jobs: resp.data.docs
         });
      }
    }
    return resp;
  },
  async updateJob ( { commit }, payload) {
    const resp = await JobService.fetchJobInformation(payload)
    if (resp.status === 200 && !hasError(resp)) {
      if (resp.data.docs) {
        commit(types.JOB_UPDATED, {
          job: payload
         });
      }
    }
    return resp;
  },
}
export default actions;