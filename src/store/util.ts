import { defineStore } from "pinia";
import { api, commonUtil } from "@common";
import logger from "@/logger";
import { StatusItem, StatusItemAndType } from "@/types";

export const useUtilStore = defineStore("util", {
  state: () => ({
    statusItems: {} as Record<string, StatusItemAndType>,
    statusFlowTransitions: [] as any
  }),
  getters: {
    getStatusItemsByType: (state: any) => (typeId: string) => state.statusItems[typeId] || [],
    getStatusItemDesc: (state: any) => (statusId: string) => {
      const statusItem = Object.values(state.statusItems).flatMap(item => item).find((statusItem: any) => statusItem.statusId === statusId) as StatusItem
      return statusItem?.description || statusId
    },
    getAllowedTransitions: (state: any) => (message: any) => {
      return (state.statusFlowTransitions.size && state.statusFlowTransitions.get(message.statusId) || []).map((transition: any) => ({
        ...transition,
        toStatusDescription: state.getStatusItemDesc(transition.toStatusId || ""),
        toStatusColor: commonUtil.getStatusColor(state.getStatusItemDesc(transition.toStatusId || ""))
      }));
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
    },
    async fetchStatusFlowTransitions() {
      try {
        const resp = await api({
          url: "admin/statusFlows/transitions",
          method: "GET",
          params: {
            pageSize: 500
          }
        });
        const transitionsByStatusId = resp.data.reduce(
          (transitions: any, transition: any) => {
            if (!transition.statusId) return transitions;
            const currentTransitions = transitions.get(transition.statusId) || [];
            currentTransitions.push(transition);
            transitions.set(transition.statusId, currentTransitions);
            return transitions;
          },
          new Map<string, any[]>()
        );

        for (const transitionList of transitionsByStatusId.values()) {
          transitionList.sort((left: any, right: any) => {
            const leftSequence = left.transitionSequence ?? Number.MAX_SAFE_INTEGER;
            const rightSequence = right.transitionSequence ?? Number.MAX_SAFE_INTEGER;

            if (leftSequence !== rightSequence) {
              return leftSequence - rightSequence;
            }

            return (left.toStatusId || "").localeCompare(right.toStatusId || "");
          });
        }

        this.statusFlowTransitions = transitionsByStatusId
      } catch(error: any) {
        logger.error("Failed to fetch status flow transitions");
      }
    }
  },
  persist: true,
});
