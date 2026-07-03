import logger from "@/logger";
import { getCronString } from "@/utils";
import { api } from "@common";
import { DateTime } from "luxon";
import { defineStore } from "pinia";
import { useUserStore } from "./user";

const getTimeInMillis = (value: any) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const isoDateTime = DateTime.fromISO(value);
  if (isoDateTime.isValid) return isoDateTime.toMillis();
  const sqlDateTime = DateTime.fromSQL(value);
  return sqlDateTime.isValid ? sqlDateTime.toMillis() : 0;
};

const getRunTime = (run: any) => getTimeInMillis(run.startTime || run.lastUpdatedStamp || run.endTime);

const getRunStatus = (run: any) => {
  if (run.hasError === "Y") return "FAILED";
  if (run.startTime && !run.endTime) return "RUNNING";
  if (run.startTime && run.endTime) return "SUCCESSFUL";
  return "TERMINATED";
};

const getRunHistoryStats = (runs: Array<any>) => runs.reduce((stats: any, run: any) => {
  stats.total += 1;
  stats[run.runStatus] += 1;
  return stats;
}, {
  total: 0,
  successful: 0,
  failed: 0,
  running: 0,
  terminated: 0
});

const parseParameterPayload = (parameters: any) => {
  if (!parameters) return parameters;
  if (typeof parameters !== "string") return parameters;

  try {
    return JSON.parse(parameters);
  } catch (err) {
    return parameters;
  }
};

const getProductStoreIdFromParameters = (parameters: any) => {
  const parsedParameters = parseParameterPayload(parameters);

  if (Array.isArray(parsedParameters)) {
    const productStoreParameter = parsedParameters.find((parameter: any) =>
      parameter?.parameterName === "productStoreId" || parameter?.productStoreId
    );

    return productStoreParameter?.parameterValue || productStoreParameter?.productStoreId || "";
  }

  if (parsedParameters && typeof parsedParameters === "object") {
    return parsedParameters.productStoreId || "";
  }

  return "";
};

export const useJobStore = defineStore("job", {
  state: () => ({
    jobs: [] as Array<any>,
    categories: [] as Array<any>,
    categoryMembers: [] as Array<any>,
    categoryRollups: [] as Array<any>,
    products: {} as any,
    jobRunHistory: [] as Array<any>,
    jobRunHistoryTotal: 0,
    jobRunHistoryStats: {
      total: 0,
      successful: 0,
      failed: 0,
      running: 0,
      terminated: 0
    },
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
            ...payload
          }
        })
        jobRuns = resp.data || []
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
      return Array.isArray(jobRuns) ? jobRuns : []
    },
    async fetchJobRunHistory(payload: Record<string, any> = {}) {
      this.loading = true;
      try {
        if (!this.jobs.length) await this.fetchJobs();

        const pageSize = Number(payload.pageSize ?? 25);
        const pageIndex = Number(payload.pageIndex ?? 0);
        const runsPerJob = Number(payload.runsPerJob ?? 25);
        const queryString = (payload.queryString || "").trim().toLowerCase();
        const selectedJobName = payload.jobName || "";
        const selectedUserId = payload.userId || "";
        const selectedStatus = payload.status || "";
        const hasDataLogs = payload.hasDataLogs || "";
        const hasMessages = payload.hasMessages || "";
        const hasErrors = payload.hasError || "";
        const selectedProductStoreId = useUserStore().getCurrentProductStore?.productStoreId || "";

        let jobsToLoad = selectedJobName
          ? this.jobs.filter((job: any) => job.jobName === selectedJobName)
          : this.jobs;

        if (queryString && !selectedJobName && Number.isNaN(Number(queryString))) {
          jobsToLoad = jobsToLoad.filter((job: any) => {
            const searchableJobText = [
              job.jobName,
              job.serviceName,
              job.description,
              job.systemJobEnumId,
              job.instanceOfProductId,
              this.products[job.instanceOfProductId]?.productName
            ].filter(Boolean).join(" ").toLowerCase();
            return searchableJobText.includes(queryString);
          });
        }

        const productIds = [...new Set(jobsToLoad.map((job: any) => job.instanceOfProductId).filter(Boolean))] as string[];
        await Promise.all(productIds
          .filter((productId: string) => !this.products[productId])
          .map((productId: string) => this.fetchProductDetail(productId))
        );

        const runResponses = await Promise.allSettled(
          jobsToLoad.map(async (job: any) => {
            const params = { pageSize: runsPerJob, pageIndex: 0 } as any;
            if (hasErrors === "Y") params.hasError = "Y";
            const runs = await this.fetchJobRuns(job.jobName, params);
            return runs.map((run: any) => ({
              ...run,
              jobName: job.jobName,
              serviceName: job.serviceName,
              jobDescription: job.description,
              systemJobEnumId: job.systemJobEnumId,
              instanceOfProductId: job.instanceOfProductId,
              jobProductStoreId: getProductStoreIdFromParameters(job.serviceJobParameters),
              productName: this.products[job.instanceOfProductId]?.productName,
              paused: job.paused,
              cronExpression: job.cronExpression,
              runStatus: getRunStatus(run)
            }));
          })
        );

        let runs = runResponses.flatMap((result: any) => result.status === "fulfilled" ? result.value : []);

        if (selectedProductStoreId) {
          runs = runs.filter((run: any) => {
            const runProductStoreId = getProductStoreIdFromParameters(run.parameters) || run.jobProductStoreId;
            return !runProductStoreId || runProductStoreId === selectedProductStoreId;
          });
        }

        if (queryString) {
          runs = runs.filter((run: any) => {
            const searchableRunText = [
              run.jobRunId,
              run.jobName,
              run.serviceName,
              run.userId,
              run.messages,
              run.results,
              run.errors
            ].filter(Boolean).join(" ").toLowerCase();
            return searchableRunText.includes(queryString);
          });
        }

        if (selectedStatus) {
          runs = runs.filter((run: any) => run.runStatus === selectedStatus);
        }

        if (selectedUserId) {
          runs = runs.filter((run: any) => String(run.userId || "").toLowerCase().includes(String(selectedUserId).toLowerCase()));
        }

        if (hasErrors === "Y") {
          runs = runs.filter((run: any) => run.hasError === "Y");
        }

        if (hasErrors === "N") {
          runs = runs.filter((run: any) => run.hasError !== "Y");
        }

        if (hasDataLogs) {
          runs = runs.filter((run: any) => hasDataLogs === "Y" ? !!run.logs?.length : !run.logs?.length);
        }

        if (hasMessages) {
          runs = runs.filter((run: any) => hasMessages === "Y" ? !!run.messages : !run.messages);
        }

        runs = runs.sort((first: any, second: any) => getRunTime(second) - getRunTime(first));

        this.jobRunHistoryTotal = runs.length;
        this.jobRunHistoryStats = getRunHistoryStats(runs);

        const start = pageIndex * pageSize;
        this.jobRunHistory = runs.slice(start, start + pageSize);
      } catch(err) {
        logger.error("Failed to fetch job run history", err);
        this.jobRunHistory = [];
        this.jobRunHistoryTotal = 0;
        this.jobRunHistoryStats = {
          total: 0,
          successful: 0,
          failed: 0,
          running: 0,
          terminated: 0
        };
      } finally {
        this.loading = false;
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
