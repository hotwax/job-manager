import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './JobState'
import * as types from './mutation-types'
import { hasError } from '@/utils'
import { JobService } from '@/services/JobService'

const actions: ActionTree<JobState, RootState> = {

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

      resp.data.docs.filter((job: any) => job.statusId === 'SERVICE_PENDING').map((item: any) => {
        return cached[item.systemJobEnumId] = {
          ...item,
          id: item.jobId,
          frequency: item.tempExprId,
          enumId: item.systemJobEnumId,
          status: item.statusId
        }
      })  

      resp.data.docs.filter((job: any) => job.statusId === 'SERVICE_DRAFT').map((item: any) => {
        return cached[item.systemJobEnumId] = cached[item.systemJobEnumId] ? cached[item.systemJobEnumId] : {
          ...item,
          id: item.jobId,
          frequency: item.tempExprId,
          enumId: item.systemJobEnumId,
          status: item.statusId
        }
      })

      commit(types.JOB_UPDATED_BULK, cached);
    }
    return resp;
  },
  async updateJob ({ commit }, payload) {
    // const resp = await JobService.updateJob(payload)
    // if (resp.status === 200 && !hasError(resp) && resp.data.docs) {
    //   commit(types.JOB_UPDATED, { job: payload});
    // }
    // return resp;
    console.log('job updated', payload)
  },

  async scheduleService({ commit }, payload) {
    // const resp = await JobService.scheduleJob(payload);
    // if (resp.status == 200 && !hasError(resp) && resp.data.docs) {
    //   commit(types.JOB_UPDATED, { job: payload })
    // }
    console.log('job scheduled', payload)
  }

}
export default actions;