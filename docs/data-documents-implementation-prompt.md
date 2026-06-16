# Multi-Agent Implementation Prompt: Data Documents in Job Manager

You are a multi-agent engineering team implementing the Data Documents feature for the HotWax Job Manager app and the supporting Moqui backend. Work from the product/technical spec in:

```text
/Users/adityapatel/Documents/GitHub/job-manager/docs/data-documents.md
```

The end state must include:

1. Moqui backend support for Data Document CRUD, query preview, and System Message-backed exports.
2. Job Manager UI for a dedicated Data Documents menu section.
3. Mock-data support so the UI can be developed and smoke-tested without a live backend.
4. Verification that the browser UI works locally.
5. Updates to the spec doc so it matches what actually got implemented.

## Hard Requirements

Follow these constraints exactly:

1. Data Documents must be a dedicated Job Manager menu section, parallel to System Messages.
2. The section must include at least:
   - Documents
   - Export History
3. Data Document CRUD APIs must be Moqui entity REST resources, not custom service contracts.
4. Data Document fields must support relation paths, not only flat primary-entity fields.
5. Export requests must always be queued through System Messages.
6. Export history must be read from System Message records.
7. The UI must work against mock data and against real APIs.
8. Keep `/Users/adityapatel/Documents/GitHub/job-manager/docs/data-documents.md` updated as implementation decisions are finalized.
9. In Ionic code, use core Ionic components, avoid `ion-grid`, keep screens mobile-compatible, and do not write CSS unless explicitly requested.

## Known Local References

Use these local repos as implementation references:

```text
/Users/adityapatel/Documents/GitHub/job-manager
/Users/adityapatel/Documents/GitHub/accxui
/Users/adityapatel/Documents/GitHub/oms
/Users/adityapatel/Documents/GitHub/inventory-count
```

Reference patterns:

1. Job Manager System Message routes and menu:
   - `job-manager/src/router/index.ts`
   - `job-manager/src/components/Menu.vue`
   - `job-manager/src/store/systemMessage.ts`
2. Existing Job Manager API/store style:
   - `job-manager/src/store/jobs.ts`
3. Moqui entity REST resource patterns:
   - `oms/service/oms.rest.xml`
4. Existing Data Document preview service:
   - `oms/service/co/hotwax/oms/common/CommonServices.xml`
   - `POST /rest/s1/oms/dataDocumentView`
5. Cycle Count System Message export pattern:
   - `inventory-count/src/views/Closed.vue`
   - `inventory-count/src/views/ExportHistory.vue`
   - `inventory-count/src/composables/useInventoryCountRun.ts`

The preferred backend component owner is `maarg-util`. If that local checkout is not available, inspect the active Moqui component layout and use the closest existing shared component pattern. Do not silently invent a component path without documenting the decision in the spec.

## Agent Assignments

### Agent 1: Backend Moqui Entity REST

Owns Moqui REST resources for Data Document configuration.

Tasks:

1. Locate the correct backend component for this feature. Prefer `maarg-util`; if missing locally, document the fallback component decision.
2. Add or update REST resources for:
   - `moqui.entity.document.DataDocument`
   - `moqui.entity.document.DataDocumentField`
   - `moqui.entity.document.DataDocumentCondition`
   - `moqui.entity.feed.DataFeedDocument`
3. Use direct Moqui entity REST operations:
   - `list`
   - `one`
   - `create`
   - `update`
   - `delete`
4. Ensure field CRUD supports `fieldPath` values that contain relation paths such as `product:internalName`.
5. Add backend tests or at least runnable verification notes for each REST resource.
6. Record exact implemented endpoint paths in `docs/data-documents.md`.

Expected output:

1. Backend files changed.
2. Endpoint list.
3. Verification commands/results.
4. Spec updates for actual REST paths.

### Agent 2: Backend System Message Export

Owns Data Document export queueing and download.

Tasks:

1. Inspect the Cycle Count export implementation and mirror its System Message-backed pattern.
2. Add a Data Document export queue service only where orchestration is needed.
3. Create or seed the System Message Type for Data Document exports, for example `ExportDataDocument` unless a better existing name is found.
4. Queue exports by creating a System Message with:
   - `dataDocumentId`
   - selected fields
   - runtime filters
   - export format
   - requesting user
   - output file metadata when complete
5. Add export-history query support using `SystemMessage` records.
6. Add download support by `systemMessageId`.
7. Update the spec with the actual System Message type ID, service names, payload, statuses, and download endpoint.

Expected output:

1. Export service/data files changed.
2. System Message Type seed data.
3. Export queue and download contract.
4. Verification notes.
5. Spec updates for implemented export behavior.

### Agent 3: Job Manager Data Documents UI

Owns routes, menu, pages, and user flows.

Tasks:

1. Add a Data Documents menu section parallel to System Messages.
2. Add routes:
   - `/data-documents`
   - `/data-documents/new`
   - `/data-documents/:id`
   - `/data-documents/:id/edit`
   - `/data-documents/:id/run`
   - `/data-document-export-history`
3. Build pages using core Ionic components:
   - Documents catalog
   - Document detail
   - Create/edit document
   - Query builder/preview
   - Export history
4. Do not use `ion-grid`.
5. Do not add CSS unless explicitly approved.
6. Keep UI mobile-compatible.
7. Remove duplicate information from screens.
8. Wire UI actions to store methods and mock fallback.

Expected output:

1. Vue route/menu/page changes.
2. Store/composable integration.
3. Screens working locally.
4. Spec updates if routes or flows differ from the initial plan.

### Agent 4: Job Manager Data Store and Mock Data

Owns frontend data access and mock behavior.

Tasks:

1. Create a Data Documents store/composable matching existing Job Manager patterns.
2. Support real API calls for:
   - list documents
   - get document
   - create/update document
   - list/create/update/delete fields
   - list/create/update/delete conditions
   - preview document results
   - queue export
   - list export history
   - download export
3. Add mock fixtures for:
   - Data Documents with relation-path fields
   - Fields
   - Conditions
   - Query preview rows
   - Export System Messages
4. Ensure the UI can run without a live backend.
5. Add focused unit tests where store behavior has meaningful branching.

Expected output:

1. Store/composable files.
2. Mock fixtures.
3. Test results.
4. Spec updates for actual frontend data shapes.

### Agent 5: Integration, QA, and Spec Steward

Owns end-to-end integration and documentation truth.

Tasks:

1. Keep `docs/data-documents.md` synchronized with what is actually implemented.
2. Run local build/type/lint/test commands that are appropriate for the changed files.
3. Start the Job Manager app locally from the `accxui` workspace root.
4. Browser-smoke-test:
   - Data Documents menu appears.
   - Documents catalog loads with mock data.
   - Create document flow saves a mock/real record.
   - Relation-path fields render and persist.
   - Query preview returns rows.
   - Export queues a System Message.
   - Export History shows queued/generated messages.
5. Capture any known gaps in the spec under an implementation status section.

Expected output:

1. Verification checklist with pass/fail status.
2. Browser smoke-test notes.
3. Final spec updates.
4. Known gaps and next steps.

## Coordination Rules

1. Do not overwrite another agent's files without checking current changes.
2. Keep backend and frontend endpoint names aligned through the spec.
3. If actual Moqui entity names differ from the spec, update the spec immediately.
4. If `maarg-util` is unavailable locally, document the chosen backend component before implementing.
5. Prefer direct entity REST for CRUD; use services only for export orchestration and preview execution.
6. Keep implementation incremental: get read/list/mock working first, then create/edit, then preview, then export.
7. Do not leave the UI dependent on unavailable backend endpoints; mock mode must remain usable.

### Agent 6: Researcher

Owns documentation and research.

Tasks:

1. Keep `docs/data-documents.md` synchronized with what is actually implemented.
2. Research and document the Moqui entity REST patterns for Data Documents in other local moqui repos.
3. Research and document the Moqui entity REST patterns for System Messages in other local moqui repos.
4. Research and document the Moqui entity REST patterns for Job Manager in other local moqui repos like oms, poorti, maarg-util.
5. Keep implementation incremental: get read/list/mock working first, then create/edit, then preview, then export.
6. Do not leave the UI dependent on unavailable backend endpoints; mock mode must remain usable.
7. Analyze existing UI patters in the job manager app and other apps to make sure the UI you develop is consistent with existing UI patterns.


## Suggested Implementation Order

1. Backend discovery and endpoint finalization.
2. Frontend mock store and route/menu skeleton.
3. Documents catalog and detail with mock data.
4. Entity REST CRUD wiring.
5. Create/edit builder with relation-path fields.
6. Query preview using `dataDocumentView`.
7. System Message-backed export queue.
8. Export History.
9. Browser smoke test.
10. Final spec reconciliation.

## Verification Commands

Use the repo’s workspace flow from `/Users/adityapatel/Documents/GitHub/accxui`:

```sh
pnpm --filter job-manager dev
pnpm --filter job-manager build
pnpm --filter job-manager test:unit
```

If build/test commands fail because of pre-existing unrelated issues, record the exact failure and still smoke-test the changed feature in the browser.

## Final Deliverable

At completion, provide:

1. Backend files changed.
2. Frontend files changed.
3. Mock-data files changed.
4. Spec sections updated.
5. Endpoint list with implemented status.
6. Test/build/smoke-test results.
7. Known gaps, if any.

