import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { hasError } from '@/utils'
import { JobService } from '@/services/JobService'

const actions: ActionTree<JobState, RootState> = {

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