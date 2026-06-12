import type { EntityInfo } from "@/types";

export type EntityOption = EntityInfo | string;

export interface EntityOptionGroup {
  packageName: string;
  entities: EntityOption[];
}

const FALLBACK_PACKAGE_NAME = "Other";

const getFallbackPackageName = (entityName: string) => {
  const parts = entityName.split(".");
  parts.pop();
  return parts.join(".") || FALLBACK_PACKAGE_NAME;
};

export const getEntityValue = (entity: EntityOption) => {
  if (typeof entity === "string") return entity;
  return entity.fullEntityName || [entity.package, entity.entityName].filter(Boolean).join(".") || entity.entityName;
};

export const getEntityLabel = (entity: EntityOption) => {
  if (typeof entity !== "string" && entity.entityName) return entity.entityName;
  const entityValue = getEntityValue(entity);
  const parts = entityValue.split(".");
  return parts[parts.length - 1] || entityValue;
};

export const getEntityPackageName = (entity: EntityOption) => {
  if (typeof entity !== "string" && entity.package) return entity.package;
  return getFallbackPackageName(getEntityValue(entity));
};

export const getEntitySearchText = (entity: EntityOption) => {
  return [
    getEntityLabel(entity),
    getEntityValue(entity),
    getEntityPackageName(entity)
  ].join(" ").toLowerCase();
};

export const groupEntityOptions = (entities: EntityOption[]): EntityOptionGroup[] => {
  const groups = entities.reduce((entityGroups, entity) => {
    const packageName = getEntityPackageName(entity);
    const packageEntities = entityGroups.get(packageName) || [];
    packageEntities.push(entity);
    entityGroups.set(packageName, packageEntities);
    return entityGroups;
  }, new Map<string, EntityOption[]>());

  return Array.from(groups.entries())
    .sort(([leftPackage], [rightPackage]) => leftPackage.localeCompare(rightPackage))
    .map(([packageName, packageEntities]) => ({
      packageName,
      entities: [...packageEntities].sort((leftEntity, rightEntity) => getEntityLabel(leftEntity).localeCompare(getEntityLabel(rightEntity)))
    }));
};
