# Data Document Graph Builder

Alternate implementation plan for a graph-first Data Document builder in Job Manager.

## Implementation Status

Status as of 2026-04-27 in isolated worktree `/Users/adityapatel/Documents/GitHub/job-manager-data-document-graph-builder`:

1. Added a graph projection utility at `src/utils/dataDocumentGraph.ts`.
2. Added focused graph projection tests at `src/store/dataDocumentGraph.spec.ts`.
3. Added graph-specific Pinia state at `src/store/dataDocumentGraph.ts`.
4. Added mock Data Document fixtures with direct paths, deep paths, `#` title-qualified paths, rel aliases, links, conditions, presets, preview rows, and export history at `src/mock/dataDocuments.ts`.
5. Added graph builder routes:
   - `/data-documents/new/graph`
   - `/data-documents/:id/graph`
6. Added catalog and detail entry points for the graph builder.
7. Added `src/views/DataDocumentGraphBuilder.vue` with a custom SVG/div graph canvas and local graph CSS, plus Ionic shell/actions/inspectors/panels.
8. Confirmed field functions must save as `functionName`, and conditions must use `fieldValue`, `toFieldNameAlias`, and `postQuery`.
9. Ported the improved entity and field selection behavior from the active builder into the isolated worktree: entity fields can be force-refreshed, common mock fallback fields cover Product, Facility, OrderHeader, OrderItem, InventoryItem, Party, and UserLogin, and unknown entities get a generic field fallback so mock/offline mode remains usable.
10. Updated the graph builder field add flow to use the same searchable field selector, refresh button, loading state, and empty state instead of creating placeholder `newField` records from the primary action.
11. Added mock entity metadata for names, fields, and relationships so the graph builder can act like the backend metadata services exist. Related field authoring now starts from selectable relationships when metadata is available and falls back to manual path entry when it is not.

Known implementation gaps:

1. `hotwax-maarg-util` does not yet expose REST resources for `DataDocumentRelAlias`, `DataDocumentLink`, or `DataDocumentUserGroup`.
2. Job Manager does not yet have a relationship metadata endpoint for verified graph joins, relationship type, relationship labels, or key maps.
3. Relationship paths are currently displayed and preserved exactly, but unresolved relationship metadata remains unverified.
4. The export worker remains outside this UI scope; queue/history/download contracts exist, but file generation/status transition to `SmsgSent` is still a backend gap.
5. Full browser smoke testing is blocked by the existing auth guard when opening the local route without a valid Job Manager session.

## Summary

Building a Moqui Data Document is building a reusable query shape. The current Job Manager builder presents that shape as metadata, field rows, and condition rows. This alternate plan keeps the same backend records and export contracts, but gives users a visual query canvas that behaves more like an ER diagram:

1. The primary entity is the root node.
2. Related entities appear as joined nodes.
3. Connecting lines show the relationship path and join conditions.
4. Fields, aliases, display flags, sortable flags, functions, and conditions are edited from node and edge inspectors.
5. Preview and export still run through the existing Data Document runtime path.

This is not a SQL editor and should not create a new query language. The UI is a visual authoring layer over Moqui Data Document records.

## Moqui Capability Baseline

The graph builder must preserve the capabilities available in the default Moqui Data Document screens and the existing Job Manager Data Document work.

Reference screens and docs:

1. Default Moqui fields screen: `https://dev-maarg.hotwax.io/qapps/system/DataDocument/Edit/DataDocFields?dataDocumentId=PicklistRole`
2. Default Moqui metadata screen: `https://dev-maarg.hotwax.io/qapps/system/DataDocument/Edit/EditDataDocument?dataDocumentId=PicklistRole`
3. Official Moqui docs: `https://www.moqui.org/m/docs/framework/Data%20and%20Resources/Data%20Document`
4. Current Job Manager spec: `docs/data-documents.md`
5. Backend endpoint contract: `/Users/adityapatel/Documents/GitHub/hotwax-maarg-util/docs/DataDocumentsBackend.md`

Required record coverage:

1. `moqui.entity.document.DataDocument`
2. `moqui.entity.document.DataDocumentField`
3. `moqui.entity.document.DataDocumentCondition`
4. `moqui.entity.document.DataDocumentRelAlias`
5. `moqui.entity.document.DataDocumentLink`
6. `moqui.entity.document.DataDocumentUserGroup`
7. `moqui.entity.feed.DataFeedDocument`
8. `moqui.service.message.SystemMessage` for queued exports

Required metadata coverage:

1. Data document ID
2. Document name
3. Primary entity name
4. Document title expression
5. Index name
6. Manual data service name
7. User group access
8. Data feeds
9. Search/result links

Required field coverage:

1. Sequence number
2. Field path
3. Field alias
4. Sortable flag
5. Display/default-display flag
6. Function name (`functionName`)
7. Manual field add
8. Field delete
9. Bulk update of field rows
10. Duplicate output-name detection with alias guidance

Required condition coverage:

1. Field
2. Operator
3. Value
4. To-field comparison
5. Post-query flag (`postQuery`)
6. Add, edit, and delete

Required relationship coverage:

1. Direct primary-entity fields, such as `partyId`
2. Short relationship names, such as `product:internalName`
3. Full relationship names, such as `org.apache.ofbiz.shipment.picklist.Picklist:picklistId`
4. Deep paths, such as `picklistShipment:picklist:roles:Person:firstName`
5. Title-qualified relationships using `#`, such as `Primary#org.apache.ofbiz.order.order.OrderHeader:statusId`
6. Type-one and type-many relationship awareness
7. Relationship/document aliases through `DataDocumentRelAlias`

Required runtime coverage:

1. Dynamic view entity name: `DataDocument.${dataDocumentId}`
2. Preview through `POST /rest/s1/oms/dataDocumentView`
3. Selected fields
4. Runtime filters
5. Sort field and direction
6. Distinct mode
7. Date filtering
8. Page size and pagination
9. Export queueing through `POST /rest/s1/admin/dataDocuments/{dataDocumentId}/exports`
10. Export history through `GET /rest/s1/admin/dataDocuments/exports`
11. Download by `systemMessageId`

## Product Direction

The graph builder should help implementation and operations users understand a Data Document before they save or run it. The first viewport should answer:

1. What entity does this document start from?
2. Which related entities are joined in?
3. Which fields are selected from each entity?
4. Which relationships or fields constrain the result?
5. Which fields will appear in preview/export output?

The graph is the primary surface. Tables and forms become inspectors, not the main mental model.

## UX Structure

### Desktop Layout

Use an Ionic page with four regions:

1. Header toolbar
   - Back to Data Documents
   - Document name and unsaved state
   - Save
   - Validate
   - Preview
   - Schedule Export

2. Left browser
   - Search entities and relationships
   - Show primary entity fields
   - Show available relationships from the selected node
   - Add direct field
   - Add related entity path
   - Add manual field path when metadata is unavailable

3. Center graph canvas
   - Root entity node
   - Related entity nodes
   - Edges for relationship path segments
   - Badges for selected field count, condition count, type-one/type-many, and validation status
   - Click node to edit fields on that entity
   - Click edge to inspect relationship segment and edge conditions

4. Right inspector
   - Document inspector
   - Node inspector
   - Edge inspector
   - Field inspector
   - Condition inspector
   - Link/feed/group inspector

5. Bottom drawer
   - Validation issues
   - Generated field list
   - Query preview
   - Export queue summary

### Mobile Layout

Mobile must remain usable for operational review, even if complex authoring is more efficient on desktop.

1. The graph canvas is horizontally pannable.
2. The left browser opens as an `ion-modal`.
3. The inspector opens as an `ion-modal` or full-height sheet.
4. Preview rows render as stacked `ion-list` records.
5. Validation issues appear before preview results.
6. Toolbar actions collapse into an action menu when width is constrained.

### Ionic And Graph UI Constraints

Implementation must follow the project Ionic rules:

1. Use core Ionic components.
2. Do not use `ion-grid`.
3. Do not use Ionic grid utility classes.
4. Keep screens mobile-compatible.
5. Remove duplicate information.
6. Do not build a decorative landing page; the builder is the first screen.

The graph surface is an explicit exception to the normal no-CSS rule. The graph canvas, nodes, edges, labels, selection states, panning behavior, and diagram-specific inspector layout may use non-Ionic markup and component structure with local custom CSS in the graph builder component. The surrounding page shell, navigation, forms, modals, drawers, and action controls should still use Ionic where it fits.

The graph itself may be an SVG inside the Vue template. If a library is required later, the implementation prompt must require an explicit technical justification before adding it.

## Graph Projection Model

The graph model is frontend-only. It is derived from Moqui records and serializes back to those same records.

### Document Graph

```ts
type DataDocumentGraph = {
  dataDocumentId: string;
  metadata: DataDocumentMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
  fields: GraphField[];
  conditions: GraphCondition[];
  relAliases: GraphRelAlias[];
  links: GraphLink[];
  feeds: GraphFeed[];
  validationIssues: GraphValidationIssue[];
};
```

### Node

```ts
type GraphNode = {
  nodeId: string;
  entityName: string;
  label: string;
  relationshipPath: string[];
  pathText: string;
  isPrimary: boolean;
  relationshipType?: "one" | "many" | "unknown";
  fieldCount: number;
  conditionCount: number;
  metadataStatus: "verified" | "unverified" | "missing";
};
```

### Edge

```ts
type GraphEdge = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipName: string;
  relationshipTitle?: string;
  pathText: string;
  relationshipType: "one" | "many" | "unknown";
  joinSummary?: string;
  conditionCount: number;
  alias?: string;
  metadataStatus: "verified" | "unverified" | "missing";
};
```

### Field

```ts
type GraphField = {
  dataDocumentId: string;
  fieldSeqId?: string;
  nodeId: string;
  fieldPath: string;
  fieldName: string;
  outputName: string;
  fieldNameAlias?: string;
  sequenceNum?: number;
  defaultDisplay?: "Y" | "N";
  sortable?: "Y" | "N";
  functionName?: string;
  isManualPath: boolean;
};
```

### Condition

```ts
type GraphCondition = {
  dataDocumentId: string;
  conditionSeqId?: string;
  targetKind: "field" | "edge" | "document";
  targetId?: string;
  fieldNameAlias: string;
  operator: string;
  fieldValue?: string;
  toFieldNameAlias?: string;
  postQuery?: "Y" | "N";
};
```

The exact property names sent to Moqui should match the real entity REST contract after the backend researcher verifies `DataDocumentCondition`, `DataDocumentRelAlias`, and `DataDocumentLink` field names.

## Path Parsing Rules

The graph projection must preserve exact field paths. It may parse paths for display, but must not normalize saved paths unless the user explicitly changes the relationship or field.

Rules:

1. Split path segments on `:`.
2. The final segment is the selected field.
3. Previous segments are relationship/entity path segments.
4. `#` inside a relationship segment means title-qualified relationship and must remain part of the segment.
5. A path with no `:` belongs to the primary entity.
6. A path can use short relationship names or full entity relationship names.
7. If metadata cannot resolve a segment, show it as unverified but keep it editable.
8. Output field name is `fieldNameAlias` when present; otherwise the terminal field name.

Example:

```text
org.apache.ofbiz.shipment.picklist.Picklist:org.apache.ofbiz.shipment.picklist.PicklistShipment:org.apache.ofbiz.shipment.shipment.Shipment:Primary#org.apache.ofbiz.order.order.OrderHeader:statusId
```

This becomes:

1. Root: `org.apache.ofbiz.shipment.picklist.Picklist`
2. Edge: `org.apache.ofbiz.shipment.picklist.PicklistShipment`
3. Edge: `org.apache.ofbiz.shipment.shipment.Shipment`
4. Edge: `Primary#org.apache.ofbiz.order.order.OrderHeader`
5. Field: `statusId`

## Validation

Validation should run locally before save and again after preview errors.

Required validation issues:

1. Duplicate output field names.
2. Missing primary entity.
3. Missing document ID.
4. Field path with no terminal field.
5. Condition references a field alias that does not exist.
6. Document title references a field alias that does not exist.
7. Link URL references a field alias that does not exist.
8. Sort field is not marked sortable when sortable metadata is enforced.
9. Relationship path segment cannot be verified against metadata.
10. Manual data service document cannot be fully represented as a graph; show a warning and keep metadata editable.

Validation severity:

1. Error blocks save.
2. Warning allows save but appears before preview/export.
3. Info explains metadata limitations.

## Backend Contracts

Reuse the existing Job Manager endpoint style:

1. `GET admin/dataDocuments`
2. `POST admin/dataDocuments`
3. `GET admin/dataDocuments/{dataDocumentId}`
4. `PUT admin/dataDocuments/{dataDocumentId}`
5. `DELETE admin/dataDocuments/{dataDocumentId}`
6. `GET admin/dataDocuments/{dataDocumentId}/fields`
7. `POST admin/dataDocuments/{dataDocumentId}/fields`
8. `PUT admin/dataDocuments/{dataDocumentId}/fields/{fieldSeqId}`
9. `DELETE admin/dataDocuments/{dataDocumentId}/fields/{fieldSeqId}`
10. `GET admin/dataDocuments/{dataDocumentId}/conditions`
11. `POST admin/dataDocuments/{dataDocumentId}/conditions`
12. `PUT admin/dataDocuments/{dataDocumentId}/conditions/{conditionSeqId}`
13. `DELETE admin/dataDocuments/{dataDocumentId}/conditions/{conditionSeqId}`
14. `GET admin/dataDocuments/{dataDocumentId}/feeds`
15. `POST admin/dataDocuments/{dataDocumentId}/feeds`
16. `POST admin/dataDocuments/{dataDocumentId}/exports`
17. `GET admin/dataDocuments/exports`
18. `GET admin/dataDocuments/exports/{systemMessageId}`
19. `POST oms/dataDocumentView`

Entity metadata contracts needed by the graph builder:

1. `GET moqui/entity/EntityServices/getEntityNames`
   - Purpose: populate primary entity selection.
   - Expected response shape: `{ "entityNames": ["mantle.product.ProductFacility", "..."] }`
   - Current UI fallback: `mockEntityNames`.

2. `GET moqui/entity/EntityServices/getEntityFields?entityName={entityName}`
   - Purpose: populate direct and related field pickers.
   - Expected response shape: `{ "fields": [{ "fieldName": "productId", "description": "..." }] }`
   - Alternate accepted shape: `{ "fieldNames": ["productId", "..."] }`
   - Current UI fallback: `mockEntityFields`.

3. `GET moqui/entity/EntityServices/getEntityRelationships?entityName={entityName}`
   - Purpose: populate the relationship browser used to add related fields and draw verified graph edges.
   - Expected response shape:

```json
{
  "relationships": [
    {
      "relationshipName": "product",
      "title": "Product",
      "relatedEntityName": "mantle.product.Product",
      "type": "one",
      "keyMaps": [
        { "fieldName": "productId", "relatedFieldName": "productId" }
      ]
    }
  ]
}
```

   - Required relationship fields: `relationshipName`, `relatedEntityName`, relationship cardinality/type, and key maps.
   - Useful relationship fields: title/label and short alias when Moqui provides them.
   - Current UI fallback: `mockEntityRelationships`.

Potential backend additions to verify before implementation:

1. Entity REST resources for `DataDocumentRelAlias`.
2. Entity REST resources for `DataDocumentLink`.
3. Entity REST resources or service endpoints for `DataDocumentUserGroup`.
4. Entity metadata endpoint that returns fields, relationships, relationship type, relationship titles or short aliases, and key maps.
5. Field functions save as `functionName`.
6. Conditions save value comparisons as `fieldValue`, field-to-field comparisons as `toFieldNameAlias`, and post-query behavior as `postQuery`.

## Frontend Implementation Shape

Suggested files for implementation:

1. `src/views/DataDocumentGraphBuilder.vue`
2. `src/store/dataDocumentGraph.ts`
3. `src/utils/dataDocumentGraph.ts`
4. `src/mock/dataDocumentGraph.ts`
5. `src/store/dataDocumentGraph.spec.ts`

Route:

```text
/data-documents/:id/graph
```

Create route:

```text
/data-documents/new/graph
```

The existing form builder can remain available as a fallback until the graph builder is production proven.

## Test Scenarios

Unit tests:

1. Direct fields become fields on the primary node.
2. Deep relation paths create one node per path segment.
3. `#` relationship segments remain intact.
4. Aliased fields produce unique output names.
5. Duplicate output names produce validation errors.
6. Conditions attach to the correct field alias.
7. Unverified relationship segments produce warnings, not data loss.
8. Graph serializes back to the original field records without changing field paths.

Browser smoke tests:

1. Open graph builder with mock `PicklistRole`.
2. See primary entity node and related shipment/order/role nodes.
3. Add a direct field from the root node.
4. Add a related field from a joined node.
5. Add a condition on an alias.
6. Resolve a duplicate field name by adding an alias.
7. Run preview.
8. Queue export.
9. Open mobile viewport and confirm graph, inspector, and preview remain usable.

Build checks:

```sh
pnpm --filter job-manager test:unit
pnpm --filter job-manager build
```

Run app from the accxui workspace root:

```sh
pnpm --filter job-manager dev
```

## Open Decisions For Implementation

These must be resolved during implementation discovery before writing production code:

1. Exact entity REST path for `DataDocumentRelAlias`.
2. Exact entity REST path for `DataDocumentLink`.
3. Exact condition field names for value, to-field, and PQ.
4. Exact metadata endpoint for entity relationships.
5. Whether the graph canvas should stay SVG-only for v1 or adopt a graph library after prototype validation.
6. Whether the form builder remains the default route or the graph builder becomes default immediately.
