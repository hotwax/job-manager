import store from '@/store';
import { api, client } from '@/adapter';


const fetchMaargJobs = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: "serviceJobs",
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    },
    params: payload
  });
}

const fetchMaargJobInfo = async (jobName: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `serviceJobs/${jobName}`,
    method: "GET",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}


const runNow = async (jobName: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `serviceJobs/${jobName}/runNow`,
    method: "POST",
    baseURL,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

const updateMaargJob = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `serviceJobs/${payload.jobName}`,
    method: "POST",
    baseURL,
    data: payload,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

const fetchMaargJobHistory = async (payload: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters['user/getOmsRedirectionInfo'];
  const baseURL = store.getters['user/getMaargBaseUrl'];

  return client({
    url: `serviceJobs/${payload.jobName}/runs`,
    method: "GET",
    baseURL,
    params: payload,
    headers: {
      "api_key": omsRedirectionInfo.token,
      "Content-Type": "application/json"
    }
  });
}

export const MaargJobService = {
  fetchMaargJobs,
  fetchMaargJobHistory,
  fetchMaargJobInfo,
  runNow,
  updateMaargJob
}