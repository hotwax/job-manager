import api from '@/api'


const prepareFetchJobsQuery = () => {
  return {
    "filters":{
      "configId": ["MDM_REL_ORD_ITM_JSON", "MDM_CAN_ORD_ITM_JSON", "MDM_UPD_ORD_ITM_JSON"],
      "configId_op": "in",
      "statusId": [ 'SERVICE_PENDING', 'SERVICE_RUNNING', 'SERVICE_QUEUED'],
      "statusId_op": "in",
    },
    "fieldsToSelect": ["jobId", "createdDate", "scriptTitle", "description"],
    "sortBy" : "createdDate ASC",
    "sortOrder" : "createdDate ASC" // TODO Remove it
  }
}


const fetchJobInformation = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const updateJob = async (payload: any): Promise <any>  => {
  return api({
    url: "updateJob",
    method: "post",
    data: payload
  });
}

export const JobService = {
    fetchJobInformation,
    updateJob
}