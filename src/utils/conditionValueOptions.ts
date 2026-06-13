export type ConditionValueOption = {
  value: string;
  label: string;
  detail?: string;
};

export type ConditionValueOptionSource = {
  kind: "enum" | "status";
  label: string;
  options: ConditionValueOption[];
};

type LookupGroup = {
  id: string;
  label: string;
  rows: any[];
};

const normalizeLookupText = (value: string) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const getTerminalFieldName = (field: any) => {
  const fieldPath = String(field?.fieldPath || "");
  return field?.fieldName || fieldPath.split(":").pop() || "";
};

const stripLookupFieldSuffix = (fieldName: string) => String(fieldName || "").replace(/(EnumId|StatusId|TypeId|Id)$/i, "");

const getRelationshipLabel = (relationship: any) => {
  if (relationship?.title) return relationship.title;
  if (relationship?.shortAlias) return relationship.shortAlias;

  const relationshipName = String(relationship?.relationshipName || "");
  const localName = relationshipName.includes("#") ? relationshipName.split("#")[0] : relationshipName.split(".").pop();
  return localName || "";
};

const getRelationshipBase = (relationship: any) => normalizeLookupText(getRelationshipLabel(relationship));

const getFieldBase = (fieldName: string) => normalizeLookupText(stripLookupFieldSuffix(fieldName));

const isEnumRelationship = (relationship: any) => (
  normalizeLookupText(relationship?.relatedEntityName || relationship?.relationshipName).endsWith("enumeration")
);

const isStatusRelationship = (relationship: any) => (
  normalizeLookupText(relationship?.relatedEntityName || relationship?.relationshipName).endsWith("statusitem")
);

const findSelectedField = (condition: any, fields: any[]) => {
  const alias = String(condition?.fieldNameAlias || "");
  return fields.find((field) => [
    field.fieldNameAlias,
    field.outputName,
    field.fieldName,
    field.fieldPath
  ].filter(Boolean).includes(alias));
};

const relationshipMatchesField = (relationship: any, fieldName: string) => {
  const relationshipBase = getRelationshipBase(relationship);
  const fieldBase = getFieldBase(fieldName);

  if (!relationshipBase || !fieldBase) return false;

  return relationshipBase === fieldBase ||
    relationshipBase.endsWith(fieldBase) ||
    fieldBase.endsWith(relationshipBase);
};

const getCandidateTexts = (relationship: any, fieldName: string, kind: ConditionValueOptionSource["kind"]) => {
  const relationshipBase = getRelationshipBase(relationship);
  const fieldBase = getFieldBase(fieldName);
  const candidates = [relationshipBase, fieldBase];

  if (kind === "status") {
    candidates.push(`${relationshipBase}status`, `${fieldBase}status`);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
};

const groupRows = (rows: any[], idKey: string, labelKeys: string[]): LookupGroup[] => {
  const groups = rows.reduce((lookupGroups: Map<string, any[]>, row) => {
    const id = String(row?.[idKey] || "");
    if (!id) return lookupGroups;

    lookupGroups.set(id, [...(lookupGroups.get(id) || []), row]);
    return lookupGroups;
  }, new Map<string, any[]>());

  return Array.from(groups.entries()).map(([id, groupRows]) => {
    const firstRow = groupRows[0] || {};
    const label = labelKeys.map((key) => firstRow[key]).find(Boolean) || id;
    return { id, label, rows: groupRows };
  });
};

const findMatchingGroup = (groups: LookupGroup[], candidates: string[]) => {
  const matchingGroups = groups.filter((group) => {
    const groupText = normalizeLookupText(group.label || group.id);
    return candidates.some((candidate) => (
      groupText === candidate ||
      groupText.endsWith(candidate) ||
      candidate.endsWith(groupText)
    ));
  });

  return matchingGroups.length === 1 ? matchingGroups[0] : undefined;
};

const toSequence = (value: any) => {
  const sequence = Number(value);
  return Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER;
};

const sortOptions = (left: ConditionValueOption & { sequenceNum?: any }, right: ConditionValueOption & { sequenceNum?: any }) => {
  const leftSequence = toSequence(left.sequenceNum);
  const rightSequence = toSequence(right.sequenceNum);
  if (leftSequence !== rightSequence) return leftSequence - rightSequence;
  return left.label.localeCompare(right.label) || left.value.localeCompare(right.value);
};

const buildEnumOptions = (group: LookupGroup): ConditionValueOptionSource | undefined => {
  const options = group.rows
    .map((row) => ({
      value: row.enumId,
      label: row.description || row.enumName || row.enumCode || row.enumId,
      detail: row.enumTypeId,
      sequenceNum: row.sequenceNum
    }))
    .filter((option) => option.value)
    .sort(sortOptions)
    .map(({ sequenceNum, ...option }) => option);

  if (!options.length) return undefined;

  return {
    kind: "enum",
    label: group.label,
    options
  };
};

const buildStatusOptions = (group: LookupGroup): ConditionValueOptionSource | undefined => {
  const options = group.rows
    .map((row) => ({
      value: row.statusId,
      label: row.description || row.statusCode || row.statusId,
      detail: row.statusTypeId,
      sequenceNum: row.sequenceNum
    }))
    .filter((option) => option.value)
    .sort(sortOptions)
    .map(({ sequenceNum, ...option }) => option);

  if (!options.length) return undefined;

  return {
    kind: "status",
    label: group.label,
    options
  };
};

export const getConditionValueOptionSource = ({
  condition,
  fields,
  relationships,
  enumerations,
  statuses
}: {
  condition: any;
  fields: any[];
  relationships: any[];
  enumerations: any[];
  statuses: any[];
}): ConditionValueOptionSource | undefined => {
  const selectedField = findSelectedField(condition, fields || []);
  const fieldName = getTerminalFieldName(selectedField);

  if (!fieldName) return undefined;

  const relationship = (relationships || []).find((item) => relationshipMatchesField(item, fieldName));
  if (!relationship) return undefined;

  if (isEnumRelationship(relationship)) {
    const groups = groupRows(enumerations || [], "enumTypeId", ["typeDescription", "enumTypeDescription"]);
    const group = findMatchingGroup(groups, getCandidateTexts(relationship, fieldName, "enum"));
    return group ? buildEnumOptions(group) : undefined;
  }

  if (isStatusRelationship(relationship)) {
    const groups = groupRows(statuses || [], "statusTypeId", ["typeDescription", "statusTypeDescription"]);
    const group = findMatchingGroup(groups, getCandidateTexts(relationship, fieldName, "status"));
    return group ? buildStatusOptions(group) : undefined;
  }

  return undefined;
};
