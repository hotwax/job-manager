import api from '@/api'

const fetchJobInformation = async (payload: any): Promise <any>  => {
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
    method: "GET",
    params: payload
  });
}

export const JobService = {
  fetchJobInformation,
  updateJob,
  scheduleJob
}