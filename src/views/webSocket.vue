<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useWebSocket } from "@/composables/webSocket";

const wsUrl = "wss://wf.jiumiaoda.com/ws";
const chatMessages = ref<{ text: string; sender: string }[]>([]);
const inputMessage = ref("");

// 创建 WebSocket 实例
const {
  isConnected,
  connect,
  disconnect,
  send,
  on,
  reconnectAttempts,
  latency,
} = useWebSocket(wsUrl, {
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeat: true,
  heartbeatInterval: 10000,
  heartbeatMessage: { type: "ping" },
  debug: true,
});

// 设置事件监听
on("open", () => {
  console.log("WebSocket connection established");
});

on("message", (data: any) => {
  console.log(data, "d消息");
  if (data.type === "chat") {
    chatMessages.value.push({
      text: data.message,
      sender: "remote",
    });
  }
});

on("close", (event: any) => {
  console.log("Connection closed", event.code, event.reason);
});

on("error", (error: any) => {
  console.error("WebSocket error:", error);
});

on("reconnect", (attempt: any) => {
  console.log(`Reconnection attempt ${attempt}`);
});

// 初始化连接
onMounted(() => {
  connect();
});

// 发送聊天消息
const sendMessage = () => {
  if (!inputMessage.value.trim()) return;

  send({
    type: "chat",
    message: inputMessage.value,
  });

  chatMessages.value.push({
    text: inputMessage.value,
    sender: "local",
  });

  inputMessage.value = "";
};

// 断开连接
const closeConnection = () => {
  disconnect(1000, "User requested disconnect");
};

// 重新连接
const reconnect = () => {
  connect();
};
</script>

<template>
  <div>
    <div>
      <h2>WebSocket Connection</h2>
      <p>Status: {{ isConnected ? "Connected" : "Disconnected" }}</p>
      <p v-if="latency !== null">Latency: {{ latency }}ms</p>
      <p>Reconnect attempts: {{ reconnectAttempts }}</p>

      <button @click="connect" :disabled="isConnected">Connect</button>

      <button @click="closeConnection" :disabled="!isConnected">
        Disconnect
      </button>

      <button @click="reconnect" :disabled="isConnected">Reconnect</button>
    </div>

    <div>
      <h2>Chat</h2>
      <div class="chat-messages">
        <div
          v-for="(msg, index) in chatMessages"
          :key="index"
          :class="['message', msg.sender]"
        >
          {{ msg.text }}
        </div>
      </div>

      <input id="name" v-model="inputMessage" @keyup.enter="sendMessage" />
      <button @click="sendMessage" :disabled="!isConnected">Send</button>
    </div>
  </div>
</template>

<style scoped>
.message.local {
  text-align: right;
  color: blue;
}
.message.remote {
  text-align: left;
  color: green;
}
</style>
