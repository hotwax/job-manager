# Shopify Bulk Operations

This document explains the architecture, data linking, and UI implementation for Shopify Bulk Operations (Imports and Queries) in the `job-manager` app.

## Asynchronous Lifecycle

Shopify Bulk Operations are inherently asynchronous and follow a multi-step lifecycle:

1.  **Request (Outgoing)**: The system sends a GraphQL mutation or query to Shopify.
2.  **Shopify Processing**: Shopify processes the request (can take minutes to hours).
3.  **Webhook (Incoming)**: Shopify sends a `bulk_operations/finish` webhook once complete.
4.  **Result Link (Internal)**: The system creates an incoming message to track the result file download.
5.  **Processing Task (Outgoing/Internal)**: Once downloaded, a new task is queued to process the file data.

---

## Traceability Matrix

To trace an operation from start to finish across multiple system messages, the system uses the following identifier mapping:

| Step | Operation Type | Message Role | Linking Identifier |
| :--- | :--- | :--- | :--- |
| **1** | Initial Request | Outgoing (`Y`) | `remoteMessageId` = Shopify Bulk Operation ID |
| **2** | Result Webhook | Incoming (`N`) | Payload matches Step 1 `remoteMessageId` |
| **3** | Result Record | Incoming (`N`) | `remoteMessageId` = Step 1 `systemMessageId` |
| **4** | Processing Task| Incoming/Outgoing | `parentMessageId` = Step 3 `systemMessageId` |

---

## Enumeration Sequencing

The logical flow of operations is defined by **Enumeration Sequences**. This allows the UI to display a "Process Tracker" even before subsequent messages are created.

### 1:1 Mapping Rule
For the sequencing to work, there MUST be 1:1 mapping between `SystemMessage.systemMessageTypeId` and `Enumeration.enumId`.

### Tracing the Chain
The system traces the `Enumeration.relatedEnumId` field recursively to build the operation sequence. 
- **Current Step**: Where `enumId` === `systemMessageTypeId`.
- **Next Step**: Found via `relatedEnumId`.

---

## UI Implementation: Process Tracker

The `SystemMessageDetailView` uses this architectural data to provide an interactive **Operation Sequence** component.

### Step Status Mapping
The UI determines the state of each logical step in the sequence by scanning for linked messages:

- **Primary (Blue Pulse)**: The current active step being viewed.
- **Success (Green)**: A linked message exists for this type and its status is `SmsgConsumed` or `SmsgConfirmed`.
- **Orange (Hourglass)**: A linked message exists but is still in progress (`Sent`, `Received`, `Produced`).
- **Red (Alert)**: A linked message exists but is in an `SmsgError` state.
- **Gray (Pending)**: No linked message found yet; the system is waiting for an asynchronous event.

### Interactive Navigation
Each step in the tracker is a clickable button. If a linked message ID exists for that step, clicking it navigates the user to that message's detail view, allowing them to jump through the entire operation history.

---

## Implementation Details

### Store Logic (`systemMessage` store)
- **`fetchEnumSequence(enumId)`**: Recursively traces the `relatedEnumId` chain starting from the provided `systemMessageTypeId`.
- **`fetchAllRelatedMessages(systemMessageId, remoteMessageId)`**: Scans all messages to find predecessors and successors based on the Traceability Matrix logic.

### View Component (`SystemMessageDetailView.vue`)
- **`getStepStatus(step)`**: Helper function that maps the logical `Enumeration` step to actual `SystemMessage` data in the store.
- **`goToStep(step)`**: Handles the navigation logic between linked messages.
