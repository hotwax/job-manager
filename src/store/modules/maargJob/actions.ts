import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './MaargJobState'
import * as types from './mutation-types'
import { isCustomRunTime, generateAllowedFrequencies, hasError, showToast } from '@/utils'
import store from '@/store'
import logger from "@/logger";
import { MaargJobService } from '@/services/MaargJobService'

const actions: ActionTree<JobState, RootState> = {
  async fetchMaargJobs({ commit, dispatch }, jobTypeEnumIds){
    const productStoreId = store.getters["user/getCurrentEComStore"]?.productStoreId
    const maargJobEnums = store.getters["maargJob/getMaargJobEnums"]

    let resp = {} as any;
    const maargJobs = {} as any;

    try {
      resp = await MaargJobService.fetchMaargJobs({ jobTypeEnumId: jobTypeEnumIds, jobTypeEnumId_op: "in" })
      if(!hasError(resp) && resp.data?.length) {
        const jobs = resp.data;
        const jobEnumIdsToFetch = jobs.map((job: any) => job.jobTypeEnumId);
        
        const responses = await Promise.allSettled(jobs.map((job: any) => MaargJobService.fetchMaargJobInfo(job.jobName)))
        await dispatch("fetchMaargJobEnums", jobEnumIdsToFetch)

        responses.map((response: any) => {
          if(response.status === "fulfilled") {
            const job = response.value.data.jobDetail
            const paramValue = {} as any;

            job.serviceJobParameters.map((parameter: any) => {
              paramValue[parameter.parameterName] = parameter.parameterValue
            })
            job["parameterValues"] = paramValue
            job["enumDescription"] = maargJobEnums[job.jobTypeEnumId]?.description

            if(Object.keys(paramValue).includes("productStoreIds")) {
              if(paramValue["productStoreIds"] === productStoreId) {
                maargJobs[job.jobTypeEnumId] = job 
              }
            } else {
              // For handling case where we have childs jobs for the productstore independent job
              // We'll give preference to job with parentJobName and then the job without parentJobName
              if(!maargJobs[job.jobTypeEnumId] || (maargJobEnums[job.jobTypeEnumId] && !maargJobEnums[job.jobTypeEnumId]?.parentJobName)) {
                maargJobs[job.jobTypeEnumId] = job
              }
            }
          }
        })
      } else {
        throw resp;
      }
    } catch(error: any) {
      logger.error(error);
    }

    commit(types.MAARGJOB_UPDATED, maargJobs);
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
        commit(types.MAARGJOB_UPDATED, jobs);
        commit(types.MAARGJOB_CURRENT_UPDATED, currentJob);
      } else {
        throw resp;
      }
    } catch(error: any) {
      logger.error(error);
    }
  },

  async fetchMaargJobEnums({ commit }, enumIds) {
    const jobEnums = JSON.parse(JSON.stringify(store.getters["maargJob/getMaargJobEnums"]))
    const enumIdsToFetch = enumIds.filter((enumId: any) => !jobEnums[enumId])

    if(!enumIdsToFetch.length) return;

    try {
      const resp = await MaargJobService.fetchMaargJobEnumerations({ enumId: enumIdsToFetch, enumId_op: "in" });

      if(!hasError(resp)) {
        resp.data.map((enumeration: any) => {
          jobEnums[enumeration.enumId] = enumeration
        })
      } else {
        throw resp;
      }
    } catch(error) {
      logger.error(error);
    }
    commit(types.MAARGJOB_ENUMS_UPDATED, jobEnums);
  },

  async updateCurrentMaargJob({ commit }, payload) {
    if(payload?.job) {
      commit(types.MAARGJOB_CURRENT_UPDATED, payload.job);
      return payload?.job;
    }

    // Todo: refetch job for the mobile view of job details.
  },

  async clearMaargJobState({ commit }) {
    commit(types.MAARGJOB_ENUMS_UPDATED, {});
  }
}
export default actions;
