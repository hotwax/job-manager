import logger from "@/logger";
import { showToast } from "@/utils";
import { api, translate } from "@common";
import { defineStore } from "pinia";

export const useJobStore = defineStore("job", {
  state: () => ({
    jobs: [] as Array<any>,
    categories: [] as Array<any>,
    categoryMembers: [] as Array<any>,
    categoryRollups: [] as Array<any>
  }),
  getters: {
    getJobs: (state: any) => state.jobs,
    getCategories: (state: any) => state.categories,
    getCategoryMembers: (state: any) => state.categoryMembers,
    getCategoryRollups: (state: any) => state.categoryRollups
  },
  actions: {
    async fetchJobs() {
      try {
        const resp = await api({
          url: "admin/serviceJobs",
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        console.log('serviceJobs', resp)
        this.jobs = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
    },
    async fetchCategories() {
      try {
        const resp = await api({
          url: "admin/productCategories",
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        console.log('categories', resp)
        this.categories = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
    },
    async fetchCategoryMembers() {
      try {
        const resp = await api({
          url: "admin/productCategories/member",
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        console.log('members', resp)
        this.categoryMembers = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
    },
    async fetchCategoryRollup() {
      try {
        const resp = await api({
          url: "admin/productCategories/rollup",
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        console.log('members', resp)
        this.categoryRollups = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
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
            pageSize: 250
          }
        })
        parameters = resp.data.serviceInParameters
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
      return parameters
    },
    async fetchJobDetail(jobName: string) {
      let jobDetails = {}
      try {
        const resp = await api({
          url: `admin/serviceJobs/${jobName}`,
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        jobDetails = resp.data.jobDetail
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
      return jobDetails
    },
    async fetchJobRuns(jobName: string) {
      let jobRuns = {}
      try {
        const resp = await api({
          url: `admin/serviceJobs/${jobName}/runs`,
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        jobRuns = resp.data
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
      return jobRuns
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
