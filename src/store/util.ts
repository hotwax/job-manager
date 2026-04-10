import { defineStore } from "pinia";
import { api } from "@common";
import logger from "@/logger";
import { StatusItem, StatusItemAndType } from "@/types";

export const useUtilStore = defineStore("util", {
  state: () => ({
    statusItems: {} as Record<string, StatusItemAndType>,
  }),
  getters: {
    getStatusItemsByType: (state: any) => (typeId: string) => state.statusItems[typeId] || [],
    getStatusItemDesc: (state: any) => (statusId: string) => {
      const statusItem = Object.values(state.statusItems).flatMap(item => item).find((statusItem: any) => statusItem.statusId === statusId) as StatusItem
      return statusItem.description || statusId
    }
  },
  actions: {
    async fetchStatusItemsByType(typeId: string) {
      if(this.getStatusItemsByType(typeId).length) {
        return;
      }

      try {
        const resp = await api({
          url: "admin/status",
          method: "GET",
          params: {
            statusTypeId: typeId,
            pageSize: 200
          }
        });
        this.statusItems[typeId] = resp.data
      } catch(error: any) {
        logger.error(`Failed to fetch status item data for type ${typeId}`, error);
      }
    }
  },
  persist: true,
});
