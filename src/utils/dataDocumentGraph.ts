export type DataDocumentRecord = Record<string, any> & {
  dataDocumentId?: string;
  primaryEntityName?: string;
};

export type DataDocumentFieldRecord = Record<string, any> & {
  dataDocumentId?: string;
  fieldSeqId?: string;
  fieldPath?: string;
  fieldNameAlias?: string;
  sequenceNum?: number | string;
  defaultDisplay?: "Y" | "N" | string;
  sortable?: "Y" | "N" | string;
  functionName?: string;
};

export type DataDocumentConditionRecord = Record<string, any> & {
  dataDocumentId?: string;
  conditionSeqId?: string;
  fieldNameAlias?: string;
  operator?: string;
  value?: string;
  fieldValue?: string;
  toFieldNameAlias?: string;
  postQuery?: "Y" | "N" | string;
};

export type DataDocumentRelAliasRecord = Record<string, any> & {
  dataDocumentId?: string;
  relAlias?: string;
  relationshipName?: string;
  fieldPath?: string;
};

export type DataDocumentLinkRecord = Record<string, any> & {
  dataDocumentId?: string;
  linkSeqId?: string;
  linkUrl?: string;
};

export type DataFeedDocumentRecord = Record<string, any> & {
  dataDocumentId?: string;
  dataFeedId?: string;
};

export type GraphMetadataStatus = "verified" | "unverified" | "missing";
export type GraphRelationshipType = "one" | "many" | "unknown";
export type GraphValidationSeverity = "error" | "warning" | "info";

export type GraphNode = {
  nodeId: string;
  entityName: string;
  label: string;
  relationshipPath: string[];
  pathText: string;
  isPrimary: boolean;
  relationshipType?: GraphRelationshipType;
  fieldCount: number;
  conditionCount: number;
  metadataStatus: GraphMetadataStatus;
};

export type GraphEdge = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipName: string;
  relationshipTitle?: string;
  pathText: string;
  relationshipType: GraphRelationshipType;
  joinSummary?: string;
  conditionCount: number;
  alias?: string;
  metadataStatus: GraphMetadataStatus;
};

export type GraphField = {
  dataDocumentId: string;
  fieldSeqId?: string;
  nodeId: string;
  fieldPath: string;
  fieldName: string;
  outputName: string;
  fieldNameAlias?: string;
  sequenceNum?: number | string;
  defaultDisplay?: "Y" | "N" | string;
  sortable?: "Y" | "N" | string;
  functionName?: string;
  isManualPath: boolean;
  sourceRecord?: DataDocumentFieldRecord;
};

export type GraphCondition = {
  dataDocumentId: string;
  conditionSeqId?: string;
  targetKind: "field" | "edge" | "document";
  targetId?: string;
  fieldNameAlias: string;
  operator: string;
  fieldValue?: string;
  toFieldNameAlias?: string;
  postQuery?: "Y" | "N" | string;
  sourceRecord?: DataDocumentConditionRecord;
};

export type GraphValidationIssue = {
  code: string;
  severity: GraphValidationSeverity;
  message: string;
  targetKind?: "document" | "node" | "edge" | "field" | "condition" | "link";
  targetId?: string;
};

export type RelationshipMetadata = {
  pathText?: string;
  relationshipName?: string;
  relationshipTitle?: string;
  entityName?: string;
  label?: string;
  relationshipType?: GraphRelationshipType;
  joinSummary?: string;
  alias?: string;
  verified?: boolean;
};

export type DataDocumentGraph = {
  dataDocumentId: string;
  metadata: DataDocumentRecord;
  nodes: GraphNode[];
  edges: GraphEdge[];
  fields: GraphField[];
  conditions: GraphCondition[];
  relAliases: DataDocumentRelAliasRecord[];
  links: DataDocumentLinkRecord[];
  feeds: DataFeedDocumentRecord[];
  validationIssues: GraphValidationIssue[];
};

export type ProjectDataDocumentGraphInput = {
  document: DataDocumentRecord;
  fields?: DataDocumentFieldRecord[];
  conditions?: DataDocumentConditionRecord[];
  relAliases?: DataDocumentRelAliasRecord[];
  links?: DataDocumentLinkRecord[];
  feeds?: DataFeedDocumentRecord[];
  relationshipMetadata?: Record<string, RelationshipMetadata>;
};

export type DataDocumentRunQuery = {
  selectedFields?: string[];
  filters?: Array<{
    fieldNameAlias?: string;
    operator?: string;
    value?: any;
  }>;
  sort?: Array<{
    fieldNameAlias?: string;
    direction?: "ASC" | "DESC" | string;
  }>;
  distinct?: boolean;
  pageSize?: number;
  format?: string;
};

const ROOT_NODE_ID = "node:root";

const compact = <T extends Record<string, any>>(record: T) => {
  return Object.entries(record).reduce((cleanRecord: Record<string, any>, [key, value]) => {
    if (value !== undefined) cleanRecord[key] = value;
    return cleanRecord;
  }, {}) as T;
};

const operatorAliases: Record<string, string> = {
  "greater-than": "greater",
  "greater-than-equal-to": "greater-equals",
  "less-than": "less",
  "less-than-equal-to": "less-equals",
  "in-list": "in",
  "is-empty": "empty",
  "is-not-empty": "not-empty"
};

export const normalizeDataDocumentOperator = (operator?: string) => {
  const normalizedOperator = String(operator || "");
  return operatorAliases[normalizedOperator] || normalizedOperator;
};

const getDataDocumentId = (document: DataDocumentRecord, fields: DataDocumentFieldRecord[]) => {
  return String(document.dataDocumentId || fields.find((field) => field.dataDocumentId)?.dataDocumentId || "");
};

const splitFieldPath = (fieldPath: string) => {
  const segments = fieldPath.split(":");
  const fieldName = segments.pop() || "";
  return {
    relationshipSegments: segments,
    fieldName
  };
};

const toNodeId = (relationshipSegments: string[]) => {
  return relationshipSegments.length ? `node:${relationshipSegments.join(":")}` : ROOT_NODE_ID;
};

const toEdgeId = (relationshipSegments: string[]) => `edge:${relationshipSegments.join(":")}`;

const getRelationshipTitle = (segment: string) => {
  const hashIndex = segment.indexOf("#");
  return hashIndex > -1 ? segment.slice(0, hashIndex) : undefined;
};

const getRelationshipName = (segment: string) => {
  const hashIndex = segment.indexOf("#");
  return hashIndex > -1 ? segment.slice(hashIndex + 1) : segment;
};

const getLabel = (value: string) => {
  const relationshipName = getRelationshipName(value);
  const pieces = relationshipName.split(".");
  return pieces[pieces.length - 1] || relationshipName || "Unknown";
};

const resolveRelationshipMetadata = (
  relationshipMetadata: Record<string, RelationshipMetadata>,
  pathText: string,
  segment: string
) => relationshipMetadata[pathText] || relationshipMetadata[segment];

const getOutputName = (field: DataDocumentFieldRecord, fieldName: string) => field.fieldNameAlias || fieldName;

const addValidationIssue = (
  validationIssues: GraphValidationIssue[],
  issue: GraphValidationIssue
) => {
  validationIssues.push(issue);
};

export const parseDataDocumentFieldPath = (fieldPath: string) => splitFieldPath(fieldPath);

export const projectDataDocumentGraph = ({
  document,
  fields = [],
  conditions = [],
  relAliases = [],
  links = [],
  feeds = [],
  relationshipMetadata = {}
}: ProjectDataDocumentGraphInput): DataDocumentGraph => {
  const dataDocumentId = getDataDocumentId(document, fields);
  const validationIssues: GraphValidationIssue[] = [];
  const nodesById = new Map<string, GraphNode>();
  const edgesById = new Map<string, GraphEdge>();

  const rootNode: GraphNode = {
    nodeId: ROOT_NODE_ID,
    entityName: document.primaryEntityName || "",
    label: document.primaryEntityName ? getLabel(document.primaryEntityName) : "Primary entity",
    relationshipPath: [],
    pathText: "",
    isPrimary: true,
    relationshipType: "one",
    fieldCount: 0,
    conditionCount: 0,
    metadataStatus: document.primaryEntityName ? "verified" : "missing"
  };
  nodesById.set(rootNode.nodeId, rootNode);

  if (!dataDocumentId) {
    addValidationIssue(validationIssues, {
      code: "missing_document_id",
      severity: "error",
      message: "Data document ID is required.",
      targetKind: "document"
    });
  }

  if (!document.primaryEntityName) {
    addValidationIssue(validationIssues, {
      code: "missing_primary_entity",
      severity: "error",
      message: "Primary entity is required.",
      targetKind: "document"
    });
  }

  const graphFields = fields.map((field, index) => {
    const fieldPath = String(field.fieldPath || "");
    const { relationshipSegments, fieldName } = splitFieldPath(fieldPath);

    if (!fieldName) {
      addValidationIssue(validationIssues, {
        code: "missing_terminal_field",
        severity: "error",
        message: `Field path "${fieldPath}" does not include a terminal field.`,
        targetKind: "field",
        targetId: field.fieldSeqId
      });
    }

    relationshipSegments.forEach((segment, segmentIndex) => {
      const currentPath = relationshipSegments.slice(0, segmentIndex + 1);
      const previousPath = relationshipSegments.slice(0, segmentIndex);
      const pathText = currentPath.join(":");
      const metadata = resolveRelationshipMetadata(relationshipMetadata, pathText, segment);
      const metadataStatus: GraphMetadataStatus = metadata?.verified === false
        ? "unverified"
        : metadata
          ? "verified"
          : "unverified";
      const nodeId = toNodeId(currentPath);

      if (!nodesById.has(nodeId)) {
        nodesById.set(nodeId, {
          nodeId,
          entityName: metadata?.entityName || getRelationshipName(segment),
          label: metadata?.label || getLabel(segment),
          relationshipPath: currentPath,
          pathText,
          isPrimary: false,
          relationshipType: metadata?.relationshipType || "unknown",
          fieldCount: 0,
          conditionCount: 0,
          metadataStatus
        });
      }

      const edgeId = toEdgeId(currentPath);
      if (!edgesById.has(edgeId)) {
        edgesById.set(edgeId, {
          edgeId,
          fromNodeId: toNodeId(previousPath),
          toNodeId: nodeId,
          relationshipName: metadata?.relationshipName || getRelationshipName(segment),
          relationshipTitle: metadata?.relationshipTitle || getRelationshipTitle(segment),
          pathText,
          relationshipType: metadata?.relationshipType || "unknown",
          joinSummary: metadata?.joinSummary,
          conditionCount: 0,
          alias: metadata?.alias,
          metadataStatus
        });
      }

      if (!metadata) {
        addValidationIssue(validationIssues, {
          code: "unverified_relationship_path",
          severity: "warning",
          message: `Relationship path segment "${segment}" could not be verified.`,
          targetKind: "edge",
          targetId: edgeId
        });
      }
    });

    const nodeId = toNodeId(relationshipSegments);
    const outputName = getOutputName(field, fieldName);
    const graphField: GraphField = {
      dataDocumentId,
      fieldSeqId: field.fieldSeqId,
      nodeId,
      fieldPath,
      fieldName,
      outputName,
      fieldNameAlias: field.fieldNameAlias,
      sequenceNum: field.sequenceNum,
      defaultDisplay: field.defaultDisplay,
      sortable: field.sortable,
      functionName: field.functionName,
      isManualPath: relationshipSegments.some((segment, segmentIndex) => {
        const pathText = relationshipSegments.slice(0, segmentIndex + 1).join(":");
        return !resolveRelationshipMetadata(relationshipMetadata, pathText, segment);
      }),
      sourceRecord: field
    };

    const targetNode = nodesById.get(nodeId);
    if (targetNode) targetNode.fieldCount += 1;

    if (!field.fieldSeqId) graphField.fieldSeqId = String((index + 1) * 10);

    return graphField;
  });

  const fieldByOutputName = new Map<string, GraphField[]>();
  graphFields.forEach((field) => {
    if (!field.outputName) return;
    fieldByOutputName.set(field.outputName, (fieldByOutputName.get(field.outputName) || []).concat(field));
  });

  fieldByOutputName.forEach((matchingFields, outputName) => {
    if (matchingFields.length > 1) {
      matchingFields.forEach((field) => {
        addValidationIssue(validationIssues, {
          code: "duplicate_output_name",
          severity: "error",
          message: `Output field name "${outputName}" is used by more than one field.`,
          targetKind: "field",
          targetId: field.fieldSeqId
        });
      });
    }
  });

  const graphConditions = conditions.map((condition) => {
    const fieldNameAlias = String(condition.fieldNameAlias || "");
    const targetField = graphFields.find((field) => field.outputName === fieldNameAlias || field.fieldNameAlias === fieldNameAlias);
    const graphCondition: GraphCondition = {
      dataDocumentId,
      conditionSeqId: condition.conditionSeqId,
      targetKind: targetField ? "field" : "document",
      targetId: targetField?.fieldSeqId,
      fieldNameAlias,
      operator: normalizeDataDocumentOperator(condition.operator),
      fieldValue: condition.fieldValue ?? condition.value,
      toFieldNameAlias: condition.toFieldNameAlias,
      postQuery: condition.postQuery,
      sourceRecord: condition
    };

    if (targetField) {
      const targetNode = nodesById.get(targetField.nodeId);
      if (targetNode) targetNode.conditionCount += 1;
    } else {
      addValidationIssue(validationIssues, {
        code: "missing_condition_field_alias",
        severity: "error",
        message: `Condition references missing field alias "${fieldNameAlias}".`,
        targetKind: "condition",
        targetId: condition.conditionSeqId
      });
    }

    return graphCondition;
  });

  return {
    dataDocumentId,
    metadata: document,
    nodes: Array.from(nodesById.values()),
    edges: Array.from(edgesById.values()),
    fields: graphFields,
    conditions: graphConditions,
    relAliases,
    links,
    feeds,
    validationIssues
  };
};

export const validateDataDocumentGraph = (graph: DataDocumentGraph) => {
  return projectDataDocumentGraph({
    document: graph.metadata,
    fields: serializeGraphFields(graph),
    conditions: serializeGraphConditions(graph),
    relAliases: graph.relAliases,
    links: graph.links,
    feeds: graph.feeds
  }).validationIssues;
};

export const serializeGraphFields = (graph: Pick<DataDocumentGraph, "dataDocumentId" | "fields">) => {
  return graph.fields.map((field) => compact({
    ...(field.sourceRecord || {}),
    dataDocumentId: field.dataDocumentId || graph.dataDocumentId,
    fieldSeqId: field.fieldSeqId,
    fieldPath: field.fieldPath,
    fieldNameAlias: field.fieldNameAlias,
    sequenceNum: field.sequenceNum,
    defaultDisplay: field.defaultDisplay,
    sortable: field.sortable,
    functionName: field.functionName
  }));
};

export const serializeGraphConditions = (graph: Pick<DataDocumentGraph, "dataDocumentId" | "conditions">) => {
  return graph.conditions.map((condition) => compact({
    ...(condition.sourceRecord || {}),
    dataDocumentId: condition.dataDocumentId || graph.dataDocumentId,
    conditionSeqId: condition.conditionSeqId,
    fieldNameAlias: condition.fieldNameAlias,
    operator: normalizeDataDocumentOperator(condition.operator),
    fieldValue: condition.fieldValue,
    toFieldNameAlias: condition.toFieldNameAlias,
    postQuery: condition.postQuery
  }));
};

export const serializeDataDocumentGraph = (graph: DataDocumentGraph) => ({
  document: graph.metadata,
  fields: serializeGraphFields(graph),
  conditions: serializeGraphConditions(graph),
  relAliases: graph.relAliases,
  links: graph.links,
  feeds: graph.feeds
});

export const buildDataDocumentPreviewPayload = (
  dataDocumentId: string,
  query: DataDocumentRunQuery = {},
  graph?: Pick<DataDocumentGraph, "fields">
) => {
  const selectedFields = query.selectedFields?.length
    ? query.selectedFields
    : graph?.fields
      .filter((field) => field.defaultDisplay !== "N")
      .map((field) => field.outputName) || [];
  const customParametersMap = (query.filters || []).reduce((parameters: Record<string, any>, filter) => {
    if (filter.fieldNameAlias && filter.value !== undefined && filter.value !== "") {
      parameters[filter.fieldNameAlias] = filter.value;
    }
    return parameters;
  }, {});

  return compact({
    dataDocumentId,
    fieldsToSelect: selectedFields,
    customParametersMap,
    orderByField: query.sort?.[0]?.fieldNameAlias
      ? `${query.sort[0].direction === "DESC" ? "-" : ""}${query.sort[0].fieldNameAlias}`
      : undefined,
    distinct: !!query.distinct,
    pageSize: Number(query.pageSize || 25)
  });
};

export const buildDataDocumentExportPayload = (
  dataDocumentId: string,
  query: DataDocumentRunQuery = {},
  graph?: Pick<DataDocumentGraph, "fields">
) => compact({
  ...buildDataDocumentPreviewPayload(dataDocumentId, query, graph),
  format: query.format || "csv"
});
