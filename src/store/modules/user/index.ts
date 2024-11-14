import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: {
      token: '',
      permissions: [],
      current: {},
      instanceUrl: '',
      shopifyConfigs: [],
      currentShopifyConfig: {},
      currentEComStore: {
        productStoreId: "",
        storeName: "None"
      },
      productStoreCategories: {},
      pwaState: {
        updateExists: false,
        registration: null,
      },
      omsRedirectionInfo: {
        url: "",
        token: ""
      }
    },
    getters,
    actions,
    mutations,
}

// TODO
// store.registerModule('user', userModule);
export default userModule;