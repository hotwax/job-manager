# Menu Table of Contents

This document defines the final navigation structure for the Job Manager app. The menu stays flat, but uses `ion-item-divider` to group related areas.

## Menu Pillars

### Jobs
- **Catalog**: Search, filter, create, and inspect scheduled jobs.

### MDM
- **File History**: Audit trail for generated or consumed files.
- **Manual Uploads**: Entry point for manual import workflows.

### System Messages
- **Monitor**: Global inbox of individual system messages across all types and remotes.
- **Message Types**: Catalog and configuration management for `SystemMessageType`.
- **Remote Systems**: Catalog and configuration management for `SystemMessageRemote`.

### Settings
- **Settings**: Application-level configuration screens.

## Route Model

System Messages uses plural top-level resource routes.

```ts
const appPages = [
  { title: "Jobs" },
  { title: "Catalog", url: "/catalog", iosIcon: albumsOutline, mdIcon: albumsOutline, childRoutes: ["/job/"] },

  { title: "MDM" },
  { title: "File history", url: "/file-history", iosIcon: timeOutline, mdIcon: timeOutline, childRoutes: ["/file-history/"] },
  { title: "Manual uploads", url: "/manual-uploads", iosIcon: cloudUploadOutline, mdIcon: cloudUploadOutline, childRoutes: ["/manual-uploads/"] },

  { title: "System Messages" },
  { title: "Monitor", url: "/system-messages", iosIcon: pulseOutline, mdIcon: pulseOutline, childRoutes: ["/system-messages/"] },
  { title: "Message Types", url: "/system-message-types", iosIcon: copyOutline, mdIcon: copyOutline, childRoutes: ["/system-message-types/"] },
  { title: "Remote Systems", url: "/system-message-remotes", iosIcon: desktopOutline, mdIcon: desktopOutline, childRoutes: ["/system-message-remotes/"] },

  { title: "Settings" },
  { title: "Settings", url: "/settings", iosIcon: settingsOutline, mdIcon: settingsOutline }
]
```

### Required Routes

- `/system-messages`: global message monitor
- `/system-messages/:id`: message detail
- `/system-message-types`: message type catalog
- `/system-message-types/new`: create message type
- `/system-message-types/:id`: message type detail and edit
- `/system-message-remotes`: remote system catalog
- `/system-message-remotes/new`: create remote system
- `/system-message-remotes/:id`: remote system detail and edit

## Navigation Rules

- Every primary menu item uses `router-direction="root"`.
- Active-state highlighting is based on `selectedIndex` plus `childRoutes`.
- Message detail routes (`/system-messages/:id`) highlight `Monitor`.
- Message Type detail and create routes highlight `Message Types`.
- Remote System detail and create routes highlight `Remote Systems`.
- The current single `System Messages` menu item is replaced by the three entries above.

## Implementation Notes

- `Menu.vue` remains array-driven.
- Divider rows do not have a `url`.
- The existing hidden dashboard entry may remain hidden, but it is not part of the user-facing navigation spec.
