import logger from "@/logger";
import { getCronString } from "@/utils";
import { getRunStatus } from "@/utils/jobRuns";
import { buildJobRunHistoryParams, readJobRunTotal } from "@/utils/jobRunHistory";
import { api, commonUtil } from "@common";
import { DateTime } from "luxon";
import { defineStore } from "pinia";
import { useUserStore } from "./user";

const JOB_RUN_STATUSES = ["SUCCESSFUL", "FAILED", "RUNNING", "TERMINATED"];
const EMPTY_JOB_RUN_HISTORY_STATS = {
  total: null as number | null,
  failed: 0,
  successful: 0,
  running: 0,
  terminated: 0
};

// Whether a job's filled-in dependency parameter ties it to a store other than the selected one.
// A systemMessageRemoteId only scopes a job when the remote belongs to a Shopify shop; SFTP and
// other shared remotes serve every store.
const isScopedToAnotherStore = (dependency: any) => {
  const userStore = useUserStore()
  if(dependency.parameterName !== "systemMessageRemoteId") {
    return dependency.parameterValue !== userStore.getCurrentProductStore.productStoreId
  }
  if(dependency.parameterValue === userStore.getSelectedSystemMessageRemoteId) {
    return false
  }

  const shopRemoteIds = userStore.getShopSystemMessageRemoteIds
  // Until the shop remotes are known, treat every remote as a shop's so another store's job never shows
  return !shopRemoteIds || shopRemoteIds.includes(dependency.parameterValue)
};

export const useJobStore = defineStore("job", {
  state: () => ({
    jobs: [] as Array<any>,
    categories: [] as Array<any>,
    categoryMembers: [] as Array<any>,
    categoryRollups: [] as Array<any>,
    products: {} as any,
    jobRunHistory: [] as Array<any>,
    jobRunHistoryTotal: null as number | null,
    jobRunHistoryHasMore: false,
    jobRunHistoryLoading: false,
    jobRunHistoryError: "",
    jobRunHistoryRequestId: 0,
    jobRunStatsLoading: false,
    jobRunStatsLoaded: false,
    jobRunStatsError: "",
    jobRunStatsRequestId: 0,
    jobRunHistoryStats: { ...EMPTY_JOB_RUN_HISTORY_STATS },
    loading: false
  }),
  getters: {
    getJobs: (state: any) => state.jobs,
    getCategories: (state: any) => state.categories,
    getCategoryMembers: (state: any) => state.categoryMembers,
    getCategoryRollups: (state: any) => state.categoryRollups,
    getProducts: (state: any) => state.products,
    getJobRunHistory: (state: any) => state.jobRunHistory,
    getJobRunHistoryTotal: (state: any) => state.jobRunHistoryTotal,
    getJobRunHistoryStats: (state: any) => state.jobRunHistoryStats,
    isLoading: (state: any) => state.loading
  },
  actions: {
    async fetchJobs() {
      this.loading = true
      try {
        let total = 0
        let pageIndex = 0
        do {
          const resp = await api({
            url: "admin/serviceJobs",
            method: "GET",
            params: {
              pageSize: 250,
              pageIndex,
              instanceOfProductId_op: "empty",
              instanceOfProductId_not: "Y"
            }
          })

          let respJobs: Array<any> = []
          resp.data?.serviceJobList?.forEach((job: any) => {
            // Get all the parameters that shows dependency and then get the first one that has actual value
            // as we have cases where a job can have multiple dependency params and only one of them have value
            const jobProductStoreDepList = job.serviceJobParameters.filter((param: any) => JSON.parse(import.meta.env.VITE_PRT_STR_DEP_SER_JOB_IDENTIFIER).includes(param.parameterName))
            const jobProductStoreDep = (jobProductStoreDepList.find((dependent: any) => dependent.parameterValue) ?? jobProductStoreDepList[0])
            let skipJob = false
            // Check for whether job is productStore dependent or not.
            if(jobProductStoreDep?.parameterName) {
              if(!jobProductStoreDep.parameterValue) {
                job["isDraftJob"] = true
              } else if(isScopedToAnotherStore(jobProductStoreDep)) {
                skipJob = true
              }
            }

            if(!skipJob) {
              respJobs.push({
                ...job,
                cronString: job.cronExpression ? getCronString(job.cronExpression) : ""
              })
            }
          })

          total = resp.data?.serviceJobList.length
          this.jobs = pageIndex > 0 ? this.jobs.concat(respJobs) : respJobs
          pageIndex++
        } while(total == 250)
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false

        this.jobs = Object.values(this.jobs.reduce((jobs: any, job: any) => {
          const current = jobs[job.instanceOfProductId];

          // This check needs to be removed once verified that there is no job in the system without
          // instanceOfProductId value
          if(!job.instanceOfProductId) {
            jobs[job.jobName] = job
            return jobs
          }

          if(!current?.jobName || current?.isDraftJob) {
            jobs[job.instanceOfProductId] = job
          }
          return jobs
        }, {}))
      }
    },
    async fetchCategories() {
      if(this.categories.length) return;
      this.loading = true
      try {
        let total = 0
        let pageIndex = 0
        do {
          const resp = await api({
            url: "admin/productCategories",
            method: "GET",
            params: {
              pageSize: 250,
              pageIndex
            }
          })
          total = resp.data.length
          this.categories = pageIndex > 0 ? this.categories.concat(resp.data) : resp.data
          pageIndex++
        } while(total == 250);
        this.fetchCategoryMembers();
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false
      }
    },
    async fetchCategoryMembers() {
      if(this.categoryMembers.length) return;
      this.loading = true
      try {
        const productCategoryIds = this.categories.map((category: any) => {
          if(category.primaryParentCategoryId === 'SYSTEM_JOB') return category.productCategoryId
        }).filter((id: string) => id);
        let total = 0
        let pageIndex = 0
        do {
          const resp = await api({
            url: "admin/productCategories/member",
            method: "GET",
            params: {
              pageSize: 250,
              pageIndex,
              productCategoryId: productCategoryIds,
              productCategoryId_op: "in"
            }
          })
          total = resp.data.length
          this.categoryMembers = pageIndex > 0 ? this.categoryMembers.concat(resp.data) : resp.data
          pageIndex++
        } while(total == 250)
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false
      }
    },
    async fetchCategoryRollup() {
      if(this.categoryRollups.length) return;
      this.loading = true
      try {
        const resp = await api({
          url: "admin/productCategories/rollup",
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        this.categoryRollups = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false
      }
    },
    async fetchServiceParams(serviceName: string) {
      const encodedServiceName = encodeURIComponent(serviceName)
      let parameters = []
      try {
        const resp = await api({
          url: `admin/services/${encodedServiceName}/parameters`,
          method: "GET",
          params: {
            pageSize: 1000
          }
        })
        parameters = resp.data.serviceInParameters
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
      return parameters
    },
    async fetchJobDetail(jobName: string) {
      let jobDetails: Record<string, any> = {}
      try {
        const resp = await api({
          url: `admin/serviceJobs/${jobName}`,
          method: "GET",
          params: {
            pageSize: 1000
          }
        })
        const job = resp.data.jobDetail || {}

        // Get all the parameters that shows dependency and then get the first one that has actual value
        // as we have cases where a job can have multiple dependency params and only one of them have value
        const jobProductStoreDepList = job.serviceJobParameters.filter((param: any) => JSON.parse(import.meta.env.VITE_PRT_STR_DEP_SER_JOB_IDENTIFIER).includes(param.parameterName))
        const jobProductStoreDep = (jobProductStoreDepList.find((dependent: any) => dependent.parameterValue) ?? jobProductStoreDepList[0])

        // Check for whether job is productStore dependent or not.
        if(jobProductStoreDep?.parameterName) {
          if(!jobProductStoreDep.parameterValue) {
            jobDetails = { ...job, isDraftJob: true }
          } else if(isScopedToAnotherStore(jobProductStoreDep)) {
            // The job is scheduled for some other store, so its details are not displayed
            jobDetails = {}
          } else {
            jobDetails = job
          }
        } else {
          jobDetails = job
        }
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }

      if(jobDetails.instanceOfProductId && !this.products[jobDetails.instanceOfProductId]) {
        this.fetchProductDetail(jobDetails.instanceOfProductId);
      }

      return jobDetails;
    },
    async fetchProductDetail(productId: string) {
      try {
        const resp = await api({
          url: `oms/products/${productId}`,
          method: "GET"
        })
        this.products[productId] = resp.data;
      } catch(err) {
        logger.error("Failed to fetch product detail", err)
      }
    },
    async fetchJobRuns(jobName: string, payload = { pageSize: 250, pageIndex: 0 }) {
      let jobRuns = [] as any
      try {
        const resp = await api({
          url: `admin/serviceJobs/${jobName}/runs`,
          method: "GET",
          params: {
            orderByField: "-jobRunId",
            ...payload
          }
        })
        jobRuns = resp.data || []
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
      return Array.isArray(jobRuns) ? jobRuns : []
    },
    invalidateJobRunHistoryStats() {
      this.jobRunStatsRequestId++;
      this.jobRunStatsLoading = false;
      this.jobRunStatsLoaded = false;
      this.jobRunStatsError = "";
      this.jobRunHistoryStats = { ...EMPTY_JOB_RUN_HISTORY_STATS, total: this.jobRunHistoryTotal };
    },
    cancelJobRunHistory() {
      this.jobRunHistoryRequestId++;
      this.jobRunHistoryLoading = false;
      this.invalidateJobRunHistoryStats();
    },
    async fetchJobRunHistory(payload: Record<string, any> = {}) {
      const requestId = ++this.jobRunHistoryRequestId;
      const params = buildJobRunHistoryParams(payload);
      this.jobRunHistoryLoading = true;
      this.jobRunHistoryError = "";
      this.jobRunHistory = [];
      this.jobRunHistoryTotal = null;
      this.jobRunHistoryHasMore = false;
      this.jobRunHistoryStats.total = 0;
      try {
        const resp = await api({ url: "admin/serviceJobs/runs", method: "GET", params });
        if(requestId !== this.jobRunHistoryRequestId) return false;
        if(commonUtil.hasError(resp) || !Array.isArray(resp.data)) {
          throw new Error("Invalid job run list response");
        }
        this.jobRunHistory = resp.data.map((run: any) => ({ ...run, runStatus: getRunStatus(run) }));
        this.jobRunHistoryTotal = readJobRunTotal(resp.headers);
        this.jobRunHistoryHasMore = this.jobRunHistoryTotal === null
          ? resp.data.length === params.pageSize
          : (params.pageIndex + 1) * params.pageSize < this.jobRunHistoryTotal;
        this.jobRunHistoryStats.total = this.jobRunHistoryTotal;
        return true;
      } catch(err: any) {
        if(requestId !== this.jobRunHistoryRequestId) return false;
        logger.error("Job - Failed to fetch run history", err);
        this.jobRunHistoryError = err?.response?.status === 404
          ? "Run history is unavailable on this server. Contact your administrator."
          : "Unable to load run history. Try again.";
        return false;
      } finally {
        if(requestId === this.jobRunHistoryRequestId) this.jobRunHistoryLoading = false;
      }
    },
    async fetchJobRunHistoryStats(payload: Record<string, any> = {}) {
      const requestId = ++this.jobRunStatsRequestId;
      const selectedStatus = payload.status || "";
      this.jobRunStatsLoading = true;
      this.jobRunStatsError = "";
      try {
        const counts = await Promise.all(JOB_RUN_STATUSES.map(async (status: string) => {
          if(selectedStatus && selectedStatus !== status) return 0;
          const resp = await api({
            url: "admin/serviceJobs/runs",
            method: "GET",
            params: buildJobRunHistoryParams({ ...payload, status, pageIndex: 0, pageSize: 1 })
          });
          const count = readJobRunTotal(resp.headers);
          if(commonUtil.hasError(resp) || !Array.isArray(resp.data) || count === null) {
            throw new Error("Invalid job run count response");
          }
          return count;
        }));
        if(requestId !== this.jobRunStatsRequestId) return;
        this.jobRunHistoryStats = {
          ...this.jobRunHistoryStats,
          successful: counts[0], failed: counts[1], running: counts[2], terminated: counts[3]
        };
        this.jobRunStatsLoaded = true;
      } catch(err) {
        if(requestId !== this.jobRunStatsRequestId) return;
        logger.error("Job - Failed to fetch run history stats", err);
        this.jobRunStatsError = "Unable to load run counts. Try again.";
      } finally {
        if(requestId === this.jobRunStatsRequestId) this.jobRunStatsLoading = false;
      }
    },
    // ServiceJob create is the plain entity endpoint: it takes ServiceJob fields only,
    // so parameters and category membership are stored in follow-up calls.
    async createJob(payload: any) {
      return await api({
        url: "admin/serviceJobs",
        method: "POST",
        data: payload,
      });
    },
    // A job's category is a membership on the job's product, so categorising a job means
    // storing a ProductCategoryMember for its instanceOfProductId.
    async addJobToCategory(productId: string, productCategoryId: string) {
      return await api({
        url: `oms/products/${encodeURIComponent(productId)}/categories`,
        method: "POST",
        data: {
          productId,
          productCategoryId,
          fromDate: DateTime.now().toMillis()
        },
      });
    },
    async cloneMaargJob(payload: any) {
      return await api({
        url: `admin/serviceJobs/${payload.jobName}/clone`,
        method: "POST",
        data: payload,
      });
    },
    async updateJob(payload: any) {
      return await api({
        url: `admin/serviceJobs/${payload.jobName}`,
        method: "PUT",
        data: payload,
      });
    },
    async runNow(jobName: string) {
      return await api({
        url: `admin/serviceJobs/${jobName}/runNow`,
        method: "POST"
      });
    },
    // async updateJob(job: any) {
    //   if(!job.cronExpression) {
    //     showToast(translate("Please select a scheduling for job"))
    //     logger.error("Please select a scheduling for job")
    //     return;
    //   }

    //   if(this.currentMaargJob.isDraftJob) {
    //     const clonedJob = await this.cloneJob();
    //     if(!clonedJob.jobName) {
    //       showToast(translate("Failed to update service"));
    //       return;
    //     }
    //     clonedJob.serviceJobParameters.find((parameter: any) => {
    //       if(parameter.parameterName === "productStoreIds") {
    //         parameter.parameterValue = this.currentEComStore.productStoreId
    //         return true;
    //       }
    //       return false;
    //     })
    //     job = clonedJob
    //   }

    //   const paramValues = generateJobCustomParameters(this.customRequiredParameters, this.customOptionalParameters, {});

    //   Object.keys(paramValues).map((paramName: any) => {
    //     const existingParameter = job.serviceJobParameters.find((parameter: any) => parameter.parameterName === paramName);

    //     if(existingParameter) {
    //       existingParameter.parameterValue = paramValues[paramName]
    //     } else {
    //       job.serviceJobParameters.push({
    //         parameterName: paramName,
    //         parameterValue: paramValues[paramName],
    //         jobName: job.jobName
    //       })
    //     }
    //   })

    //   const updatedJob = {
    //     ...job,
    //     paused: "N",
    //     cronExpression: this.selectedCronExpression
    //   }

    //   const payload = { jobName: updatedJob.jobName } as any;

    //   if(this.currentMaargJob.paused === "Y") payload["paused"] = "N"
    //   if(this.isCronExpressionUpdated()) payload["cronExpression"] = this.selectedCronExpression
    //   const isParametersUpdated = updatedJob.serviceJobParameters.some((parameter: any) => parameter.parameterValue !== this.currentMaargJob.parameterValues[parameter.parameterName])
    //   if(isParametersUpdated) payload["serviceJobParameters"] = updatedJob.serviceJobParameters

    //   try {
    //     const resp = await MaargJobService.updateMaargJob(payload)
    //     if(!hasError(resp)) {
    //       showToast(translate("Service updated successfully"))
    //       this.store.dispatch("maargJob/updateMaargJob", this.currentMaargJob.isDraftJob ? { jobEnumId: job.jobTypeEnumId, job: updatedJob } : { jobEnumId: job.jobTypeEnumId })
    //     } else {
    //       throw resp.data
    //     }
    //   } catch(err) {
    //     showToast(translate("Failed to update service"))
    //     logger.error(err)
    //   }
    // },
  }
});
