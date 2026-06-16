import logger from "@/logger";
import { api } from "@common";
import { defineStore } from "pinia";

export const useMdmConfigStore = defineStore("mdmConfig", {
  state: () => ({
    configs: [] as Array<any>,
    logs: [] as Array<any>,
    logsCount: 0,
    filters: {} as Record<string, any>,
    globalStats: { total: 0, successful: 0, failed: 0 }
  }),
  getters: {
    getConfigs: (state: any) => state.configs,
    getConfigById: (state: any) => (configId: string) => state.configs.find((config: any) => config.configId === configId) || {},
    getLogs: (state: any) => state.logs,
    getLogsCount: (state: any) => state.logsCount,
    getAppliedFilters: (state: any) => JSON.parse(JSON.stringify(state.filters)),
    getGlobalStats: (state: any) => state.globalStats
  },
  actions: {
    async fetchConfigs() {
      try {
        const resp = await api({
          url: "admin/dataManager",
          method: "get",
          params: {
            pageSize: 250
          }
        })

        if (Array.isArray(resp.data)) {
          // Filter out legacy OFBiz-migrated DataManagerConfig records.
          // Only Moqui-native configs are valid for the Manual Uploads screen.
          // Moqui services follow the verb#Noun convention (e.g. update#ProductFacility),
          // so we check for the presence of '#' in importServiceName.
          // Configs with plain camelCase OFBiz service names or no importServiceName are excluded.
          this.configs = resp.data.filter((config: any) =>
            config?.importServiceName?.includes("#")
          )
        }
      } catch (err) {
        logger.error("Failed to fetch configs", err)
      }
    },
    async fetchConfigById(configId: string) {
      const isConfigDataAvailable = this.configs.some((config: any) => config.configId === configId)
      if (isConfigDataAvailable) {
        return;
      }

      try {
        const resp = await api({
          url: `admin/dataManager/${configId}`,
          method: "get"
        })

        if (resp.data?.length) {
          this.configs.push(resp.data)
        }
      } catch (err) {
        logger.error(`Failed to fetch config with id ${configId}`, err)
      }
    },
    async fetchDataManagerLogs(params = { pageSize: 10, pageIndex: 0 }) {
      try {
        const payload = {
          ...params
        } as any

        Object.entries(this.filters).forEach(([type, value]) => {
          if (type === "priority") {
            // We only have two priorities for the configs, HIGH(PRIORITY) and NORMAL
            // Thus when both are selected, we do not need to send the filter in payload
            // But in case any one of them is selected, deciding the operator on the basis of value selected
            // We can think of updating the UI for the priority filter to radio, so that only one option selection
            // is allowed
            if (value.length === 1) {
              payload["priority"] = "6"
              payload["priority_op"] = value[0] === "HIGH" ? "greater" : "less-equals"
            }
          } else if (Array.isArray(value)) {
            payload[type] = value.join(",")
            payload[`${type}_op`] = "in"
          } else {
            payload[type] = value
          }
        })

        // As we have DataManagerLogs created from ofbiz as well, but we do not want to show them in the app
        // thus when statusId filter is not applied passing valid moqui status in filters to fetch only
        // moqui specific DataManagerLogs
        if (!payload.statusId) {
          payload["statusId"] = "DmlsCancelled,DmlsCrashed,DmlsFailed,DmlsFinished,DmlsPending,DmlsQueued,DmlsRunning"
          payload["statusId_op"] = "in"
        }

        const resp = await api({
          url: "admin/dataManager/details",
          method: "get",
          params: payload
        })

        if (resp.data?.dataManagerLogsCount) {
          this.logs = resp.data.dataManagerLogs
          this.logsCount = resp.data.dataManagerLogsCount
        } else {
          this.logs = []
          this.logsCount = 0
        }
      } catch (err) {
        logger.error("Failed to fetch logs", err)
      }
    },
    async fetchDataManagerLogById(logId: string) {
      try {
        const resp = await api({
          url: "admin/dataManager/details",
          method: "get",
          params: { logId }
        })

        if (resp.data?.dataManagerLogs?.length) {
          return resp.data.dataManagerLogs[0]
        }
        return null
      } catch (err) {
        logger.error(`Failed to fetch log with id ${logId}`, err)
        return null
      }
    },
    async fetchDataManagerFileContent(configId: string, logContentId: string) {
      try {
        const resp = await api({
          url: "admin/dataManager/downloadDataManagerFile",
          method: "GET",
          params: { configId, logContentId }
        })
        // The endpoint returns the file payload wrapped as { csvData }. A bare {} means
        // no downloadable content is stored for this log content id.
        const content = resp?.data?.csvData ?? resp?.data
        if (content && typeof content === "object" && !Object.keys(content).length) return null
        const text = typeof content === "string" ? content : JSON.stringify(content)
        return text && text.replace(/\s/g, "") !== "{}" ? text : null
      } catch (err) {
        logger.error(`Failed to fetch file content for log content ${logContentId}`, err)
        return null
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
      } catch (err) {
        logger.error(`Failed to cancel log with id ${logId}`, err)
      }
    },
    async updateAppliedFilters(filterType: string, value: any) {
      this.filters[filterType] = value
    },
    async fetchGlobalStats() {
      const moquiStatuses = "DmlsCancelled,DmlsCrashed,DmlsFailed,DmlsFinished,DmlsPending,DmlsQueued,DmlsRunning"
      try {
        const [totalResp, successResp, failedResp] = await Promise.all([
          api({ url: "admin/dataManager/details", method: "get", params: { pageSize: 1, pageIndex: 0, statusId: moquiStatuses, statusId_op: "in" } }),
          api({ url: "admin/dataManager/details", method: "get", params: { pageSize: 1, pageIndex: 0, statusId: "DmlsFinished" } }),
          api({ url: "admin/dataManager/details", method: "get", params: { pageSize: 1, pageIndex: 0, statusId: "DmlsFailed,DmlsCrashed", statusId_op: "in" } })
        ])
        this.globalStats = {
          total: totalResp.data?.dataManagerLogsCount || 0,
          successful: successResp.data?.dataManagerLogsCount || 0,
          failed: failedResp.data?.dataManagerLogsCount || 0
        }
      } catch (err) {
        logger.error("Failed to fetch global stats", err)
      }
    }
  }
});
