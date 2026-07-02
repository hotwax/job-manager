import { api } from "@common";
import { defineStore } from "pinia";

import logger from "@/logger";
import { useDataDocumentStore } from "@/store/dataDocuments";
import {
  DataDocumentGraph,
  DataDocumentConditionRecord,
  DataDocumentFieldRecord,
  deriveDataDocumentId,
  projectDataDocumentGraph,
  serializeDataDocumentGraph,
  serializeGraphConditions,
  serializeGraphFields
} from "@/utils/dataDocumentGraph";

const NEW_GRAPH_METADATA = {
  dataDocumentId: "",
  documentName: "",
  primaryEntityName: "",
  documentTitle: "",
  indexName: "",
  manualDataServiceName: ""
};

const graphSnapshot = (graph?: DataDocumentGraph) =>
  graph ? JSON.stringify(serializeDataDocumentGraph(graph)) : "";

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

const NEW_FIELD_PLACEHOLDER = "newField";

const getTerminalFieldName = (fieldPath?: string) => String(fieldPath || "").split(":").pop() || "";

const shouldDefaultFieldAlias = (field: DataDocumentFieldRecord, patch: Record<string, any>) => {
  if (!("fieldPath" in patch) || "fieldNameAlias" in patch) return false;

  const nextFieldName = getTerminalFieldName(patch.fieldPath);
  if (!nextFieldName) return false;

  const currentFieldName = getTerminalFieldName(field.fieldPath) || NEW_FIELD_PLACEHOLDER;
  const currentAlias = String(field.fieldNameAlias || "");

  return !currentAlias || currentAlias === NEW_FIELD_PLACEHOLDER || currentAlias === currentFieldName;
};

export const useDataDocumentGraphStore = defineStore("dataDocumentGraph", {
  state: () => ({
    graph: undefined as DataDocumentGraph | undefined,
    relAliases: [] as any[],
    links: [] as any[],
    removedFieldSeqIds: [] as string[],
    removedConditionSeqIds: [] as string[],
    // Snapshot of the last saved/fetched graph; drives the unsaved-changes (dirty) check.
    baseline: "",
    // True once the document exists on the server (stops id auto-derivation from the name).
    isPersisted: false,
    // True once the user manually edits the id (stops auto-derivation from the name).
    idLocked: false,
    loading: false,
    saving: false
  }),
  getters: {
    getGraph: (state) => state.graph,
    getLinks: (state) => state.links,
    isLoading: (state) => state.loading,
    isSaving: (state) => state.saving,
    isDirty: (state) => !!state.graph && graphSnapshot(state.graph) !== state.baseline
  },
  actions: {
    startNewGraph() {
      // Keep an in-progress, unsaved new draft (e.g. after a page reload) instead of wiping it.
      if (this.graph && !this.isPersisted && this.isDirty) return;
      this.relAliases = [];
      this.links = [];
      this.removedFieldSeqIds = [];
      this.removedConditionSeqIds = [];
      this.isPersisted = false;
      this.idLocked = false;
      this.graph = projectDataDocumentGraph({
        document: { ...NEW_GRAPH_METADATA },
        fields: [],
        conditions: [],
        relAliases: [],
        links: []
      });
      this.baseline = graphSnapshot(this.graph);
    },
    updateMetadata(patch: Record<string, any>) {
      if (!this.graph) return;
      const nextMetadata = { ...this.graph.metadata, ...patch };
      if ("dataDocumentId" in patch) {
        // User set the id by hand — stop deriving it from the name.
        this.idLocked = true;
      } else if ("documentName" in patch && !this.isPersisted && !this.idLocked) {
        // Auto-generate a readable id from the name until the document is saved.
        nextMetadata.dataDocumentId = deriveDataDocumentId(nextMetadata.documentName);
      }
      this.graph = projectDataDocumentGraph({
        document: nextMetadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    async fetchGraph(dataDocumentId: string, options: { force?: boolean } = {}) {
      // Preserve an in-progress unsaved draft for this same document (reload survival).
      if (!options.force && this.graph?.dataDocumentId === dataDocumentId && this.isDirty) {
        return this.graph;
      }
      this.loading = true;
      const dataDocumentStore = useDataDocumentStore();
      try {
        await dataDocumentStore.fetchDataDocument(dataDocumentId);
        this.relAliases = dataDocumentStore.getCurrentDocument?.relAliases || [];
        this.links = dataDocumentStore.getCurrentDocument?.links || [];
        this.removedFieldSeqIds = [];
        this.removedConditionSeqIds = [];
        this.graph = projectDataDocumentGraph({
          document: dataDocumentStore.getCurrentDocument,
          fields: dataDocumentStore.getFields,
          conditions: dataDocumentStore.getConditions,
          relAliases: this.relAliases,
          links: this.links
        });
        this.isPersisted = true;
        this.idLocked = true;
        this.baseline = graphSnapshot(this.graph);
      } finally {
        this.loading = false;
      }
      return this.graph;
    },
    updateField(fieldSeqId: string | undefined, fieldPath: string, patch: Record<string, any>) {
      if (!this.graph) return;
      this.graph.fields = this.graph.fields.map((field) => {
        const matchesField = fieldSeqId ? field.fieldSeqId === fieldSeqId : field.fieldPath === fieldPath;
        const nextPatch = shouldDefaultFieldAlias(field, patch)
          ? { ...patch, fieldNameAlias: getTerminalFieldName(patch.fieldPath) }
          : patch;
        return matchesField ? { ...field, ...nextPatch } : field;
      });
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    reorderFields(oldIndex: number, newIndex: number) {
      if (!this.graph) return;
      const fields = [...this.graph.fields];
      if (oldIndex === newIndex) return;
      if (oldIndex < 0 || oldIndex >= fields.length || newIndex < 0 || newIndex >= fields.length) return;
      const movedField = fields.splice(oldIndex, 1)[0];
      fields.splice(newIndex, 0, movedField);
      const resequencedFields = fields.map((field, index) => {
        const sequenceNum = (index + 1) * 10;
        return {
          ...field,
          sequenceNum,
          sourceRecord: field.sourceRecord ? { ...field.sourceRecord, sequenceNum } : undefined
        };
      });
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields({ dataDocumentId: this.graph.dataDocumentId, fields: resequencedFields }),
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
      const fieldName = getTerminalFieldName(fieldPath) || NEW_FIELD_PLACEHOLDER;
      const field: DataDocumentFieldRecord = {
        dataDocumentId: this.graph.dataDocumentId,
        // Empty until the server assigns one on save; mirrors how new conditions work.
        fieldSeqId: "",
        localId: `field-${Date.now()}-${this.graph.fields.length}`,
        fieldPath,
        fieldNameAlias: alias || (fieldPath ? fieldName : ""),
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
      // Match on the projected (possibly synthetic) id the UI holds, then record the
      // persisted seq id so saveGraph can delete it server-side.
      const survivors = this.graph.fields.filter((f) => f.fieldSeqId !== fieldSeqIdOrPath && f.fieldPath !== fieldSeqIdOrPath);
      const removed = this.graph.fields.find((f) => f.fieldSeqId === fieldSeqIdOrPath || f.fieldPath === fieldSeqIdOrPath);
      const persistedSeqId = removed?.sourceRecord?.fieldSeqId;
      if (persistedSeqId) this.removedFieldSeqIds.push(persistedSeqId);

      const resequencedSurvivors = survivors.map((field, index) => {
        const sequenceNum = (index + 1) * 10;
        return {
          ...field,
          sequenceNum,
          sourceRecord: field.sourceRecord ? { ...field.sourceRecord, sequenceNum } : undefined
        };
      });

      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields({ dataDocumentId: this.graph.dataDocumentId, fields: resequencedSurvivors }),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    addCondition(condition: any) {
      if (!this.graph) return undefined;
      const conditionPayload = condition && typeof condition === "object" ? condition : {};
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: [...serializeGraphConditions(this.graph), {
          dataDocumentId: this.graph.dataDocumentId,
          conditionSeqId: "",
          localId: `condition-${Date.now()}-${this.graph.conditions.length}`,
          isNew: true,
          ...conditionPayload
        }],
        relAliases: this.relAliases,
        links: this.links
      });
    },
    updateCondition(conditionId: string | undefined, patch: Record<string, any>) {
      if (!this.graph) return;
      this.graph.conditions = this.graph.conditions.map((condition) => (
        condition.conditionSeqId === conditionId || condition.localId === conditionId ? { ...condition, ...patch } : condition
      ));
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    removeCondition(conditionId: string) {
      if (!this.graph) return;
      const removed = this.graph.conditions.find((c) => c.conditionSeqId === conditionId || c.localId === conditionId);
      if (removed?.conditionSeqId) this.removedConditionSeqIds.push(removed.conditionSeqId);
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph).filter((c) => c.conditionSeqId !== conditionId && c.localId !== conditionId),
        relAliases: this.relAliases,
        links: this.links
      });
    },
    async saveGraph() {
      if (!this.graph) return;
      this.saving = true;
      const dataDocumentStore = useDataDocumentStore();
      // Tracks the document id once the parent is saved, so a mid-loop failure can re-sync
      // from the server (avoiding duplicate child rows on retry — new children carry an empty
      // seqId and would otherwise be POSTed again).
      let savedDataDocumentId = "";
      try {
        const savedDoc = await dataDocumentStore.saveDataDocument(this.graph.metadata);
        // The backend auto-generates (or normalizes) the id when it is blank — adopt it
        // before saving child fields/conditions so they attach to the right document.
        const dataDocumentId = savedDoc?.dataDocumentId || this.graph.dataDocumentId;
        savedDataDocumentId = dataDocumentId;
        if (dataDocumentId !== this.graph.dataDocumentId) {
          this.graph = projectDataDocumentGraph({
            document: { ...this.graph.metadata, dataDocumentId },
            fields: serializeGraphFields(this.graph).map((field) => ({ ...field, dataDocumentId })),
            conditions: serializeGraphConditions(this.graph).map((condition) => ({ ...condition, dataDocumentId })),
            relAliases: this.relAliases,
            links: this.links
          });
        }
        this.isPersisted = true;
        this.idLocked = true;
        for (const field of serializeGraphFields(this.graph)) {
          await dataDocumentStore.saveField(dataDocumentId, stripGraphFields(field));
        }
        for (const condition of serializeGraphConditions(this.graph)) {
          await dataDocumentStore.saveCondition(dataDocumentId, stripGraphFields(condition));
        }
        // The document API has no bulk-replace: fields/conditions removed in the builder
        // must be explicitly deleted, otherwise they reappear after the post-save refetch.
        for (const fieldSeqId of this.removedFieldSeqIds) {
          await dataDocumentStore.deleteField(dataDocumentId, fieldSeqId);
        }
        for (const conditionSeqId of this.removedConditionSeqIds) {
          await dataDocumentStore.deleteCondition(dataDocumentId, conditionSeqId);
        }
        this.removedFieldSeqIds = [];
        this.removedConditionSeqIds = [];
        // force the refetch past the dirty-draft guard so state re-syncs with the server.
        await this.fetchGraph(dataDocumentId, { force: true });
        return dataDocumentId;
      } catch (error) {
        logger.error(`Failed to save data document graph ${this.graph?.dataDocumentId}`, error);
        // If the document was created/updated but a child save failed partway, re-sync from
        // the server so a retry PUTs the rows that already exist instead of creating duplicates.
        if (savedDataDocumentId) {
          try {
            await this.fetchGraph(savedDataDocumentId, { force: true });
          } catch (refetchError) {
            logger.error(`Failed to re-sync data document graph after a save error`, refetchError);
          }
        }
        throw error;
      } finally {
        this.saving = false;
      }
    },
    // Drop the in-progress draft (used when the user chooses "Discard" on the unsaved-changes
    // prompt). Clearing state lets the next builder visit fetch a clean copy from the server.
    discardDraft() {
      this.graph = undefined;
      this.baseline = "";
      this.isPersisted = false;
      this.idLocked = false;
      this.relAliases = [];
      this.links = [];
      this.removedFieldSeqIds = [];
      this.removedConditionSeqIds = [];
    },
    // NOTE: there is no admin/dataDocuments/{id}/relAliases REST endpoint (returns 404),
    // so relationship aliases are not persisted via this action yet. Kept for when the
    // backend exposes it; saveGraph no longer invokes it to avoid silent 404s on every save.
    async saveRelAlias(dataDocumentId: string, relAlias: any) {
      try {
        const response = await api({
          url: `admin/dataDocuments/${encodeURIComponent(dataDocumentId)}/relAliases/${encodeURIComponent(relAlias.relationshipName)}`,
          method: relAlias.isNew ? "POST" : "PUT",
          data: relAlias
        });
        return getEntity(response) || relAlias;
      } catch (error) {
        logger.error(`Failed to save relationship alias for ${dataDocumentId}`, error);
      }
    }
  },
  // Persist the in-progress draft to localStorage so builder work survives a reload. Only
  // the document state is kept — transient loading/saving flags are excluded.
  // NOTE: pinia-plugin-persistedstate v4 uses `pick` (v3's `paths` is silently ignored).
  persist: {
    pick: [
      "graph",
      "baseline",
      "isPersisted",
      "idLocked",
      "relAliases",
      "links",
      "removedFieldSeqIds",
      "removedConditionSeqIds"
    ]
  }
});
