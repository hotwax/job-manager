import { UtilService } from '@/services/UtilService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UtilState from './UtilState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import logger from "@/logger";
import store from '@/store'
import { translate } from '@hotwax/dxp-components'

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

  async getJobRecurrenceTimeZone({ commit, dispatch }, eComStoreId) {
    const payload = {
      "inputFields": {
        "productStoreId": eComStoreId,
        "settingTypeEnumId": "JOB_RECUR_TIMEZONE"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingValue", "fromDate"],
      "viewSize": 1
    }

    try {
      const resp = await UtilService.getProductStoreSetting(payload) as any
      if(!hasError(resp)) {
        const respValue = resp.data.docs[0].settingValue
        commit(types.UITL_JOB_RECURRENCE_TIME_ZONE_UPDATED, respValue)
      } else {
        dispatch('createJobRecurrenceTimeZone');
      }
    } catch(err) {
      console.error(err)
      commit(types.UITL_JOB_RECURRENCE_TIME_ZONE_UPDATED, "")
    }
  },

  async createJobRecurrenceTimeZone({ commit }) {
    const ecomStore = store.getters['user/getCurrentEComStore'];
    const fromDate = Date.now()

    try {
      if(!await UtilService.isEnumExists("JOB_RECUR_TIMEZONE")) {
        const resp = await UtilService.createEnumeration({
          "enumId": "JOB_RECUR_TIMEZONE",
          "enumTypeId": "PROD_STR_STNG",
          "description": "Timezone for the job recurrence.",
          "enumName": "Job Recurrence Timezone",
          "enumCode": "JOB_RECUR_TIMEZONE"
        })

        if(hasError(resp)) {
          throw resp.data;
        }
      }

      const params = {
        fromDate,
        "productStoreId": ecomStore.productStoreId,
        "settingTypeEnumId": "JOB_RECUR_TIMEZONE",
        "settingValue": ""
      }

      await UtilService.createProductStoreSetting(params) as any
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a scan setting
    commit(types.UITL_JOB_RECURRENCE_TIME_ZONE_UPDATED, "")
    return fromDate;
  },

  async setJobRecurrenceTimeZone({ commit, dispatch, state }, value) {
    let prefValue = state.jobRecurrenceTimeZone
    const eComStoreId = store.getters['user/getCurrentEComStore'].productStoreId;

    // when selecting none as ecom store, not updating the pref as it's not possible to save pref with empty productStoreId
    if(!eComStoreId) {
      showToast(translate("Unable to update job execution time zone."))
      commit(types.UITL_JOB_RECURRENCE_TIME_ZONE_UPDATED, prefValue)
      return;
    }

    let fromDate;

    try {
      const resp = await UtilService.getProductStoreSetting({
        "inputFields": {
          "productStoreId": eComStoreId,
          "settingTypeEnumId": "JOB_RECUR_TIMEZONE"
        },
        "filterByDate": 'Y',
        "entityName": "ProductStoreSetting",
        "fieldList": ["fromDate"],
        "viewSize": 1
      }) as any
      if(!hasError(resp)) {
        fromDate = resp.data.docs[0]?.fromDate
      }
    } catch(err) {
      console.error(err)
    }

    if(!fromDate) {
      fromDate = await dispatch("createJobRecurrenceTimeZone");
    }

    const params = {
      "fromDate": fromDate,
      "productStoreId": eComStoreId,
      "settingTypeEnumId": "JOB_RECUR_TIMEZONE",
      "settingValue": value
    }

    try {
      const resp = await UtilService.updateProductStoreSetting(params) as any

      if((!hasError(resp))) {
        showToast(translate("Job execution timezone updated successfully."))
        prefValue = value
      } else {
        throw resp.data;
      }
    } catch(err) {
      showToast(translate("Failed to update job execution timezone."))
      console.error(err)
    }
    commit(types.UITL_JOB_RECURRENCE_TIME_ZONE_UPDATED, prefValue)
  },

  async updateForceScanStatus({ commit }, payload) { 
    commit(types.UITL_JOB_RECURRENCE_TIME_ZONE_UPDATED, payload)
  }
}

export default actions;