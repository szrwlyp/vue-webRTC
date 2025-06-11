<script setup lang="ts">
import { ref } from "vue";

// 本地Video DOM引用
const localVideo = ref<HTMLVideoElement | null>(null);
// 本地前置或者后置摄像头
const facingMode = ref<string>("user");

// 获取本地媒体流
const getLocalMediaStream = async () => {
  // isLoading.value = true;
  // loadingMessage.value = "正在访问摄像头和麦克风...";
  // addDebugMessage("请求媒体设备权限...");
  console.log(facingMode.value, "facingMode.value");

  try {
    const constraints = {
      video: {
        width: { ideal: 200 },
        height: { ideal: 200 },
        frameRate: { ideal: 30 },
        facingMode: facingMode.value,
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    };
    // front.value ? "user" : "environment"
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // addDebugMessage("已获取媒体流");
    // localStream.value = stream;

    if (localVideo.value) {
      localVideo.value.srcObject = stream;
    }

    return stream;
  } catch (err: any) {
    console.error("获取媒体设备失败:", err);
    // showNotification(
    //   "error",
    //   "无法访问摄像头/麦克风: " + err.message
    // );
    throw err;
  } finally {
    // isLoading.value = false;
  }
};
// 切换本地摄像头
const changeDeviceCamera = () => {
  facingMode.value = facingMode.value === "user" ? "environment" : "user";

  console.log(localVideo.value?.srcObject);
  const stream = localVideo.value?.srcObject;
  stream.getTracks().forEach((track) => track.stop());

  getLocalMediaStream();
};
</script>

<template>
  <div>
    <video ref="localVideo" autoplay muted></video>
    <div @click="getLocalMediaStream">打开本地视频流</div>
    <div style="margin-top: 20px" @click="changeDeviceCamera">
      切换成{{ facingMode === "user" ? "后置" : "前置" }}摄像头
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
