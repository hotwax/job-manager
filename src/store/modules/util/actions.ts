import { UtilService } from '@/services/UtilService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { hasError } from '@/utils'
import logger from "@/logger";

const actions: ActionTree<UtilState, RootState> = {
  /**
   * Status Description
   */
  async getServiceStatusDesc ({ commit }) {
    try{
      const resp = await UtilService.getServiceStatusDesc({
        "inputFields": {
          "statusTypeId": "SERVICE_STATUS",
          "statusTypeId_op": "equals"
        },
        "entityName": "StatusItem",
        "fieldList": ["statusId", "description"],
        "noConditionFind": "Y",
        "viewSize": 20
      }) 
      if (resp.status === 200 && !hasError(resp) && resp.data.count) {
        commit(types.UTIL_SERVICE_STATUS_DESC_UPDATED, resp.data.docs);
      }
    } catch(err) {
      logger.error(err)
    }
  },
  async getSystemInformation({ commit }) {
    try {
      const resp = await UtilService.getSystemInformation()
      if(!hasError(resp) && resp.data?.instanceInfo) {
        commit(types.UTIL_SYSTEM_INFORMATION_UPDATED, resp.data);
      }
    } catch(err) {
      logger.error(err)
    }
  },
  clearSystemInformation({ commit }) {
    commit(types.UTIL_SYSTEM_INFORMATION_UPDATED, {});
  }
}

export default actions;