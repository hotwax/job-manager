import { GetterTree } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const getters: GetterTree <UserState, RootState> = {
    isAuthenticated (state) {
        return !!state.token;
    },
    isUserAuthenticated(state) {
        return state.token && state.current
    },
    getUserToken (state) {
        return state.token
    },
    getUserProfile (state) {
        return state.current
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getCurrentShopifyConfig (state) {
        return state.currentShopifyConfig;
    },
    getShopifyConfigs (state) {
        return state.shopifyConfigs;
    },
    getCurrentEComStore(state) {
        return state.currentEComStore
    },
    getPinnedJobs(state) {
        return state.current ? (state.current as any)['pinnedJobs']?.jobs : []
    },
    getDateTimeFormat (state) {
        return state.preferredDateTimeFormat;
    }
}
export default getters;