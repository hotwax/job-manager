import logger from "@/logger";
import { showToast } from "@/utils";
import { api, translate } from "@common";
import { defineStore } from "pinia";
import { useUserStore } from "./user";

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

          total = resp.data.length
          this.jobs = pageIndex > 0 ? this.jobs.concat(resp.data) : resp.data
          pageIndex++
        } while(total == 250)
      } catch(err) {
        logger.error("Failed to fetch jobs", err)
      }
    },
    async fetchCategories() {
      // if(this.categories.length) return;
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
      }
    },
    async fetchCategoryMembers() {
      // if(this.categoryMembers.length) return;
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
      }
    },
    async fetchCategoryRollup() {
      // if(this.categoryRollups.length) return;
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
      let jobDetails: Record<string, any> = {}
      try {
        const resp = await api({
          url: `admin/serviceJobs/${jobName}`,
          method: "GET",
          params: {
            pageSize: 250
          }
        })
        const job = resp.data.jobDetail

        const isJobProductStoreDependent = () => job.serviceJobParameters.some((param: any) => param.parameterName === "productStoreIds")

        // Check for whether job is productStore dependent or not.
        if(isJobProductStoreDependent()) {
          const jobProductStore = job.serviceJobParameters.find((param: any) => param.parameterName === "productStoreIds")
          // Checks if a product store-dependent job has the current product store set in its parameters.
          if(jobProductStore?.parameterName && jobProductStore.parameterValue === useUserStore().getCurrentProductStore.productStoreId) {
            jobDetails = job
          } else if(!jobProductStore?.parameterName) {
            jobDetails = { ...job, isDraftJob: true }
          }
        } else {
          // For handling case where we have child jobs for the productstore independent job
          // We'll give preference to job with parentJobName and then the job without parentJobName
          // if(job.parentJobName) {
          jobDetails = job
          // }
        }
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
