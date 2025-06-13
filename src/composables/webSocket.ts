import { ref, onUnmounted, watch } from "vue";

interface WebSocketOptions {
  // 自动重连配置
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;

  // 心跳机制配置
  heartbeat?: boolean;
  heartbeatInterval?: number;
  heartbeatMessage?: any;

  // 其他配置
  debug?: boolean;
  protocols?: string | string[];
}

export function useWebSocket(url: string, options: WebSocketOptions = {}) {
  // 默认配置
  const {
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeat = true,
    heartbeatInterval = 15000,
    heartbeatMessage = { type: "heartbeat" },
    debug = false,
    protocols = [],
  } = options;

  // 状态
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const message = ref<any>(null);
  const messageHistory = ref<any[]>([]);
  const reconnectAttempts = ref(0);
  const lastHeartbeat = ref<number | null>(null);
  const latency = ref<number | null>(null);

  // 计时器
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;

  // 事件处理器
  const eventHandlers = {
    open: [] as Function[],
    message: [] as Function[],
    close: [] as Function[],
    error: [] as Function[],
    reconnect: [] as Function[],
  };

  // 日志函数
  const log = (...args: any[]) => {
    if (debug) {
      console.log("[WebSocket]", ...args);
    }
  };

  // 连接函数
  const connect = () => {
    // 清除现有连接
    disconnect();

    try {
      socket.value = protocols
        ? new WebSocket(url, protocols)
        : new WebSocket(url);

      log("Connecting to", url);

      socket.value.onopen = () => {
        log("Connection opened");
        isConnected.value = true;
        reconnectAttempts.value = 0;
        eventHandlers.open.forEach((handler) => handler());

        // 启动心跳
        if (heartbeat) {
          startHeartbeat();
        }
      };

      socket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 处理心跳响应
          // if (heartbeat && data.type === "heartbeat-ack") {
          //   handleHeartbeatAck();
          //   return;
          // }

          message.value = data;
          messageHistory.value.push(data);
          eventHandlers.message.forEach((handler) => handler(data));
        } catch (e) {
          // 非JSON消息
          message.value = event.data;
          messageHistory.value.push(event.data);
          eventHandlers.message.forEach((handler) => handler(event.data));
        }
      };

      socket.value.onclose = (event) => {
        log(`Connection closed: ${event.code} ${event.reason}`);
        isConnected.value = false;
        eventHandlers.close.forEach((handler) => handler(event));

        // 清理心跳
        stopHeartbeat();

        // 尝试重连
        if (reconnect && event.code !== 1000) {
          scheduleReconnect();
        }
      };

      socket.value.onerror = (error) => {
        log("Connection error:", error);
        eventHandlers.error.forEach((handler) => handler(error));
      };
    } catch (error) {
      log("Connection failed:", error);
      if (reconnect) {
        scheduleReconnect();
      }
    }
  };

  // 断开连接
  const disconnect = (code = 1000, reason = "Normal closure") => {
    if (socket.value) {
      log("Disconnecting");

      // 清理心跳
      stopHeartbeat();

      // 关闭连接
      try {
        socket.value.close(code, reason);
      } catch (e) {
        log("Error while closing connection:", e);
      }

      socket.value = null;
      isConnected.value = false;
    }

    // 清除重连计时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  // 安排重连
  const scheduleReconnect = () => {
    if (reconnectTimer || reconnectAttempts.value >= maxReconnectAttempts) {
      return;
    }

    reconnectAttempts.value++;
    log(
      `Scheduling reconnect in ${reconnectInterval}ms (attempt ${reconnectAttempts.value}/${maxReconnectAttempts})`
    );

    reconnectTimer = setTimeout(() => {
      log("Attempting reconnect...");
      eventHandlers.reconnect.forEach((handler) =>
        handler(reconnectAttempts.value)
      );
      connect();
      reconnectTimer = null;
    }, reconnectInterval);
  };

  // 心跳机制
  const startHeartbeat = () => {
    stopHeartbeat();

    // 发送心跳
    heartbeatTimer = setInterval(() => {
      if (isConnected.value && socket.value?.readyState === WebSocket.OPEN) {
        send(heartbeatMessage);
        lastHeartbeat.value = Date.now();

        // 设置心跳超时检测
        // heartbeatTimeout = setTimeout(() => {
        //   log("Heartbeat timeout detected, reconnecting...");
        //   disconnect();
        //   scheduleReconnect();
        // }, heartbeatInterval * 1.5);
      }
    }, heartbeatInterval);
  };

  // 处理心跳确认
  const handleHeartbeatAck = () => {
    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = null;
    }

    if (lastHeartbeat.value) {
      latency.value = Date.now() - lastHeartbeat.value;
      log(`Heartbeat acknowledged, latency: ${latency.value}ms`);
    }
  };

  // 停止心跳
  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout);
      heartbeatTimeout = null;
    }

    lastHeartbeat.value = null;
  };

  // 发送消息
  const send = (data: any) => {
    if (!isConnected.value || !socket.value) {
      log("Cannot send message, connection not established");
      return false;
    }

    try {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      socket.value.send(payload);
      return true;
    } catch (e) {
      log("Error sending message:", e);
      return false;
    }
  };

  // 事件监听
  const on = (
    event: "open" | "message" | "close" | "error" | "reconnect",
    handler: Function
  ) => {
    eventHandlers[event].push(handler);
  };

  const off = (
    event: "open" | "message" | "close" | "error" | "reconnect",
    handler: Function
  ) => {
    eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
  };

  // 响应式状态变化
  watch(isConnected, (connected) => {
    if (connected && reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  // 组件卸载时清理
  onUnmounted(() => {
    disconnect();
  });

  return {
    // 状态
    isConnected,
    message,
    messageHistory,
    reconnectAttempts,
    latency,

    // 方法
    connect,
    disconnect,
    send,
    on,
    off,
  };
}
