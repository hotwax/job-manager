import { ref, onUnmounted } from "vue";
import { cookieHelper, commonUtil } from "@common";
import logger from "@/logger";

export interface MoquiNotificationsOptions {
  /** Milliseconds to wait before attempting a reconnect after an abnormal close. Default: 3000 */
  reconnectDelay?: number;
  /** Callback fired when the WebSocket connection state changes */
  onConnectionChange?: (isConnected: boolean) => void;
}

export interface MoquiNotificationMessage {
  topic?: string;
  dataDocumentId?: string;
  documents?: any[];
  [key: string]: any;
}

/**
 * Composable that opens a WebSocket to the Moqui /notws notification endpoint,
 * subscribes to the supplied topics, and calls `onMessage` for each incoming
 * notification document.
 *
 * Auto-reconnects on abnormal close.  Callbacks are guarded against stale
 * socket references so that an in-flight reconnect cannot dispatch events
 * from the previous (dead) socket.
 */
export function useMoquiNotifications(
  topics: string[],
  onMessage: (message: MoquiNotificationMessage) => void,
  options: MoquiNotificationsOptions = {}
) {
  const { reconnectDelay = 3000 } = options;

  const isConnected = ref(false);

  // The active socket.  A ref so watchers can track it, but we also keep a
  // plain variable for synchronous guard checks in callbacks.
  let activeSocket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  /** Build candidate WebSocket URLs from the OMS cookie and session token cookie. */
  function buildWsUrls(): string[] {
    const oms = commonUtil.getOmsURL();
    const token = cookieHelper().get("token") as string;
    // The loginKey is the UserLoginKey stored in the DB (from resp.data.api_key at login time).
    // Moqui's ?api_key= WebSocket auth calls loginUserKey() which looks up the hashed key in
    // the UserLoginKey entity — this works only with the raw UserLoginKey, NOT the JWT token.
    const loginKey = cookieHelper().get("loginKey") as string;

    if (!oms || !token) {
      console.warn("Notification [Hook: useMoquiNotifications] - Cannot connect; OMS URL or token cookie missing");
      return [];
    }

    try {
      // Replace the http(s) scheme with ws(s).
      let base = oms.replace(/^https?:\/\//, (match: string) =>
        match.startsWith("https") ? "wss://" : "ws://"
      ).replace(/\/$/, "");

      // Use the UserLoginKey (loginKey) for ?api_key= when available — this is the
      // actual DB-backed key that Moqui's loginUserKey() can validate.  Fall back to
      // ?token= with the JWT if no loginKey cookie is present (e.g., users logged in
      // before this change was deployed).
      const param = loginKey
        ? `?api_key=${encodeURIComponent(loginKey)}`
        : `?token=${encodeURIComponent(token)}`;
      const urls: string[] = [];

      // Candidate 1: Try appending /notws directly to the exact OMS base URL (e.g., /api/notws)
      urls.push(`${base}/notws${param}`);

      // Candidate 2: Try stripping /rest/s1 or /api and appending /notws
      const strippedBase = base.replace(/\/(rest\/s1|api)\/?$/, "");
      if (strippedBase !== base) {
        urls.push(`${strippedBase}/notws${param}`);
      }

      return urls;
    } catch (err) {
      console.error("Configuration [Hook: useMoquiNotifications] - Invalid OMS URL", err);
      return [];
    }
  }

  /** Send subscription frames once the socket is open. */
  function subscribe(socket: WebSocket) {
    topics.forEach((topic) => {
      try {
        socket.send(`subscribe:${topic}`);
      } catch (err) {
        logger.error(`Notification [Topic: ${topic}] - Failed to subscribe`, err);
      }
    });
  }

  function connect(urlIndex = 0) {
    destroyed = false;

    const urls = buildWsUrls();
    if (urls.length === 0) return;

    if (urlIndex >= urls.length) {
      // If we exhausted all fallback URLs, wait for the reconnect delay and start over at index 0
      reconnectTimer = setTimeout(() => connect(0), options.reconnectDelay || 5000);
      return;
    }

    const url = urls[urlIndex];

    // Prevent leaking connections if connect() is called multiple times
    if (activeSocket) {
      activeSocket.close(1000, "reconnecting");
    }

    const socket = new WebSocket(url);
    activeSocket = socket;
    let hasConnectedSuccessfully = false;

    socket.onopen = () => {
      // Guard: discard if this socket was superseded before the open event fired.
      if (socket !== activeSocket) {
        socket.close();
        return;
      }

      // Send the auth message immediately!
      const token = cookieHelper().get("token") as string;
      socket.send(`auth:${token}`);

      hasConnectedSuccessfully = true;
      isConnected.value = true;
      if (options.onConnectionChange) options.onConnectionChange(true);
      subscribe(socket);
    };

    socket.onmessage = (event: MessageEvent) => {
      if (socket !== activeSocket) return;
      try {
        const message = JSON.parse(event.data);
        onMessage(message);
      } catch (err) {
        logger.error("Notification [Hook: useMoquiNotifications] - Failed to parse message", err);
      }
    };

    socket.onclose = (event: CloseEvent) => {
      if (socket !== activeSocket || destroyed) return;

      isConnected.value = false;
      if (options.onConnectionChange) options.onConnectionChange(false);

      if (event.code !== 1000) {
        if (hasConnectedSuccessfully) {
          reconnectTimer = setTimeout(() => connect(0), options.reconnectDelay || 5000);
        } else {
          connect(urlIndex + 1);
        }
      }
    };

    socket.onerror = (error: Event) => {
      if (socket !== activeSocket) return;
      // The onclose event will immediately follow onerror, so we let onclose handle the fallback logic.
    };
  }

  function disconnect() {
    destroyed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (activeSocket) {
      activeSocket.close(1000, "intentional_disconnect");
      activeSocket = null;
    }
    isConnected.value = false;
    if (options.onConnectionChange) options.onConnectionChange(false);
  }

  function reconnect() {
    destroyed = false;
    if (activeSocket) {
      activeSocket.close(1000, "forced reconnect");
      activeSocket = null;
    }
    connect();
  }

  // Ensure cleanup when the component that owns this composable is destroyed.
  // This is critical for preventing connection leaks during Hot Module Replacement (HMR).
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    connect,
    disconnect,
    reconnect,
  };
}
