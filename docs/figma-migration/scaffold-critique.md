# Scaffold Critique

This critiques the first-pass Figma frames created in `Current Job Manager / Route-backed screens`.

## Overall Finding

The frames are route-labeled scaffolds, not migrated Job Manager UI. They should be preserved only as a temporary map of routes, then replaced by frames built from `docs/figma-migration/job-manager-ui-contract.md`.

## Problems To Fix

- The frames reuse the old `Jobs / Home` dashboard card layout instead of each route's actual visible structure.
- Most pages show generic metric cards even when the source UI is search/filter/list, modal-heavy, or detail-form based.
- The current frames do not represent important controls from the code:
  - searchbars and chip filters on Catalog,
  - select filters and config picker modal on File History,
  - segmented detail panels on Job Detail and File Detail,
  - SystemMessageList and DataDocumentExportList result structures,
  - graph-builder field/condition/preview/export sections,
  - Solr progress/list states,
  - Settings profile/store/time-zone/data-fetch sections.
- Modals are not represented except by route notes:
  - Time zone modal,
  - File config filter modal,
  - Job schedule modal,
  - Graph entity/field/related-field/condition/advanced metadata modals,
  - Schedule email export modal.
- The scaffold frames do not capture loading, empty, error, skeleton, pagination, infinite-scroll, unsaved-change, or confirm-alert states.
- The menu was text-adjusted but not structurally rebuilt from the current `ion-menu > ion-list` contract.
- Some inherited components are still old dashboard/card semantics; future frames should use local Ionic component instances that map directly to actual tags.

## Required Replacement Approach

1. Keep scaffold frames only as temporary route markers.
2. Rename the scaffold section so it is not confused with production designs.
3. Build new route frames from the UI contract, starting with a small batch:
   - Shell/menu,
   - Catalog,
   - File History,
   - Job Detail,
   - Settings modal.
4. Validate each new frame with screenshot and component-source audit before moving to the next batch.

## Definition Of Done For A Replacement Frame

- The frame matches the route's documented toolbar, filters, content hierarchy, lists/cards, and main states.
- The frame uses local HC Ionic component families according to the code tag map.
- The frame contains no unrelated inherited card text or scaffold-only content.
- Any page-specific modal or alternate state is either represented nearby or explicitly tracked as pending.
