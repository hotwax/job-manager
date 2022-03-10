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
    url: "updateJob",
    method: "post",
    data: payload
  });
}

export const JobService = {
    fetchJobInformation,
    updateJob
}