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
    getJobStatus: (state) => (id: string): any  => {
        console.log("id", id);
        console.log("state.cached[id]", state.cached[id]);
        return state.cached[id] && (state.cached[id].status === "SERVICE_DRAFT" ? state.cached[id].status : state.cached[id].frequency);
    },
    
}
export default getters;