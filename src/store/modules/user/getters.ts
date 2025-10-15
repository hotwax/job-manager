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
    getUserPermissions (state) {
        return state.permissions;
    },
    getUserProfile (state) {
        return state.current
    },
    getInstanceUrl (state) {
        const baseUrl = process.env.VUE_APP_BASE_URL;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getBaseUrl (state) {
        let baseURL = process.env.VUE_APP_BASE_URL;
        if (!baseURL) baseURL = state.instanceUrl;
        return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;
    },
    getCurrentShopifyConfig (state) {
        return state.currentShopifyConfig;
    },
    getShopifyConfigs (state) {
        return state.shopifyConfigs;
    },
    getProductStoreCategories(state) {
        return state.productStoreCategories;
    },
    getPwaState (state) {
        return state.pwaState;
    },
    getCurrentProductStore(state) {
        return state.currentProductStore
    },
    getPinnedJobs(state) {
        return state.current ? (state.current as any)['pinnedJobs']?.jobs : []
    },
    getMaargBaseUrl (state) {
        const url = state.omsRedirectionInfo.url
        return url.startsWith('http') ? url.includes('/rest/s1/admin') ? url : `${url}/rest/s1/admin/` : `https://${url}.hotwax.io/rest/s1/admin/`;
    },
    getOmsRedirectionInfo(state) {
        return state.omsRedirectionInfo
    }
}
export default getters;