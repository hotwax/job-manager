# Data Documents

Implementation document for a dedicated Job Manager section that lets users view, create, run, and export Moqui Data Documents.

## Implementation Status

Status as of 2026-04-26:

1. Backend component owner is confirmed as `hotwax-maarg-util`.
2. Data Document CRUD is implemented in `hotwax-maarg-util/service/admin.rest.xml` under `/rest/s1/admin/dataDocuments`.
3. `DataDocument`, `DataDocumentField`, `DataDocumentCondition`, and `DataFeedDocument` CRUD use direct Moqui entity REST resources.
4. Relation-path fields are supported through `DataDocumentField.fieldPath`, including values such as `product:internalName`.
5. Query preview uses the existing OMS service `POST /rest/s1/oms/dataDocumentView`.
6. Export queueing is implemented through `POST /rest/s1/admin/dataDocuments/{dataDocumentId}/exports`, which creates a `SystemMessage` with `systemMessageTypeId = ExportDataDocument`.
7. Export history is implemented through `GET /rest/s1/admin/dataDocuments/exports`, backed by `SystemMessage` records.
8. Export download is implemented as `GET /rest/s1/admin/dataDocuments/exports/{systemMessageId}` for completed `ExportDataDocument` messages.
9. Job Manager has a dedicated Data Documents menu section with Documents and Export History pages.
10. Job Manager has mock fixtures and store fallback behavior so the UI can run without a live backend. Local mock mode can also be forced with `?mockDataDocuments=true` or `window.localStorage.setItem("JOB_MANAGER_DATA_DOCUMENTS_MOCK", "true")`.

Known implementation gaps:

1. The export sender/worker that renders the queued Data Document into a CSV or JSON file is not implemented yet.
2. Query presets are currently frontend mock/support data only; no persisted Moqui preset entities were added in this pass.
3. Related jobs are frontend mock/support data only; the implemented backend exposes related feeds through `DataFeedDocument`.
4. Permissions are still inherited from the existing REST/service configuration and have not been split into separate Data Document view/edit/run/export permissions.

## Overview

Data Documents will be a first-class Job Manager section, similar to System Messages. Users should not have to discover Data Documents through the job catalog or a generic admin screen.

This feature lets implementation and operations users:

1. Browse existing Moqui Data Documents.
2. Create new Data Documents from Moqui entity metadata.
3. Define fields using direct fields and relation paths.
4. Add structured conditions.
5. Preview results from a saved document.
6. Create reusable query presets.
7. Schedule exports through System Messages.
8. Review export history from generated System Messages.

This feature is not a raw SQL console. Users should build structured Moqui entity-document definitions and runtime query parameters using entity names, field paths, aliases, operators, selected fields, and sort rules.

## Navigation

Data Documents must have a dedicated menu group, matching the System Messages pattern.

Menu group:

```text
Data Documents
  Documents
  Export History
```

Primary routes:

- `/data-documents`: Data Document catalog
- `/data-documents/new`: Create Data Document
- `/data-documents/:id`: Data Document detail
- `/data-documents/:id/edit`: Edit Data Document
- `/data-documents/:id/run`: Query builder and preview
- `/data-documents/:id/presets/new`: Create query preset
- `/data-documents/:id/presets/:presetId`: Run or edit query preset
- `/data-document-export-history`: Export history
- `/data-document-export-history/:systemMessageId`: Export detail, when a separate detail route is needed

The Data Documents menu should not be nested under Catalog. Catalog remains for Service Jobs.

## User Goals

### View Data Documents

Users can browse available `moqui.entity.document.DataDocument` records.

The list should show:

1. Data document ID
2. Document name
3. Primary entity name
4. Document title
5. Field count
6. Condition count
7. Related Data Feeds when available
8. Related Service Jobs when available

Users should be able to search by data document ID, document name, primary entity name, field alias, field path, related feed, or related job.

### Create Data Documents

Users can create Data Documents without editing XML directly.

Required inputs:

1. Data document ID
2. Document name
3. Primary entity name
4. Document title expression
5. Fields
6. Conditions

Field rows must allow:

1. Direct entity fields, such as `productId`
2. Relation paths, such as `product:internalName`
3. Deep relation paths, such as `facility:facilityType:description`
4. Field aliases
5. Default display flag
6. Sequence/order

Relation-path support is required in the first implementation. The builder should help users choose relation paths from metadata, but the model must not be limited to one flat entity.

### Inspect Data Documents

Users can open a document and understand its query shape before running it.

Required sections:

1. Summary
2. Fields
3. Conditions
4. Related feeds
5. Related jobs
6. Saved presets
7. Recent exports

The detail page should answer: what entity does this document start from, which relation paths are included, which conditions always apply, and where is this document currently used?

### Build Custom Queries

Users can run runtime filters on top of a saved Data Document.

A custom query can include:

1. Runtime filters
2. Date filters
3. Selected output fields
4. Sort order
5. Distinct mode
6. Page size

Supported operators:

1. Equals
2. Not equals
3. Contains
4. Starts with
5. In list
6. Is empty
7. Is not empty
8. Greater than
9. Greater than or equal
10. Less than
11. Less than or equal
12. Between

The query builder stores structured JSON, not SQL text.

### Preview Results

Users can preview results before scheduling an export.

Preview behavior:

1. Use server-side pagination.
2. Use selected fields as table columns.
3. Allow filter edits and rerun.
4. Preserve the active run parameters while the user stays on the page.
5. Warn when the query looks too broad.

Preview may call the existing Data Document view execution endpoint when available.

### Schedule Exports

All exports must be scheduled through System Messages.

The app should not treat exports as direct browser-only downloads. The export request should create or queue a System Message, and export history should read from System Message records.

This mirrors the Cycle Count app pattern:

1. Closed count export calls `POST inventory-cycle-count/cycleCounts/export`.
2. The UI tells the user the export was queued.
3. Export History reads `SystemMessage` records filtered by `systemMessageTypeId = ExportInventoryCounts`.
4. Download uses `systemMessageId`.

For Data Documents, the equivalent flow should be:

1. User chooses document, fields, filters, and format.
2. App queues an export.
3. Backend creates a `SystemMessage` for the export.
4. Export History lists Data Document export System Messages.
5. Download retrieves the generated file by `systemMessageId`.

### Export History

Export History is a dedicated Data Documents route and menu item.

History should show:

1. System message ID
2. Data document ID
3. Preset name when applicable
4. File name
5. Started by
6. Init date
7. Processed date
8. Status
9. Record count when available
10. Error summary when failed

Status should come from Moqui System Message status IDs, such as `SmsgProduced`, `SmsgSending`, `SmsgSent`, and `SmsgError`.

## Screen Definitions

### 1. Documents

Catalog of `moqui.entity.document.DataDocument` records.

Required actions:

1. Search
2. Filter by primary entity
3. Filter by related Data Feed
4. Create document
5. Open document
6. Run document

### 2. Document Detail

Detail route for a single Data Document.

Required sections:

1. Metadata
2. Field list
3. Condition list
4. Query presets
5. Related feeds
6. Related jobs
7. Recent export messages

### 3. Document Builder

Create/edit form for Data Document definitions.

Required behavior:

1. Select primary entity.
2. Add direct fields.
3. Add relation-path fields.
4. Add aliases.
5. Add conditions.
6. Validate by previewing a small sample result.

### 4. Query Builder

Runtime query and preview screen.

Required behavior:

1. Display available document fields.
2. Let users choose output columns.
3. Let users add runtime filters.
4. Let users set sort order.
5. Let users toggle distinct mode.
6. Preview paginated results.
7. Save current query as a preset.
8. Schedule export through System Message.

### 5. Export History

List of Data Document export System Messages.

Required behavior:

1. Filter by document.
2. Filter by status.
3. Filter by user.
4. Filter by date range.
5. Download only when the System Message is sent and a file path is available.
6. Link to System Message detail when available.

## Backend Component Ownership

Preferred owner: `maarg-util`.

Local checkout note: I did not find a local `maarg-util` repository under `/Users/adityapatel/Documents/GitHub`. The local Moqui component that currently demonstrates the relevant patterns is `/Users/adityapatel/Documents/GitHub/oms`.

Relevant local references:

1. `/Users/adityapatel/Documents/GitHub/oms/service/oms.rest.xml`
2. `/Users/adityapatel/Documents/GitHub/oms/service/co/hotwax/oms/common/CommonServices.xml`
3. `/Users/adityapatel/Documents/GitHub/oms/data/DocumentData.xml`
4. `/Users/adityapatel/Documents/GitHub/inventory-count/src/views/Closed.vue`
5. `/Users/adityapatel/Documents/GitHub/inventory-count/src/views/ExportHistory.vue`
6. `/Users/adityapatel/Documents/GitHub/inventory-count/src/composables/useInventoryCountRun.ts`

If `maarg-util` is added locally later, the REST resources and services below should be implemented there unless the team decides the shared `oms` component is the right permanent owner.

## API Rules

All CRUD APIs for Data Document configuration should use Moqui entity REST resources. Do not invent custom service contracts for basic list/create/update/delete flows.

The REST XML should follow the existing pattern used in local Moqui components:

```xml
<resource name="dataDocuments">
    <method type="get">
        <entity name="moqui.entity.document.DataDocument" operation="list"/>
    </method>
    <method type="post">
        <entity name="moqui.entity.document.DataDocument" operation="create"/>
    </method>
    <resource name="{dataDocumentId}">
        <method type="get">
            <entity name="moqui.entity.document.DataDocument" operation="one"/>
        </method>
        <method type="put">
            <entity name="moqui.entity.document.DataDocument" operation="update"/>
        </method>
        <method type="delete">
            <entity name="moqui.entity.document.DataDocument" operation="delete"/>
        </method>
        <resource name="fields">
            <method type="get">
                <entity name="moqui.entity.document.DataDocumentField" operation="list"/>
            </method>
            <method type="post">
                <entity name="moqui.entity.document.DataDocumentField" operation="create"/>
            </method>
        </resource>
        <resource name="conditions">
            <method type="get">
                <entity name="moqui.entity.document.DataDocumentCondition" operation="list"/>
            </method>
            <method type="post">
                <entity name="moqui.entity.document.DataDocumentCondition" operation="create"/>
            </method>
        </resource>
    </resource>
</resource>
```

The app API wrapper may name these routes cleanly, but the backend implementation should remain direct entity REST where the operation is entity CRUD.

## Entity REST Contract

### List Documents

```http
GET /rest/s1/admin/dataDocuments
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocument" operation="list"/>
```

### Create Document

```http
POST /rest/s1/admin/dataDocuments
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocument" operation="create"/>
```

### Get Document

```http
GET /rest/s1/admin/dataDocuments/{dataDocumentId}
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocument" operation="one"/>
```

### Update Document

```http
PUT /rest/s1/admin/dataDocuments/{dataDocumentId}
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocument" operation="update"/>
```

### Delete Document

```http
DELETE /rest/s1/admin/dataDocuments/{dataDocumentId}
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocument" operation="delete"/>
```

### List Fields

```http
GET /rest/s1/admin/dataDocuments/{dataDocumentId}/fields
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentField" operation="list"/>
```

Filter by `dataDocumentId`.

### Create Field

```http
POST /rest/s1/admin/dataDocuments/{dataDocumentId}/fields
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentField" operation="create"/>
```

Field payload must support relation paths:

```json
{
  "dataDocumentId": "ProductFacilityAndInventoryItem",
  "fieldSeqId": "10",
  "fieldPath": "product:internalName",
  "fieldNameAlias": "productName",
  "defaultDisplay": "Y"
}
```

### Update Field

```http
PUT /rest/s1/admin/dataDocuments/{dataDocumentId}/fields/{fieldSeqId}
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentField" operation="update"/>
```

### Delete Field

```http
DELETE /rest/s1/admin/dataDocuments/{dataDocumentId}/fields/{fieldSeqId}
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentField" operation="delete"/>
```

### List Conditions

```http
GET /rest/s1/admin/dataDocuments/{dataDocumentId}/conditions
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentCondition" operation="list"/>
```

### Create Condition

```http
POST /rest/s1/admin/dataDocuments/{dataDocumentId}/conditions
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentCondition" operation="create"/>
```

Condition payload:

```json
{
  "dataDocumentId": "NetSuiteShipmentReceiptEvent",
  "conditionSeqId": "01",
  "fieldNameAlias": "returnId",
  "operator": "is-not-null"
}
```

### Update Condition

```http
PUT /rest/s1/admin/dataDocuments/{dataDocumentId}/conditions/{conditionSeqId}
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentCondition" operation="update"/>
```

### Delete Condition

```http
DELETE /rest/s1/admin/dataDocuments/{dataDocumentId}/conditions/{conditionSeqId}
```

Backend:

```xml
<entity name="moqui.entity.document.DataDocumentCondition" operation="delete"/>
```

### Related Feeds

```http
GET /rest/s1/admin/dataDocuments/{dataDocumentId}/feeds
```

Backend:

```xml
<entity name="moqui.entity.feed.DataFeedDocument" operation="list"/>
```

Filter by `dataDocumentId`.

## Query Preview

The local OMS component already includes:

```http
POST /rest/s1/oms/dataDocumentView
```

Depending on route mounting, the same service may also be exposed as:

```http
POST /rest/s1/dataDocumentView
```

Backend service:

```text
co.hotwax.oms.common.CommonServices.get#DataDocumentView
```

This service runs:

```text
DataDocument.${dataDocumentId}
```

Supported inputs found locally:

1. `dataDocumentId`
2. `pageIndex`
3. `pageSize`
4. `customParametersMap`
5. `filterByDate`
6. `fieldsToSelect`
7. `distinct`

This is acceptable for preview because it executes the saved Data Document view. It is not the contract for CRUD.

Preview request:

```json
{
  "dataDocumentId": "ProductFacilityAndInventoryItem",
  "pageIndex": 0,
  "pageSize": 25,
  "customParametersMap": {
    "productId": "10001",
    "facilityId": "WebStoreWarehouse",
    "orderByField": "-^lastUpdatedStamp"
  },
  "fieldsToSelect": ["productId", "productName", "facilityId", "availableToPromiseTotal"],
  "distinct": false
}
```

## Export Contract

Exports are not direct CRUD and should not be modeled as direct Data Document entity operations. They are queueing actions that produce System Messages.

Implemented queue endpoint:

```http
POST /rest/s1/admin/dataDocuments/{dataDocumentId}/exports
```

This endpoint is a service because it orchestrates System Message creation. It creates a `SystemMessage` with `systemMessageTypeId = ExportDataDocument`.

Request:

```json
{
  "presetId": "LowStockByFacility",
  "format": "CSV",
  "fieldsToSelect": ["productId", "productName", "facilityId", "availableToPromiseTotal"],
  "customParametersMap": {
    "facilityId": "WebStoreWarehouse",
    "availableToPromiseTotal_op": "less-than",
    "availableToPromiseTotal": 5
  },
  "orderByField": "facilityId,productId"
}
```

Response:

```json
{
  "systemMessageId": "123456",
  "statusId": "SmsgProduced"
}
```

Export System Message type:

```text
ExportDataDocument
```

Export history should list messages with:

```text
systemMessageTypeId = ExportDataDocument
```

Implemented download endpoint:

```http
GET /rest/s1/admin/dataDocuments/exports/{systemMessageId}
```

The download endpoint returns the generated file only after the System Message has status `SmsgSent` and `messageText` contains a file resource location. In the current implementation, the worker that generates the file and updates the message is still a known gap.

## Query Presets

Query presets are app support data. If no existing Moqui entity covers them, add entities in the owning component.

Candidate entities:

1. `DataDocumentQueryPreset`
2. `DataDocumentQueryPresetField`
3. `DataDocumentQueryPresetFilter`

These should also be exposed through direct Moqui entity REST resources:

```xml
<entity name="co.hotwax.maarg.util.DataDocumentQueryPreset" operation="list"/>
<entity name="co.hotwax.maarg.util.DataDocumentQueryPreset" operation="create"/>
<entity name="co.hotwax.maarg.util.DataDocumentQueryPreset" operation="update"/>
<entity name="co.hotwax.maarg.util.DataDocumentQueryPreset" operation="delete"/>
```

Use the final namespace chosen by the owning component.

## Security Rules

Required permissions:

1. View Data Documents
2. Create Data Documents
3. Update Data Documents
4. Delete Data Documents
5. Run Data Document previews
6. Schedule Data Document exports
7. View Data Document export history
8. Download Data Document exports

Guardrails:

1. Do not expose SQL.
2. Use Moqui artifact/entity authorization for entity REST resources.
3. Restrict create/update/delete to admin users.
4. Restrict export scheduling separately from preview.
5. Record the user in the export System Message payload.
6. Store the export parameters used for each run.
7. Do not download files for errored or still-processing messages.

## Integration With Existing Job Manager Concepts

Data Documents should connect to existing Job Manager areas:

1. **Menu**: Dedicated Data Documents section, peer to System Messages.
2. **System Messages**: All exports are queued, tracked, and downloaded through System Messages.
3. **Catalog**: Service Jobs that run Data Document exports can link to a Data Document or preset.
4. **File History**: If generated export files are also logged through existing file workflows, link them from export history.

## Implementation Phases

### Phase 1: Backend Validation

1. Confirm whether `maarg-util` exists in the active Moqui deployment.
2. If local source is needed, add or locate the local `maarg-util` checkout.
3. Confirm the final REST mount path for Data Document CRUD.
4. Confirm `oms/dataDocumentView` availability in the target instance.
5. Confirm System Message type and send service for Data Document exports.

### Phase 2: Documents Read/Create

1. Add Data Documents menu group.
2. Add Documents catalog.
3. Add create route.
4. Use entity REST for `DataDocument`, `DataDocumentField`, and `DataDocumentCondition`.
5. Support relation-path fields in the builder.

### Phase 3: Query and Preview

1. Add Data Document detail.
2. Add Query Builder.
3. Run previews through `dataDocumentView`.
4. Add query presets through entity REST.

### Phase 4: System Message Exports

1. Add export queue service in the owning Moqui component.
2. Create `ExportDataDocument` System Message type.
3. Add Data Document Export History.
4. Download generated export files by `systemMessageId`.
5. Link export messages back to System Message detail.

## Open Questions

1. Is `maarg-util` the final component owner, or should this live in the shared `oms` component?
2. What exact REST base path should Job Manager call for entity CRUD?
3. What System Message type ID should be used for Data Document exports?
4. Which send service should generate and store the export file?
5. Should export files be delivered only by download, or also to a configured remote?
6. What permissions map to view, edit, run, export, and download?
7. Should query presets be global, user-owned, or security-group scoped?
8. Should Data Document delete be blocked when a document is referenced by feeds, jobs, presets, or export history?
