# Job Manager Figma Migration UI Contract

Source of truth: `origin/main` at `f7b3d6931205f112ba52e724780d5f1eb9e081d1`.

This document is the migration contract for rebuilding the HC Ionic design system Job Manager page. Figma frames should not be considered current unless they satisfy the relevant route or modal contract below.

## Migration Stages

1. Archive old job-domain explorations.
   - Mark old sections with `Archive /`.
   - Move archived work away from the current production workspace.
   - Preserve old work as reference; do not delete it.

2. Build current production workspace.
   - One route-backed frame per major routed page.
   - Separate modal/state frames for important workflows.
   - Use the current menu from `src/components/Menu.vue`.

3. Replace scaffold frames.
   - Existing placeholder frames with generic metric cards are scaffold only.
   - Replace them with route-specific layouts documented here.

4. Validate.
   - Visible controls must use the local HC Ionic component family that matches the code tag.
   - Screenshots must show readable frames without stale labels, clipping, or unrelated inherited content.

## Shell And Menu

Source: `src/components/Menu.vue`.

- Shell: `ion-menu` start side, `ion-header`, `ion-toolbar`, `ion-title` "Job Manager", `ion-content`, `ion-list`, `ion-footer`.
- First action: `Legacy App` item with `openOutline`.
- Menu groups:
  - Dashboard: `/pipeline`, `pulseOutline`.
  - Jobs: section divider, `Catalog` route `/catalog`, `albumsOutline`, child route `/job/`.
  - MDM: section divider, `File history` route `/file-history`, `timeOutline`; `Manual uploads` route `/manual-uploads`, `cloudUploadOutline`.
  - System Messages: section divider, `Monitor`, `Message Types`, `Remote Systems`.
  - Data Documents: section divider, `Documents`, `Export History`; `Feeds` is commented out and archive-only.
  - System Health: section divider, `Solr Monitoring`, `Solr Repair`.
  - Settings: section divider, `Settings`.
- Footer:
  - OMS URL item with user time zone in end note.
  - Product store select when more than two stores exist, otherwise static store label.
- Figma requirements:
  - Menu parent must be represented as a local Ionic `List`/item-backed navigation structure.
  - Menu rows must keep start icons where code renders `ion-icon slot="start"`.
  - Footer store selector must map to Select, not Input.

## Route Contracts

### Dashboard

- Route: `/pipeline`
- Source: `src/views/Pipeline.vue`
- Toolbar: menu button, title `Dashboard`, refresh action.
- Main structure:
  - KPI cards for job schedules, failed high-priority jobs, failed standard jobs, incoming message errors, outgoing message errors.
  - Queue Operations Map card with operational layout of ingestion and message sync queues.
  - Service Jobs Diagnostics card with warnings and actionable job rows.
  - Loading, empty, healthy, and error states.
- Components: toolbar, buttons, cards, chips, badges, lists, items, spinner/progress states.
- Figma frame: `Dashboard`.

### Jobs - Catalog

- Route: `/catalog`
- Source: `src/views/Catalog.vue`
- Toolbar: menu button, title `Catalog`; create job action exists in code but is commented out.
- Main structure:
  - Top search/filter card with `ion-searchbar`.
  - Parent category chip row, subcategory chip row, status chip row.
  - Loading skeleton job cards.
  - Job cards with title, description, lock/draft status, paused/scheduled/no-schedule status row, and detail navigation.
  - Empty search state.
- Components: Searchbar, Chip, Card, Item, Button, Icon, skeleton states.
- Figma frame: `Jobs - Catalog`.

### Jobs - Job Detail

- Route: `/job/:jobName`
- Source: `src/views/JobDetail.vue`
- Toolbar: back button, job title, pause/resume action when job supports it.
- Main structure:
  - Loading skeleton state.
  - Header/status area with job name, paused/running badges, run now action.
  - Segments: `Overview`, `Parameters`, `History`.
  - Overview: job info card, schedule card, grouped parameter lists.
  - Parameters: editable parameter form with required/optional handling, save/cancel.
  - History: run history list with infinite scroll.
  - Schedule modal for editing cron/frequency.
- Components: Segment, Accordion, Card, List, Item, Input, Chip, Badge, Button, Modal, Infinite Scroll.
- Figma frames: `Jobs - Job Detail`, `Modal - Job Schedule`.

### MDM - File History

- Route: `/file-history`
- Source: `src/views/FileHistory.vue`
- Toolbar: menu button, title `File history`.
- Main structure:
  - KPI cards: total files, successful, failed, success rate, average time.
  - Filter card with searchbar, status select, priority select, config selector trigger.
  - Selected filter chips.
  - Paginated log list.
  - Cancel pending log action and confirm alert.
  - Config picker modal with search and checkbox multi-select.
- Components: Searchbar, Select, Checkbox, Chip, Badge, Card, List, Item, Modal, Button.
- Figma frames: `MDM - File History`, `Modal - File Config Filter`, `Alert - Cancel Pending File`.

### MDM - File Detail

- Route: `/file-history/:id`
- Source: `src/views/FileHistoryDetail.vue`
- Toolbar: back button, title `File Details`.
- Main structure:
  - Execution Details card.
  - Timeline card.
  - Payload viewer with copy/download buttons.
  - Segment tabs for payload variants.
  - Payload search.
  - Loading, JSON, CSV/text, empty, and error states.
- Components: Back Button, Card, List, Item, Badge, Chip, Segment, Searchbar, Spinner, Buttons.
- Figma frame: `MDM - File Detail`.

### MDM - Manual Uploads

- Route: `/manual-uploads`
- Source: `src/views/ManualUploads.vue`
- Toolbar: menu button, title `Manual Uploads`.
- Main structure:
  - Searchbar for upload configs.
  - Loading state.
  - Upload config cards with import action.
  - Empty state.
- Components: Searchbar, Card, Item, Button, Spinner.
- Figma frame: `MDM - Manual Uploads`.

### MDM - Upload Detail

- Route: `/manual-uploads/:type`
- Source: `src/views/ImportDetail.vue`
- Toolbar: back button, title from config script title/config id/type.
- Main structure:
  - Import summary and queue type.
  - Download template action.
  - Drag/drop or choose file area.
  - Selected file row with remove action.
  - Start import action.
  - Missing config state.
- Components: Back Button, Button, Icon, Note, Label, file input representation.
- Figma frame: `MDM - Upload Detail`.

### System Messages - Monitor

- Route: `/system-messages`
- Source: `src/views/SystemMessageMonitor.vue`, `src/components/SystemMessageList.vue`
- Toolbar: menu button, title `System Message Monitor`.
- Main structure:
  - Searchbar.
  - Select filters for status, parent type, message type, and remote system.
  - Paginated `SystemMessageList`.
  - Empty state.
- Components: Searchbar, Select, Card, List, Item, Badge, Button, Note.
- Figma frame: `System Messages - Monitor`.

### System Messages - Message Detail

- Routes: `/system-messages/:id`, `/data-document-export-history/:id`
- Source: `src/views/SystemMessageDetailView.vue`
- Toolbar: back button, title `Message Detail`.
- Main structure:
  - Loading skeleton state.
  - Message status summary.
  - Journey map / sequence lifecycle.
  - Status history.
  - Linked messages.
  - Technical message/type/remote details.
  - Payload fields and textarea blocks.
  - Optional thumbnails/attachments.
- Components: Card, List, Item, Item Divider, Chip, Badge, Textarea, Thumbnail, Skeleton.
- Figma frame: `System Messages - Message Detail`; export detail can reference this frame.

### System Messages - Message Types

- Route: `/system-message-types`
- Source: `src/views/SystemMessageTypes.vue`
- Toolbar: menu button, title `Message Types`, create action.
- Main structure:
  - Searchbar.
  - Type cards.
  - Empty state.
- Components: Searchbar, Card, Button, Note.
- Figma frame: `System Messages - Message Types`.

### System Messages - Message Type Detail

- Routes: `/system-message-types/new`, `/system-message-types/:id`
- Source: `src/views/SystemMessageTypeDetail.vue`
- Toolbar: back button, create/edit title, save and delete actions.
- Main structure:
  - Configuration card with textarea/input/select controls.
  - Related messages search/filter/list using `SystemMessageList`.
  - New, edit, and delete states.
- Components: Input, Textarea, Searchbar, Select, Card, Button, SystemMessageList.
- Figma frame: `System Messages - Message Type Detail`.

### System Messages - Remote Systems

- Route: `/system-message-remotes`
- Source: `src/views/SystemMessageRemotes.vue`
- Toolbar: menu button, title `Remote Systems`, create action.
- Main structure:
  - Searchbar.
  - Remote system cards.
  - Empty state.
- Components: Searchbar, Card, Button, Note.
- Figma frame: `System Messages - Remote Systems`.

### System Messages - Remote System Detail

- Routes: `/system-message-remotes/new`, `/system-message-remotes/:id`
- Source: `src/views/SystemMessageRemoteDetail.vue`
- Toolbar: back button, create/edit title, save and delete actions.
- Main structure:
  - Configuration card with textarea/input/select controls.
  - Related messages search/filter/list using `SystemMessageList`.
  - New, edit, and delete states.
- Components: Input, Textarea, Searchbar, Select, Card, Button, SystemMessageList.
- Figma frame: `System Messages - Remote System Detail`.

### Data Documents - Documents

- Route: `/data-documents`
- Source: `src/views/DataDocumentCatalog.vue`
- Toolbar: menu button, title `Data Documents`, create graph action.
- Main structure:
  - Searchbar.
  - Primary entity select.
  - Feed select.
  - Document cards with detail item, metadata list, related feeds/jobs, preview action, export history action.
  - Empty state.
- Components: Searchbar, Select, Card, List, Item, Button, Text.
- Figma frame: `Data Documents - Documents`.

### Data Documents - Graph Builder

- Route: `/data-documents/:id/graph`
- Source: `src/views/DataDocumentGraphBuilder.vue`
- Toolbar: back button, title `Graph Builder`, save and queue export actions.
- Main structure:
  - Metadata card: primary entity picker, document id/title inputs, advanced metadata.
  - Graph/relationship builder panel.
  - Field/relationship inspector.
  - Conditions panel.
  - Segments: Issues, Fields, Conditions, Preview, Usage, Exports.
  - Preview table.
  - Recent export history list.
  - Unsaved changes guard alert when navigating away.
- Components: Input, Select, Checkbox, Toggle, Segment, Modal, Radio Group, Progress Bar, Card, List, Item, DataDocumentPreviewTable, DataDocumentExportList.
- Figma frames: `Data Documents - Graph Builder`, plus modal frames below.

### Data Documents - Export History

- Route: `/data-document-export-history`
- Source: `src/views/DataDocumentExportHistory.vue`, `src/components/DataDocumentExportList.vue`
- Toolbar: menu button, title `Data Document Export History`.
- Main structure:
  - Searchbar.
  - Document select.
  - Status select.
  - From date input.
  - Thru date input.
  - Page size input.
  - Pagination and export list.
  - Empty state.
- Components: Searchbar, Select, Input, Button, Note, DataDocumentExportList.
- Figma frame: `Data Documents - Export History`.

### System Health - Solr Monitoring

- Route: `/solr-monitoring`
- Source: `src/views/SolrMonitoring.vue`
- Toolbar: menu button, title `Solr Monitoring`, link to repair, refresh action.
- Main structure:
  - Search health card.
  - Collections visibility/status card.
  - Core pings card.
  - API coverage card.
  - Key metrics card.
  - Refresher and loading states.
- Components: Card, List, Item, Badge, Progress Bar, Refresher, Spinner, Button.
- Figma frame: `System Health - Solr Monitoring`.

### System Health - Solr Repair

- Route: `/solr-repair`
- Source: `src/views/SolrRepair.vue`
- Toolbar: menu button, title `Solr Repair`, link to monitoring, refresh action.
- Main structure:
  - Index operations card with rebuild action and progress/status.
  - Repair one record card.
  - Order/Product segment.
  - Searchbar and search action.
  - Search results list with per-record reindex action.
  - Loading/no-match states.
- Components: Card, List, Item, Badge, Progress Bar, Searchbar, Segment, Spinner, Button.
- Figma frame: `System Health - Solr Repair`.

### Settings

- Route: `/settings`
- Source: `src/views/Settings.vue`
- Toolbar: menu button, title `Settings`.
- Main structure:
  - User profile card with avatar image, username, full name/party id, logout, launchpad.
  - OMS card.
  - Product store select.
  - App update card.
  - Time zone card with modal trigger.
  - Data fetch status card with refresh actions for user profile, permissions, entities, status transitions.
- Components: Avatar/Image, Card, List, Item, Select, Button, Modal, Searchbar, Radio Group, FAB, Spinner.
- Figma frames: `Settings`, `Modal - Time Zone`.

## Modal And Alert Contracts

### Modal - Time Zone

- Source: `src/views/Settings.vue`.
- Trigger: `time-zone-modal`.
- Structure: modal header toolbar with close icon button, title `Select time zone`, searchbar, browser time zone section, alternative time zone list, radio group, bottom-right save FAB.
- Components: Modal, Toolbar, Searchbar, List, List Header, Item, Radio, FAB.

### Modal - File Config Filter

- Source: `src/views/FileHistory.vue`.
- Structure: modal header toolbar with close icon button, title `Select Config`, searchbar, checkbox list, selected configs.
- Components: Modal, Toolbar, Searchbar, List, Item, Checkbox.

### Modal - Job Schedule

- Source: `src/views/JobDetail.vue`.
- Structure: modal for editing schedule/frequency, input fields, save/cancel actions.
- Components: Modal, Toolbar, Input, Button.

### Modal - Graph Entity Picker

- Source: `src/views/DataDocumentGraphBuilder.vue`.
- Structure: title `Select Primary Entity`, searchbar toolbar, grouped entity list, radio selection.
- Components: Modal, Toolbar, Searchbar, List, Item Divider, Item, Radio.

### Modal - Graph Field Picker

- Source: `src/views/DataDocumentGraphBuilder.vue`.
- Structure: close/back button, title from field modal state, refresh button, searchbar, fields section, related entities section, checkbox/radio selection.
- Components: Modal, Toolbar, Searchbar, List, Item Divider, Item, Checkbox, Radio, Icon Button.

### Modal - Graph Related Field Picker

- Source: `src/views/DataDocumentGraphBuilder.vue`.
- Structure: related field selection, grouped fields, checkbox support, save action.
- Components: Modal, Toolbar, Searchbar, List, Item, Checkbox, Button.

### Modal - Graph Condition Editor

- Source: `src/views/DataDocumentGraphBuilder.vue`.
- Structure: condition field/alias/operator/value controls, save/cancel action.
- Components: Modal, Toolbar, Select, Input, Button.

### Modal - Advanced Metadata

- Sources: `src/views/DataDocumentGraphBuilder.vue`, `src/views/DataDocumentFormView.vue`.
- Structure: metadata inputs for package/service/document metadata.
- Components: Modal, Toolbar, List, Item, Input.

### Modal - Schedule Email Export

- Source: `src/components/ScheduleEmailExportModal.vue`.
- Trigger: Graph Builder queue/schedule export.
- Structure: modal controller component with form fields and confirm/cancel.
- Components: Modal shell, Toolbar, Input/Select controls, Button.

### Modal - Create Job

- Source: `src/components/CreateJobModal.vue`.
- Trigger: currently commented in `Catalog.vue`, so archive/reference until the create action is active.
- Components: Modal controller form.

### Alert - Unsaved Graph Changes

- Source: `src/router/index.ts`.
- Trigger: navigating away from dirty graph builder.
- Buttons: Cancel, Discard, Save.

### Alert - Cancel Pending File

- Source: `src/views/FileHistory.vue`.
- Trigger: cancel pending log action.
- Confirm/cancel action.

## Archive-Only Views

- `DataDocumentFeeds.vue` and `DataDocumentFeedDetail.vue`: route entries are commented out in `src/router/index.ts`; preserve as archive/reference only.
- `DataDocumentFormView.vue`: not routed directly; it is embedded inside graph builder field/condition workflows and informs graph-builder modal design.
- Old Figma job-domain sections such as POS, ERP, WMS, Pre-order, Orders, Inventory, Products, Bulk editor, Miscellaneous, Initial load, and old Pipeline are archive/reference material, not current production IA.

## Component Mapping

- `ion-menu` -> local Job Manager menu shell, built from local Ionic List/Item/Toolbar components.
- `ion-toolbar` / `ion-title` -> local Toolbar.
- `ion-searchbar` -> local Searchbar.
- `ion-select` -> local Select or select-capable Item; never Input.
- `ion-input` / `ion-textarea` -> local Input/Textarea field representation.
- `ion-checkbox` -> local Checkbox.
- `ion-radio` / `ion-radio-group` -> local Radio/List combination.
- `ion-chip` -> local Chip.
- `ion-button` / `ion-fab` -> local Button/FAB.
- `ion-list`, `ion-list-header`, `ion-item-divider`, `ion-item` -> local List with native header/divider/item slots where possible.
- `ion-segment` -> local segment representation; if missing, compose from local Ionic buttons/items and label it for future component work.
- `ion-modal` -> local Modal shell with toolbar/header and Ionic content controls.
