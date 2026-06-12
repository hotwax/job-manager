import { defineStore } from "pinia";
import { api, commonUtil, translate } from "@common";
import logger from "@/logger";
import { EntityInfo, StatusItem, StatusItemAndType } from "@/types";

export const normalizeEntityField = (field: any) => {
  if (typeof field === "string") {
    return {
      name: field,
      fieldName: field,
      description: ""
    };
  }

  const fieldName = field.fieldName || field.name || "";

  return {
    ...field,
    name: field.name || fieldName,
    fieldName,
    description: field.description || ""
  };
};

export const useUtilStore = defineStore("util", {
  state: () => ({
    statusItems: {} as Record<string, StatusItemAndType>,
    enumerations: [] as any[],
    statuses: [] as any[],
    statusFlowTransitions: [] as any,
    entities: [] as Array<EntityInfo>,
    entityFields: {} as Record<string, any[]>,
    entityRelationships: {} as Record<string, any[]>,
    fetchStatus: {
      statusFlowTransitions: 'none',
      entities: 'none',
      entityFields: 'none',
      entityRelationships: 'none',
      enumerations: 'none',
      statuses: 'none'
    } as any,
    systemInformation: {} as any
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
    getEnumerations: (state: any) => state.enumerations,
    getStatuses: (state: any) => state.statuses,
    getEntityFields: (state: any) => (entityName: string) => (state.entityFields[entityName] || []).map(normalizeEntityField),
    getEntityRelationships: (state: any) => (entityName: string) => state.entityRelationships[entityName] || [],
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
      if(this.entities.length && !force) return;
      this.fetchStatus.entities = "pending"

      try {
        const resp = await api({
          url: "admin/entities",
          method: "GET",
          params: {
            excludeViewEntities: true,
            orderByField: "entityName"
          }
        });
        if(resp.data.entityInfoList) {
          this.entities = resp.data.entityInfoList;
          this.fetchStatus.entities = "success"
        } else {
          throw new Error("Empty entity list");
        }
      } catch (error) {
        logger.error("Failed to fetch entities", error);
        this.fetchStatus.entities = "error"
      }
    },
    async fetchEntityFields(entityName: string, force = false) {
      if (
        !force &&
        this.entityFields[entityName]?.length &&
        this.entityRelationships[entityName]?.length &&
        typeof this.entityFields[entityName][0] === 'object'
      ) return;
      this.fetchStatus.entityFields = 'pending'

      try {
        const resp = await api({
          url: `admin/entities/${entityName}/definition`,
          method: "GET"
        });
        if (resp.data?.entityDefinition?.fields) {
          this.entityFields[entityName] = resp.data.entityDefinition.fields
            .map(normalizeEntityField)
            .sort((a: any, b: any) => a.fieldName.localeCompare(b.fieldName));
          if (resp.data.entityDefinition.relationships) {
            this.entityRelationships[entityName] = resp.data.entityDefinition.relationships
              .sort((a: any, b: any) => (a.relationshipName || "").localeCompare(b.relationshipName || ""));
          }
          this.fetchStatus.entityFields = 'success'
        } else {
          throw new Error("Empty field list");
        }
      } catch (error) {
        logger.error(`Failed to fetch fields for entity ${entityName}`, error);
        this.fetchStatus.entityFields = 'error'
      }
    },
    async fetchEntityRelationships(entityName: string, force = false) {
      if (!force && this.entityRelationships[entityName]?.length) return;
      this.fetchStatus.entityRelationships = 'pending'

      try {
        const resp = await api({
          url: `admin/entities/${entityName}/definition`,
          method: "GET"
        });
        if (resp.data?.entityDefinition?.relationships) {
          this.entityRelationships[entityName] = resp.data.entityDefinition.relationships
            .sort((a: any, b: any) => (a.relationshipName || "").localeCompare(b.relationshipName || ""));
          if (resp.data.entityDefinition.fields && !this.entityFields[entityName]?.length) {
            this.entityFields[entityName] = resp.data.entityDefinition.fields
              .map(normalizeEntityField)
              .sort((a: any, b: any) => a.fieldName.localeCompare(b.fieldName));
          }
          this.fetchStatus.entityRelationships = 'success'
        } else {
          throw new Error("Empty relationship list");
        }
      } catch (error) {
        logger.error(`Failed to fetch relationships for entity ${entityName}`, error);
        this.fetchStatus.entityRelationships = 'error'
      }
    },
    async fetchEnumerations(force = false) {
      if (this.enumerations.length && !force) return;
      this.fetchStatus.enumerations = 'pending'

      try {
        const resp = await api({
          url: "admin/enums",
          method: "GET",
          params: {
            pageSize: 5000
          }
        });
        this.enumerations = Array.isArray(resp.data) ? resp.data : [];
        this.fetchStatus.enumerations = 'success'
      } catch(error: any) {
        logger.error("Failed to fetch enumerations", error);
        this.fetchStatus.enumerations = 'error'
      }
    },
    async fetchStatuses(force = false) {
      if (this.statuses.length && !force) return;
      this.fetchStatus.statuses = 'pending'

      try {
        const resp = await api({
          url: "admin/status",
          method: "GET",
          params: {
            pageSize: 5000
          }
        });
        this.statuses = Array.isArray(resp.data) ? resp.data : [];
        this.fetchStatus.statuses = 'success'
      } catch(error: any) {
        logger.error("Failed to fetch statuses", error);
        this.fetchStatus.statuses = 'error'
      }
    },
    async fetchSystemInformation() {
      try {
        const resp = await api({
          url: "admin/maarg",
          method: "GET"
        });
        this.systemInformation = resp.data
      } catch(error: any) {
        logger.error("Failed to fetch system information");
        commonUtil.showToast(translate("App is not compatible with oms version and will not work as expected, please contact administrator"));
      }
    }
  },
  persist: true,
});
