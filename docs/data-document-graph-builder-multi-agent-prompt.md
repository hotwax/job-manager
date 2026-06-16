# Multi-Agent Implementation Prompt: Data Document Graph Builder

You are a multi-agent engineering team implementing an alternate graph-first Data Document builder for the HotWax Job Manager app.

Work from this spec:

```text
/Users/adityapatel/Documents/GitHub/job-manager-data-document-graph-builder/docs/data-document-graph-builder.md
```

The work must happen in an isolated worktree, not in the user's active dev checkout:

```text
/Users/adityapatel/Documents/GitHub/job-manager-data-document-graph-builder
```

Do not edit:

```text
/Users/adityapatel/Documents/GitHub/job-manager
```

## Goal

Build a production-ready graph-first Data Document builder that lets users visualize Data Documents as query diagrams:

1. Primary entity as the root node.
2. Related entities as joined nodes.
3. Relationship paths as connecting edges.
4. Edge labels that show relationship names, relationship type, and join summary when available.
5. Node and edge inspectors for fields, aliases, flags, functions, and conditions.
6. Preview and export using the existing Data Document runtime contracts.

This feature must preserve the default Moqui Data Document capabilities. Do not ship a graph-only simplification that drops Moqui features.

## Hard Constraints

1. Use core Ionic components for the surrounding app shell, forms, modals, drawers, and action controls.
2. Do not use `ion-grid`.
3. Do not use Ionic grid utility classes.
4. Keep all screens mobile-compatible.
5. Remove duplicate information from screens.
6. Preserve existing Data Document REST and System Message export contracts.
7. Do not introduce SQL editing.
8. Do not change saved `fieldPath` strings unless the user explicitly edits that field.
9. Keep mock mode usable without a live backend.
10. Keep `/Users/adityapatel/Documents/GitHub/job-manager/docs` untouched unless the user explicitly moves the work out of the isolated worktree.
11. The graph canvas, graph nodes, graph edges, labels, selection states, and diagram-specific layout may use non-Ionic markup/components and custom CSS local to the graph builder component.

## Required Reference Review

Before implementation, inspect and summarize the relevant behavior from:

1. `docs/data-document-graph-builder.md`
2. `docs/data-documents.md`
3. `src/views/DataDocumentBuilder.vue`
4. `src/views/DataDocumentQueryPreview.vue`
5. `src/store/dataDocuments.ts`
6. `src/mock/dataDocuments.ts`
7. `src/store/util.ts`
8. `/Users/adityapatel/Documents/GitHub/hotwax-maarg-util/docs/DataDocumentsBackend.md`
9. `/Users/adityapatel/Documents/GitHub/hotwax-maarg-util/service/admin.rest.xml`
10. `/Users/adityapatel/Documents/GitHub/hotwax-maarg-util/service/co/hotwax/util/DataDocumentServices.xml`
11. Moqui default screen: `https://dev-maarg.hotwax.io/qapps/system/DataDocument/Edit/DataDocFields?dataDocumentId=PicklistRole`
12. Moqui default metadata screen: `https://dev-maarg.hotwax.io/qapps/system/DataDocument/Edit/EditDataDocument?dataDocumentId=PicklistRole`
13. Official Moqui docs: `https://www.moqui.org/m/docs/framework/Data%20and%20Resources/Data%20Document`

## Agent Roles

### Agent 1: Product And Spec Steward

Owns product completeness and documentation truth.

Tasks:

1. Keep `docs/data-document-graph-builder.md` updated with actual implementation decisions.
2. Maintain a capability checklist against the default Moqui screens.
3. Verify the graph builder does not omit metadata, fields, conditions, rel aliases, links, feeds, user groups, preview, or export.
4. Record any backend gaps as explicit implementation blockers or follow-up tasks.
5. Keep wording aligned with Job Manager and Moqui terminology.

Expected output:

1. Updated spec.
2. Capability checklist.
3. Known gaps.
4. Acceptance criteria.

### Agent 2: Moqui Capability Researcher

Owns Moqui Data Document semantics and backend contract discovery.

Tasks:

1. Verify exact entity names and field names for:
   - `DataDocument`
   - `DataDocumentField`
   - `DataDocumentCondition`
   - `DataDocumentRelAlias`
   - `DataDocumentLink`
   - `DataFeedDocument`
2. Verify that `DataDocumentCondition` uses `fieldValue`, `toFieldNameAlias`, and `postQuery`.
3. Verify field flags for sortable, display/default display, and `functionName`.
4. Verify how user groups are represented for Data Documents.
5. Verify relationship metadata endpoints available to Job Manager.
6. Verify relationship type and key-map data needed to label graph edges.
7. Verify exact REST endpoints needed for rel aliases and links.
8. Update the spec before UI/store work depends on guessed names.

Expected output:

1. Backend capability notes.
2. Exact field-name mapping.
3. Exact REST endpoint list.
4. Any unresolved backend questions.

### Agent 3: Graph Architecture Engineer

Owns graph projection, parsing, validation, and serialization.

Tasks:

1. Implement `src/utils/dataDocumentGraph.ts`.
2. Convert Data Document records into graph nodes, edges, fields, conditions, rel aliases, links, feeds, and validation issues.
3. Preserve exact `fieldPath` values on round trip.
4. Parse `:` relationship segments.
5. Preserve `#` title-qualified relationship segments.
6. Support full entity relationship names and short aliases.
7. Attach direct fields to the primary node.
8. Attach relation fields to terminal related nodes.
9. Attach conditions to fields where possible.
10. Produce validation issues for duplicate output names, missing aliases, invalid references, and unverified metadata.
11. Serialize graph edits back into existing Moqui records.

Expected output:

1. Graph utility module.
2. Focused unit tests.
3. Mock graph fixtures.
4. Notes on unsupported or ambiguous Moqui semantics.

### Agent 4: Store And API Engineer

Owns Pinia stores, API calls, mock fallback, and integration with existing stores.

Tasks:

1. Extend existing `src/store/dataDocuments.ts` only where shared API methods belong.
2. Add `src/store/dataDocumentGraph.ts` for graph-specific state.
3. Add fetch/save support for rel aliases, links, feeds, and any user group records confirmed by Agent 2.
4. Add relationship metadata loading through `src/store/util.ts` or a graph-specific metadata store.
5. Keep mock fallback behavior for graph data.
6. Keep preview calling `oms/dataDocumentView`.
7. Keep export queueing through `admin/dataDocuments/{dataDocumentId}/exports`.
8. Add tests for API payload shape and mock fallback.

Expected output:

1. Store changes.
2. API method list.
3. Mock fixtures.
4. Unit tests.

### Agent 5: Ionic Graph UI Engineer

Owns the user-facing graph builder.

Tasks:

1. Add `src/views/DataDocumentGraphBuilder.vue`.
2. Add routes:
   - `/data-documents/new/graph`
   - `/data-documents/:id/graph`
3. Add entry actions from the document detail or builder route without removing the existing form builder.
4. Build the graph canvas with SVG/custom Vue markup for v1 unless Agent 3 proves a graph library is necessary.
5. Build the left entity/relationship browser with Ionic components.
6. Build the right inspector with Ionic components.
7. Build the bottom drawer for validation, generated fields, preview, and export.
8. Implement node selection, edge selection, add field, add relationship path, add condition, alias edit, display/sort/function edit, preview, and export queue interactions.
9. Keep mobile behavior usable with modals/sheets and stacked preview rows.
10. You may add custom CSS local to `DataDocumentGraphBuilder.vue` for the graph canvas, nodes, edges, responsive diagram layout, and diagram selection states. Keep non-graph controls in Ionic where practical.

Expected output:

1. New graph builder view.
2. Route/menu/detail entry points.
3. Working interactions against mock data.
4. Browser smoke-test notes.

### Agent 6: QA And Integration Engineer

Owns verification and final readiness.

Tasks:

1. Run unit tests:
   ```sh
   pnpm --filter job-manager test:unit
   ```
2. Run build:
   ```sh
   pnpm --filter job-manager build
   ```
3. Start local app from accxui workspace root:
   ```sh
   pnpm --filter job-manager dev
   ```
4. Browser smoke-test desktop and mobile.
5. Verify mock mode with:
   ```text
   ?mockDataDocuments=true
   ```
6. Verify the active checkout at `/Users/adityapatel/Documents/GitHub/job-manager` remains untouched.
7. Report exact changed files and test results.

Expected output:

1. Pass/fail checklist.
2. Browser notes.
3. Remaining risks.
4. Confirmation that the active checkout was not modified.

## Implementation Order

1. Product/spec steward and Moqui researcher complete capability mapping.
2. Graph architecture engineer adds graph projection utility and tests.
3. Store/API engineer adds missing data access and mock graph fixtures.
4. UI engineer builds read-only graph visualization.
5. UI engineer adds inspectors and edit interactions.
6. Store/API engineer wires save, preview, and export.
7. QA engineer runs unit tests and build.
8. QA engineer browser-tests desktop and mobile.
9. Spec steward updates documentation with final behavior and known gaps.

## Capability Checklist

The final implementation is not complete unless it covers or explicitly documents every item below.

Document metadata:

1. Data document ID
2. Name
3. Primary entity
4. Title
5. Index name
6. Manual data service
7. Clone or duplicate flow, if keeping parity with Moqui default is in scope

Fields:

1. Sequence
2. Field path
3. Alias
4. Sortable
5. Display/default display
6. Function name (`functionName`)
7. Manual field add
8. Delete
9. Update-all equivalent
10. Duplicate output name warning

Relationships:

1. Direct field path
2. Short relationship path
3. Full relationship path
4. Deep path
5. `#` title-qualified path
6. Type-one relationship
7. Type-many relationship
8. Relationship alias
9. Unverified manual path

Conditions:

1. Field
2. Operator
3. Value
4. To field
5. Post query (`postQuery`)
6. Add
7. Delete

Related configuration:

1. User groups
2. Data feeds
3. Links

Runtime:

1. Preview
2. Selected fields
3. Runtime filters
4. Sort
5. Distinct
6. Date filter
7. Page size
8. Export queue
9. Export history
10. Export download

## Test Scenarios

Unit tests:

1. Convert a document with only direct fields into one root node.
2. Convert a document with deep fields into multiple nodes and edges.
3. Preserve full path strings with package names.
4. Preserve `#` relationship title segments.
5. Detect duplicate field output names.
6. Resolve duplicate output names after alias update.
7. Serialize graph fields back to original `DataDocumentField` records.
8. Attach conditions to existing field aliases.
9. Keep unverified relationship paths editable.
10. Build preview payload compatible with `oms/dataDocumentView`.
11. Build export payload compatible with `ExportDataDocument`.

Browser tests:

1. Catalog can open graph builder.
2. Existing mock document renders graph.
3. Selecting a node opens node inspector.
4. Selecting an edge opens edge inspector.
5. Adding a field updates node count and generated field list.
6. Adding a condition updates validation and preview payload.
7. Duplicate field output names are visible before save.
8. Preview shows rows.
9. Export queues a System Message.
10. Mobile viewport can open browser, inspector, validation, and preview.

## Completion Requirements

Before final handoff:

1. All changed files are in `/Users/adityapatel/Documents/GitHub/job-manager-data-document-graph-builder`.
2. No files are changed in `/Users/adityapatel/Documents/GitHub/job-manager`.
3. `git status --short` in the isolated worktree contains only intentional changes.
4. Unit tests and build have been run or documented as blocked with exact error output.
5. Browser smoke-test has been run or documented as blocked with exact reason.
6. The spec reflects the actual implemented behavior.
