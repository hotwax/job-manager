import { api } from "@common";
import { defineStore } from "pinia";

import logger from "@/logger";
import { useDataDocumentStore } from "@/store/useDataDocumentStore";
import {
  DataDocumentGraph,
  DataDocumentConditionRecord,
  DataDocumentFieldRecord,
  projectDataDocumentGraph,
  serializeGraphConditions,
  serializeGraphFields
} from "@/utils/dataDocumentGraph";

const shouldUseMockData = () => {
  const locationSearch = typeof window !== "undefined" ? window.location.search : "";
  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  if (locationSearch.includes("mockDataDocuments=true")) {
    if (typeof storage?.setItem === "function") storage.setItem("JOB_MANAGER_DATA_DOCUMENTS_MOCK", "true");
    return true;
  }
  return typeof storage?.getItem === "function" && storage.getItem("JOB_MANAGER_DATA_DOCUMENTS_MOCK") === "true";
};

const canUseMockFallback = (error: any) => !error?.response || [404, 501].includes(Number(error?.response?.status));

const getCollection = (response: any, fallbackKey?: string) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (fallbackKey && Array.isArray(data?.[fallbackKey])) return data[fallbackKey];
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.entityValueList)) return data.entityValueList;
  return [];
};

const getEntity = (response: any) => {
  const data = response?.data;
  if (Array.isArray(data)) return data[0];
  if (data?.entity && typeof data.entity === "object") return data.entity;
  if (data?.item && typeof data.item === "object") return data.item;
  if (data?.data && !Array.isArray(data.data) && typeof data.data === "object") return data.data;
  if (data && typeof data === "object") return data;
  return undefined;
};

const stripGraphFields = (payload: Record<string, any>) => {
  const { nodeId, fieldName, outputName, isManualPath, targetKind, targetId, localId, isNew, ...apiPayload } = payload;
  return apiPayload;
};

export const useDataDocumentGraphStore = defineStore("useDataDocumentGraphStore", {
  state: () => ({
    graph: undefined as DataDocumentGraph | undefined,
    relAliases: [] as any[],
    links: [] as any[],
    loading: false,
    saving: false
  }),
  getters: {
    getGraph: (state) => state.graph,
    getRelAliases: (state) => state.relAliases,
    getLinks: (state) => state.links,
    isLoading: (state) => state.loading,
    isSaving: (state) => state.saving
  },
  actions: {
    startNewGraph() {
      this.relAliases = [];
      this.links = [];
      this.graph = projectDataDocumentGraph({
        document: {
          dataDocumentId: "",
          documentName: "",
          primaryEntityName: "",
          documentTitle: "",
          indexName: "",
          manualDataServiceName: ""
        },
        fields: [],
        conditions: [],
        relAliases: [],
        links: []
      });
    },
    updateMetadata(patch: Record<string, any>) {
      if (!this.graph) return;
      this.graph = projectDataDocumentGraph({
        document: { ...this.graph.metadata, ...patch },
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    async fetchGraph(dataDocumentId: string) {
      this.loading = true;
      const dataDocumentStore = useDataDocumentStore();
      try {
        await dataDocumentStore.fetchDataDocument(dataDocumentId);
        await Promise.all([
          this.fetchRelAliases(dataDocumentId),
          this.fetchLinks(dataDocumentId)
        ]);
        this.graph = projectDataDocumentGraph({
          document: dataDocumentStore.getCurrentDocument,
          fields: dataDocumentStore.getFields,
          conditions: dataDocumentStore.getConditions,
          relAliases: this.relAliases,
          links: this.links
        });
      } finally {
        this.loading = false;
      }
      return this.graph;
    },
    async fetchRelAliases(dataDocumentId: string) {
      try {
        const response = await api({
          url: `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/relAliases`,
          method: "GET",
          params: { pageSize: 250 }
        });
        this.relAliases = getCollection(response, "relAliases");
      } catch (error) {
        logger.error(`Failed to fetch relationship aliases for ${dataDocumentId}`, error);
      }
    },
    async fetchLinks(dataDocumentId: string) {
      try {
        const response = await api({
          url: `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/links`,
          method: "GET",
          params: { pageSize: 250 }
        });
        this.links = getCollection(response, "links");
      } catch (error) {
        logger.error(`Failed to fetch links for ${dataDocumentId}`, error);
      }
    },
    updateField(fieldSeqId: string | undefined, fieldPath: string, patch: Record<string, any>) {
      if (!this.graph) return;
      this.graph.fields = this.graph.fields.map((field) => {
        const matchesField = fieldSeqId ? field.fieldSeqId === fieldSeqId : field.fieldPath === fieldPath;
        return matchesField ? { ...field, ...patch } : field;
      });
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    addField(nodeId: string, fieldName = "newField") {
      if (!this.graph) return;
      const node = this.graph.nodes.find((item) => item.nodeId === nodeId);
      if (!node) return;
      const fieldPath = node.relationshipPath.length ? `${node.relationshipPath.join(":")}:${fieldName}` : fieldName;
      return this.addFieldPath(fieldPath, fieldName);
    },
    addFieldPath(fieldPath: string, alias?: string) {
      if (!this.graph) return;
      const fieldName = fieldPath.split(":").pop() || "newField";
      const field: DataDocumentFieldRecord = {
        dataDocumentId: this.graph.dataDocumentId,
        fieldSeqId: `new-${Date.now()}`,
        fieldPath,
        fieldNameAlias: alias || fieldName,
        defaultDisplay: "Y",
        sortable: "N",
        functionName: "",
        sequenceNum: (this.graph.fields.length + 1) * 10,
        isNew: true
      };
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: [...serializeGraphFields(this.graph), field],
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
      return field;
    },
    removeField(fieldSeqIdOrPath: string) {
      if (!this.graph) return;
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph).filter((f) => f.fieldSeqId !== fieldSeqIdOrPath && f.fieldPath !== fieldSeqIdOrPath),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    addCondition(fieldNameAlias: string) {
      if (!this.graph) return undefined;
      const condition: DataDocumentConditionRecord = {
        dataDocumentId: this.graph.dataDocumentId,
        conditionSeqId: `new-${Date.now()}`,
        fieldNameAlias,
        operator: "equals",
        value: "",
        fieldValue: "",
        toFieldNameAlias: "",
        postQuery: "N",
        isNew: true
      };
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: [...serializeGraphConditions(this.graph), condition],
        relAliases: this.relAliases,
        links: this.links
      });
      return condition;
    },
    updateCondition(conditionSeqId: string | undefined, patch: Record<string, any>) {
      if (!this.graph) return;
      this.graph.conditions = this.graph.conditions.map((condition) => (
        condition.conditionSeqId === conditionSeqId ? { ...condition, ...patch } : condition
      ));
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    removeCondition(conditionSeqId: string) {
      if (!this.graph) return;
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph).filter((c) => c.conditionSeqId !== conditionSeqId),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    async saveGraph() {
      if (!this.graph) return;
      this.saving = true;
      const dataDocumentStore = useDataDocumentStore();
      try {
        await dataDocumentStore.saveDataDocument(this.graph.metadata);
        for (const field of serializeGraphFields(this.graph)) {
          await dataDocumentStore.saveField(this.graph.dataDocumentId, stripGraphFields(field));
        }
        for (const condition of serializeGraphConditions(this.graph)) {
          await dataDocumentStore.saveCondition(this.graph.dataDocumentId, stripGraphFields(condition));
        }
        for (const relAlias of this.relAliases) {
          await this.saveRelAlias(this.graph.dataDocumentId, relAlias);
        }
      } finally {
        this.saving = false;
      }
      await this.fetchGraph(this.graph.dataDocumentId);
    },
    async saveRelAlias(dataDocumentId: string, relAlias: any) {
      if (shouldUseMockData()) return relAlias;
      try {
        const response = await api({
          url: `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/relAliases/${encodeURIComponent(relAlias.relationshipName)}`,
          method: relAlias.isNew ? "POST" : "PUT",
          data: relAlias
        });
        return getEntity(response) || relAlias;
      } catch (error) {
        logger.error(`Failed to save relationship alias for ${dataDocumentId}`, error);
        if (!canUseMockFallback(error)) throw error;
        return relAlias;
      }
    }
  }
});
