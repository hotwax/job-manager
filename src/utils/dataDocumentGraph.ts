export type DataDocumentRecord = Record<string, any> & {
  dataDocumentId?: string;
  primaryEntityName?: string;
};

export type DataDocumentFieldRecord = Record<string, any> & {
  dataDocumentId?: string;
  fieldSeqId?: string;
  localId?: string;
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
  localId?: string;
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
  isAutoReverse?: boolean;
  metadataStatus: GraphMetadataStatus;
};

export type GraphField = {
  dataDocumentId: string;
  fieldSeqId?: string;
  localId?: string;
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
  localId?: string;
  targetKind: "field" | "edge" | "document";
  targetId?: string;
  toTargetId?: string;
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
  aliasProperty?: "fieldNameAlias" | "toFieldNameAlias";
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
  isAutoReverse?: boolean;
  verified?: boolean;
  attempted?: boolean;
};

export type DataDocumentGraph = {
  dataDocumentId: string;
  // Stored drafts before alias canonicalization do not have this marker. The store uses it
  // as a one-time migration boundary before serializing or saving a restored graph.
  aliasesCanonical: boolean;
  // Persisted separately from canonical aliases, so invalid external input remains blocked
  // through unrelated graph re-projections until that specific alias is replaced.
  aliasValidationIssues: GraphValidationIssue[];
  metadata: DataDocumentRecord;
  nodes: GraphNode[];
  edges: GraphEdge[];
  fields: GraphField[];
  conditions: GraphCondition[];
  relAliases: DataDocumentRelAliasRecord[];
  links: DataDocumentLinkRecord[];
  feeds: DataFeedDocumentRecord[];
  relationshipMetadata: Record<string, RelationshipMetadata>;
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
  aliasesAreCanonical?: boolean;
  preservedAliasValidationIssues?: GraphValidationIssue[];
};

// Moqui's `id` dictionary type is VARCHAR(40); DataDocument.dataDocumentId uses that type.
const DATA_DOCUMENT_ID_MAX_LENGTH = 40;

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
  "less-than-equal-to": "less-equals"
};

export const normalizeDataDocumentOperator = (operator?: string) => {
  const normalizedOperator = String(operator || "");
  return operatorAliases[normalizedOperator] || normalizedOperator;
};

// Persisted DataDocumentCondition operators are evaluated by Moqui's
// EntityConditionFactory. Keep this separate from RUNTIME_FILTER_OPERATORS:
// runtime filters use search-form-inputs (_op/_not/_from/_thru), while these
// values are saved directly on the document definition.
export const PERSISTED_CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Not equals" },
  { value: "less", label: "Less than" },
  { value: "greater", label: "Greater than" },
  { value: "less-equals", label: "Less than or equal" },
  { value: "greater-equals", label: "Greater than or equal" },
  { value: "in", label: "In" },
  { value: "not-in", label: "Not in" },
  { value: "not-between", label: "Not between" },
  { value: "like", label: "Like" },
  { value: "not-like", label: "Not like" },
  { value: "is-null", label: "Is null" },
  { value: "is-not-null", label: "Is not null" }
] as const;

const persistedConditionOperatorValues = new Set(PERSISTED_CONDITION_OPERATORS.map((operator) => operator.value));
const persistedNullConditionOperators = new Set(["is-null", "is-not-null"]);

export const isPersistedConditionOperator = (operator?: string) =>
  persistedConditionOperatorValues.has(normalizeDataDocumentOperator(operator) as typeof PERSISTED_CONDITION_OPERATORS[number]["value"]);

export const isPersistedNullConditionOperator = (operator?: string) =>
  persistedNullConditionOperators.has(normalizeDataDocumentOperator(operator));

export type PersistedConditionValidationResult = {
  isValid: boolean;
  issues: GraphValidationIssue[];
};

// This validation result is intentionally reusable by the store, UI, and future
// save orchestration. It prevents a bad stored condition from creating a parent
// DataDocument before a child condition request can be rejected.
export const validatePersistedConditionOperators = (
  conditions: Array<Pick<DataDocumentConditionRecord, "conditionSeqId" | "localId" | "operator"> | Pick<GraphCondition, "conditionSeqId" | "localId" | "operator">>
): PersistedConditionValidationResult => {
  const issues = conditions.flatMap((condition) => {
    if (isPersistedConditionOperator(condition.operator)) return [];
    return [{
      code: "unsupported_persisted_condition_operator",
      severity: "error" as const,
      message: `Unsupported persisted condition operator \"${String(condition.operator || "")}\".`,
      targetKind: "condition" as const,
      targetId: condition.conditionSeqId || condition.localId
    }];
  });
  return { isValid: !issues.length, issues };
};

export const isConditionValueMissing = (operator: string | undefined, fieldValue: any, toFieldNameAlias?: any) => {
  if (!operator) return false;
  const op = normalizeDataDocumentOperator(operator);
  if (op === "empty" || op === "not-empty" || isPersistedNullConditionOperator(op)) return false;
  const val = fieldValue;
  const fieldValueIsBlank = val === undefined || val === null || (typeof val === "string" && val.trim() === "");
  if (!fieldValueIsBlank) return false;
  if (toFieldNameAlias === undefined || toFieldNameAlias === null) return true;
  if (typeof toFieldNameAlias === "string") return toFieldNameAlias.trim() === "";
  return false;
};

// Aggregate functions Moqui supports on a DataDocumentField (FieldInfo.aggFunctionArray).
// A field with one of these is a MEASURE (aggregated); a field with none is a DIMENSION
// (a group-by key). `numericOnly` marks functions that only yield a value on numeric
// columns — sum/avg silently return null on text/date fields.
export type DataDocumentFunction = {
  value: string;
  label: string;
  shortLabel: string;
  numericOnly: boolean;
};

export const DATA_DOCUMENT_FUNCTIONS: DataDocumentFunction[] = [
  { value: "count", label: "Count", shortLabel: "COUNT", numericOnly: false },
  { value: "count-distinct", label: "Count distinct", shortLabel: "DISTINCT", numericOnly: false },
  { value: "sum", label: "Sum", shortLabel: "SUM", numericOnly: true },
  { value: "avg", label: "Average", shortLabel: "AVG", numericOnly: true },
  { value: "min", label: "Minimum", shortLabel: "MIN", numericOnly: false },
  { value: "max", label: "Maximum", shortLabel: "MAX", numericOnly: false }
];

export const isMeasureField = (field?: { functionName?: string }) => !!field?.functionName;

// Runtime filter operators offered to the user. These map onto Moqui's search-form-inputs
// vocabulary (EntityFindBase): _op equals|contains|begins|empty|in, _not to negate, and
// _from/_thru for ranges. There is no strict greater/less in search-form-inputs, so the
// comparison operators map to >= (_from) and <= (_thru).
export const RUNTIME_FILTER_OPERATORS = [
  { value: "equals", label: "Equals", needsValue: true },
  { value: "not-equals", label: "Not equals", needsValue: true },
  { value: "contains", label: "Contains", needsValue: true },
  { value: "starts-with", label: "Starts with", needsValue: true },
  { value: "in", label: "In list (comma-separated)", needsValue: true },
  { value: "empty", label: "Is empty", needsValue: false },
  { value: "not-empty", label: "Is not empty", needsValue: false },
  { value: "greater-equals", label: "Greater than or equal (≥)", needsValue: true },
  { value: "less-equals", label: "Less than or equal (≤)", needsValue: true },
  { value: "between", label: "Between", needsValue: true, needsToValue: true }
];

const hasFilterValue = (value: any) => value !== undefined && value !== null && value !== "";

// Encode runtime UI filters into a Moqui search-form-inputs customParametersMap for
// oms/dataDocumentView. Persisted DataDocumentCondition operators are evaluated by the
// saved document and must not be translated into these runtime parameters.
export const buildCustomParametersMap = (
  filters: Array<{ fieldNameAlias?: string; operator?: string; value?: any; toValue?: any }> = []
) => {
  const map: Record<string, any> = {};
  for (const filter of filters) {
    const field = filter.fieldNameAlias;
    if (!field) continue;
    const op = filter.operator || "equals";
    const value = filter.value;
    switch (op) {
      case "equals":
        if (hasFilterValue(value)) map[field] = value;
        break;
      case "not-equals":
        if (hasFilterValue(value)) { map[field] = value; map[`${field}_op`] = "equals"; map[`${field}_not`] = "Y"; }
        break;
      case "contains":
        if (hasFilterValue(value)) { map[field] = value; map[`${field}_op`] = "contains"; }
        break;
      case "starts-with":
        if (hasFilterValue(value)) { map[field] = value; map[`${field}_op`] = "begins"; }
        break;
      case "in":
        if (hasFilterValue(value)) { map[field] = value; map[`${field}_op`] = "in"; }
        break;
      case "empty":
        map[`${field}_op`] = "empty";
        break;
      case "not-empty":
        map[`${field}_op`] = "empty"; map[`${field}_not`] = "Y";
        break;
      case "greater-equals":
        if (hasFilterValue(value)) map[`${field}_from`] = value;
        break;
      case "less-equals":
        if (hasFilterValue(value)) map[`${field}_thru`] = value;
        break;
      case "between":
        if (hasFilterValue(value)) map[`${field}_from`] = value;
        if (hasFilterValue(filter.toValue)) map[`${field}_thru`] = filter.toValue;
        break;
      default:
        break;
    }
  }
  return map;
};

// Derive a readable PascalCase dataDocumentId from the document name (e.g. "Order Export
// Report" -> "OrderExportReport"), matching Moqui's data document id convention. Returns ""
// for an empty name, in which case the backend auto-generates an id on save.
export const deriveDataDocumentId = (name?: string) =>
  String(name || "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

export const getDataDocumentFunctionLabel = (functionName?: string, short = false) => {
  if (!functionName) return "";
  const fn = DATA_DOCUMENT_FUNCTIONS.find((item) => item.value === functionName);
  if (!fn) return functionName;
  return short ? fn.shortLabel : fn.label;
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

export const normalizeRelationshipKeyMaps = (relationship: any) => {
  if (Array.isArray(relationship?.keyMaps)) {
    const keyMaps = relationship.keyMaps.filter((keyMap: any) => keyMap && typeof keyMap === "object");
    if (keyMaps.length) return keyMaps;
  }
  if (relationship?.keyMap && typeof relationship.keyMap === "object") return [relationship.keyMap];
  return [];
};

const getRelationshipJoinSummary = (relationship: any) => {
  const joinFacts = normalizeRelationshipKeyMaps(relationship)
    .filter((keyMap: any) => keyMap.fieldName && keyMap.relatedFieldName)
    .map((keyMap: any) => `${keyMap.fieldName} = ${keyMap.relatedFieldName}`);
  return joinFacts.length ? joinFacts.join(", ") : undefined;
};

const normalizeRelationshipType = (type?: string): GraphRelationshipType => {
  const normalizedType = String(type || "").toLowerCase();
  return normalizedType === "one" || normalizedType === "many" ? normalizedType : "unknown";
};

const isExplicitAutoReverse = (relationship: any) => {
  const value = relationship?.isAutoReverse ?? relationship?.autoReverse;
  return value === true || String(value || "").toUpperCase() === "Y" || String(value || "").toLowerCase() === "true";
};

const findUniqueRelationship = (relationships: any[], predicate: (relationship: any) => boolean) => {
  const matches = relationships.filter(predicate);
  return matches.length === 1 ? matches[0] : undefined;
};

export const resolveDefinitionRelationship = (relationships: any[] = [], segment: string) => {
  const segmentName = getRelationshipName(segment);
  const segmentTitle = getRelationshipTitle(segment);
  const exactRelationshipName = findUniqueRelationship(
    relationships,
    (relationship) => relationship?.relationshipName === segment
  );
  if (exactRelationshipName) return exactRelationshipName;

  if (segmentTitle !== undefined) {
    // A qualified path is one relationship identity. A title alone or an alias/name
    // alone must never select a different relationship.
    return findUniqueRelationship(relationships, (relationship) => (
      relationship?.title === segmentTitle
      && (relationship?.relationshipName === segmentName || relationship?.shortAlias === segmentName)
    ));
  }

  const exactShortAlias = findUniqueRelationship(
    relationships,
    (relationship) => relationship?.shortAlias === segment
  );
  if (exactShortAlias) return exactShortAlias;

  const exactTitle = findUniqueRelationship(
    relationships,
    (relationship) => relationship?.title === segment
  );
  if (exactTitle) return exactTitle;

  // A target-only path denotes an auto-reverse relationship only when the definition
  // says so explicitly and exactly one relationship qualifies for that target.
  return findUniqueRelationship(relationships, (relationship) => (
    isExplicitAutoReverse(relationship) && relationship?.relatedEntityName === segmentName
  ));
};

export const getRelationshipMetadata = (
  relationship: any,
  pathText: string,
  segment: string
): RelationshipMetadata => {
  if (!relationship) {
    return {
      pathText,
      relationshipName: getRelationshipName(segment),
      relationshipTitle: getRelationshipTitle(segment),
      verified: false,
      attempted: true
    };
  }

  const entityName = String(relationship.relatedEntityName || "").trim();

  return {
    pathText,
    relationshipName: relationship.relationshipName || getRelationshipName(segment),
    relationshipTitle: relationship.title || getRelationshipTitle(segment),
    entityName: entityName || undefined,
    label: relationship.title || entityName || getLabel(segment),
    relationshipType: normalizeRelationshipType(relationship.type),
    joinSummary: getRelationshipJoinSummary(relationship),
    alias: relationship.shortAlias,
    isAutoReverse: isExplicitAutoReverse(relationship),
    verified: !!entityName,
    attempted: true
  };
};

const resolveRelationshipMetadata = (
  relationshipMetadata: Record<string, RelationshipMetadata>,
  pathText: string,
  segment: string
) => relationshipMetadata[pathText] || relationshipMetadata[segment];

// DataDocument aliases are normalized by Moqui's StringUtilities.prettyToCamelCase(value, false).
// Keep the same representation at the graph boundary so fields, conditions, and persisted records
// cannot disagree about the name of one output column.
// Moqui evaluates aliases as UTF-16 chars. The browser supports the same behavior for
// ASCII (the supported persistence domain); reject any other input before it can be saved
// instead of silently applying JavaScript code-point iteration or expanding a case mapping.
export const isDataDocumentAliasJavaCompatible = (value?: string | null) => /^[\x00-\x7F]*$/.test(String(value || ""));

export const canonicalDataDocumentAlias = (value?: string | null) => {
  let alias = "";
  let upperNext = false;
  const source = String(value || "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source.charAt(index);
    const codePoint = character.charCodeAt(0);
    const isAsciiLetterOrDigit = (codePoint >= 48 && codePoint <= 57)
      || (codePoint >= 65 && codePoint <= 90)
      || (codePoint >= 97 && codePoint <= 122);
    if (isAsciiLetterOrDigit) {
      alias += upperNext ? character.toUpperCase() : character.toLowerCase();
      upperNext = false;
    } else {
      upperNext = true;
    }
  }

  return alias;
};

const canonicalOptionalDataDocumentAlias = (value?: string) =>
  value === undefined ? undefined : canonicalDataDocumentAlias(value);

const getOutputName = (field: DataDocumentFieldRecord, fieldName: string, aliasesAreCanonical = false) =>
  aliasesAreCanonical ? field.fieldNameAlias || fieldName : canonicalDataDocumentAlias(field.fieldNameAlias || fieldName);

const addValidationIssue = (
  validationIssues: GraphValidationIssue[],
  issue: GraphValidationIssue
) => {
  validationIssues.push(issue);
};

const getDataDocumentAliasValidationIssue = (
  value: string | undefined,
  targetKind: "field" | "condition",
  targetId: string | undefined,
  aliasProperty: "fieldNameAlias" | "toFieldNameAlias"
) => {
  if (isDataDocumentAliasJavaCompatible(value)) return undefined;
  return {
    code: "unsupported_data_document_alias_character",
    severity: "error",
    message: "Data document aliases support ASCII characters only.",
    targetKind,
    targetId,
    aliasProperty
  } as const;
};

export const parseDataDocumentFieldPath = (fieldPath: string) => splitFieldPath(fieldPath);

// Local ids are only used while a field has no persisted sequence id. The deterministic
// fallback upgrades pre-local-id persisted drafts once, after which serialization retains it.
export const getDataDocumentFieldLocalId = (index: number) => `field-${index + 1}`;

export const projectDataDocumentGraph = ({
  document,
  fields = [],
  conditions = [],
  relAliases = [],
  links = [],
  feeds = [],
  relationshipMetadata = {},
  aliasesAreCanonical = false,
  preservedAliasValidationIssues = []
}: ProjectDataDocumentGraphInput): DataDocumentGraph => {
  const dataDocumentId = getDataDocumentId(document, fields);
  const validationIssues: GraphValidationIssue[] = [];
  const aliasValidationIssues = [...preservedAliasValidationIssues];
  const nodesById = new Map<string, GraphNode>();
  const edgesById = new Map<string, GraphEdge>();
  const warnedRelationshipPaths = new Set<string>();

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
  } else if (dataDocumentId.length > DATA_DOCUMENT_ID_MAX_LENGTH) {
    addValidationIssue(validationIssues, {
      code: "data_document_id_too_long",
      severity: "error",
      message: `Data document ID must be ${DATA_DOCUMENT_ID_MAX_LENGTH} characters or fewer (currently ${dataDocumentId.length}). Shorten the Name or edit the ID in Advanced Metadata.`,
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
          : "missing";
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
          isAutoReverse: metadata?.isAutoReverse,
          metadataStatus
        });
      }

      if (metadata?.attempted && metadata.verified === false && !warnedRelationshipPaths.has(pathText)) {
        warnedRelationshipPaths.add(pathText);
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
    const localId = field.fieldSeqId ? field.localId : field.localId || getDataDocumentFieldLocalId(index);
    const fieldAliasValidationTargetId = field.fieldSeqId || localId;
    const aliasValidationIssue = getDataDocumentAliasValidationIssue(
      field.fieldNameAlias || fieldName,
      "field",
      fieldAliasValidationTargetId,
      "fieldNameAlias"
    );
    const outputName = getOutputName(field, fieldName, aliasesAreCanonical);
    const graphField: GraphField = {
      dataDocumentId,
      fieldSeqId: field.fieldSeqId,
      localId,
      nodeId,
      fieldPath,
      fieldName,
      outputName,
      fieldNameAlias: outputName,
      sequenceNum: field.sequenceNum,
      defaultDisplay: field.defaultDisplay,
      sortable: field.sortable,
      functionName: field.functionName,
      isManualPath: relationshipSegments.some((segment, segmentIndex) => {
        const pathText = relationshipSegments.slice(0, segmentIndex + 1).join(":");
        return resolveRelationshipMetadata(relationshipMetadata, pathText, segment)?.verified !== true;
      }),
      sourceRecord: field
    };

    const targetNode = nodesById.get(nodeId);
    if (targetNode) targetNode.fieldCount += 1;

    if (!field.fieldSeqId) graphField.fieldSeqId = String((index + 1) * 10);
    if (aliasValidationIssue) aliasValidationIssues.push(aliasValidationIssue);

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
    const requestedFieldNameAlias = aliasesAreCanonical
      ? String(condition.fieldNameAlias || "")
      : canonicalDataDocumentAlias(condition.fieldNameAlias);
    const requestedToFieldNameAlias = aliasesAreCanonical
      ? condition.toFieldNameAlias
      : canonicalOptionalDataDocumentAlias(condition.toFieldNameAlias);
    const getFieldTargetId = (field: GraphField) => field.sourceRecord?.fieldSeqId || field.localId || field.fieldSeqId;
    const targetField = graphFields.find((field) => (
      !!condition.targetId && getFieldTargetId(field) === condition.targetId
    )) || graphFields.find((field) => field.outputName === requestedFieldNameAlias);
    const toTargetField = requestedToFieldNameAlias
      ? graphFields.find((field) => (
        !!condition.toTargetId && getFieldTargetId(field) === condition.toTargetId
      )) || graphFields.find((field) => field.outputName === requestedToFieldNameAlias)
      : undefined;
    const fieldNameAlias = targetField?.outputName || requestedFieldNameAlias;
    const toFieldNameAlias = toTargetField?.outputName || requestedToFieldNameAlias;
    const graphCondition: GraphCondition = {
      dataDocumentId,
      conditionSeqId: condition.conditionSeqId,
      localId: condition.localId,
      targetKind: targetField ? "field" : "document",
      targetId: targetField ? getFieldTargetId(targetField) : condition.targetId,
      toTargetId: toTargetField ? getFieldTargetId(toTargetField) : condition.toTargetId,
      fieldNameAlias,
      operator: normalizeDataDocumentOperator(condition.operator),
      fieldValue: condition.fieldValue ?? condition.value,
      toFieldNameAlias,
      postQuery: condition.postQuery,
      sourceRecord: condition
    };
    const conditionTargetId = graphCondition.conditionSeqId || graphCondition.localId;
    const fieldAliasValidationIssue = getDataDocumentAliasValidationIssue(
      condition.fieldNameAlias,
      "condition",
      conditionTargetId,
      "fieldNameAlias"
    );
    const toFieldAliasValidationIssue = getDataDocumentAliasValidationIssue(
      condition.toFieldNameAlias,
      "condition",
      conditionTargetId,
      "toFieldNameAlias"
    );
    if (fieldAliasValidationIssue) aliasValidationIssues.push(fieldAliasValidationIssue);
    if (toFieldAliasValidationIssue) aliasValidationIssues.push(toFieldAliasValidationIssue);

    if (targetField) {
      const targetNode = nodesById.get(targetField.nodeId);
      if (targetNode) targetNode.conditionCount += 1;
    } else {
      addValidationIssue(validationIssues, {
        code: "missing_condition_field_alias",
        severity: "error",
        message: `Condition references missing field alias "${fieldNameAlias}".`,
        targetKind: "condition",
        targetId: condition.conditionSeqId || condition.localId
      });
    }
    if (toFieldNameAlias && !toTargetField) {
      addValidationIssue(validationIssues, {
        code: "missing_condition_to_field_alias",
        severity: "error",
        message: `Condition references missing to-field alias "${toFieldNameAlias}".`,
        targetKind: "condition",
        targetId: condition.conditionSeqId || condition.localId
      });
    }
    if (isConditionValueMissing(graphCondition.operator, graphCondition.fieldValue, graphCondition.toFieldNameAlias)) {
      addValidationIssue(validationIssues, {
        code: "missing_condition_value",
        severity: "error",
        message: `Condition value is required for operator "${graphCondition.operator}".`,
        targetKind: "condition",
        targetId: condition.conditionSeqId || condition.localId
      });
    }
    return graphCondition;
  });

  validatePersistedConditionOperators(graphConditions).issues.forEach((issue) => addValidationIssue(validationIssues, issue));

  return {
    dataDocumentId,
    aliasesCanonical: true,
    aliasValidationIssues,
    metadata: document,
    nodes: Array.from(nodesById.values()),
    edges: Array.from(edgesById.values()),
    fields: graphFields,
    conditions: graphConditions,
    relAliases,
    links,
    feeds,
    relationshipMetadata,
    validationIssues: [...validationIssues, ...aliasValidationIssues]
  };
};

export const validateDataDocumentGraph = (graph: DataDocumentGraph) => {
  return projectDataDocumentGraph({
    document: graph.metadata,
    fields: serializeGraphFields(graph),
    conditions: serializeGraphConditions(graph),
    relAliases: graph.relAliases,
    links: graph.links,
    feeds: graph.feeds,
    relationshipMetadata: graph.relationshipMetadata,
    aliasesAreCanonical: graph.aliasesCanonical,
    preservedAliasValidationIssues: graph.aliasValidationIssues
  }).validationIssues;
};

export const serializeGraphFields = (graph: Pick<DataDocumentGraph, "dataDocumentId" | "fields">) => {
  return graph.fields.map((field) => compact({
    ...(field.sourceRecord || {}),
    dataDocumentId: field.dataDocumentId || graph.dataDocumentId,
    // Persisted seq id (empty for unsaved fields), never the synthetic id that graph
    // projection assigns for UI keying — otherwise new fields PUT to a nonexistent id.
    fieldSeqId: field.sourceRecord ? field.sourceRecord.fieldSeqId : field.fieldSeqId,
    localId: field.localId,
    fieldPath: field.fieldPath,
    fieldNameAlias: field.fieldNameAlias || field.outputName,
    sequenceNum: field.sequenceNum,
    defaultDisplay: field.defaultDisplay,
    sortable: field.sortable,
    functionName: field.functionName
  }));
};

export const serializeGraphConditions = (graph: Pick<DataDocumentGraph, "dataDocumentId" | "conditions">) => {
  return graph.conditions.map((condition) => {
    const { fieldValue: _sourceFieldValue, value: _sourceValue, ...sourceRecord } = condition.sourceRecord || {};
    const operator = normalizeDataDocumentOperator(condition.operator);
    return compact({
      ...sourceRecord,
      dataDocumentId: condition.dataDocumentId || graph.dataDocumentId,
      conditionSeqId: condition.conditionSeqId,
      targetId: condition.targetId,
      toTargetId: condition.toTargetId,
      fieldNameAlias: condition.fieldNameAlias,
      operator,
      fieldValue: isPersistedNullConditionOperator(operator) ? undefined : condition.fieldValue,
      toFieldNameAlias: condition.toFieldNameAlias,
      postQuery: condition.postQuery
    });
  });
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
