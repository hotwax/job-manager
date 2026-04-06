import { defineStore } from "pinia";
import { api } from "@common";
import logger from "@/logger";

export const useUtilStore = defineStore("util", {
  state: () => ({
    statusItems: [] as any,
  }),
  getters: {
    getStatusItems: (state: any) => (typeId: string) => state.statusItems.filter((statusItem: any) => statusItem.statusTypeId === typeId)
  },
  actions: {
    async fetchStatusItems(typeId: string) {
      if(this.getStatusItems(typeId).length) {
        return;
      }

      try {
        const resp = await api({
          url: "admin/status",
          method: "GET",
          params: {
            statusTypeId: typeId
          },
          pageSize: 200
        });
        this.statusItems = resp.data
      } catch(error: any) {
        logger.error(`Failed to fetch status item data for type ${typeId}`, error);
      }
    }
  },
  persist: true,
});
