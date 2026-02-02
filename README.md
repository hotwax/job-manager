# Job Manager

## 1. Repository Overview
- **Logical Name**: Job Manager (English name; not a Sanskrit word).
- **Business Purpose**: The Job Manager app is a front-end control plane for configuring, scheduling, and monitoring operational jobs in the HotWax Commerce OMS ecosystem. It gives operations teams a single place to run, pause, and inspect automated workflows (imports, fulfillment, inventory sync, preorder releases, etc.) that keep commerce data flowing between OMS and external channels. It also surfaces job history, failures, and configuration so teams can keep automations healthy without direct backend access.

## 2. Core Responsibilities & Business Logic
- **Primary domains handled**:
  - Job scheduling and configuration for OMS services (enable/disable, frequency, parameters, and run-now actions).
  - Job monitoring and pipeline visibility (pending/running/history views with status and timestamps).
  - Order workflows (imports, approvals, updates, cancellations, returns, and brokered order jobs).
  - Fulfillment workflows (shipment notifications, BOPIS notifications, auto-cancel rules).
  - Inventory workflows (hard sync, facility imports, inventory level updates).
  - Preorder/backorder workflows (catalog sync, tag management, release scheduling).
  - Initial data load workflows (bulk product/order imports, queue processing).
  - Shopify webhook management for order, return, and inventory events.
  - User preferences and permissions for job visibility/pinning and store context.

- **Core business logic & workflows implemented**:
  - **Job discovery + categorization**: The app loads job definitions and maps them into business categories (Orders, Fulfillment, Inventory, Product, Preorder, Initial Load, Misc) using environment-provided job enum maps, then renders them per domain view for operations teams.【F:.env.example†L1-L16】
  - **Job configuration lifecycle**: Users can open a job configuration modal, update its schedule or parameters, and persist changes to the OMS services layer (updateJobSandbox/scheduleService/cancelScheduledJob).【F:src/services/JobService.ts†L5-L80】
  - **Job execution monitoring**: The pipeline view queries pending/running/history job records and surfaces status, run times, and runtime data for triage and operational visibility.【F:src/store/modules/job/actions.ts†L45-L240】
  - **Immediate execution**: For Maarg/ServiceJobs-backed tasks, the app can issue a “run now,” clone, and update job definitions via the ServiceJobs API, enabling ad-hoc job execution for operational exceptions.【F:src/services/MaargJobService.ts†L5-L104】
  - **Store and channel context**: User/session configuration pulls OMS store and Shopify configuration, then filters job data and preferences based on the selected store or shop context.【F:src/services/UserService.ts†L51-L154】
  - **Webhook orchestration**: Shopify webhook subscriptions are listed and managed so the OMS can receive key commerce events (orders, cancellations, refunds, inventory updates).【F:src/services/WebhookService.ts†L1-L76】

## 3. Dependencies & Architecture
- **Tech Stack**:
  - Vue 3 + Vue Router + Vuex for application structure and state management.
  - Ionic Vue UI and Capacitor for a mobile-friendly app shell.
  - HotWax OMS API SDK (`@hotwax/oms-api`) and DXP component libraries for API communication and UI building blocks.
  - Supporting libraries: Luxon (dates), Cron parser/formatter, CASL (authorization), and Cypress (E2E tests).【F:package.json†L1-L55】

- **Dependency Map (App Repo)**:
  - **HotWax OMS REST APIs** via `@hotwax/oms-api`:
    - Job lifecycle endpoints: `findJobs`, `scheduleService`, `service/updateJobSandbox`, `service/cancelScheduledJob`, `performFind` for entity lookup, and `DownloadCsvFile` for exports.【F:src/services/JobService.ts†L5-L102】
    - User/session endpoints: `login`, `getPermissions`, `user-profile`, store/shopify configuration lookups.【F:src/services/UserService.ts†L6-L198】
  - **Maarg ServiceJobs API** for job execution and configuration operations (run-now, clone, update, job history).【F:src/services/MaargJobService.ts†L5-L104】
  - **Shopify webhook services** for subscribing/unsubscribing webhooks related to order and inventory events.【F:src/services/WebhookService.ts†L1-L76】

## 4. Technical Context
- **Run locally**:
  1. Install dependencies: `npm install`
  2. Create a `.env` file based on `.env.example` and set `VUE_APP_BASE_URL` to the OMS instance.
  3. Start the app: `npm run serve`

- **Key environment variables**:
  - `VUE_APP_BASE_URL`: Base URL for the OMS REST API instance the app connects to.
  - `VUE_APP_*_JOB_ENUMS`: Job enum mappings for Orders, Fulfillment, Inventory, Product, Preorder, and Initial Load domains.
  - `VUE_APP_PERMISSION_ID`: Permission required to view the app.
  - `VUE_APP_LOGIN_URL` / `VUE_APP_PREORDER_LOGIN_URL`: External login entry points for related apps.
  - `VUE_APP_WEBHOOK_ENUMS`: Shopify webhook topic mappings used by the webhook manager.
  - `VUE_APP_CRON_EXPRESSIONS`: Default schedule presets for job configuration.
  - `VUE_APP_GITBOOK_*`: Documentation lookup configuration for job workflows.【F:.env.example†L1-L18】

HotWax Commerce Job Manager App

# Prerequisite
Ionic CLI - If you don't have the ionic CLI installed refer [official documentation](https://ionicframework.com/docs/intro/cli) for the installation instructions.


# Build Notes (Users)

1. Download the app from [release](https://github.com/hotwax/job-manager/releases) page and extract it.
2. Go to the app directory.
3. Run following command to download dependencies  
    `npm i`
4. Create a `.env` file by taking reference from the `.env.example` and set the `VUE_APP_BASE_URL` to the instance you want to connect the app.
5. To run the app in browser use the command: `ionic serve`


# Build Notes (Contributors)

1. Open a Terminal window
2. Clone app using the command: `git clone https://github.com/hotwax/job-manager.git <repository-name>`
3. Go to the <repository-name> directory using command: `cd <repository-name>`
4. Run following command to download dependencies
    `npm i`
5. Create a `.env` file by taking reference from the `.env.example` and change the `VUE_APP_BASE_URL` to the instance you want to connect the app.
6. To run the app in browser use the command: `ionic serve`


# Contribution Guideline

1. Fork the repository and clone it locally from the `main` branch. Before starting your work make sure it's up to date with current `main` branch.
2. Pick an issue from [here](https://github.com/hotwax/job-manager/issues). Write in the issue comment that you want to pick it, if you can't assign yourself. **Please stay assigned to one issue at a time to not block others**.
3. Create a branch for your edits. Use the following branch naming conventions: **job-manager/issue-number**.
4. Please add issue number to your commit message.
5. Propose a Pull Request to `main` branch containing issue number and issue title.
6. Use [Pull Request template](https://github.com/hotwax/job-manager/blob/main/.github/PULL_REQUEST_TEMPLATE.md) (it's automatically added to each PR) and fill as much fields as possible to describe your solution.
7. Reference any relevant issues or other information in your PR.
8. Wait for review and adjust your PR according to it.
9. Congrats! Your PR should now be merged in!

If you can't handle some parts of the issue then please ask for help in the comment. If you have any problems during the implementation of some complex issue, feel free to implement just a part of it.

## Report a bug or request a feature

Always define the type of issue:
* Bug report
* Feature request

While writing issues, please be as specific as possible. All requests regarding support with implementation or application setup should be sent to.
    
    
# UI / UX Resources
You may find some useful resources for improving the UI / UX of the app <a href="https://www.figma.com/community/file/885791511781717756" target="_blank">here</a>.

# Join the community on Discord
If you have any questions or ideas feel free to join our <a href="https://discord.gg/S5zqNtJ9" target="_blank">Discord channel</a>
    
# The license

Job Manager app is completely free and released under the Apache v2.0 License. Check <a href="https://github.com/hotwax/job-manager/blob/main/LICENSE" target="_blank">LICENSE</a> for more details.

