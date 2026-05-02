import logger from "@/logger";
import { getCronString } from "@/utils";
import { api } from "@common";
import { defineStore } from "pinia";
import { useUserStore } from "./user";

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
          resp.data?.serviceJobList?.map((job: any) => {
            const jobProductStoreDep = job.serviceJobParameters.find((param: any) => import.meta.env.VITE_PRT_STR_DEP_SER_JOB_IDENTIFIER.includes(param.parameterName))

            let skipJob = false
            // Check for whether job is productStore dependent or not.
            if(jobProductStoreDep?.parameterName) {
              const dependentValue = jobProductStoreDep.parameterName === "systemMessageRemoteId" ? useUserStore().getSelectedSystemMessageRemoteId : useUserStore().getCurrentProductStore.productStoreId
              // Checks if a product store-dependent job has the current product store set in its parameters.
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
      }
    },
    async fetchCategories() {
      // if(this.categories.length) return;
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
      // if(this.categoryMembers.length) return;
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
      // if(this.categoryRollups.length) return;
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

        const jobProductStoreDep = job.serviceJobParameters.find((param: any) => import.meta.env.VITE_PRT_STR_DEP_SER_JOB_IDENTIFIER.includes(param.parameterName))

        // Check for whether job is productStore dependent or not.
        if(jobProductStoreDep?.parameterName) {
          const dependentValue = jobProductStoreDep.parameterName === "systemMessageRemoteId" ? useUserStore().getSelectedSystemMessageRemoteId : useUserStore().getCurrentProductStore.productStoreId
          // Checks if a product store dependent job has the current product store set in its parameters.
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
