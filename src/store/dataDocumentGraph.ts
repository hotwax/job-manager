import { defineStore } from "pinia";

import logger from "@/logger";
import { useDataDocumentStore } from "@/store/dataDocuments";
import {
  DataDocumentGraph,
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

// The owner of a graph that has no document id yet.
const NEW_GRAPH_OWNER = "new";

// Identifies the load that may still write to the store. Handing the store to another page (or
// dropping the working copy) bumps it, so a slower earlier response can never land on top of a newer one.
let loadSeq = 0;

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
    saving: false,
    // Who the graph above is for: a document id, or "new". A graph is only valid for its owner, so a
    // page renders it only while status is "ready" for the document it is showing. Not persisted: after
    // a reload nothing owns the store until a page claims it (fetchGraph / startNewGraph).
    owner: "",
    status: "idle" as "idle" | "loading" | "ready" | "error",
    // The page that last claimed the store. Leaving releases the store only if that page still holds
    // it: when the id is the same (a saved document reopened under its new id) or another page has
    // taken over, the leaving page must not clear what the entering page is showing.
    claimant: undefined as symbol | undefined
  }),
  getters: {
    getGraph: (state) => state.graph,
    getLinks: (state) => state.links,
    isLoading: (state) => state.loading,
    isSaving: (state) => state.saving,
    isDirty: (state) => !!state.graph && graphSnapshot(state.graph) !== state.baseline
  },
  actions: {
    startNewGraph(claimant?: symbol) {
      // Keep an in-progress, unsaved new draft (e.g. after a page reload) instead of wiping it.
      if(this.graph && !this.isPersisted && this.isDirty) {
        this.claimant = claimant;
        this.owner = NEW_GRAPH_OWNER;
        this.status = "ready";

        return;
      }
      loadSeq++;
      useDataDocumentStore().resetDocumentScope();
      this.claimant = claimant;
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
      this.owner = NEW_GRAPH_OWNER;
      this.status = "ready";
    },
    updateMetadata(patch: Record<string, any>) {
      if (!this.graph) return;
      
      if (patch.primaryEntityName && patch.primaryEntityName !== this.graph.metadata.primaryEntityName) {
        for (const field of this.graph.fields) {
          const persistedSeqId = field.sourceRecord?.fieldSeqId;
          if (persistedSeqId && !this.removedFieldSeqIds.includes(persistedSeqId)) {
            this.removedFieldSeqIds.push(persistedSeqId);
          }
        }
        for (const condition of this.graph.conditions) {
          const persistedSeqId = condition.sourceRecord?.conditionSeqId;
          if (persistedSeqId && !this.removedConditionSeqIds.includes(persistedSeqId)) {
            this.removedConditionSeqIds.push(persistedSeqId);
          }
        }
        this.relAliases = [];
        this.links = [];
        this.graph = projectDataDocumentGraph({
          document: {
            ...this.graph.metadata,
            ...patch
          },
          fields: [],
          conditions: [],
          relAliases: [],
          links: []
        });
        return;
      }
      
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
    async fetchGraph(dataDocumentId: string, options: { force?: boolean; claimant?: symbol } = {}) {
      if(!options.force) {
        // Already showing this document (a page for the id a first save just created lands here).
        if(this.owner === dataDocumentId && this.status === "ready") {
          this.claimant = options.claimant;
          useDataDocumentStore().loadRelated(dataDocumentId);

          return this.graph;
        }
        // An unsaved draft of this very document survived a reload: keep it rather than replace it
        // with the server copy.
        if(this.graph?.dataDocumentId === dataDocumentId && this.isDirty) {
          this.owner = dataDocumentId;
          this.status = "ready";
          this.claimant = options.claimant;
          useDataDocumentStore().loadRelated(dataDocumentId);

          return this.graph;
        }
        // Whatever the store still holds belongs to another document. Drop it before the first request,
        // so the page can only show loading, an error, or this document, never the previous one.
        this.discardDraft();
        this.owner = dataDocumentId;
        this.status = "loading";
        this.claimant = options.claimant;
      }
      const loadId = ++loadSeq;
      this.loading = true;
      const dataDocumentStore = useDataDocumentStore();
      try {
        await dataDocumentStore.fetchDataDocument(dataDocumentId, { includeRelated: !options.force });
        // The store was handed to another page while this loaded (the user moved on): leave it alone.
        if(loadId !== loadSeq) {
          return this.graph;
        }
        // The API answers an id it does not know with an empty 200, not an error. A blank document must
        // not pass for a loaded one, or a dead link would offer to start a new document.
        if(!dataDocumentStore.getCurrentDocument?.dataDocumentId) {
          throw new Error(`Data document ${dataDocumentId} was not found`);
        }
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
        this.owner = dataDocumentId;
        this.status = "ready";
      } catch (error) {
        if(loadId !== loadSeq) {
          return this.graph;
        }
        logger.error(`Failed to load data document graph ${dataDocumentId}`, error);
        // A re-sync after a save keeps the working copy on screen and lets the caller decide.
        if(options.force) {
          throw error;
        }
        const claimant = this.claimant;
        this.discardDraft();
        this.owner = dataDocumentId;
        this.status = "error";
        this.claimant = claimant;
      } finally {
        if(loadId === loadSeq) {
          this.loading = false;
        }
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
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields({ dataDocumentId: this.graph.dataDocumentId, fields: survivors }),
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
      // The parent document is written before any field or condition, so an id the database
      // will reject has to stop the save before the first request rather than after it.
      const idTooLong = this.graph.validationIssues.find((issue) => issue.code === "data_document_id_too_long");
      if (idTooLong) throw new Error(idTooLong.message);
      this.saving = true;
      const dataDocumentStore = useDataDocumentStore();
      // Tracks the document id once the parent is saved, so a mid-loop failure can re-sync
      // from the server (avoiding duplicate child rows on retry — new children carry an empty
      // seqId and would otherwise be POSTed again).
      let savedDataDocumentId = "";
      try {
        // This flag survives draft restoration; the document store's fetched copy does not.
        const savedDoc = await dataDocumentStore.saveDataDocument(this.graph.metadata, { isNew: !this.isPersisted });
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
    // Drop the working copy and everything loaded for it: when the user chooses "Discard" on the
    // unsaved-changes prompt, and whenever the store is handed to another page (fetchGraph, release).
    // Clearing state lets the next builder visit fetch a clean copy from the server.
    discardDraft() {
      loadSeq++;
      this.graph = undefined;
      this.baseline = "";
      this.isPersisted = false;
      this.idLocked = false;
      this.relAliases = [];
      this.links = [];
      this.removedFieldSeqIds = [];
      this.removedConditionSeqIds = [];
      this.owner = "";
      this.status = "idle";
      this.claimant = undefined;
      this.loading = false;
      useDataDocumentStore().resetDocumentScope();
    },
    // The page that claimed the store is gone. Clear what it loaded, unless another page has claimed
    // the store since, or it still holds unsaved work the leave guard let through.
    release(claimant: symbol) {
      if(!claimant || this.claimant !== claimant || this.isDirty) {
        return;
      }
      this.discardDraft();
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
