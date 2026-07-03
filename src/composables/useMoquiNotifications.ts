import { computed, ref } from "vue";
import { commonUtil, cookieHelper } from "@common";
import logger from "@/logger";

export const JOB_MANAGER_NOTIFICATION_TOPICS = [
  "JobManagerServiceJobRun",
  "JobManagerDataManagerLog",
  "JobManagerSystemMessage"
];

type MoquiNotification = {
  topic?: string;
  subTopic?: string;
  title?: string;
  type?: string;
  message?: {
    dataFeedId?: string;
    feedStamp?: string;
    dataDocumentId?: string;
    documents?: Array<Record<string, any>>;
    [key: string]: any;
  };
  link?: string;
  showAlert?: boolean;
};

type NotificationOptions = {
  topics?: string[];
  onNotification?: (notification: MoquiNotification) => void;
  reconnectDelayMs?: number;
};

const getNotificationSocketUrl = () => {
  const omsUrl = commonUtil.getOmsURL();
  if (!omsUrl) return "";

  try {
    const url = new URL(omsUrl);
    const pathname = url.pathname.replace(/\/(rest\/s1|api)\/?$/, "");
    url.pathname = `${pathname.replace(/\/$/, "")}/notws`;
    url.search = "";
    url.hash = "";
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const apiKey = cookieHelper().get("api_key");
    if (apiKey) url.searchParams.set("api_key", apiKey);
    return url.toString();
  } catch (error) {
    logger.error("Unable to build Moqui notification WebSocket URL", error);
    return "";
  }
};

export function useMoquiNotifications(options: NotificationOptions = {}) {
  const topics = options.topics || JOB_MANAGER_NOTIFICATION_TOPICS;
  const reconnectDelayMs = options.reconnectDelayMs ?? 5000;
  const state = ref<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const lastNotification = ref<MoquiNotification | null>(null);
  let socket: WebSocket | undefined;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let shouldReconnect = false;

  const isConnected = computed(() => state.value === "connected");

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = undefined;
    }
  };

  const subscribe = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(`subscribe:${topics.join(",")}`);
  };

  const scheduleReconnect = () => {
    clearReconnectTimeout();
    if (!shouldReconnect) return;
    reconnectTimeoutId = setTimeout(() => {
      connect();
    }, reconnectDelayMs);
  };

  const connect = () => {
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

    const socketUrl = getNotificationSocketUrl();
    if (!socketUrl) {
      state.value = "error";
      return;
    }

    shouldReconnect = true;
    state.value = "connecting";

    let currentSocket: WebSocket;
    try {
      currentSocket = new WebSocket(socketUrl);
      socket = currentSocket;
    } catch (error) {
      logger.error("Failed to create Moqui notification WebSocket", error);
      state.value = "error";
      scheduleReconnect();
      return;
    }

    currentSocket.addEventListener("open", () => {
      if (socket !== currentSocket) return;
      state.value = "connected";
      subscribe();
    });

    currentSocket.addEventListener("message", (event) => {
      if (socket !== currentSocket) return;
      try {
        const notification = JSON.parse(event.data) as MoquiNotification;
        lastNotification.value = notification;
        options.onNotification?.(notification);
      } catch (error) {
        logger.error("Failed to parse Moqui notification message", error);
      }
    });

    currentSocket.addEventListener("error", (event) => {
      if (socket !== currentSocket) return;
      logger.error("Moqui notification WebSocket error", event);
      state.value = "error";
    });

    currentSocket.addEventListener("close", () => {
      if (socket !== currentSocket) return;
      socket = undefined;
      state.value = shouldReconnect ? "disconnected" : "idle";
      scheduleReconnect();
    });
  };

  const disconnect = () => {
    shouldReconnect = false;
    clearReconnectTimeout();
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }
    socket = undefined;
    state.value = "idle";
  };

  return {
    connect,
    disconnect,
    isConnected,
    lastNotification,
    state
  };
}
