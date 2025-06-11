<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8"
  >
    <div class="max-w-6xl mx-auto">
      <header class="text-center mb-8 md:mb-12">
        <h1 class="text-2xl md:text-4xl font-bold mb-2">WebRTC视频通话</h1>
        <p class="text-blue-300">类似微信视频聊天的实现，支持拖拽小窗口</p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 主视频区域 -->
        <div class="lg:col-span-2 bg-black/30 rounded-xl p-4 md:p-6 shadow-2xl">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center">
              <div class="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <h2 class="text-xl font-semibold">与李明的通话</h2>
            </div>
            <div class="text-blue-400">
              00:{{ minutes.toString().padStart(2, '0') }}:{{
              seconds.toString().padStart(2, '0') }}
            </div>
          </div>

          <div
            class="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center"
          >
            <!-- 主视频窗口 -->
            <video
              ref="remoteVideo"
              autoplay
              playsinline
              class="w-full h-full object-cover"
              :class="{'bg-gray-800': !callActive}"
            ></video>

            <!-- 通话状态提示 -->
            <div
              v-if="!callActive"
              class="absolute text-center p-6 bg-black/50 rounded-xl"
            >
              <div class="text-5xl mb-4">
                <i class="fas fa-user-circle"></i>
              </div>
              <p class="text-xl mb-2">等待连接...</p>
              <p v-if="callStatus === 'incoming'" class="text-blue-300 text-lg">
                李明 邀请您视频通话
              </p>
            </div>

            <!-- 小窗口 -->
            <div
              ref="pipWindow"
              class="absolute bottom-4 right-4 w-32 h-48 md:w-40 md:h-60 bg-black rounded-lg overflow-hidden shadow-2xl cursor-move border-2 border-blue-500"
              @mousedown="startDrag"
              @touchstart="startDrag"
            >
              <video
                ref="localVideo"
                autoplay
                playsinline
                muted
                class="w-full h-full object-cover"
              ></video>
              <div class="absolute top-2 right-2 flex space-x-1">
                <button
                  class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <i class="fas fa-microphone-slash text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- 控制按钮 -->
          <div class="flex justify-center space-x-6 mt-6">
            <button
              class="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-all"
              @click="toggleMic"
            >
              <i
                class="fas text-xl"
                :class="micActive ? 'fa-microphone' : 'fa-microphone-slash'"
              ></i>
            </button>

            <button
              class="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-all"
              @click="toggleCamera"
            >
              <i
                class="fas text-xl"
                :class="cameraActive ? 'fa-video' : 'fa-video-slash'"
              ></i>
            </button>

            <button
              v-if="callStatus === 'incoming'"
              class="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400 transition-all"
              @click="answerCall"
            >
              <i class="fas fa-phone text-2xl transform rotate-135"></i>
            </button>

            <button
              v-else
              class="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 transition-all"
              @click="endCall"
            >
              <i class="fas fa-phone text-2xl transform rotate-135"></i>
            </button>

            <button
              class="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-all"
              @click="togglePip"
            >
              <i class="fas fa-expand text-xl"></i>
            </button>
          </div>
        </div>

        <!-- 通话信息面板 -->
        <div class="bg-black/30 rounded-xl p-4 md:p-6 shadow-2xl">
          <h3 class="text-xl font-semibold mb-4 flex items-center">
            <i class="fas fa-info-circle mr-2 text-blue-400"></i>
            通话信息
          </h3>

          <div class="space-y-4">
            <div class="flex items-center">
              <div
                class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3"
              >
                <i class="fas fa-user"></i>
              </div>
              <div>
                <p class="font-medium">李明</p>
                <p class="text-sm text-gray-300">在线 · 移动设备</p>
              </div>
            </div>

            <div class="bg-gray-800/50 rounded-lg p-3">
              <h4 class="font-medium mb-2 flex items-center">
                <i class="fas fa-shield-alt mr-2 text-green-400"></i>
                安全状态
              </h4>
              <p class="text-sm text-green-300">端到端加密 · 仅限参与者</p>
            </div>

            <div>
              <h4 class="font-medium mb-2">媒体设备</h4>
              <div class="text-sm space-y-2">
                <div class="flex items-center">
                  <i class="fas fa-microphone w-6 text-blue-400"></i>
                  <span class="flex-1">麦克风 (Built-in)</span>
                  <span class="text-green-400">●</span>
                </div>
                <div class="flex items-center">
                  <i class="fas fa-video w-6 text-blue-400"></i>
                  <span class="flex-1">摄像头 (FaceTime HD)</span>
                  <span class="text-green-400">●</span>
                </div>
                <div class="flex items-center">
                  <i class="fas fa-volume-up w-6 text-blue-400"></i>
                  <span class="flex-1">扬声器 (Built-in)</span>
                  <span class="text-green-400">●</span>
                </div>
              </div>
            </div>

            <button
              class="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all mt-4"
            >
              <i class="fas fa-cog mr-2"></i>高级设置
            </button>
          </div>
        </div>
      </div>

      <!-- 功能说明 -->
      <div class="mt-8 bg-black/30 rounded-xl p-6 shadow-2xl">
        <h3 class="text-xl font-semibold mb-4 flex items-center">
          <i class="fas fa-star mr-2 text-yellow-400"></i>
          功能说明
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-gray-800/50 p-4 rounded-lg">
            <div class="text-blue-400 text-2xl mb-2">
              <i class="fas fa-video"></i>
            </div>
            <h4 class="font-medium mb-2">WebRTC技术</h4>
            <p class="text-sm text-gray-300">
              使用WebRTC实现点对点音视频通信，无需插件
            </p>
          </div>
          <div class="bg-gray-800/50 p-4 rounded-lg">
            <div class="text-blue-400 text-2xl mb-2">
              <i class="fas fa-mobile-alt"></i>
            </div>
            <h4 class="font-medium mb-2">移动端适配</h4>
            <p class="text-sm text-gray-300">
              完美适配移动设备，支持触摸拖拽小窗口
            </p>
          </div>
          <div class="bg-gray-800/50 p-4 rounded-lg">
            <div class="text-blue-400 text-2xl mb-2">
              <i class="fas fa-window-restore"></i>
            </div>
            <h4 class="font-medium mb-2">可拖拽画中画</h4>
            <p class="text-sm text-gray-300">
              支持鼠标和触摸拖拽小窗口，调整位置
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, computed } from "vue";

  // 状态管理
  const callStatus = ref("incoming"); // 'incoming', 'active', 'ended'
  const callActive = ref(false);
  const micActive = ref(true);
  const cameraActive = ref(true);
  const pipActive = ref(true);
  const callDuration = ref(0);

  // 视频元素引用
  const localVideo = ref(null);
  const remoteVideo = ref(null);
  const pipWindow = ref(null);

  // 拖拽相关状态
  const isDragging = ref(false);
  const dragStartX = ref(0);
  const dragStartY = ref(0);
  const pipPosition = ref({ x: 0, y: 0 });

  // 计时器
  let callTimer = null;

  // 计算通话时间
  const minutes = computed(() => Math.floor(callDuration.value / 60));
  const seconds = computed(() => callDuration.value % 60);

  // 初始化媒体流
  const initMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideo.value) {
        localVideo.value.srcObject = stream;
      }

      // 模拟远程流（实际项目中应来自其他用户）
      if (remoteVideo.value) {
        remoteVideo.value.srcObject = stream.clone();
      }
    } catch (error) {
      console.error("无法获取媒体设备:", error);
      alert("无法访问摄像头和麦克风。请确保您已授予权限。");
    }
  };

  // 开始通话
  const startCall = () => {
    callStatus.value = "active";
    callActive.value = true;

    // 开始计时
    callTimer = setInterval(() => {
      callDuration.value++;
    }, 1000);
  };

  // 接听来电
  const answerCall = () => {
    startCall();
  };

  // 结束通话
  const endCall = () => {
    callStatus.value = "ended";
    callActive.value = false;

    // 停止计时器
    if (callTimer) {
      clearInterval(callTimer);
      callTimer = null;
    }

    // 停止所有媒体流
    if (localVideo.value && localVideo.value.srcObject) {
      localVideo.value.srcObject.getTracks().forEach((track) => track.stop());
    }

    if (remoteVideo.value && remoteVideo.value.srcObject) {
      remoteVideo.value.srcObject.getTracks().forEach((track) => track.stop());
    }
  };

  // 切换麦克风
  const toggleMic = () => {
    micActive.value = !micActive.value;
    if (localVideo.value && localVideo.value.srcObject) {
      localVideo.value.srcObject.getAudioTracks().forEach((track) => {
        track.enabled = micActive.value;
      });
    }
  };

  // 切换摄像头
  const toggleCamera = () => {
    cameraActive.value = !cameraActive.value;
    if (localVideo.value && localVideo.value.srcObject) {
      localVideo.value.srcObject.getVideoTracks().forEach((track) => {
        track.enabled = cameraActive.value;
      });
    }
  };

  // 切换画中画
  const togglePip = () => {
    pipActive.value = !pipActive.value;
    if (pipWindow.value) {
      pipWindow.value.style.display = pipActive.value ? "block" : "none";
    }
  };

  // 拖拽功能
  const startDrag = (e) => {
    isDragging.value = true;

    if (e.type === "mousedown") {
      dragStartX.value = e.clientX - pipPosition.value.x;
      dragStartY.value = e.clientY - pipPosition.value.y;
      document.addEventListener("mousemove", dragMove);
      document.addEventListener("mouseup", stopDrag);
    } else if (e.type === "touchstart") {
      const touch = e.touches[0];
      dragStartX.value = touch.clientX - pipPosition.value.x;
      dragStartY.value = touch.clientY - pipPosition.value.y;
      document.addEventListener("touchmove", dragMove, { passive: false });
      document.addEventListener("touchend", stopDrag);
    }

    e.preventDefault();
  };

  const dragMove = (e) => {
    if (!isDragging.value) return;

    let clientX, clientY;

    if (e.type === "mousemove") {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.type === "touchmove") {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    }

    if (clientX !== undefined && clientY !== undefined) {
      pipPosition.value = {
        x: clientX - dragStartX.value,
        y: clientY - dragStartY.value,
      };

      // 边界检查
      const pipRect = pipWindow.value.getBoundingClientRect();
      const containerRect =
        pipWindow.value.parentElement.getBoundingClientRect();

      pipPosition.value.x = Math.max(
        0,
        Math.min(pipPosition.value.x, containerRect.width - pipRect.width)
      );

      pipPosition.value.y = Math.max(
        0,
        Math.min(pipPosition.value.y, containerRect.height - pipRect.height)
      );

      // 更新位置
      pipWindow.value.style.transform = `translate(${pipPosition.value.x}px, ${pipPosition.value.y}px)`;
    }

    if (e.type === "touchmove") {
      e.preventDefault();
    }
  };

  const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", dragMove);
    document.removeEventListener("touchend", stopDrag);
  };

  // 生命周期钩子
  onMounted(() => {
    initMediaStream();

    // 设置初始位置
    if (pipWindow.value) {
      const containerRect =
        pipWindow.value.parentElement.getBoundingClientRect();
      const pipRect = pipWindow.value.getBoundingClientRect();

      pipPosition.value = {
        x: containerRect.width - pipRect.width - 20,
        y: containerRect.height - pipRect.height - 20,
      };

      pipWindow.value.style.transform = `translate(${pipPosition.value.x}px, ${pipPosition.value.y}px)`;
    }
  });

  onBeforeUnmount(() => {
    endCall();
  });
</script>

<style>
  @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css");

  /* 拖拽元素样式 */
  video {
    background-color: #1a202c;
  }

  /* 小窗口拖拽效果 */
  .pip-draggable {
    transition: transform 0.1s ease;
  }

  /* 移动端优化 */
  @media (max-width: 768px) {
    .control-buttons {
      padding: 0 10px;
    }

    .control-button {
      width: 50px;
      height: 50px;
    }

    .call-button {
      width: 60px;
      height: 60px;
    }
  }

  /* 动画效果 */
  button {
    transition: all 0.2s ease;
    transform: scale(1);
  }

  button:active {
    transform: scale(0.95);
  }

  /* 自定义滚动条 */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #4299e1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #3182ce;
  }
</style>
