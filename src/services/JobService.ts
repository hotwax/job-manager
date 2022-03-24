import api from '@/api'

const fetchJobInformation = async (payload: any): Promise <any>  => {
  return api({
    url: "/findJobs",
    method: "post",
    data: payload
  });
}
const fetchJobDescription = async (payload: any): Promise <any>  => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
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
    method: "post",
    data: payload
  });
}


export const JobService = {
  fetchJobDescription,
  fetchJobInformation,
  fetchTemporalExpression,
  updateJob,
  scheduleJob
}