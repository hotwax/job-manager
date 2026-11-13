import { DateTime } from "luxon";

export type MappingMode = "source" | "constant";
export interface EdiMappingRow {
  id: string;
  target: string;
  label: string;
  group: string;
  source: string;
  mode: MappingMode;
  constant: string;
  transform: "none" | "number" | "uppercase" | "lookup";
  required: boolean;
  repeated?: boolean;
  lookup?: Record<string, string>;
  attributeName?: string;
}
export interface MappingIssue {
  level: "error" | "warning";
  field: string;
  message: string;
}
export interface MappingResult {
  payload: Record<string, unknown>;
  issues: MappingIssue[];
  lineCount: number;
  mappedFields: number;
}
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
export function readPath(value: unknown, path: string): unknown {
  if(!path.trim()) {return undefined;}

  return path
    .split(".")
    .reduce<unknown>(
      (object, key) =>
        forbidden.has(key)
          ? undefined
          : object !== null && typeof object === "object"
            ? Object.prototype.hasOwnProperty.call(object, key)
              ? (object as Record<string, unknown>)[key]
              : undefined
            : undefined,
      value
    );
}
function writePath(
  target: Record<string, unknown>,
  path: string,
  value: unknown
) {
  const parts = path.split(".");
  if(parts.some((k) => forbidden.has(k))) {return;}
  let current = target;
  parts.forEach((part, index) => {
    if(index === parts.length - 1) {current[part] = value;} else {
      if(!current[part] || typeof current[part] !== "object") {current[part] = {};}
      current = current[part] as Record<string, unknown>;
    }
  });
}
export function previewEdiOrder(
  sample: unknown,
  rows: EdiMappingRow[],
  linesPath: string
): MappingResult {
  const payload: Record<string, unknown> = {};
  const shipGroup: Record<string, unknown> = {};
  const issues: MappingIssue[] = [];
  let mappedFields = 0;
  const lines = readPath(sample, linesPath);
  if(!sample || typeof sample !== "object" || Array.isArray(sample)) {
    issues.push({
      level: "error",
      field: "Payload",
      message: "The sample must be a JSON object.",
    });
  }
  if(!Array.isArray(lines) || !lines.length) {
    issues.push({
      level: "error",
      field: "Order lines",
      message: "Choose a source array with at least one order line.",
    });
  }
  function valueFor(row: EdiMappingRow, source: unknown, label: string) {
    let value: unknown =
      row.mode === "constant" ? row.constant : readPath(source, row.source);
    if(
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim())
    ) {
      if(row.required) {
        issues.push({
          level: "error",
          field: label,
          message: "Required value is missing.",
        });
      }

      return undefined;
    }
    if(typeof value === "object") {
      issues.push({
        level: "error",
        field: label,
        message: "Choose a single value, not an object or array.",
      });

      return undefined;
    }
    if(row.transform === "number") {
      const n = typeof value === "boolean" ? NaN : Number(value);
      if(!Number.isFinite(n)) {
        issues.push({
          level: "error",
          field: label,
          message: "Value must be a valid number.",
        });

        return undefined;
      }
      value = n;
    }
    if(row.transform === "uppercase") {value = String(value).toUpperCase();}
    if(row.transform === "lookup") {
      const mapped =
        row.lookup &&
        Object.prototype.hasOwnProperty.call(row.lookup, String(value))
          ? row.lookup[String(value)]
          : undefined;
      if(mapped === undefined) {
        issues.push({
          level: "error",
          field: label,
          message: "No value-map entry matches this source value.",
        });

        return undefined;
      }
      value = mapped;
    }
    mappedFields++;

    return value;
  }
  for(const row of rows.filter((r) => !r.repeated)) {
    const value = valueFor(row, sample, row.label);
    if(value === undefined) {continue;}
    if(row.target.startsWith("shipTo.")) {writePath(shipGroup, row.target, value);} else if(row.target.startsWith("shipGroup.")) {writePath(shipGroup, row.target.slice(10), value);} else {writePath(payload, row.target, value);}
  }
  const items = Array.isArray(lines)
    ? lines.map((line, index) => {
      const item: Record<string, unknown> = {};
      for(const row of rows.filter((r) => r.repeated)) {
        const value = valueFor(row, line, `Line ${index + 1}: ${row.label}`);
        if(value === undefined) {continue;}
        if(row.attributeName) {
          const attributes = (item.attributes || []) as {
            attrName: string;
            attrValue: unknown;
          }[];
          attributes.push({ attrName: row.attributeName, attrValue: value });
          item.attributes = attributes;
        } else {writePath(item, row.target, value);}
      }
      const hasIssue = (label: string) =>
        issues.some((issue) =>
          issue.level === "error" &&
              issue.field === `Line ${index + 1}: ${label}`);
      if(!hasIssue("Quantity")) {
        if(typeof item.quantity !== "number") {
          issues.push({
            level: "error",
            field: `Line ${index + 1}: Quantity`,
            message: "Choose To number for quantity values received as text.",
          });
        } else if(item.quantity <= 0) {
          issues.push({
            level: "error",
            field: `Line ${index + 1}: Quantity`,
            message: "Quantity must be greater than zero.",
          });
        }
      }
      if(!hasIssue("Unit price") && item.unitPrice !== undefined) {
        if(typeof item.unitPrice !== "number") {
          issues.push({
            level: "error",
            field: `Line ${index + 1}: Unit price`,
            message: "Choose To number for price values received as text.",
          });
        } else if(item.unitPrice < 0) {
          issues.push({
            level: "error",
            field: `Line ${index + 1}: Unit price`,
            message: "Unit price must be zero or greater.",
          });
        }
      }

      return item;
    })
    : [];
  shipGroup.items = items;
  payload.shipGroups = [shipGroup];
  if(
    payload.orderDate &&
    (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(String(payload.orderDate)) ||
      !DateTime.fromISO(String(payload.orderDate), { setZone: true }).isValid)
  ) {
    issues.push({
      level: "error",
      field: "Order date",
      message: "Use an ISO date and time with a time-zone offset.",
    });
  }
  issues.push({
    level: "warning",
    field: "Reference data",
    message:
      "Products, customer IDs, store, channel, shipping method, currency, and geographic codes need OMS validation.",
  });
  issues.push({
    level: "warning",
    field: "Duplicate orders",
    message:
      "Partner and external order ID must be checked before creating an order.",
  });

  return { payload, issues, lineCount: items.length, mappedFields };
}
export function sourcePaths(value: unknown, prefix = ""): string[] {
  if(!value || typeof value !== "object" || Array.isArray(value)) {return [];}

  return Object.entries(value as Record<string, unknown>).flatMap(([key, val]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return val !== null && typeof val === "object" && !Array.isArray(val)
      ? sourcePaths(val, path)
      : [path];
  });
}
export function defaultEdiMapping(productStoreId = ""): EdiMappingRow[] {
  const row = (
    id: string,
    target: string,
    label: string,
    group: string,
    source: string,
    required = true,
    transform: EdiMappingRow["transform"] = "none",
    repeated = false
  ): EdiMappingRow => ({
    id,
    target,
    label,
    group,
    source,
    mode: "source",
    constant: "",
    transform,
    required,
    repeated,
  });

  return [
    row(
      "externalId",
      "externalId",
      "External order ID",
      "Order",
      "purchaseOrder.number"
    ),
    {
      ...row("productStoreId", "productStoreId", "Product store", "Order", ""),
      mode: "constant",
      constant: productStoreId,
    },
    row("orderDate", "orderDate", "Order date", "Order", "purchaseOrder.date"),
    row(
      "currencyUom",
      "currencyUom",
      "Currency",
      "Order",
      "purchaseOrder.currency",
      true,
      "uppercase"
    ),
    row(
      "firstName",
      "firstName",
      "First name",
      "Customer",
      "customer.firstName"
    ),
    row("lastName", "lastName", "Last name", "Customer", "customer.lastName"),
    row(
      "customerEmail",
      "customerEmail",
      "Email",
      "Customer",
      "customer.email",
      false
    ),
    row(
      "address1",
      "shipTo.postalAddress.address1",
      "Address line 1",
      "Ship to",
      "shipTo.address1"
    ),
    row("city", "shipTo.postalAddress.city", "City", "Ship to", "shipTo.city"),
    row(
      "stateProvinceGeoId",
      "shipTo.postalAddress.stateProvinceGeoId",
      "State / province code",
      "Ship to",
      "shipTo.state",
      true,
      "uppercase"
    ),
    row(
      "postalCode",
      "shipTo.postalAddress.postalCode",
      "Postal code",
      "Ship to",
      "shipTo.postalCode"
    ),
    row(
      "countryGeoId",
      "shipTo.postalAddress.countryGeoId",
      "Country code",
      "Ship to",
      "shipTo.country",
      true,
      "uppercase"
    ),
    row("sku", "sku", "SKU", "Order lines", "sku", true, "none", true),
    row(
      "quantity",
      "quantity",
      "Quantity",
      "Order lines",
      "quantity",
      true,
      "number",
      true
    ),
    row(
      "unitPrice",
      "unitPrice",
      "Unit price",
      "Order lines",
      "unitPrice",
      true,
      "number",
      true
    ),
  ];
}

export function optionalEdiFields(): EdiMappingRow[] {
  const field = (
    id: string,
    target: string,
    label: string,
    group: string,
    source: string,
    repeated = false
  ): EdiMappingRow => ({
    id,
    target,
    label,
    group,
    source,
    mode: "source",
    constant: "",
    transform: "none",
    required: false,
    repeated,
  });

  return [
    field(
      "orderName",
      "orderName",
      "Order name",
      "Order",
      "purchaseOrder.name"
    ),
    field(
      "salesChannelEnumId",
      "salesChannelEnumId",
      "Sales channel",
      "Order",
      "purchaseOrder.channel"
    ),
    field(
      "customerExternalId",
      "customerExternalId",
      "Customer external ID",
      "Customer",
      "customer.id"
    ),
    field(
      "customerPhone",
      "customerPhone",
      "Customer phone",
      "Customer",
      "customer.phone"
    ),
    field(
      "address2",
      "shipTo.postalAddress.address2",
      "Address line 2",
      "Ship to",
      "shipTo.address2"
    ),
    field(
      "toName",
      "shipTo.postalAddress.toName",
      "Recipient name",
      "Ship to",
      "shipTo.name"
    ),
    field(
      "shipmentMethodTypeId",
      "shipGroup.shipmentMethodTypeId",
      "Shipping method",
      "Ship to",
      "shipTo.method"
    ),
    field(
      "itemExternalId",
      "itemExternalId",
      "External line ID",
      "Order lines",
      "lineId",
      true
    ),
    field(
      "description",
      "description",
      "Item description",
      "Order lines",
      "description",
      true
    ),
    {
      ...field(
        "personalization",
        "attributes",
        "Personalization type",
        "Order lines",
        "personalizationType",
        true
      ),
      attributeName: "personalizationType",
    },
  ];
}

export function ediTargetPath(row: EdiMappingRow) {
  if(row.attributeName) {return `shipGroups[].items[].attributes[] (attrName=${row.attributeName})`;}
  if(row.repeated) {return `shipGroups[].items[].${row.target}`;}
  if(row.target.startsWith("shipGroup.")) {return row.target.replace("shipGroup.", "shipGroups[].");}
  if(row.target.startsWith("shipTo.")) {return `shipGroups[].${row.target}`;}

  return row.target;
}
