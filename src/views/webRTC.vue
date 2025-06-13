<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useWebRTC } from "@/composables/webRTC";

// 创建 WebRTC 实例
const {
  localStream,
  remoteStream,
  isCalling,
  isCaller,
  isConnected,
  error,
  initLocalStream,
  startCall,
  acceptCall,
  handleAnswer,
  handleICECandidate,
  endCall,
  testRemoteVideo,
} = useWebRTC();

// 视频元素引用
const localVideo = ref<HTMLVideoElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);

// 初始化本地媒体流
onMounted(async () => {
  try {
    await initLocalStream();
    if (localVideo.value && localStream.value) {
      localVideo.value.srcObject = localStream.value;
    }
  } catch (err) {
    console.error("初始化失败:", err);
  }
});

// 发起呼叫
const initiateCall = async () => {
  try {
    const offer = await startCall();
    // 实际应用中：通过信令服务器发送offer
    console.log("发起呼叫，发送offer:", offer);
  } catch (err) {
    console.error("呼叫失败:", err);
  }
};

// 模拟接收呼叫
const simulateIncomingCall = async () => {
  // 在实际应用中，这会从信令服务器接收
  const fakeOffer: RTCSessionDescriptionInit = {
    type: "offer",
    sdp: "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\n...",
  };

  try {
    const answer = await acceptCall(fakeOffer);
    // 实际应用中：通过信令服务器发送answer
    console.log("接受呼叫，发送answer:", answer);
  } catch (err) {
    console.error("接受呼叫失败:", err);
  }
};

// 模拟接收应答
const simulateAnswer = async () => {
  // 在实际应用中，这会从信令服务器接收
  const fakeAnswer: RTCSessionDescriptionInit = {
    type: "answer",
    sdp: "v=0\r\no=- 987654321 2 IN IP4 127.0.0.1\r\n...",
  };

  try {
    await handleAnswer(fakeAnswer);
    console.log("处理应答成功");
  } catch (err) {
    console.error("处理应答失败:", err);
  }
};
</script>

<template>
  <div class="simple-webrtc">
    <div class="status-bar">
      <div class="status">
        <span v-if="isCalling">
          {{ isCaller ? "呼叫中..." : "接听中..." }}
        </span>
        <span v-if="isConnected" class="connected">已连接</span>
        <span v-if="error" class="error">{{ error }}</span>
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

      <div class="video-wrapper" v-if="remoteStream">
        <video
          ref="remoteVideo"
          autoplay
          playsinline
          class="remote-video"
          v-if="remoteStream"
          :srcObject="remoteStream"
        />
        <div class="video-label">远程视频</div>
      </div>
    </div>

    <div class="controls">
      <button @click="initiateCall" :disabled="isCalling" class="call-button">
        发起呼叫
      </button>

      <button
        @click="simulateIncomingCall"
        :disabled="isCalling"
        class="answer-button"
      >
        模拟来电
      </button>

      <button
        @click="simulateAnswer"
        :disabled="!isCalling || isCaller || isConnected"
        class="answer-button"
      >
        模拟应答
      </button>

      <button @click="endCall" :disabled="!isCalling" class="end-button">
        结束通话
      </button>

      <button @click="testRemoteVideo" class="answer-button">
        开启远程视频
      </button>
    </div>
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
  grid-column: span 2; /* 占据两列 */
}

.end-button:not(:disabled):hover {
  background-color: #ff5252;
  transform: translateY(-2px);
}
</style>
