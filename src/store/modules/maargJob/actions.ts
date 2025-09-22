import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import JobState from './MaargJobState'
import * as types from './mutation-types'
import { hasError } from '@/utils'
import store from '@/store'
import logger from "@/logger";
import { MaargJobService } from '@/services/MaargJobService'

const actions: ActionTree<JobState, RootState> = {
  async fetchMaargJobs({ commit }, enumTypeId){
    const productStoreId = store.getters["user/getCurrentProductStore"]?.productStoreId

    let resp = {} as any;
    const maargJobs = {} as any;

    try {
      resp = await MaargJobService.fetchMaargJobs({ enumTypeId, pageSize: 200 })
      if(!hasError(resp) && resp.data?.length) {
        const jobs = resp.data;
        
        const responses = await Promise.allSettled(jobs.map((job: any) => MaargJobService.fetchMaargJobInfo(job.jobName)))
        
        responses.map((response: any) => {
          if(response.status === "fulfilled" && response.value.data?.jobDetail) {
            const job = response.value.data.jobDetail
            const paramValues = {} as any;

            job.serviceJobParameters.map((parameter: any) => {
              paramValues[parameter.parameterName] = parameter.parameterValue
            })
            job["parameterValues"] = paramValues
            job["permissions"] = job.jobPermissions?.map((permission: any) => permission.userPermissionId)

            // Check for whether job is productStore dependent or not.
            if(Object.hasOwn(paramValues, "productStoreIds")) {
              // Checks if a product store-dependent job has the current product store set in its parameters.
              if(paramValues["productStoreIds"] && paramValues["productStoreIds"] === productStoreId) {
                maargJobs[job.jobTypeEnumId] = job 
              } else if(!paramValues["productStoreIds"] && !maargJobs[job.jobTypeEnumId]) {
                maargJobs[job.jobTypeEnumId] = { ...job, isDraftJob: true }
              }
            } else {
              // For handling case where we have childs jobs for the productstore independent job
              // We'll give preference to job with parentJobName and then the job without parentJobName
              if(!maargJobs[job.jobTypeEnumId] || job.parentJobName) {
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

  async updateMaargJob({ commit, dispatch, state }, payload) {
    let resp = {} as any;
    let jobs = JSON.parse(JSON.stringify(state.maargJobs));
    let currentJob = payload.job ? payload.job : jobs[payload.jobEnumId]

    try {
      if(!currentJob?.jobName) {
        await dispatch("fetchMaargJobs", [payload.jobEnumId]);
        jobs = JSON.parse(JSON.stringify(state.maargJobs));
        currentJob = jobs[payload.jobEnumId]
        commit(types.MAARGJOB_CURRENT_UPDATED, currentJob);
        return;
      }

      resp = await MaargJobService.fetchMaargJobInfo(currentJob.jobName);
      if(!hasError(resp)) {
        const updatedJob = resp.data?.jobDetail
        
        const paramValue = {} as any;
        updatedJob.serviceJobParameters.map((parameter: any) => {
          paramValue[parameter.parameterName] = parameter.parameterValue
        })

        currentJob = { ...currentJob, parameterValues: paramValue, ...updatedJob }

        jobs[payload.jobEnumId] = currentJob
        commit(types.MAARGJOB_UPDATED, jobs);
        commit(types.MAARGJOB_CURRENT_UPDATED, currentJob);
      } else {
        throw resp;
      }
    } catch(error: any) {
      logger.error(error);
    }
  },  

  async updateCurrentMaargJob({ commit, dispatch, state }, payload) {
    const maargJobs = state.maargJobs;
    const getMaargJob = store.getters["maargJob/getMaargJob"]

    if(payload?.job) {
      commit(types.MAARGJOB_CURRENT_UPDATED, payload.job);
      return payload?.job;
    }

    if(!payload.jobId) {
      commit(types.MAARGJOB_CURRENT_UPDATED, {});
      return;
    }

    let currentMaargJob = maargJobs[payload.jobId];
    if(currentMaargJob) {
      commit(types.MAARGJOB_CURRENT_UPDATED, currentMaargJob);
      return currentMaargJob;
    }

    await dispatch("updateMaargJob", { jobEnumId: payload.jobId });
    currentMaargJob = getMaargJob(payload.jobId)

    commit(types.MAARGJOB_CURRENT_UPDATED, currentMaargJob ? currentMaargJob : {});
    return currentMaargJob;
  },

  async clearCurrentMaargJob({ commit }) {
    commit(types.MAARGJOB_CURRENT_UPDATED, {});
  },
}
export default actions;
