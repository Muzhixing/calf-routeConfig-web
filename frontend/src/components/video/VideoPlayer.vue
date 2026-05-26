<template>
  <div class="video-player" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="video-container" ref="videoContainerRef">
      <video 
        ref="videoRef"
        class="video-element"
        :poster="poster"
        @play="handlePlay"
        @pause="handlePause"
        @ended="handleEnded"
        @waiting="handleWaiting"
        @error="handleError"
        @timeupdate="handleTimeUpdate"
      />
      
      <!-- Loading overlay -->
      <div v-if="isLoading" class="video-overlay loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>连接中...</span>
      </div>
      
      <!-- Error overlay -->
      <div v-if="hasError" class="video-overlay error">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ errorMessage }}</span>
        <el-button type="primary" size="small" @click="retryConnection">
          重试
        </el-button>
      </div>
      
      <!-- Stream disconnected overlay -->
      <div v-if="isStreamDisconnected && !hasError" class="video-overlay disconnected">
        <el-icon><Warning /></el-icon>
        <span>视频流已断开</span>
        <el-button type="primary" size="small" @click="reconnect">
          重新连接
        </el-button>
      </div>
    </div>
    
    <!-- Controls -->
    <div class="video-controls" v-if="showControls">
      <div class="controls-left">
        <el-button 
          type="primary" 
          circle 
          size="small"
          @click="togglePlay"
        >
          <el-icon v-if="isPlaying"><VideoPause /></el-icon>
          <el-icon v-else><VideoPlay /></el-icon>
        </el-button>
      </div>
      
      <div class="controls-center">
        <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>
      
      <div class="controls-right">
        <el-button 
          circle 
          size="small"
          @click="toggleFullscreen"
        >
          <el-icon><FullScreen /></el-icon>
        </el-button>
      </div>
    </div>
    
    <!-- Stream info -->
    <div class="stream-info" v-if="showStreamInfo">
      <span class="info-item">
        <el-icon><Connection /></el-icon>
        {{ connectionStatus }}
      </span>
      <span class="info-item" v-if="bitrate">
        <el-icon><Monitor /></el-icon>
        {{ bitrate }} kbps
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Loading, WarningFilled, Warning, VideoPause, VideoPlay, FullScreen, Connection, Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = withDefaults(defineProps<{
  src?: string
  poster?: string
  autoplay?: boolean
  showControls?: boolean
  showStreamInfo?: boolean
  robotId?: string
}>(), {
  autoplay: false,
  showControls: true,
  showStreamInfo: true,
})

const emit = defineEmits<{
  play: []
  pause: []
  ended: []
  error: [error: Error]
  timeupdate: [time: number]
  statusChange: [status: string]
}>()

const videoRef = ref<HTMLVideoElement>()
const videoContainerRef = ref<HTMLDivElement>()

// State
const isPlaying = ref(false)
const isLoading = ref(false)
const hasError = ref(false)
const errorMessage = ref('视频加载失败')
const isStreamDisconnected = ref(false)
const isFullscreen = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const connectionStatus = ref('未连接')
const bitrate = ref<number>(0)

// WebRTC
let pc: RTCPeerConnection | null = null
let ws: WebSocket | null = null
let reconnectTimer: number | null = null
let statsTimer: number | null = null

// Initialize WebRTC
const initWebRTC = async () => {
  if (!props.robotId) return
  
  isLoading.value = true
  connectionStatus.value = '连接中...'
  
  try {
    // Create peer connection
    pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    })
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && ws) {
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          robotId: props.robotId,
        }))
      }
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      if (videoRef.value && event.streams[0]) {
        videoRef.value.srcObject = event.streams[0]
        isLoading.value = false
        isStreamDisconnected.value = false
        connectionStatus.value = '已连接'
        
        if (props.autoplay) {
          videoRef.value.play()
        }
      }
    }
    
    // Handle connection state
    pc.onconnectionstatechange = () => {
      const state = pc?.connectionState
      if (state === 'disconnected' || state === 'failed') {
        handleStreamDisconnect()
      }
    }
    
    // Connect to signaling server (mock)
    await connectToSignaling()
    
  } catch (e) {
    console.error('WebRTC init error:', e)
    handleError(new Error('WebRTC初始化失败'))
  }
}

// Connect to signaling server (mock)
const connectToSignaling = async () => {
  // In a real app, this would connect to your signaling server
  // For now, we'll simulate a connection
  
  connectionStatus.value = '等待视频流...'
  
  // Simulate receiving a stream after a delay
  setTimeout(() => {
    if (props.src) {
      // Use provided src as fallback
      if (videoRef.value) {
        videoRef.value.src = props.src
        isLoading.value = false
        connectionStatus.value = '已连接'
        
        if (props.autoplay) {
          videoRef.value.play()
        }
      }
    } else {
      // Mock: create a blank stream for demo
      mockVideoStream()
    }
  }, 1500)
}

// Mock video stream for demo
const mockVideoStream = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true,
      audio: false 
    })
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      isLoading.value = false
      isStreamDisconnected.value = false
      connectionStatus.value = '已连接 (模拟)'
      
      if (props.autoplay) {
        videoRef.value.play()
      }
    }
  } catch (e) {
    // Camera not available, show error
    isLoading.value = false
    hasError.value = true
    errorMessage.value = '无法访问摄像头'
    connectionStatus.value = '连接失败'
  }
}

// Handle stream disconnect
const handleStreamDisconnect = () => {
  isStreamDisconnected.value = true
  connectionStatus.value = '已断开'
  emit('statusChange', 'disconnected')
}

// Reconnect
const reconnect = () => {
  cleanup()
  initWebRTC()
}

// Retry connection
const retryConnection = () => {
  hasError.value = false
  reconnect()
}

// Toggle play/pause
const togglePlay = () => {
  if (!videoRef.value) return
  
  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
}

// Toggle fullscreen
const toggleFullscreen = () => {
  if (!videoContainerRef.value) return
  
  if (!document.fullscreenElement) {
    videoContainerRef.value.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// Event handlers
const handlePlay = () => {
  isPlaying.value = true
  emit('play')
}

const handlePause = () => {
  isPlaying.value = false
  emit('pause')
}

const handleEnded = () => {
  isPlaying.value = false
  emit('ended')
}

const handleWaiting = () => {
  isLoading.value = true
}

const handleError = (e: Error) => {
  isLoading.value = false
  hasError.value = true
  errorMessage.value = '视频加载失败'
  connectionStatus.value = '连接失败'
  emit('error', e)
  emit('statusChange', 'error')
}

const handleTimeUpdate = () => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
    duration.value = videoRef.value.duration || 0
    emit('timeupdate', currentTime.value)
  }
}

// Cleanup
const cleanup = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  
  if (statsTimer) {
    clearInterval(statsTimer)
    statsTimer = null
  }
  
  if (pc) {
    pc.close()
    pc = null
  }
  
  if (ws) {
    ws.close()
    ws = null
  }
  
  // Stop video tracks
  if (videoRef.value?.srcObject) {
    const stream = videoRef.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
    videoRef.value.srcObject = null
  }
}

// Format time
const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '00:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Watch for src changes
watch(() => props.src, (newSrc) => {
  if (newSrc) {
    cleanup()
    initWebRTC()
  }
})

// Watch for robotId changes
watch(() => props.robotId, () => {
  cleanup()
  initWebRTC()
})

onMounted(() => {
  if (props.src || props.robotId) {
    initWebRTC()
  }
  
  // Listen for fullscreen changes
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.video-player {
  display: flex;
  flex-direction: column;
  background-color: #000;
  border-radius: 4px;
  overflow: hidden;
}

.video-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #000;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #fff;
}

.video-overlay .el-icon {
  font-size: 48px;
}

.video-overlay.loading .loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.video-overlay.error {
  color: #f56c6c;
}

.video-overlay.disconnected {
  color: #e6a23c;
}

.video-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: #1a1a1a;
}

.controls-left,
.controls-right {
  display: flex;
  gap: 8px;
}

.controls-center {
  flex: 1;
  text-align: center;
}

.time-display {
  color: #fff;
  font-size: 13px;
}

.stream-info {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background-color: #2a2a2a;
  font-size: 12px;
  color: #909399;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.is-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background-color: #000;
}

.is-fullscreen .video-container {
  height: calc(100vh - 80px);
}
</style>