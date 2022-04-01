import { MutationTree } from 'vuex'
import JobState from './JobState'
import * as types from './mutation-types'

const mutations: MutationTree <JobState> = {
    [types.JOB_UPDATED_BULK] (state, payload) {
        state.cached = payload
    },
    [types.JOB_UPDATED] (state, payload) {
        state.cached[payload.systemJobEnumId] = {
            ...state.cached[payload.systemJobEnumId],
            payload
        }
    },
    [types.JOB_PENDING_UPDATED] (state, payload) {
        state.pending.list = payload.jobs;
        state.pending.total = payload.total;
    },
    [types.JOB_HISTORY_UPDATED] (state, payload) {
        state.history.list = payload.jobs;
        state.history.total = payload.total;
    },
    [types.JOB_DRAFT_UPDATED] (state, payload) {
        state.draft.list = payload.jobs;
        state.draft.total = payload.total;
    },
    [types.JOB_TEMPORAL_EXPRESSION_UPDATED] (state, temporalExpressions) {
        if(temporalExpressions){
            temporalExpressions.forEach((temporalExpression: any) => {
              state.temporalExp[temporalExpression.tempExprId] = temporalExpression;
            })
        }
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