<script setup lang="ts">
import { ref, onMounted, watchEffect } from "vue";
import { useWebRTC } from "@/composables/webRTC";
import { useWebSocket } from "@/composables/webSocket";
import { useRoute } from "vue-router";

const route = useRoute();
console.log(route.query.name);
const userName = ref(route.query.name);

// const wsUrl = `ws://127.0.0.1:8000/ws?username=${userName.value}`;
const wsUrl = `https://c5ch87q1-8000.asse.devtunnels.ms/ws?username=${userName.value}`;
const msgInput = ref<string>();
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
const historyMsg = ref<any>([]);
// 设置事件监听
on("open", () => {
  console.log("WebSocket connection established");
});

on("message", (data: any) => {
  if (data.type === "pong") return;

  console.log("webSocket消息：", data);
  try {
    historyMsg.value.push(data);
    console.log(historyMsg.value);

    // 接收SDP(offer)
    if (data.type === "video-offer") {
      simulateIncomingCall(data.message_content);
    }
    // 接收SDP(answer)
    if (data.type === "video-answer") {
      simulateAnswer(data.message_content);
    }

    // 添加 ICE 候选处理
    if (data.type === "ice-candidate") {
      console.log("收到 ICE 候选", data.message_content);
      handleICECandidate(data.message_content);
    }

    // 接受结束通话
    if (data.type === "endCall") {
      endCall();
    }

    // 报错信息
    if (data.type === "error") {
      error.value = data.message_content;
      endCall();
    }
  } catch (err) {
    console.log("webSocket消息报错:", err);
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

// 创建 WebRTC 实例
const {
  localStream,
  remoteStream,
  isCalling,
  isCaller,
  isConnected: isConnectedWebRTC,
  error,
  initLocalStream,
  startCall,
  acceptCall,
  handleAnswer,
  handleICECandidate,
  onIceCandidate, // 接收 ICE 候选回调
  endCall,
} = useWebRTC();

// 设置 ICE 候选回调
onIceCandidate.value = (candidate) => {
  console.log("页面ICE 候选回调", candidate);
  // 发送 ICE 候选给对端
  sendWebSocketMsg({
    type: "ice-candidate",
    message_content: candidate,
  });
};

// 视频元素引用
const localVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);

watchEffect(() => {
  console.log("监听本地视频", localVideo.value, localStream.value);
  if (localVideo.value && localStream.value) {
    localVideo.value.srcObject = localStream.value;
  }

  console.log("监听远程视频", remoteVideo.value, remoteStream.value);
  if (remoteVideo.value && remoteStream.value) {
    remoteVideo.value.srcObject = remoteStream.value;
  }
});

// 初始化本地媒体流
onMounted(async () => {
  connect();
});

const sendWebSocketMsg = (msg: any) => {
  send(
    JSON.stringify({
      ...msg,
      name: userName.value,
      target_user: userName.value === "lanyuping" ? "lisi" : "lanyuping",
    })
  );
};

// 发起呼叫
const initiateCall = async () => {
  try {
    await initLocalStream();

    const offer = await startCall();
    // 实际应用中：通过信令服务器发送offer
    console.log("发起呼叫，发送offer:", offer);

    let msg = {
      type: "video-offer",
      message_content: offer,
    };
    sendWebSocketMsg(msg);
  } catch (err) {
    console.error(`呼叫失败: 当前用户${(err as Error).message}`);
    error.value = `呼叫失败: 当前用户${(err as Error).message}`;
  }
};

// 模拟接收呼叫
const simulateIncomingCall = async (fakeOffer: any) => {
  // 在实际应用中，这会从信令服务器接收
  // const fakeOffer: RTCSessionDescriptionInit = {
  //   type: "offer",
  //   sdp: "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n...",
  // };

  try {
    const answer = await acceptCall(fakeOffer);
    // 实际应用中：通过信令服务器发送answer
    console.log("接受呼叫，发送answer:", answer);
    let msg = {
      type: "video-answer",
      message_content: answer,
    };
    sendWebSocketMsg(msg);
  } catch (err) {
    console.error("接受呼叫失败:", err);
    sendWebSocketMsg({
      type: "error",
      message_content: `对方${(err as Error).message}`,
    });
  }
};

// 模拟接收应答
const simulateAnswer = async (fakeAnswer: any) => {
  // 在实际应用中，这会从信令服务器接收
  // const fakeAnswer: RTCSessionDescriptionInit = {
  //   type: "answer",
  //   sdp: "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n...",
  // };

  try {
    console.log("开始处理应答", fakeAnswer);
    await handleAnswer(fakeAnswer);
    console.log("处理应答成功");
  } catch (err) {
    console.error("处理应答失败:", err);
  }
};

// 结束通话
const endWebRTCCall = () => {
  endCall();

  sendWebSocketMsg({ type: "endCall" });
};

const sendInputContent = () => {
  let msg = {
    type: "test",
    message_content: msgInput.value,
  };
  sendWebSocketMsg(msg);

  msgInput.value = "";
};
</script>

<template>
  <div class="simple-webrtc">
    <h2 class="text-center text-xl">当前用户：{{ userName }}</h2>
    <div class="status-bar">
      <div class="status">
        <div v-if="isCalling">
          {{ isCaller ? "呼叫中..." : "接听中..." }}
        </div>
        <div v-if="isConnectedWebRTC" class="connected">已连接</div>
        <div v-if="error" class="error">{{ error }}</div>
      </div>
    </div>

    <div class="video-container">
      <div class="video-wrapper">
        <video
          ref="localVideo"
          autoplay
          muted
          playsinline
          class="local-video"
        />
        <div class="video-label">本地视频</div>
      </div>

      <div class="video-wrapper">
        <video ref="remoteVideo" autoplay playsinline class="remote-video" />
        <div class="video-label">远程视频</div>
      </div>
    </div>

    <div class="controls">
      <button @click="initiateCall" :disabled="isCalling" class="call-button">
        发起呼叫
      </button>
      <button @click="endWebRTCCall" :disabled="!isCalling" class="end-button">
        结束通话
      </button>
    </div>

    <div>
      <input type="text" id="msg" v-model="msgInput" />
      <button @click="sendInputContent" class="answer-button">发送消息</button>
    </div>

    <div v-for="item of historyMsg" class="break-words">{{ item }}</div>
  </div>
</template>

<style scoped>
.simple-webrtc {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f5ff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.status-bar {
  padding: 10px 15px;
  background-color: #e6f0ff;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 500;
}

.connected {
  color: #28a745;
  font-weight: bold;
}

.error {
  color: #dc3545;
  font-weight: bold;
}

.video-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 25px;
}

.video-wrapper {
  position: relative;
  background-color: #1a2b4d;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  aspect-ratio: 4/3;
}

video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background-color: #0d1a33;
}

.local-video {
  transform: scaleX(-1); /* 镜像本地视频 */
}

.video-label {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

button {
  padding: 12px 15px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.call-button {
  background-color: #4a9dff;
  color: white;
}

.call-button:not(:disabled):hover {
  background-color: #2a8cff;
  transform: translateY(-2px);
}

.answer-button {
  background-color: #6fcf97;
  color: white;
}

.answer-button:not(:disabled):hover {
  background-color: #4db57d;
  transform: translateY(-2px);
}

.end-button {
  background-color: #ff6b6b;
  color: white;
  /* grid-column: span 2;  */
}

.end-button:not(:disabled):hover {
  background-color: #ff5252;
  transform: translateY(-2px);
}
</style>
