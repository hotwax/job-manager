import logger from "@/logger";
import { api } from "@common";
import { defineStore } from "pinia";

export const useMdmConfigStore = defineStore("mdmConfig", {
  state: () => ({
    configs: [] as Array<any>,
    logs: [] as Array<any>,
    logsCount: 0,
    filters: {} as Record<string, any>
  }),
  getters: {
    getConfigs: (state: any) => state.configs,
    getConfigById: (state: any) => (configId: string) => state.configs.find((config: any) => config.configId === configId) || {},
    getLogs: (state: any) => state.logs,
    getLogsCount: (state: any) => state.logsCount,
    islogsScrollable: (state: any) => state.logs?.length > 0 && state.logs?.length < state.logsCount,
    getAppliedFilters: (state: any) => JSON.parse(JSON.stringify(state.filters))
  },
  actions: {
    async fetchConfigs() {
      try {
        let resp = await api({
          url: "admin/dataManager",
          method: "get",
          params: {
            pageSize: 250
          }
        })

        if(resp.data?.length) {
          this.configs = resp.data
        }
      } catch(err) {
        logger.error("Failed to fetch configs", err)
      }
    },
    async fetchConfigById(configId: string) {
      const isConfigDataAvailable = this.configs.some((config: any) => config.configId === configId)
      if(isConfigDataAvailable) {
        return;
      }

      try {
        let resp = await api({
          url: `admin/dataManager/${configId}`,
          method: "get"
        })

        if(resp.data?.length) {
          this.configs.push(resp.data)
        }
      } catch(err) {
        logger.error(`Failed to fetch config with id ${configId}`, err)
      }
    },
    async fetchDataManagerLogs(params = { pageSize: 10, pageIndex: 0 }) {
      try {
        const payload = {
          ...params
        } as any

        Object.entries(this.filters).map(([ type, value ]) => {
          payload[type] = value
          payload[`${type}_op`] = "in"
        })

        let resp = await api({
          url: "admin/dataManager/details",
          method: "get",
          params: payload
        })

        if(resp.data?.dataManagerLogsCount) {
          if(params?.pageIndex > 0) {
            this.logs = this.logs.concat(resp.data.dataManagerLogs)
          } else {
            this.logs = resp.data.dataManagerLogs
            this.logsCount = resp.data.dataManagerLogsCount
          }
        } else if(params?.pageIndex == 0) {
          this.logs = []
          this.logsCount = 0
        }
      } catch(err) {
        logger.error("Failed to fetch logs", err)
      }
    },
    async cancelDataManagerLog(configId: string, logId: string) {
      try {
        await api({
          url: `admin/dataManager/log/${logId}`,
          method: "PUT",
          data: {
            configId,
            logId,
            statusId: "DmlsCancelled"
          }
        })

        const log = this.logs.find((log: any) => log.logId === logId)
        log["statusId"] = "DmlsCancelled"
      } catch(err) {
        logger.error(`Failed to cancel log with id ${logId}`, err)
      }
    },
    async updateAppliedFilters(filterType: string, value: any) {
      this.filters[filterType] = value
    }
  },
  persist: true,
});
