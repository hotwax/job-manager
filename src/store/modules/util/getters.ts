import { GetterTree } from 'vuex'
import UtilState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UtilState, RootState> = {
  getServiceStatusDesc: (state) => (statusId: any) => {
    return state.statusDesc[statusId] ? state.statusDesc[statusId] : "-";
  }
}
export default getters;