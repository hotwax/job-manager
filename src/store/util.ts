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

type EntityDefinition = {
  fields: any[];
  relationships: any[];
};

type EntityDefinitionFetchState = {
  status: "none" | "pending" | "success" | "error";
  error?: string;
  generation: number;
};

type EntityDefinitionRequest = {
  generation: number;
  promise: Promise<EntityDefinition | undefined>;
};

const cloneEntityDefinition = (definition: EntityDefinition): EntityDefinition => ({
  fields: definition.fields.map((field) => (
    field && typeof field === "object" ? { ...field } : field
  )),
  relationships: definition.relationships.map((relationship) => (
    relationship && typeof relationship === "object"
      ? {
        ...relationship,
        ...(relationship.keyMap && typeof relationship.keyMap === "object"
          ? { keyMap: { ...relationship.keyMap } }
          : {}),
        ...(Array.isArray(relationship.keyMaps)
          ? { keyMaps: relationship.keyMaps.map((keyMap: any) => keyMap && typeof keyMap === "object" ? { ...keyMap } : keyMap) }
          : {})
      }
      : relationship
  ))
});

const normalizeEntityNameKey = (entityName: string) => entityName.trim();

const entityDefinitionRequests = new WeakMap<object, Map<string, EntityDefinitionRequest>>();

const getEntityDefinitionRequests = (store: object) => {
  let requests = entityDefinitionRequests.get(store);
  if (!requests) {
    requests = new Map<string, EntityDefinitionRequest>();
    entityDefinitionRequests.set(store, requests);
  }
  return requests;
};

const useUtilPiniaStore = defineStore("util", {
  state: () => ({
    statusItems: {} as Record<string, StatusItemAndType>,
    enumerations: [] as any[],
    statuses: [] as any[],
    statusFlowTransitions: [] as any,
    entities: [] as Array<EntityInfo>,
    entityDefinitions: {} as Record<string, EntityDefinition>,
    entityDefinitionFetchStates: {} as Record<string, EntityDefinitionFetchState>,
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
    getEntityDefinition: (state: any) => (entityName: string) => state.entityDefinitions[normalizeEntityNameKey(entityName)],
    getEntityDefinitionFetchState: (state: any) => (entityName: string): EntityDefinitionFetchState => (
      state.entityDefinitionFetchStates[normalizeEntityNameKey(entityName)] || { status: "none", error: undefined, generation: 0 }
    ),
    getEntityFields: (state: any) => (entityName: string) => (
      state.entityDefinitions[normalizeEntityNameKey(entityName)]?.fields
      || state.entityFields[normalizeEntityNameKey(entityName)]
      || []
    ).map(normalizeEntityField),
    getEntityRelationships: (state: any) => (entityName: string) => (
      state.entityDefinitions[normalizeEntityNameKey(entityName)]?.relationships
      || state.entityRelationships[normalizeEntityNameKey(entityName)]
      || []
    ),
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
    fetchEntityDefinition(entityName: string, { force = false }: { force?: boolean } = {}) {
      const normalizedEntityName = normalizeEntityNameKey(entityName);
      if (!normalizedEntityName) return Promise.resolve(undefined);

      const requests = getEntityDefinitionRequests(this);
      const inFlight = requests.get(normalizedEntityName);
      if (!force && inFlight) return inFlight.promise;
      if (!force && this.entityDefinitions[normalizedEntityName]) {
        return Promise.resolve(cloneEntityDefinition(this.entityDefinitions[normalizedEntityName]));
      }

      const generation = (this.entityDefinitionFetchStates[normalizedEntityName]?.generation || 0) + 1;
      this.entityDefinitionFetchStates[normalizedEntityName] = {
        status: "pending",
        error: undefined,
        generation
      };
      this.fetchStatus.entityFields = "pending";
      this.fetchStatus.entityRelationships = "pending";

      let requestPromise: Promise<EntityDefinition | undefined>;
      requestPromise = (async () => {
        try {
          const resp = await api({
            url: `admin/entities/${encodeURIComponent(normalizedEntityName)}/definition`,
            method: "GET"
          });
          const responseDefinition = resp.data?.entityDefinition;
          if (!responseDefinition) throw new Error("Empty entity definition");

          const definition: EntityDefinition = {
            fields: (Array.isArray(responseDefinition.fields) ? responseDefinition.fields : [])
              .map(normalizeEntityField)
              .sort((left: any, right: any) => left.fieldName.localeCompare(right.fieldName)),
            relationships: (Array.isArray(responseDefinition.relationships) ? responseDefinition.relationships : [])
              .map((relationship: any) => ({ ...relationship }))
              .sort((left: any, right: any) => (
                (left.relationshipName || "").localeCompare(right.relationshipName || "")
              ))
          };
          const cachedDefinition = cloneEntityDefinition(definition);

          if (this.entityDefinitionFetchStates[normalizedEntityName]?.generation === generation) {
            this.entityDefinitions[normalizedEntityName] = cachedDefinition;
            this.entityFields[normalizedEntityName] = cachedDefinition.fields;
            this.entityRelationships[normalizedEntityName] = cachedDefinition.relationships;
            this.entityDefinitionFetchStates[normalizedEntityName] = {
              status: "success",
              error: undefined,
              generation
            };
            this.fetchStatus.entityFields = "success";
            this.fetchStatus.entityRelationships = "success";
          }

          return cloneEntityDefinition(definition);
        } catch (error) {
          if (this.entityDefinitionFetchStates[normalizedEntityName]?.generation === generation) {
            this.entityDefinitionFetchStates[normalizedEntityName] = {
              status: "error",
              error: error instanceof Error ? error.message : String(error),
              generation
            };
            this.fetchStatus.entityFields = "error";
            this.fetchStatus.entityRelationships = "error";
            logger.error(`Failed to fetch definition for entity ${normalizedEntityName}`, error);
          }
          throw error;
        } finally {
          if (requests.get(normalizedEntityName)?.promise === requestPromise) {
            requests.delete(normalizedEntityName);
          }
        }
      })();

      requests.set(normalizedEntityName, { generation, promise: requestPromise });
      return requestPromise;
    },
    fetchEntityFields(entityName: string, force = false) {
      return this.fetchEntityDefinition(entityName, { force });
    },
    fetchEntityRelationships(entityName: string, force = false) {
      return this.fetchEntityDefinition(entityName, { force });
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
  persist: {
    pick: [
      "statusItems",
      "enumerations",
      "statuses",
      "entities",
      "entityDefinitions",
      "entityFields",
      "entityRelationships",
      "systemInformation"
    ]
  },
});

const wrappedUtilStores = new WeakSet<object>();
const publicEntityDefinitionRequests = new WeakMap<object, Map<string, Promise<EntityDefinition | undefined>>>();

export const useUtilStore: typeof useUtilPiniaStore = Object.assign(
  ((...args: Parameters<typeof useUtilPiniaStore>) => {
    const store = useUtilPiniaStore(...args);
    if (wrappedUtilStores.has(store)) return store;

    const performFetchEntityDefinition = store.fetchEntityDefinition.bind(store);
    let requests = publicEntityDefinitionRequests.get(store);
    if (!requests) {
      requests = new Map<string, Promise<EntityDefinition | undefined>>();
      publicEntityDefinitionRequests.set(store, requests);
    }

    const fetchEntityDefinition: typeof store.fetchEntityDefinition = (entityName, options = {}) => {
      const normalizedEntityName = normalizeEntityNameKey(entityName);
      if (!normalizedEntityName) return Promise.resolve(undefined);

      const inFlight = requests.get(normalizedEntityName);
      if (!options.force && inFlight) return inFlight;

      let sharedRequest: Promise<EntityDefinition | undefined>;
      sharedRequest = performFetchEntityDefinition(normalizedEntityName, options).finally(() => {
        if (requests.get(normalizedEntityName) === sharedRequest) requests.delete(normalizedEntityName);
      });
      requests.set(normalizedEntityName, sharedRequest);
      return sharedRequest;
    };

    store.fetchEntityDefinition = fetchEntityDefinition;
    store.fetchEntityFields = ((entityName: string, force = false) => (
      fetchEntityDefinition(entityName, { force })
    )) as typeof store.fetchEntityFields;
    store.fetchEntityRelationships = ((entityName: string, force = false) => (
      fetchEntityDefinition(entityName, { force })
    )) as typeof store.fetchEntityRelationships;
    wrappedUtilStores.add(store);
    return store;
  }) as typeof useUtilPiniaStore,
  { $id: useUtilPiniaStore.$id }
);
