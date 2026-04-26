import { defineStore } from "pinia";
import { api, commonUtil } from "@common";
import logger from "@/logger";
import { StatusItem, StatusItemAndType } from "@/types";

export const useUtilStore = defineStore("util", {
  state: () => ({
    statusItems: {} as Record<string, StatusItemAndType>,
    statusFlowTransitions: [] as any,
    entities: [] as any[],
    entityFields: {} as Record<string, any[]>,
    fetchStatus: {
      statusFlowTransitions: 'none',
      entities: 'none',
      entityFields: 'none'
    } as any
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
    },
    getEntities: (state: any) => state.entities,
    getEntityFields: (state: any) => (entityName: string) => state.entityFields[entityName] || [],
    getFetchStatus: (state: any) => state.fetchStatus
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
      this.fetchStatus.statusFlowTransitions = 'pending'
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
        this.fetchStatus.statusFlowTransitions = 'success'
      } catch(error: any) {
        logger.error("Failed to fetch status flow transitions");
        this.fetchStatus.statusFlowTransitions = 'error'
      }
    },
    async fetchEntities(force = false) {
      if (this.entities.length && !force) return;
      this.fetchStatus.entities = 'pending'

      try {
        const resp = await api({
          url: "moqui/entity/EntityServices/getEntityNames",
          method: "GET"
        });
        if (resp.data.entityNames) {
          this.entities = resp.data.entityNames.sort();
          this.fetchStatus.entities = 'success'
        } else {
          throw new Error("Empty entity list");
        }
      } catch (error) {
        logger.error("Failed to fetch entities", error);
        this.fetchStatus.entities = 'error'
        
        // Mock fallback to keep UI functional if API fails
        if (!this.entities.length) {
          this.entities = [
            "Product", "Facility", "InventoryItem", "OrderHeader", "OrderItem", 
            "ProductFacility", "UserLogin", "Party", "ContactMech", "PostalAddress"
          ].sort();
        }
      }
    },
    async fetchEntityFields(entityName: string) {
      if (this.entityFields[entityName]?.length && typeof this.entityFields[entityName][0] === 'object') return;
      this.fetchStatus.entityFields = 'pending'

      try {
        const resp = await api({
          url: `moqui/entity/EntityServices/getEntityFields`,
          method: "GET",
          params: { entityName }
        });
        if (resp.data.fields) {
          this.entityFields[entityName] = resp.data.fields.sort((a: any, b: any) => a.fieldName.localeCompare(b.fieldName));
          this.fetchStatus.entityFields = 'success'
        } else if (resp.data.fieldNames) {
          // Fallback if only names are returned
          this.entityFields[entityName] = resp.data.fieldNames.map((name: string) => ({ fieldName: name, description: "" })).sort((a: any, b: any) => a.fieldName.localeCompare(b.fieldName));
          this.fetchStatus.entityFields = 'success'
        } else {
          throw new Error("Empty field list");
        }
      } catch (error) {
        logger.error(`Failed to fetch fields for entity ${entityName}`, error);
        this.fetchStatus.entityFields = 'error'
        
        // Mock fallback
        if (entityName === 'Product') {
          this.entityFields[entityName] = [
            { fieldName: 'productId', description: 'Unique identifier for the product.' },
            { fieldName: 'productName', description: 'The name of the product.' },
            { fieldName: 'description', description: 'Detailed description of the product.' },
            { fieldName: 'internalName', description: 'Internal name used for reporting and tracking.' },
            { fieldName: 'productTypeId', description: 'Type of product (e.g., Finished Good, Service).' }
          ].sort((a: any, b: any) => a.fieldName.localeCompare(b.fieldName));
        } else if (entityName === 'Facility') {
          this.entityFields[entityName] = [
            { fieldName: 'facilityId', description: 'Unique identifier for the facility.' },
            { fieldName: 'facilityName', description: 'The name of the facility.' },
            { fieldName: 'facilityTypeId', description: 'Type of facility (e.g., Warehouse, Store).' },
            { fieldName: 'ownerPartyId', description: 'The party that owns the facility.' }
          ].sort((a: any, b: any) => a.fieldName.localeCompare(b.fieldName));
        }
      }
    }
  },
  persist: true,
});
