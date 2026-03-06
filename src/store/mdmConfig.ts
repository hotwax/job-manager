import logger from "@/logger";
import { api } from "@common";
import { defineStore } from "pinia";

export const useMdmConfigStore = defineStore("mdmConfig", {
  state: () => ({
    configs: [] as Array<any>,
    logs: [] as Array<any>
  }),
  getters: {
    getConfigs: (state: any) => state.configs,
    getConfigById: (state: any) => (configId: string) => state.configs.find((config: any) => config.configId === configId) || {},
    getLogs: (state: any) => {
      let logs: Record<string, any> = {}
      return state.logs.reduce((configLogs: any, log: any) => {
        if(configLogs[log.logId]) {
          configLogs[log.logId].push(log)
        } else {
          configLogs[log.logId] = [log]
        }
        return configLogs
      }, logs)
    },
    getLogById: (state: any) => (logId: string) => state.logs.filter((log: any) => log.logId === logId) || [],
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
    async fetchDataManagerLogs(params = {}) {
      try {
        let resp = await api({
          url: "admin/dataManager/logs",
          method: "get",
          params
        })

        if(resp.data?.length) {
          this.logs = resp.data
        }
      } catch(err) {
        logger.error("Failed to fetch logs", err)
      }
    },
    async fetchDataManagerLogById(logId: string) {
      const isLogDataAvailable = this.logs.some((log: any) => log.logId === logId)
      if(isLogDataAvailable) {
        return;
      }
      try {
        let resp = await api({
          url: "admin/dataManager/logs",
          method: "get",
          params: {
            logId
          }
        })

        if(resp.data?.length) {
          this.logs.concat(resp.data)
        }
      } catch(err) {
        logger.error(`Failed to fetch log with id ${logId}`, err)
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
      } catch(err) {
        logger.error(`Failed to cancel log with id ${logId}`, err)
      }
    }
  },
  persist: true,
});
