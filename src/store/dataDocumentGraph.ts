import { api } from "@common";
import { defineStore } from "pinia";

import logger from "@/logger";
import { useDataDocumentStore } from "@/store/dataDocuments";
import { useUtilStore } from "@/store/util";
import {
  DataDocumentGraph,
  DataDocumentConditionRecord,
  DataDocumentFieldRecord,
  canonicalDataDocumentAlias,
  deriveDataDocumentId,
  getDataDocumentFieldLocalId,
  getRelationshipMetadata,
  isDataDocumentAliasJavaCompatible,
  parseDataDocumentFieldPath,
  projectDataDocumentGraph,
  RelationshipMetadata,
  resolveDefinitionRelationship,
  serializeDataDocumentGraph,
  serializeGraphConditions,
  serializeGraphFields,
  validateDataDocumentGraph
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
  const { nodeId, fieldName, outputName, isManualPath, targetKind, targetId, toTargetId, localId, isNew, ...apiPayload } = payload;
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

  return !currentAlias
    || currentAlias === NEW_FIELD_PLACEHOLDER
    || currentAlias === canonicalDataDocumentAlias(currentFieldName);
};

const canonicalizeDataDocumentAlias = (value?: string) => {
  if (!isDataDocumentAliasJavaCompatible(value)) {
    throw new Error("Data document aliases support ASCII characters only.");
  }
  return canonicalDataDocumentAlias(value);
};

const canonicalizeFieldPatch = (patch: Record<string, any>) => (
  "fieldNameAlias" in patch
    ? { ...patch, fieldNameAlias: canonicalizeDataDocumentAlias(patch.fieldNameAlias) }
    : patch
);

const canonicalizeConditionPatch = (patch: Record<string, any>) => ({
  ...patch,
  ...("fieldNameAlias" in patch ? { fieldNameAlias: canonicalizeDataDocumentAlias(patch.fieldNameAlias) } : {}),
  ...("toFieldNameAlias" in patch ? { toFieldNameAlias: canonicalizeDataDocumentAlias(patch.toFieldNameAlias) } : {})
});

const migrateGraphAliases = (graph: DataDocumentGraph) => {
  const fieldsNeedingLocalIds = graph.fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => !field.sourceRecord?.fieldSeqId && !field.localId);
  if (graph.aliasesCanonical && !fieldsNeedingLocalIds.length) return graph;

  const fieldAliasValidationIssueTargetIds = new Map(
    fieldsNeedingLocalIds.map(({ field, index }) => [field.fieldSeqId, getDataDocumentFieldLocalId(index)])
  );
  const preservedAliasValidationIssues = graph.aliasesCanonical
    ? graph.aliasValidationIssues.map((issue) => (
      issue.targetKind === "field" && issue.targetId && fieldAliasValidationIssueTargetIds.has(issue.targetId)
        ? { ...issue, targetId: fieldAliasValidationIssueTargetIds.get(issue.targetId) }
        : issue
    ))
    : [];
  return projectDataDocumentGraph({
    document: graph.metadata,
    fields: serializeGraphFields(graph),
    conditions: serializeGraphConditions(graph),
    relAliases: graph.relAliases,
    links: graph.links,
    feeds: graph.feeds,
    relationshipMetadata: graph.relationshipMetadata,
    aliasesAreCanonical: graph.aliasesCanonical,
    preservedAliasValidationIssues
  });
};

const getFieldAliasValidationIdentity = (field: DataDocumentGraph["fields"][number]) => (
  field.sourceRecord?.fieldSeqId || field.localId || field.fieldSeqId
);

const matchesField = (field: DataDocumentGraph["fields"][number], fieldSeqId: string | undefined, fieldPath: string) => (
  fieldSeqId
    ? field.fieldSeqId === fieldSeqId || field.localId === fieldSeqId
    : field.fieldPath === fieldPath
);

const withoutAliasValidationIssues = (
  issues: DataDocumentGraph["aliasValidationIssues"],
  targetKind: "field" | "condition",
  targetIds: string[],
  aliasProperties: Array<"fieldNameAlias" | "toFieldNameAlias">
) => issues.filter((issue) => !(
  issue.targetKind === targetKind
  && !!issue.targetId
  && targetIds.includes(issue.targetId)
  && !!issue.aliasProperty
  && aliasProperties.includes(issue.aliasProperty)
));

const mergePendingChildRecords = <T extends Record<string, any>>(
  serverRecords: T[],
  pendingRecords: T[],
  sequenceId: "fieldSeqId" | "conditionSeqId"
) => {
  const pendingBySequenceId = new Map(
    pendingRecords
      .filter((record) => record[sequenceId])
      .map((record) => [record[sequenceId], record])
  );
  const serverSequenceIds = new Set(serverRecords.map((record) => record[sequenceId]).filter(Boolean));
  return serverRecords
    .map((record) => pendingBySequenceId.get(record[sequenceId]) || record)
    .concat(pendingRecords.filter((record) => !record[sequenceId] || !serverSequenceIds.has(record[sequenceId])));
};

const hydrateRelationshipMetadata = async (
  primaryEntityName: string,
  fields: DataDocumentFieldRecord[]
) => {
  const relationshipMetadata: Record<string, RelationshipMetadata> = {};
  const relationshipPaths = Array.from(new Set(fields.map((field) => (
    parseDataDocumentFieldPath(String(field.fieldPath || "")).relationshipSegments.join(":")
  )).filter(Boolean)));
  if (!primaryEntityName || !relationshipPaths.length) return relationshipMetadata;

  const utilStore = useUtilStore();
  for (const relationshipPath of relationshipPaths) {
    const segments = relationshipPath.split(":").filter(Boolean);
    let sourceEntityName = primaryEntityName;

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex];
      const pathText = segments.slice(0, segmentIndex + 1).join(":");
      const cachedMetadata = relationshipMetadata[pathText];
      if (cachedMetadata) {
        if (!cachedMetadata.verified || !cachedMetadata.entityName) break;
        sourceEntityName = cachedMetadata.entityName;
        continue;
      }

      let definition;
      try {
        definition = await utilStore.fetchEntityDefinition(sourceEntityName);
      } catch {
        relationshipMetadata[pathText] = getRelationshipMetadata(undefined, pathText, segment);
        break;
      }
      const relationship = resolveDefinitionRelationship(definition?.relationships, segment);
      const metadata = getRelationshipMetadata(relationship, pathText, segment);
      relationshipMetadata[pathText] = metadata;
      if (!metadata.verified || !metadata.entityName) break;
      sourceEntityName = metadata.entityName;
    }
  }

  return relationshipMetadata;
};

const acknowledgeSavedField = (
  graph: DataDocumentGraph,
  pendingField: DataDocumentFieldRecord,
  savedField: DataDocumentFieldRecord | undefined,
  dataDocumentId: string
) => {
  const fieldSeqId = savedField?.fieldSeqId || pendingField.fieldSeqId;
  if (!fieldSeqId) return;
  const graphField = graph.fields.find((field) => pendingField.localId
    ? field.localId === pendingField.localId
    : field.sourceRecord?.fieldSeqId === pendingField.fieldSeqId);
  if (!graphField) return;
  graphField.dataDocumentId = dataDocumentId;
  graphField.fieldSeqId = fieldSeqId;
  graphField.sourceRecord = {
    ...graphField.sourceRecord,
    ...pendingField,
    ...savedField,
    dataDocumentId,
    fieldSeqId,
    localId: graphField.localId
  };
};

const acknowledgeSavedCondition = (
  graph: DataDocumentGraph,
  pendingCondition: DataDocumentConditionRecord,
  savedCondition: DataDocumentConditionRecord | undefined,
  dataDocumentId: string
) => {
  const conditionSeqId = savedCondition?.conditionSeqId || pendingCondition.conditionSeqId;
  if (!conditionSeqId) return;
  const graphCondition = graph.conditions.find((condition) => pendingCondition.localId
    ? condition.localId === pendingCondition.localId
    : condition.conditionSeqId === pendingCondition.conditionSeqId);
  if (!graphCondition) return;
  graphCondition.dataDocumentId = dataDocumentId;
  graphCondition.conditionSeqId = conditionSeqId;
  graphCondition.sourceRecord = {
    ...graphCondition.sourceRecord,
    ...pendingCondition,
    ...savedCondition,
    dataDocumentId,
    conditionSeqId,
    localId: graphCondition.localId
  };
};

const useDataDocumentGraphPiniaStore = defineStore("dataDocumentGraph", {
  state: () => ({
    graph: undefined as DataDocumentGraph | undefined,
    relAliases: [] as any[],
    links: [] as any[],
    removedFieldSeqIds: [] as string[],
    removedConditionSeqIds: [] as string[],
    // Route/fetch target currently owning the builder, set before any document request awaits.
    targetDataDocumentId: "",
    targetOwnerToken: undefined as symbol | undefined,
    targetOwnerGeneration: 0,
    // Snapshot of the last saved/fetched graph; drives the unsaved-changes (dirty) check.
    baseline: "",
    // True once the document exists on the server (stops id auto-derivation from the name).
    isPersisted: false,
    // True once the user manually edits the id (stops auto-derivation from the name).
    idLocked: false,
    loading: false,
    saving: false,
    graphRequestId: 0,
    graphRequestDataDocumentId: "",
    loadedDataDocumentId: "",
    loadError: undefined as unknown,
    loadErrorDataDocumentId: ""
  }),
  getters: {
    getGraph: (state) => state.graph,
    getLinks: (state) => state.links,
    isLoading: (state) => state.loading,
    getLoadError: (state) => state.loadError,
    getLoadErrorDataDocumentId: (state) => state.loadErrorDataDocumentId,
    getLoadedDataDocumentId: (state) => state.loadedDataDocumentId,
    isSaving: (state) => state.saving,
    savedRevision: (state) => state.baseline,
    isDirty: (state) => !!state.graph && graphSnapshot(state.graph) !== state.baseline,
    canPreview: (state) => !!state.graph?.dataDocumentId
      && !!state.targetOwnerToken
      && state.targetDataDocumentId === state.graph.dataDocumentId
      && state.isPersisted
      && !state.loading
      && !state.saving
      && graphSnapshot(state.graph) === state.baseline
      && !state.graph.validationIssues.some((issue) => issue.severity === "error")
  },
  actions: {
    activatePreviewTarget(ownerToken: symbol, dataDocumentId: string) {
      if (this.targetOwnerToken === ownerToken && this.targetDataDocumentId === dataDocumentId) return;
      this.targetOwnerGeneration += 1;
      this.targetOwnerToken = ownerToken;
      this.targetDataDocumentId = dataDocumentId;
    },
    releasePreviewTarget(ownerToken: symbol) {
      if (this.targetOwnerToken !== ownerToken) return;
      this.targetOwnerGeneration += 1;
      this.targetOwnerToken = undefined;
      this.targetDataDocumentId = "";
    },
    setTargetDataDocumentId(dataDocumentId: string) {
      this.targetDataDocumentId = dataDocumentId;
    },
    ensureCanonicalGraph() {
      if (this.graph) this.graph = migrateGraphAliases(this.graph);
    },
    startNewGraph() {
      if (this.saving) return;
      // Keep an in-progress, unsaved new draft (e.g. after a page reload) instead of wiping it.
      if (this.graph && !this.isPersisted && this.isDirty) return;
      this.relAliases = [];
      this.links = [];
      this.removedFieldSeqIds = [];
      this.removedConditionSeqIds = [];
      this.isPersisted = false;
      this.idLocked = false;
      this.loadedDataDocumentId = "";
      this.loadError = undefined;
      this.loadErrorDataDocumentId = "";
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
      if (this.saving) return;
      if (!this.graph) return;
      this.ensureCanonicalGraph();
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
        links: this.links,
        relationshipMetadata: this.graph.relationshipMetadata,
        aliasesAreCanonical: true,
        preservedAliasValidationIssues: this.graph.aliasValidationIssues
      });
    },
    async fetchGraph(dataDocumentId: string, options: { force?: boolean } = {}) {
      this.setTargetDataDocumentId(dataDocumentId);
      // Preserve an in-progress unsaved draft for this same document (reload survival).
      if (!options.force && this.graph?.dataDocumentId === dataDocumentId && this.isDirty) {
        return this.graph;
      }
      const requestId = this.graphRequestId + 1;
      const targetOwnerGeneration = this.targetOwnerGeneration;
      this.graphRequestId = requestId;
      this.graphRequestDataDocumentId = dataDocumentId;
      this.loading = true;
      this.loadError = undefined;
      this.loadErrorDataDocumentId = dataDocumentId;
      const dataDocumentStore = useDataDocumentStore();
      const ownsRequest = () => this.graphRequestId === requestId
        && this.graphRequestDataDocumentId === dataDocumentId
        && this.targetDataDocumentId === dataDocumentId
        && this.targetOwnerGeneration === targetOwnerGeneration;
      try {
        const document = await dataDocumentStore.fetchDataDocument(dataDocumentId);
        const relAliases = document.relAliases || [];
        const links = document.links || [];
        const relationshipMetadata = await hydrateRelationshipMetadata(
          String(document.primaryEntityName || "").trim(),
          document.fields || []
        );
        const graph = projectDataDocumentGraph({
          document,
          fields: document.fields || [],
          conditions: document.conditions || [],
          relAliases,
          links,
          relationshipMetadata
        });
        if (!ownsRequest()) return this.graph;
        this.relAliases = relAliases;
        this.links = links;
        this.removedFieldSeqIds = [];
        this.removedConditionSeqIds = [];
        this.graph = graph;
        this.loadedDataDocumentId = dataDocumentId;
        this.isPersisted = true;
        this.idLocked = true;
        this.baseline = graphSnapshot(this.graph);
      } catch (error) {
        if (ownsRequest()) {
          this.loadError = error;
          this.loadErrorDataDocumentId = dataDocumentId;
        }
        throw error;
      } finally {
        if (ownsRequest()) this.loading = false;
      }
      return this.graph;
    },
    updateField(fieldSeqId: string | undefined, fieldPath: string, patch: Record<string, any>) {
      if (this.saving) return;
      if (!this.graph) return;
      this.ensureCanonicalGraph();
      if (!this.graph) return;
      const aliasIssueFieldIdsToClear: string[] = [];
      this.graph.fields = this.graph.fields.map((field) => {
        const isMatchingField = matchesField(field, fieldSeqId, fieldPath);
        const nextPatch = shouldDefaultFieldAlias(field, patch)
          ? { ...patch, fieldNameAlias: getTerminalFieldName(patch.fieldPath) }
          : patch;
        const fieldAliasValidationIdentity = getFieldAliasValidationIdentity(field);
        if (isMatchingField && "fieldNameAlias" in nextPatch && fieldAliasValidationIdentity) {
          aliasIssueFieldIdsToClear.push(fieldAliasValidationIdentity);
        }
        return isMatchingField ? { ...field, ...canonicalizeFieldPatch(nextPatch) } : field;
      });
      const preservedAliasValidationIssues = withoutAliasValidationIssues(
        this.graph.aliasValidationIssues,
        "field",
        aliasIssueFieldIdsToClear,
        ["fieldNameAlias"]
      );
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links,
        relationshipMetadata: this.graph.relationshipMetadata,
        aliasesAreCanonical: true,
        preservedAliasValidationIssues
      });
    },
    addField(nodeId: string, fieldName = "newField") {
      if (this.saving) return;
      if (!this.graph) return;
      this.ensureCanonicalGraph();
      if (!this.graph) return;
      const node = this.graph.nodes.find((item) => item.nodeId === nodeId);
      if (!node) return;
      const fieldPath = node.relationshipPath.length ? `${node.relationshipPath.join(":")}:${fieldName}` : fieldName;
      return this.addFieldPath(fieldPath, fieldName);
    },
    addFieldPath(fieldPath: string, alias?: string) {
      if (this.saving) return;
      if (!this.graph) return;
      this.ensureCanonicalGraph();
      if (!this.graph) return;
      const fieldName = getTerminalFieldName(fieldPath) || NEW_FIELD_PLACEHOLDER;
      const field: DataDocumentFieldRecord = {
        dataDocumentId: this.graph.dataDocumentId,
        // Empty until the server assigns one on save; mirrors how new conditions work.
        fieldSeqId: "",
        localId: `field-${Date.now()}-${this.graph.fields.length}`,
        fieldPath,
        fieldNameAlias: canonicalizeDataDocumentAlias(alias || (fieldPath ? fieldName : "")),
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
        links: this.links,
        relationshipMetadata: this.graph.relationshipMetadata,
        aliasesAreCanonical: true,
        preservedAliasValidationIssues: this.graph.aliasValidationIssues
      });
      return field;
    },
    removeField(fieldSeqIdOrPath: string) {
      if (this.saving) return;
      if (!this.graph) return;
      this.ensureCanonicalGraph();
      if (!this.graph) return;
      // Match on the projected (possibly synthetic) id the UI holds, then record the
      // persisted seq id so saveGraph can delete it server-side.
      const removed = this.graph.fields.find((field) => matchesField(field, fieldSeqIdOrPath, fieldSeqIdOrPath));
      const survivors = this.graph.fields.filter((field) => field !== removed);
      const persistedSeqId = removed?.sourceRecord?.fieldSeqId;
      if (persistedSeqId) this.removedFieldSeqIds.push(persistedSeqId);
      const preservedAliasValidationIssues = withoutAliasValidationIssues(
        this.graph.aliasValidationIssues,
        "field",
        removed ? [getFieldAliasValidationIdentity(removed)] : [],
        ["fieldNameAlias"]
      );
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields({ dataDocumentId: this.graph.dataDocumentId, fields: survivors }),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links,
        relationshipMetadata: this.graph.relationshipMetadata,
        aliasesAreCanonical: true,
        preservedAliasValidationIssues
      });
    },
    addCondition(condition: any) {
      if (this.saving) return undefined;
      if (!this.graph) return undefined;
      this.ensureCanonicalGraph();
      if (!this.graph) return undefined;
      const conditionPayload = canonicalizeConditionPatch(condition && typeof condition === "object" ? condition : {});
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
        links: this.links,
        relationshipMetadata: this.graph.relationshipMetadata,
        aliasesAreCanonical: true,
        preservedAliasValidationIssues: this.graph.aliasValidationIssues
      });
    },
    updateCondition(conditionId: string | undefined, patch: Record<string, any>) {
      if (this.saving) return;
      if (!this.graph) return;
      this.ensureCanonicalGraph();
      if (!this.graph) return;
      const matchingCondition = this.graph.conditions.find((condition) => condition.conditionSeqId === conditionId || condition.localId === conditionId);
      const matchingConditionId = matchingCondition?.conditionSeqId || matchingCondition?.localId;
      const conditionPatch = canonicalizeConditionPatch(patch);
      if ("fieldNameAlias" in patch && !("targetId" in patch)) {
        const targetField = this.graph.fields.find((field) => field.outputName === conditionPatch.fieldNameAlias);
        conditionPatch.targetId = targetField ? getFieldAliasValidationIdentity(targetField) : undefined;
      }
      if ("toFieldNameAlias" in patch && !("toTargetId" in patch)) {
        const toTargetField = this.graph.fields.find((field) => field.outputName === conditionPatch.toFieldNameAlias);
        conditionPatch.toTargetId = toTargetField ? getFieldAliasValidationIdentity(toTargetField) : undefined;
      }
      const replacedAliasProperties = (["fieldNameAlias", "toFieldNameAlias"] as const)
        .filter((property) => property in patch);
      this.graph.conditions = this.graph.conditions.map((condition) => (
        condition.conditionSeqId === conditionId || condition.localId === conditionId ? { ...condition, ...conditionPatch } : condition
      ));
      const preservedAliasValidationIssues = withoutAliasValidationIssues(
        this.graph.aliasValidationIssues,
        "condition",
        matchingConditionId ? [matchingConditionId] : [],
        replacedAliasProperties
      );
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph),
        relAliases: this.relAliases,
        links: this.links,
        relationshipMetadata: this.graph.relationshipMetadata,
        aliasesAreCanonical: true,
        preservedAliasValidationIssues
      });
    },
    removeCondition(conditionId: string) {
      if (this.saving) return;
      if (!this.graph) return;
      this.ensureCanonicalGraph();
      if (!this.graph) return;
      const removed = this.graph.conditions.find((c) => c.conditionSeqId === conditionId || c.localId === conditionId);
      const removedConditionId = removed?.conditionSeqId || removed?.localId;
      if (removed?.conditionSeqId) this.removedConditionSeqIds.push(removed.conditionSeqId);
      const preservedAliasValidationIssues = withoutAliasValidationIssues(
        this.graph.aliasValidationIssues,
        "condition",
        removedConditionId ? [removedConditionId] : [],
        ["fieldNameAlias", "toFieldNameAlias"]
      );
      this.graph = projectDataDocumentGraph({
        document: this.graph.metadata,
        fields: serializeGraphFields(this.graph),
        conditions: serializeGraphConditions(this.graph).filter((c) => c.conditionSeqId !== conditionId && c.localId !== conditionId),
        relAliases: this.relAliases,
        links: this.links,
        relationshipMetadata: this.graph.relationshipMetadata,
        aliasesAreCanonical: true,
        preservedAliasValidationIssues
      });
    },
    saveGraph() {
      if (!this.graph) return Promise.resolve(undefined);
      this.ensureCanonicalGraph();
      if (!this.graph) return Promise.resolve(undefined);
      const graphErrors = validateDataDocumentGraph(this.graph)
        .filter((issue) => issue.severity === "error");
      if (graphErrors.length) {
        return Promise.reject(new Error(Array.from(new Set(graphErrors.map((issue) => issue.message))).join(" ")));
      }
      this.saving = true;
      const saveOperation = (async () => {
        const dataDocumentStore = useDataDocumentStore();
        // Tracks the document id once the parent is saved, so a mid-loop failure can re-sync
        // from the server (avoiding duplicate child rows on retry — new children carry an empty
        // seqId and would otherwise be POSTed again).
        let savedDataDocumentId = "";
        let fieldsToSave: DataDocumentFieldRecord[] = [];
        let conditionsToSave: DataDocumentConditionRecord[] = [];
        let nextFieldIndex = 0;
        let nextConditionIndex = 0;
        let pendingFieldRemovals = [...this.removedFieldSeqIds];
        let pendingConditionRemovals = [...this.removedConditionSeqIds];
        let persistenceComplete = false;
        try {
          const savedDoc = await dataDocumentStore.saveDataDocument(this.graph!.metadata);
          // The backend auto-generates (or normalizes) the id when it is blank — adopt it
          // before saving child fields/conditions so they attach to the right document.
          const dataDocumentId = savedDoc?.dataDocumentId || this.graph!.dataDocumentId;
          savedDataDocumentId = dataDocumentId;
          if (dataDocumentId !== this.graph!.dataDocumentId) {
            this.graph = projectDataDocumentGraph({
              document: { ...this.graph!.metadata, dataDocumentId },
              fields: serializeGraphFields(this.graph!).map((field) => ({ ...field, dataDocumentId })),
              conditions: serializeGraphConditions(this.graph!).map((condition) => ({ ...condition, dataDocumentId })),
              relAliases: this.relAliases,
              links: this.links,
              relationshipMetadata: this.graph!.relationshipMetadata,
              aliasesAreCanonical: true,
              preservedAliasValidationIssues: this.graph!.aliasValidationIssues
            });
          }
          this.isPersisted = true;
          this.idLocked = true;
          fieldsToSave = serializeGraphFields(this.graph!);
          conditionsToSave = serializeGraphConditions(this.graph!);
          for (; nextFieldIndex < fieldsToSave.length; nextFieldIndex += 1) {
            const field = fieldsToSave[nextFieldIndex];
            const savedField = await dataDocumentStore.saveField(dataDocumentId, stripGraphFields(field));
            acknowledgeSavedField(this.graph!, field, savedField, dataDocumentId);
          }
          for (; nextConditionIndex < conditionsToSave.length; nextConditionIndex += 1) {
            const condition = conditionsToSave[nextConditionIndex];
            const savedCondition = await dataDocumentStore.saveCondition(dataDocumentId, stripGraphFields(condition));
            acknowledgeSavedCondition(this.graph!, condition, savedCondition, dataDocumentId);
          }
          // The document API has no bulk-replace: fields/conditions removed in the builder
          // must be explicitly deleted, otherwise they reappear after the post-save refetch.
          for (const fieldSeqId of [...pendingFieldRemovals]) {
            await dataDocumentStore.deleteField(dataDocumentId, fieldSeqId);
            pendingFieldRemovals = pendingFieldRemovals.filter((pendingId) => pendingId !== fieldSeqId);
            this.removedFieldSeqIds = this.removedFieldSeqIds.filter((pendingId) => pendingId !== fieldSeqId);
          }
          for (const conditionSeqId of [...pendingConditionRemovals]) {
            await dataDocumentStore.deleteCondition(dataDocumentId, conditionSeqId);
            pendingConditionRemovals = pendingConditionRemovals.filter((pendingId) => pendingId !== conditionSeqId);
            this.removedConditionSeqIds = this.removedConditionSeqIds.filter((pendingId) => pendingId !== conditionSeqId);
          }
          this.removedFieldSeqIds = [];
          this.removedConditionSeqIds = [];
          persistenceComplete = true;
          // force the refetch past the dirty-draft guard so state re-syncs with the server.
          await this.fetchGraph(dataDocumentId, { force: true });
          return dataDocumentId;
        } catch (error) {
          logger.error(`Failed to save data document graph ${this.graph?.dataDocumentId}`, error);
          // If the document was created/updated but a child save failed partway, re-sync from
          // the server so a retry PUTs the rows that already exist instead of creating duplicates.
          if (savedDataDocumentId && !persistenceComplete) {
            const pendingFields = fieldsToSave.slice(nextFieldIndex);
            const pendingConditions = conditionsToSave.slice(nextConditionIndex);
            try {
              await this.fetchGraph(savedDataDocumentId, { force: true });
              this.removedFieldSeqIds = [...pendingFieldRemovals];
              this.removedConditionSeqIds = [...pendingConditionRemovals];
              if (this.graph && (
                pendingFields.length
                || pendingConditions.length
                || pendingFieldRemovals.length
                || pendingConditionRemovals.length
              )) {
                this.graph = projectDataDocumentGraph({
                  document: this.graph.metadata,
                  fields: mergePendingChildRecords(
                    serializeGraphFields(this.graph).filter((field) => !pendingFieldRemovals.includes(String(field.fieldSeqId || ""))),
                    pendingFields,
                    "fieldSeqId"
                  ),
                  conditions: mergePendingChildRecords(
                    serializeGraphConditions(this.graph).filter((condition) => !pendingConditionRemovals.includes(String(condition.conditionSeqId || ""))),
                    pendingConditions,
                    "conditionSeqId"
                  ),
                  relAliases: this.relAliases,
                  links: this.links,
                  feeds: this.graph.feeds,
                  relationshipMetadata: this.graph.relationshipMetadata,
                  aliasesAreCanonical: true,
                  preservedAliasValidationIssues: this.graph.aliasValidationIssues
                });
              }
            } catch (refetchError) {
              logger.error(`Failed to re-sync data document graph after a save error`, refetchError);
            }
          }
          throw error;
        } finally {
          this.saving = false;
        }
      })();
      return saveOperation;
    },
    // Drop the in-progress draft (used when the user chooses "Discard" on the unsaved-changes
    // prompt). Clearing state lets the next builder visit fetch a clean copy from the server.
    discardDraft() {
      if (this.saving) return;
      this.graph = undefined;
      this.loadedDataDocumentId = "";
      this.loadError = undefined;
      this.loadErrorDataDocumentId = "";
      this.baseline = "";
      this.targetOwnerGeneration += 1;
      this.targetOwnerToken = undefined;
      this.targetDataDocumentId = "";
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

const singleFlightStores = new WeakSet<object>();
const saveGraphInFlight = new WeakMap<object, Promise<string | undefined>>();

export const useDataDocumentGraphStore: typeof useDataDocumentGraphPiniaStore = Object.assign(
  ((...args: Parameters<typeof useDataDocumentGraphPiniaStore>) => {
    const store = useDataDocumentGraphPiniaStore(...args);
    if (singleFlightStores.has(store)) return store;

    store.$subscribe((_mutation, state) => {
      const dataDocumentStore = useDataDocumentStore();
      const previewOwner = dataDocumentStore.getPreviewOwner;
      if (!previewOwner) return;

      const activeDataDocumentId = state.graph?.dataDocumentId || "";
      const activeGraphDiverged = !!state.graph && graphSnapshot(state.graph) !== state.baseline;
      if (
        !state.isPersisted
        || !state.graph
        || activeGraphDiverged
        || !state.targetOwnerToken
        || dataDocumentStore.getPreviewTargetGeneration !== state.targetOwnerGeneration
        || state.targetDataDocumentId !== activeDataDocumentId
        || previewOwner.dataDocumentId !== activeDataDocumentId
        || previewOwner.savedRevision !== state.baseline
      ) {
        dataDocumentStore.resetPreview();
      }
    }, { flush: "sync" });

    const performSaveGraph = store.saveGraph.bind(store);
    store.saveGraph = (() => {
      const inFlight = saveGraphInFlight.get(store);
      if (inFlight) return inFlight;

      // Pinia wraps action promises for $onAction hooks. Cache outside that wrapper so
      // callers receive the exact same Promise object as well as the same settlement.
      let sharedSave: Promise<string | undefined>;
      sharedSave = performSaveGraph().finally(() => {
        if (saveGraphInFlight.get(store) === sharedSave) saveGraphInFlight.delete(store);
      });
      saveGraphInFlight.set(store, sharedSave);
      return sharedSave;
    }) as typeof store.saveGraph;
    singleFlightStores.add(store);
    return store;
  }) as typeof useDataDocumentGraphPiniaStore,
  { $id: useDataDocumentGraphPiniaStore.$id }
);
