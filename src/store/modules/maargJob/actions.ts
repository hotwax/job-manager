import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './MaargJobState'
import * as types from './mutation-types'
import { isCustomRunTime, generateAllowedFrequencies, hasError, showToast } from '@/utils'
import { translate } from '@hotwax/dxp-components'
import { DateTime } from 'luxon';
import store from '@/store'
import logger from "@/logger";
import { MaargJobService } from '@/services/MaargJobService'

const actions: ActionTree<JobState, RootState> = {
  async fetchMaargJobs({ commit }, jobTypeEnumIds){
    const productStoreId = store.getters["user/getCurrentEComStore"]?.productStoreId

    let resp = {} as any;
    const maargJobs = {} as any;

    try {
      resp = await MaargJobService.fetchMaargJobs({ jobTypeEnumId: jobTypeEnumIds, jobTypeEnumId_op: "in" })
      if(!hasError(resp) && resp.data?.length) {
        const jobs = resp.data;
        const responses = await Promise.allSettled(jobs.map((job: any) => MaargJobService.fetchMaargJobInfo(job.jobName)))

        responses.map((response: any) => {
          if(response.status === "fulfilled") {
            const job = response.value.data.jobDetail
            const paramValue = {} as any;

            job.serviceJobParameters.map((parameter: any) => {
              paramValue[parameter.parameterName] = parameter.parameterValue
            })
            job["parameterValues"] = paramValue

            if(Object.keys(paramValue).includes("productStoreIds")) {
              if(paramValue["productStoreIds"] === productStoreId) {
                maargJobs[job.jobTypeEnumId] = job 
              }
            } else {
              maargJobs[job.jobTypeEnumId] = job
            }
          }
        })
      } else {
        throw resp;
      }
    } catch(error: any) {
      logger.error(error);
    }

    commit(types.MAARGJOB_MAARG_JOBS_UPDATED, maargJobs);
  },

  async updateMaargJob({ commit, state }, jobEnumId) {
    const jobs = JSON.parse(JSON.stringify(state.maargJobs));
    const currentJob = jobs[jobEnumId]

    try {
      const resp = await MaargJobService.fetchMaargJobInfo(currentJob.jobName);
      if(!hasError(resp)) {
        const currentJob = resp.data?.jobDetail
        
        const paramValue = {} as any;
        currentJob.serviceJobParameters.map((parameter: any) => {
          paramValue[parameter.parameterName] = parameter.parameterValue
        })
        currentJob["parameterValues"] = paramValue

        jobs[jobEnumId] = currentJob
        commit(types.MAARGJOB_MAARG_JOBS_UPDATED, jobs);
        commit(types.MAARGJOB_CURRENT_JOB_UPDATED, currentJob);
      } else {
        throw resp;
      }
    } catch(error: any) {
      logger.error(error);
    }
  },

  async updateCurrentMaargJob({ commit }, payload) {
    if(payload?.job) {
      commit(types.MAARGJOB_CURRENT_JOB_UPDATED, payload.job);
      return payload?.job;
    }

    // Todo: refetch job for the mobile view of job details.
  }
}
export default actions;
