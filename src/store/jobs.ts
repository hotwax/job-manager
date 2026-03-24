import logger from "@/logger";
import { showToast, getCronString } from "@/utils";
import { api, translate } from "@common";
import { defineStore } from "pinia";

const getNormalizedJob = (job: any = {}) => ({
  serviceInParameters: Array.isArray(job?.serviceInParameters) ? job.serviceInParameters : [],
  serviceJobParameters: Array.isArray(job?.serviceJobParameters) ? job.serviceJobParameters : [],
  ...job
});

export const getJobDetailWithFallback = (jobDetail: any = {}, fallbackJob: any = {}) => {
  const resolvedJob = Object.keys(jobDetail || {}).length ? jobDetail : fallbackJob;
  return getNormalizedJob(resolvedJob);
};

export const useJobStore = defineStore("job", {
  state: () => ({
    jobs: [] as Array<any>,
    categories: [] as Array<any>,
    categoryMembers: [] as Array<any>,
    categoryRollups: [] as Array<any>,
    products: {} as any,
    loading: false
  }),
  getters: {
    getJobs: (state: any) => state.jobs,
    getCategories: (state: any) => state.categories,
    getCategoryMembers: (state: any) => state.categoryMembers,
    getCategoryRollups: (state: any) => state.categoryRollups,
    getProducts: (state: any) => state.products,
    isLoading: (state: any) => state.loading
  },
  actions: {
    async fetchJobs() {
      this.loading = true
      try {
        const resp = await api({
          url: "admin/serviceJobs",
          method: "GET",
          params: {
            pageSize: 1000
          }
        })
        console.log('serviceJobs', resp)
        this.jobs = resp.data.map((job: any) => ({
          ...job,
          cronString: job.cronExpression ? getCronString(job.cronExpression) : ''
        }))
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false
      }
    },
    async fetchCategories() {
      this.loading = true
      try {
        const resp = await api({
          url: "admin/productCategories",
          method: "GET",
          params: {
            pageSize: 1000
          }
        })
        console.log('categories', resp)
        this.categories = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false
      }
    },
    async fetchCategoryMembers() {
      this.loading = true
      try {
        const resp = await api({
          url: "admin/productCategories/member",
          method: "GET",
          params: {
            pageSize: 1000
          }
        })
        console.log('members', resp)
        this.categoryMembers = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false
      }
    },
    async fetchCategoryRollup() {
      this.loading = true
      try {
        const resp = await api({
          url: "admin/productCategories/rollup",
          method: "GET",
          params: {
            pageSize: 1000
          }
        })
        console.log('members', resp)
        this.categoryRollups = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      } finally {
        this.loading = false
      }
    },
    async fetchServiceParams(serviceName = "AdocValidationServices.validate#ApprovalAttributesNotPresent") {
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
      let jobDetails = {} as any
      try {
        const resp = await api({
          url: `admin/serviceJobs/${jobName}`,
          method: "GET",
          params: {
            pageSize: 1000
          }
        })
        jobDetails = resp.data?.jobDetail || {}
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
 
      let fallbackJob = this.jobs.find((job: any) => job.jobName === jobName) || {}
 
      if (!Object.keys(fallbackJob).length && !Object.keys(jobDetails || {}).length) {
        await this.fetchJobs()
        fallbackJob = this.jobs.find((job: any) => job.jobName === jobName) || {}
      }
 
      const job = getJobDetailWithFallback(jobDetails, fallbackJob);
      if (job.instanceOfProductId && !this.products[job.instanceOfProductId]) {
        this.fetchProductDetail(job.instanceOfProductId);
      }
      return job;
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
