import { MutationTree } from 'vuex'
import JobState from './JobState'
import * as types from './mutation-types'

const mutations: MutationTree <JobState> = {
    [types.JOB_UPDATED_BULK] (state, payload) {
        state.cached = payload
    },
    [types.JOB_UPDATED] (state, payload) {
        state.cached[payload.jobId] = {
            ...state.cached[payload.jobId],
            payload
        }
    },
    [types.JOB_PENDING_UPDATED] (state, payload) {
        state.pending = payload;
    },
    [types.JOB_TEMPORAL_EXPRESSION_UPDATED] (state, payload) {
        state.temporalExp = payload;
    },
    [types.JOB_DESCRIPTION_UPDATED] (state, enums) {
        if (enums) {
            enums.forEach((enumId: any) => {
              state.enumIds[enumId.enumId] = enumId.description
            });
          }
    }
}
export default mutations;