import logger from "@/logger";
import { getCronString } from "@/utils";
import { api } from "@common";
import { defineStore } from "pinia";
import { useUserStore } from "./user";

const JOB_RUN_STATUSES = ["SUCCESSFUL", "FAILED", "RUNNING"];
const EMPTY_JOB_RUN_HISTORY_STATS = {
  total: 0,
  successful: 0,
  failed: 0,
  running: 0
};

// Build the query for search#ServiceJobRuns. Every filter the page offers is a parameter of that service, so the
// search always runs on the server and only the requested page is transferred.
const buildJobRunSearchParams = (filters: Record<string, any> = {}) => {
  // The ordering is left to the service, which pairs -startTime with the jobRunId tiebreak that keeps paging stable
  const params: Record<string, any> = {
    pageIndex: Number(filters.pageIndex ?? 0),
    pageSize: Number(filters.pageSize ?? 25)
  };

  // Run ids are rendered as #100, so a query copied from the card should still match the id
  const keyword = String(filters.queryString || "").trim().replace(/^#/, "");
  if(keyword) params.keyword = keyword;
  if(filters.jobName) params.jobName = filters.jobName;
  // The service matches the username exactly, so a partial one finds nothing
  if(filters.username) params.username = filters.username;
  if(filters.status) params.status = filters.status;

  // The service resolves the store of every job, however the job names it, and leaves out the ones scheduled for
  // another store. Jobs not specific to any store are kept.
  const productStoreId = useUserStore().getCurrentProductStore?.productStoreId;
  if(productStoreId) params.productStoreId = productStoreId;

  return params;
};

export const useJobStore = defineStore("job", {
  state: () => ({
    jobs: [] as Array<any>,
    categories: [] as Array<any>,
    categoryMembers: [] as Array<any>,
    categoryRollups: [] as Array<any>,
    products: {} as any,
    areServiceProductsFetched: false,
    jobRunHistory: [] as Array<any>,
    jobRunHistoryTotal: 0,
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
              const dependentValue = jobProductStoreDep.parameterName === "systemMessageRemoteId" ? useUserStore().getSelectedSystemMessageRemoteId : useUserStore().getCurrentProductStore.productStoreId
              if(!jobProductStoreDep.parameterValue) {
                job["isDraftJob"] = true
              } else if(jobProductStoreDep.parameterValue !== dependentValue) {
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
          const dependentValue = jobProductStoreDep.parameterName === "systemMessageRemoteId" ? useUserStore().getSelectedSystemMessageRemoteId : useUserStore().getCurrentProductStore.productStoreId
          if(jobProductStoreDep.parameterValue === dependentValue) {
            jobDetails = job
          } else if(!jobProductStoreDep.parameterValue) {
            jobDetails = { ...job, isDraftJob: true }
          } else {
            // If we have a parameter to check for dependent jobs, and if the parameterValue is not the one
            // set in the app, then we will assume that the job is scheduled for some other store and will
            // not display its details
            jobDetails = {}
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
    // Fetch every SERVICE product in one paged sweep instead of a lookup per instanceOfProductId, so a page of runs
    // needs no extra product calls at all.
    async fetchServiceProducts() {
      if(this.areServiceProductsFetched) return;
      try {
        let total = 0
        let pageIndex = 0
        do {
          const resp = await api({
            url: "oms/products",
            method: "GET",
            params: {
              productTypeId: "SERVICE",
              pageSize: 250,
              pageIndex
            }
          })

          const respProducts = resp.data || []
          respProducts.forEach((product: any) => {
            this.products[product.productId] = product
          })

          total = respProducts.length
          pageIndex++
        } while(total == 250)

        this.areServiceProductsFetched = true
      } catch(err) {
        logger.error("Failed to fetch service products", err)
      }
    },
    async fetchJobRunHistory(payload: Record<string, any> = {}) {
      this.loading = true;
      try {
        await this.fetchServiceProducts();

        const resp = await api({
          url: "admin/serviceJobs/runs/search",
          method: "GET",
          params: buildJobRunSearchParams(payload)
        })

        this.jobRunHistory = (resp.data?.jobRunList || []).map((run: any) => ({
          ...run,
          // The service derives the status from hasError, startTime and endTime and returns it as status
          runStatus: run.status,
          productName: this.products[run.instanceOfProductId]?.productName
        }))
        this.jobRunHistoryTotal = resp.data?.jobRunCount || 0
        // Total runs is the count of the same search that fetched the page, no separate call needed for it
        this.jobRunHistoryStats.total = this.jobRunHistoryTotal
      } catch(err) {
        logger.error("Failed to fetch job run history", err);
        this.jobRunHistory = [];
        this.jobRunHistoryTotal = 0;
        this.jobRunHistoryStats = { ...EMPTY_JOB_RUN_HISTORY_STATS };
      } finally {
        this.loading = false;
      }
    },
    // Each status count is the count of the same search narrowed to that status, asked for with pageSize 1 so that
    // the server returns the count without the rows.
    async fetchJobRunHistoryStats(payload: Record<string, any> = {}) {
      const selectedStatus = payload.status || "";
      try {
        const counts = await Promise.all(JOB_RUN_STATUSES.map(async (status: string) => {
          // A status filter is already applied, so every other status contributes nothing to the current result set
          if(selectedStatus && selectedStatus !== status) return 0;

          const resp = await api({
            url: "admin/serviceJobs/runs/search",
            method: "GET",
            params: buildJobRunSearchParams({ ...payload, status, pageIndex: 0, pageSize: 1 })
          })
          return resp.data?.jobRunCount || 0
        }))

        this.jobRunHistoryStats = {
          ...this.jobRunHistoryStats,
          successful: counts[0],
          failed: counts[1],
          running: counts[2]
        }
      } catch(err) {
        logger.error("Failed to fetch job run history stats", err);
        this.jobRunHistoryStats = { ...this.jobRunHistoryStats, successful: 0, failed: 0, running: 0 };
      }
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
