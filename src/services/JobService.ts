import api from '@/api'

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
export const JobService = {
  fetchJobDescription,
  fetchJobInformation,
  fetchTemporalExpression,
  updateJob,
  scheduleJob,
  updateAutoCancelDays,
  getAutoCancelDays
}