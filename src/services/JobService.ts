import { hasError } from '@/utils'
import store from '@/store';
import { api } from '@/adapter';

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

const fetchJobOccurrences = async (payload: any): Promise <any>  => {
  const jobOccurrences = {} as any;
  const storeFilter = (store.state.user.currentEComStore?.productStoreId) ? {
    "productStoreId": store.state.user.currentEComStore?.productStoreId,
    "shopId_fld0_value": store.state.user.currentShopifyConfig?.shopId,
    "shopId_fld0_grp": "1",
    "shopId_fld0_op": "equals",
    "shopId_fld1_grp": "2",
    "shopId_fld1_op": "empty" 
  } : {
    "productStoreId_op": "empty"
  }

  const finishedJobPayload = {
    url: "/findJobs",
    method: "get",
    params: {
      "inputFields": {
        ...storeFilter,
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
  }

  const pendingJobPayload = {
    url: "/findJobs",
    method: "get",
    params: {
      "inputFields": {
        ...storeFilter,
        "systemJobEnumId": payload.systemJobEnumId,
        "statusId": ["SERVICE_PENDING","SERVICE_RUNNING", "SERVICE_QUEUED"],
        "statusId_op": "in"
      } as any,
      "noConditionFind": "Y",
      "viewSize": 1,
      "viewIndex": 0,
      "orderBy": "runTime ASC"
    }
  }

  const responses = await Promise.allSettled([api(finishedJobPayload), api(pendingJobPayload)])
  if(responses[0].status === "fulfilled" && !hasError(responses[0].value) && responses[0].value?.data.docs?.length) {
    jobOccurrences["previousOccurrence"] = responses[0].value.data.docs[0]
  }
  if(responses[1].status === "fulfilled" && !hasError(responses[1].value) && responses[1].value?.data.docs?.length) {
    jobOccurrences["nextOccurrenceJob"] = responses[1].value.data.docs[0]
  }
  return jobOccurrences;
}

export const JobService = {
  fetchJobDescription,
  fetchJobInformation,
  fetchJobOccurrences,
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