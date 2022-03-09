import { GetterTree } from 'vuex'
import JobState from './JobState'
import RootState from '../../RootState'

const getters: GetterTree <JobState, RootState> = {
    getPreOrderInformation (state) {
        return state.preorder;
    },
    getOrderInformation (state) {
        return state.order;
    },
    // TODO Check if make is common
    getJobStatus: (state) => (enumId: string): any  => {
        console.log("id", enumId);
        console.log("state.cached[enumId]", state.cached[enumId]);
        return state.cached[enumId] && (state.cached[enumId].status === "SERVICE_DRAFT" ? state.cached[enumId].status : state.cached[enumId].frequency);
    },
    
}
export default getters;