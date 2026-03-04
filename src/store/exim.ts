import logger from "@/logger";
import { api } from "@common";
import { defineStore } from "pinia";

export const useConfigStore = defineStore("config", {
  state: () => ({
    configs: [] as Array<any>
  }),
  getters: {
    getConfigs: (state: any) => state.configs,
    getConfigById: (state: any) => (configId: string) => state.configs.find((config: any) => config.configId === configId)
  },
  actions: {
    async fetchConfigs() {
      try {
        let resp = await api({
          url: "admin/dataManager",
          method: "get",
          params: {
            pageSize: 200       // TODO: implement logic to fetch all configs
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
    }
  },
  persist: true,
});
