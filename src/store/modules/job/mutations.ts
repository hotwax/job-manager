import { MutationTree } from 'vuex'
import JobState from './JobState'
import * as types from './mutation-types'

const mutations: MutationTree <JobState> = {
    [types.JOB_UPDATED_BULK] (state, payload) {
        payload.jobs.forEach((job: any) => {
            // TODO move this to actions
            state.cached[job.systemJobEnumId] = {
                id: job.systemJobEnumId,
                status: job.statusId,
                frequency: job.tempExprId
            }
        })
    },
    [types.JOB_UPDATED] (state, payload) {
        state.cached[payload.systemJobEnumId] = {
            ...state.cached[payload.systemJobEnumId],
            payload
        }
    },
    
}
export default mutations;