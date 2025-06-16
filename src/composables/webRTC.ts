// webRTC.ts
import { ref, onUnmounted } from "vue";

// WebRTC 核心功能封装
export function useWebRTC() {
  // 媒体流和连接
  const localStream = ref<MediaStream | null>(null);
  const remoteStream = ref<MediaStream | null>(null);
  const peerConnection = ref<RTCPeerConnection | null>(null);

  // 状态
  const isCalling = ref(false);
  const isCaller = ref(false);
  const isConnected = ref(false);
  const error = ref<string | null>(null);

  // 初始化本地媒体流
  const initLocalStream = async () => {
    try {
      // 停止现有媒体流
      if (localStream.value) {
        localStream.value.getTracks().forEach((track) => track.stop());
        localStream.value = null;
      }

      // 获取新的媒体流
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStream.value = stream;
      return stream;
    } catch (err) {
      // NotAllowedError：用户拒绝授权
      // NotFoundError：无匹配设备
      // OverconstrainedError：配置无法满足
      // error.value = `无法访问摄像头/麦克风: ${(err as Error).message}`;
      throw new Error("拒绝访问摄像头/麦克风");
    }
  };

  // 添加 iceCandidate 回调
  const onIceCandidate = ref<(candidate: RTCIceCandidate) => void>();

  // 创建对等连接
  const createPeerConnection = () => {
    // 关闭现有连接
    if (peerConnection.value) {
      peerConnection.value.close();
    }

    // 创建新连接
    const pc = new RTCPeerConnection();
    // const pc = new RTCPeerConnection({
    //   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    // });

    peerConnection.value = pc;
    isCalling.value = true;
    isConnected.value = false;
    error.value = null;

    // 添加本地媒体轨道
    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.value!);
      });
    }

    // 监听远程媒体流
    pc.ontrack = (event) => {
      console.log("监听远程媒体流", event);
      // if (!remoteStream.value) {
      console.log("asdfasdf");
      remoteStream.value = event.streams[0];
      // }
      // event.streams[0].getTracks().forEach((track) => {
      //   remoteStream.value!.addTrack(track);
      // });
    };

    // 监听ICE候选
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // 实际应用中应通过信令服务器发送候选
        console.log("ICE candidate:", event.candidate);
        onIceCandidate.value(event.candidate);
      }
    };

    // 监听连接状态变化
    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case "checking":
          console.log("正在尝试建立连接...");
          break;
        case "connected":
          console.log("连接已建立");
          isConnected.value = true;
          break;
        case "completed":
          console.log("ICE 协商完成");
          break;
        case "disconnected":
          console.log("连接断开，正在尝试重新连接...");
          error.value = "连接断开";
          endCall(); //结束通话
          break;
        case "failed":
          console.error("ICE 连接失败");
          error.value = "连接失败";
          // 可以尝试重启 ICE 或重新协商
          break;
        case "closed":
          console.log("连接已关闭");
          break;
        default:
          break;
      }
    };

    return pc;
  };

  // 发起呼叫
  const startCall = async () => {
    try {
      // 确保有本地媒体流
      if (!localStream.value) {
        await initLocalStream();
      }

      // 创建对等连接
      const pc = createPeerConnection();
      isCaller.value = true;

      // 创建Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 返回Offer用于发送给被呼叫方
      return offer;
    } catch (err) {
      error.value = `发起呼叫失败: ${(err as Error).message}`;
      throw err;
    }
  };

  // 接受呼叫
  const acceptCall = async (offer: RTCSessionDescriptionInit) => {
    try {
      // 确保有本地媒体流
      if (!localStream.value) {
        await initLocalStream();
      }

      // 创建对等连接
      const pc = createPeerConnection();
      isCaller.value = false;

      // 收到 offer 后设置远程描述（需要包装）
      const offerDesc = new RTCSessionDescription(offer);

      // 设置远程Offer
      await pc.setRemoteDescription(offerDesc);

      // 创建Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 返回Answer用于发送给呼叫方
      return answer;
    } catch (err) {
      console.log(err);
      error.value = `接受呼叫失败: ${(err as Error).message}`;
      throw err;
    }
  };

  // 处理Answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnection.value) {
      throw new Error("对等连接未初始化");
    }

    try {
      // 收到 answer 后设置远程描述（需要包装）
      const answerDesc = new RTCSessionDescription(answer);
      await peerConnection.value.setRemoteDescription(answerDesc);
      isConnected.value = true;
    } catch (err) {
      error.value = `处理应答失败: ${(err as Error).message}`;
      throw err;
    }
  };

  // 处理ICE候选
  const handleICECandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnection.value) {
      throw new Error("对等连接未初始化");
    }

    try {
      await peerConnection.value.addIceCandidate(candidate);
    } catch (err) {
      console.warn("添加ICE候选失败:", err);
    }
  };

  // 结束通话
  const endCall = () => {
    if (peerConnection.value) {
      peerConnection.value.close();
      peerConnection.value = null;
    }

    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach((track) => track.stop());
      remoteStream.value = null;
    }

    if (localStream.value) {
      localStream.value.getTracks().forEach((track) => track.stop());
      localStream.value = null;
    }

    isCalling.value = false;
    isConnected.value = false;
    isCaller.value = false;
  };

  // 组件卸载时清理
  onUnmounted(() => {
    endCall();

    // if (localStream.value) {
    //   localStream.value.getTracks().forEach((track) => track.stop());
    //   localStream.value = null;
    // }
  });

  return {
    // 状态
    localStream,
    remoteStream,
    isCalling,
    isCaller,
    isConnected,
    error,

    // 方法
    initLocalStream,
    startCall,
    acceptCall,
    handleAnswer,
    handleICECandidate,
    endCall,
    onIceCandidate, // 暴露 ICE 候选回调
  };
}
