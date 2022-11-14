import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getStatusDesc: (state) => (statusId: any) => {
    return state.statusDesc[statusId] ? state.statusDesc[statusId] : "-";
  },
  appVersion: (state) => {
    return state.packageVersion
  }
}
export default getters;