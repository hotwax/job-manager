import { hasError } from '@/utils'
import store from '@/store';
import { api } from '@/adapter';
import { getProductStoreId } from '@/utils';

const fetchJobInformation = async (payload: any): Promise <any>  => {
  return api({
    url: "/findJobs",
    method: "get",
    params: payload
  });
}
const fetchJobDescription = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
}

const updateJob = async (payload: any): Promise <any>  => {
  return api({
    url: "service/updateJobSandbox",
    method: "post",
    data: payload
  });
}

const scheduleJob = async (payload: any): Promise <any>  => {
  return api({
    url: "scheduleService",
    method: "post",
    data: payload
  });
}

const fetchTemporalExpression = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
}

const updateAutoCancelDays = async (payload: any): Promise <any> => {
  return api({
    url: "service/updateProductStore",
    method: "post",
    data: payload
  });
}

const getAutoCancelDays = async (payload: any): Promise <any> => {
  return api({
    url: "performFind",
    method: "get",
    params: payload
  });
}

const cancelJob = async (payload: any): Promise <any> => {
  return api({
    url: "service/cancelScheduledJob",
    method: "post",
    data: payload
  });
}

const fetchDataManagerLogs = async (payload: any): Promise <any> => {
  return api ({
    url: "performFind",
    method: "get",
    params: payload
  })
}

const fetchDataResource = async (payload: any): Promise <any> => {
  return api ({
    url: "performFind",
    method: "get",
    params: payload
  })
}

const fetchDataManagerConfig = async (payload: any): Promise <any> => {
  return api ({
    url: "performFind",
    method: "get",
    params: payload
  })
}

const fetchFileData = async (payload: any): Promise <any> => {
  return api ({
    url: "DownloadCsvFile",
    method: "get",
    params: payload
  })
}

const fetchJobPreviousOccurrence = async (payload: any): Promise <any>  => {
  try {
    const params = {
      "inputFields": {
        "systemJobEnumId": payload.systemJobEnumId,
        "statusId": ["SERVICE_DRAFT","SERVICE_PENDING","SERVICE_RUNNING", "SERVICE_QUEUED"],
        "statusId_op": "not-in"
      } as any,
      "fieldList": [ "systemJobEnumId", "runTime"],
      "noConditionFind": "Y",
      "viewSize": 1,
      "viewIndex": 0,
      "orderBy": "runTime DESC"
    }
    if (getProductStoreId()) {
      params.inputFields = {
        ...params.inputFields,
        "productStoreId": getProductStoreId(),
        "shopId_fld0_value": store.state.user.currentShopifyConfig?.shopId,
        "shopId_fld0_grp": "1",
        "shopId_fld0_op": "equals",
        "shopId_fld1_grp": "2",
        "shopId_fld1_op": "empty"
      }
    } else {
      params.inputFields["productStoreId_op"] = "empty"
    }
    const resp = await api({
      url: "/findJobs",
      method: "get",
      params: params,
      cache: true
    });
    if (hasError(resp)) {
      return Promise.reject(resp?.data);
    } else {
      // if there are no records response has { error: "No record found" } which is handled in if block
      // We will have atleast a single record 
      return Promise.resolve(resp?.data.docs[0].runTime);
    }
  } catch(error: any) {
    return Promise.reject(error)
  }
}

export const JobService = {
  fetchJobDescription,
  fetchJobInformation,
  fetchJobPreviousOccurrence,
  fetchTemporalExpression,
  updateJob,
  scheduleJob,
  updateAutoCancelDays,
  getAutoCancelDays,
  cancelJob,
  fetchDataManagerLogs,
  fetchDataResource,
  fetchDataManagerConfig,
  fetchFileData
}