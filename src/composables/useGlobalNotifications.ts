import { useMoquiNotifications } from "@/composables/useMoquiNotifications";
import { useMdmConfigStore } from "@/store/mdmConfig";
import { useSystemMessageStore } from "@/store/systemMessage";
import { useJobStore } from "@/store/jobs";
import { getTimeInMillis, showToast } from "@/utils";
import { translate } from "@common";

/**
 * Global singleton WebSocket notification handler.
 *
 * This composable is intended to be called ONCE in App.vue after the user has
 * authenticated. It maintains a single WebSocket connection to the Moqui
 * /notws endpoint for the entire application lifetime, meaning:
 *
 *  - Notifications are received regardless of which page/route is active.
 *  - Navigating between pages never drops or re-opens the connection.
 *  - Each Pinia store is updated in-place so that any component reading from
 *    that store automatically re-renders with the fresh data.
 */

const TOPICS = [
  "*",
  "all",
  "ALL",
  "JobManagerServiceJobRun",
  "JobManagerDataManagerLog",
  "JobManagerSystemMessage",
  "JOB_MANAGER_SERVICE_JOB_RUN",
  "JOB_MANAGER_DATA_MANAGER_LOG",
  "SYSTEM_MESSAGE_DATA_MANAGER_LOG",
  "DataManagerLog",
  "ServiceJobRun",
  "ServiceJob",
  "SystemMessage",
  "DataManagerLogFeed",
  "dataManagerLogFeed",
  "DataManagerLogNotification",
  "dataManagerLogNotification",
  "DataManagerLogUpdate",
  "dataManagerLogUpdate",
  "data-manager-log",
  "dmc-log",
  "DmcLog",
  "dmcLog",
  "JobManager",
  "jobManager",
  "Notification",
  "notification"
];

function getLiveNotificationLabel(message: any): string {
  if (message.title) return message.title;
  const topic = String(message.topic || message.message?.dataDocumentId || message.dataDocumentId || "").toLowerCase();
  if (topic.includes("jobrun") || topic.includes("job_run")) return translate("Service job run updated");
  if (topic === "servicejob" || topic.includes("service_job")) return translate("Job schedule updated");
  if (topic.includes("datamanager") || topic.includes("data_manager") || topic.includes("dmls")) return translate("Data manager log updated");
  if (topic.includes("systemmessage") || topic.includes("system_message")) return translate("System message updated");
  return translate("Dashboard updated");
}

// Resolve the Pinia stores lazily (outside Vue setup context is fine for Options-API stores)
function getStores() {
  return {
    mdmStore: useMdmConfigStore(),
    systemMessageStore: useSystemMessageStore(),
    jobStore: useJobStore(),
  };
}



function handleNotification(message: any) {
  // Moqui wraps DataFeed documents inside a nested 'message' object.
  // Structure: { topic, message: { dataDocumentId, documents: [...] } }
  // Some topics may send a flat payload — handle both.
  const innerMsg = (message.message && typeof message.message === "object")
    ? message.message
    : message;

  let docsRaw = innerMsg.documents || innerMsg.document || innerMsg.data || message.documents || message.document || message.data;
  if (!docsRaw && (innerMsg.logId || innerMsg.dataManagerLogId || innerMsg.jobRunId || innerMsg.systemMessageId || innerMsg.jobName || typeof innerMsg.statusId === "string" || typeof innerMsg.logStatusId === "string")) {
    docsRaw = [innerMsg];
  }

  const docs: any[] = Array.isArray(docsRaw)
    ? docsRaw
    : (docsRaw && typeof docsRaw === "object" ? [docsRaw] : []);

  const docId = String(innerMsg.dataDocumentId || message.dataDocumentId || message.topic || "").toLowerCase();

  if (docs.length === 0) {
    // No documents to process — only show the toast
    if (message.showAlert !== false) showToast(getLiveNotificationLabel(message));
    return;
  }

  const { mdmStore, systemMessageStore, jobStore } = getStores();
  let mdmUpdated = false;
  let systemMessageUpdated = false;

  docs.forEach((rawDoc: any) => {
    const doc = rawDoc._source || rawDoc._doc || rawDoc.doc || rawDoc.document || rawDoc;
    const idStr = String(docId || "").toLowerCase();

    // Determine type strictly by topic if possible, otherwise fallback to field sniffing
    const isSystemMessage = idStr.includes("systemmessage") || idStr.includes("system_message") || (!!(doc.systemMessageId || doc.systemMessageTypeId) && !idStr.includes("jobrun"));
    const isDataManagerLog = idStr.includes("datamanager") || idStr.includes("data_manager") || idStr.includes("dmls") || (!!(doc.logId || doc.dataManagerLogId) && !idStr.includes("jobrun")) || (typeof doc.statusId === "string" && doc.statusId.startsWith("Dmls")) || (typeof doc.logStatusId === "string" && doc.logStatusId.startsWith("Dmls"));
    const isServiceJob = idStr === "servicejob" || (doc.jobName && !doc.jobRunId && (doc.paused !== undefined || doc.cronExpression !== undefined));
    const isJobRun = (idStr.includes("jobrun") || idStr.includes("job_run") || !!doc.jobRunId) && !doc.jobName && !isSystemMessage && !isDataManagerLog;

    if (isJobRun) {
      const event = new CustomEvent("moqui:jobRunUpdate", { detail: doc });
      window.dispatchEvent(event);

    } else if (isServiceJob) {
      // Surgically update this single job in the jobs store so the Dashboard card re-computes instantly.
      // This avoids a race condition where fetching jobs immediately might catch a newly cloned job
      // before its parameters are fully saved by the frontend.
      jobStore.upsertJob(doc);

    } else if (isDataManagerLog) {
      mdmStore.upsertLog({
        ...doc,
        logId: doc.logId || doc.dataManagerLogId || doc.id,
        configId: doc.configId || doc.dataManagerConfigId,
        statusId: doc.statusId || doc.logStatusId || doc.status
      });
      mdmUpdated = true;
    } else if (isSystemMessage) {
      systemMessageStore.upsertSystemMessage(doc);
      systemMessageUpdated = true;
    }
  });

  if (mdmUpdated) {
    // Surgically fetch the full details of the updated logs to populate missing fields (like configId)
    // without overwriting the entire array or destroying the user's pagination.
    setTimeout(() => {
      docs.forEach(async (doc) => {
        const logId = doc.logId || doc.dataManagerLogId || doc.id;
        if (logId) {
          const fullLog = await mdmStore.fetchDataManagerLogById(logId);
          if (fullLog) mdmStore.upsertLog(fullLog);
        }
      });
    }, 2000);
  }
  if (systemMessageUpdated) {
    setTimeout(() => {
      docs.forEach(async (doc) => {
        const msgId = doc.systemMessageId;
        if (msgId) {
          const fullMsg = await systemMessageStore.fetchSystemMessageById(msgId);
          if (fullMsg) systemMessageStore.upsertSystemMessage(fullMsg);
        }
      });
    }, 2000);
  }

  if (message.showAlert !== false) {
    showToast(getLiveNotificationLabel(message));
  }
}

// Singleton — hold the connect/disconnect handles and reactive state outside
// any Vue setup context so calling useGlobalNotifications() multiple times is safe.
import { ref } from "vue";

let _disconnect: (() => void) | null = null;
let _connect: (() => void) | null = null;
let _initialized = false;
const _isConnected = ref(false);

// Cross-tab Synchronization State
let _isLeader = false;
let _releaseLeaderLock: (() => void) | null = null;
let _broadcastChannel: BroadcastChannel | null = null;

function setupBroadcastChannel() {
  if (_broadcastChannel) return;
  _broadcastChannel = new BroadcastChannel("moqui-global-notifications");

  _broadcastChannel.onmessage = (event) => {
    if (!_isLeader) {
      if (event.data?.type === "notification") {
        // We are a follower tab, handle the broadcasted notification locally
        handleNotification(event.data.payload);
      } else if (event.data?.type === "connection-state") {
        // Sync the connection state from the leader so our UI shows "Live" correctly
        _isConnected.value = event.data.payload;
      }
    } else {
      // If we ARE the leader, and a new tab just opened and asked for the current state
      if (event.data?.type === "request-connection-state") {
        _broadcastChannel.postMessage({ type: "connection-state", payload: _isConnected.value });
      }
    }
  };

  // As soon as this tab opens, ask the leader (if any) for the current connection state
  _broadcastChannel.postMessage({ type: "request-connection-state" });
}

// Wrapper to broadcast messages to follower tabs if we are the leader
function onWsMessageReceived(message: any) {
  if (_isLeader && _broadcastChannel) {
    _broadcastChannel.postMessage({ type: "notification", payload: message });
  }
  handleNotification(message);
}

export function useGlobalNotifications() {
  if (!_initialized) {
    setupBroadcastChannel();

    const { connect, disconnect, isConnected } = useMoquiNotifications(
      TOPICS,
      onWsMessageReceived,
      {
        reconnectDelay: 3000,
        onConnectionChange: (connected) => {
          _isConnected.value = connected;
          // If we are the leader, broadcast any connection drops/reconnects to followers
          if (_isLeader && _broadcastChannel) {
            _broadcastChannel.postMessage({ type: "connection-state", payload: connected });
          }
        }
      }
    );

    _connect = () => {
      // If Web Locks API is supported (all modern browsers), elect a leader.
      // The leader connects to the WebSocket, followers listen to the BroadcastChannel.
      if (navigator.locks) {
        navigator.locks.request("moqui-ws-leader", { mode: "exclusive" }, () => {
          // By returning a Promise that never naturally resolves,
          // we "hold onto" the lock forever, until the tab is closed.
          return new Promise<void>((resolve) => {
            _isLeader = true;
            _releaseLeaderLock = resolve;

            connect();

            // Broadcast our state immediately upon taking over as leader
            if (_broadcastChannel) {
              _broadcastChannel.postMessage({ type: "connection-state", payload: _isConnected.value });
            }
          });
        }).catch(err => {

          _isLeader = true;
          connect();
        });
      } else {
        // Fallback for very old browsers: everyone is a leader
        _isLeader = true;
        connect();
      }
    };

    _disconnect = () => {
      disconnect();
      if (_releaseLeaderLock) {
        _releaseLeaderLock(); // Release the lock so another tab can take over
        _releaseLeaderLock = null;
      }
      _isLeader = false;
    };
    _initialized = true;
  }

  return {
    isConnected: _isConnected,
    connectGlobalNotifications: () => _connect?.(),
    disconnectGlobalNotifications: () => _disconnect?.(),
  };
}
