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
        }
        dispatch('fetchTemporalExpression');
      }
    }).catch((err) => {
      console.error(err);
    })
    
  },
  async fetchTemporalExpression({ commit }){
    const resp = await JobService.fetchJobInformation({
      "inputFields": {
        "tempExprId": ['DAILY_3AM_ET', 'EVERY_6_HOUR', 'HOURLY', 'CANCEL_HOURLY', 'EVERY_5_MIN', 'EVERY_15_MIN', "DAILY_8_30PM", "DAILY_9_PM", "MIDNIGHT_DAILY", "EVERY_6_HOUR", "EVERY_30_MIN", "DAILY_9_15PM"],
      },
      "fieldList": [ "tempExprId", "description" ],
      "entityName": "TemporalExpression",
      "noConditionFind": "Y",
    })
    if (resp.status === 200 && !hasError(resp)) {
      const tempExprList = {} as any;
       resp.data.docs.map((item: any) => {
         tempExprList[item.tempExprId] = item.description;
       })
      if (resp.data.docs) {
        commit(types.JOB_TEMPORAL_EXPRESSION_UPDATED, tempExprList);
      }
    }
    return resp;
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