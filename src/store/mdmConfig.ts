import logger from "@/logger";
import { api } from "@common";
import { defineStore } from "pinia";

export const useMdmConfigStore = defineStore("mdmConfig", {
  state: () => ({
    configs: [] as Array<any>,
    logs: [] as Array<any>,
    logsCount: 0
  }),
  getters: {
    getConfigs: (state: any) => state.configs,
    getConfigById: (state: any) => (configId: string) => state.configs.find((config: any) => config.configId === configId) || {},
    getLogs: (state: any) => state.logs,
    getLogsCount: (state: any) => state.logsCount,
    islogsScrollable: (state: any) => state.logs?.length > 0 && state.logs?.length < state.logsCount
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
    async fetchDataManagerLogs(params: any) {
      try {
        let resp = await api({
          url: "admin/dataManager/details",
          method: "get",
          params
        })

        if(resp.data?.dataManagerLogsCount) {
          if(params?.pageIndex > 0) {
            this.logs = this.logs.concat(resp.data.dataManagerLogs)
          } else {
            this.logs = resp.data.dataManagerLogs
            this.logsCount = resp.data.dataManagerLogsCount
          }
        }
      } catch(err) {
        logger.error("Failed to fetch logs", err)
      }
    },
    async cancelDataManagerLog(configId: string, logId: string) {
      try {
        await api({
          url: `admin/dataManager/logs/${logId}`,
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
    }
  },
  persist: true,
});
