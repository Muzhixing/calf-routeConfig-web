<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>轨迹回放</span>
        <el-tag v-if="taskInfo" type="success">
          时长: {{ formatDuration(taskInfo.duration) }} | 距离: {{ taskInfo.distance }}m
        </el-tag>
      </div>
    </template>
    
    <!-- 回放控制栏 -->
    <div class="playback-controls">
      <el-button-group>
        <el-button :icon="VideoPlay" @click="play" :disabled="isPlaying">播放</el-button>
        <el-button :icon="VideoPause" @click="pause">暂停</el-button>
        <el-button :icon="RefreshLeft" @click="reset">重置</el-button>
      </el-button-group>
      
      <div class="speed-control">
        <span>速度:</span>
        <el-select v-model="playbackSpeed" size="small" style="width: 80px">
          <el-option label="0.5x" :value="0.5" />
          <el-option label="1x" :value="1" />
          <el-option label="2x" :value="2" />
          <el-option label="4x" :value="4" />
        </el-select>
      </div>
      
      <div class="progress-control">
        <span>{{ currentIndex + 1 }} / {{ track.length }}</span>
        <el-slider 
          v-model="currentIndex" 
          :max="track.length - 1" 
          :show-tooltip="false"
          @input="handleSliderChange"
        />
      </div>
    </div>
    
    <!-- 轨迹显示区域 -->
    <div class="track-display" ref="trackContainer">
      <svg class="track-svg" :viewBox="viewBox">
        <!-- 网格背景 -->
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e8e8e8" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect x="-50" y="-50" width="100" height="100" fill="url(#grid)" />
        
        <!-- 完整轨迹线 -->
        <polyline
          :points="trackPoints"
          fill="none"
          stroke="#409eff"
          stroke-width="2"
          stroke-opacity="0.3"
        />
        
        <!-- 已播放轨迹线 -->
        <polyline
          :points="playedTrackPoints"
          fill="none"
          stroke="#409eff"
          stroke-width="3"
        />
        
        <!-- 轨迹点 -->
        <circle
          v-for="(point, index) in track"
          :key="index"
          :cx="point.position.x"
          :cy="point.position.y"
          :r="index === currentIndex ? 8 : 4"
          :fill="getPointColor(index)"
          stroke="#fff"
          stroke-width="2"
        />
        
        <!-- 当前位置标记 -->
        <g v-if="currentPoint">
          <circle
            :cx="currentPoint.position.x"
            :cy="currentPoint.position.y"
            r="12"
            fill="rgba(64, 158, 255, 0.3)"
          />
          <circle
            :cx="currentPoint.position.x"
            :cy="currentPoint.position.y"
            r="6"
            fill="#409eff"
          />
          <!-- 方向指示 -->
          <line
            v-if="nextPoint"
            :x1="currentPoint.position.x"
            :y1="currentPoint.position.y"
            :x2="nextPoint.position.x"
            :y2="nextPoint.position.y"
            stroke="#409eff"
            stroke-width="3"
            marker-end="url(#arrow)"
          />
        </g>
        
        <!-- 起点和终点标记 -->
        <text v-if="track.length > 0" :x="track[0].position.x" :y="track[0].position.y - 10" text-anchor="middle" font-size="10" fill="#67c23a">起点</text>
        <text v-if="track.length > 1" :x="track[track.length - 1].position.x" :y="track[track.length - 1].position.y - 10" text-anchor="middle" font-size="10" fill="#f56c6c">终点</text>
        
        <!-- 箭头标记 -->
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#409eff" />
          </marker>
        </defs>
      </svg>
    </div>
    
    <!-- 时间轴信息 -->
    <div class="timeline-info" v-if="currentPoint">
      <el-descriptions :column="3" size="small">
        <el-descriptions-item label="时间">
          {{ formatTime(currentPoint.timestamp) }}
        </el-descriptions-item>
        <el-descriptions-item label="位置">
          ({{ currentPoint.position.x }}, {{ currentPoint.position.y }})
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ currentPoint.status || '行进中' }}
        </el-descriptions-item>
      </el-descriptions>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { VideoPlay, VideoPause, RefreshLeft } from '@element-plus/icons-vue'
import type { TrackPoint } from '@/services/history'
import type { Task } from '@/types'
import { formatDuration } from '@/services/history'

interface Props {
  taskId: string
  track: TrackPoint[]
  taskInfo?: {
    task: Task
    track: TrackPoint[]
    duration: number
    distance: number
  } | null
}

const props = defineProps<Props>()

// 播放状态
const isPlaying = ref(false)
const playbackSpeed = ref(1)
const currentIndex = ref(0)

let playTimer: number | null = null

// 计算属性
const currentPoint = computed(() => props.track[currentIndex.value])
const nextPoint = computed(() => props.track[currentIndex.value + 1])

const trackPoints = computed(() => {
  return props.track.map(p => `${p.position.x},${p.position.y}`).join(' ')
})

const playedTrackPoints = computed(() => {
  return props.track.slice(0, currentIndex.value + 1)
    .map(p => `${p.position.x},${p.position.y}`).join(' ')
})

const viewBox = computed(() => {
  if (props.track.length === 0) return '-10 -10 20 20'
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  props.track.forEach(p => {
    minX = Math.min(minX, p.position.x)
    minY = Math.min(minY, p.position.y)
    maxX = Math.max(maxX, p.position.x)
    maxY = Math.max(maxY, p.position.y)
  })
  
  const padding = 5
  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2
  
  return `${minX - padding} ${minY - padding} ${width} ${height}`
})

// 方法
const getPointColor = (index: number): string => {
  if (index < currentIndex.value) return '#67c23a'
  if (index === currentIndex.value) return '#409eff'
  return '#c0c4cc'
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// 播放控制
const play = () => {
  if (isPlaying.value || currentIndex.value >= props.track.length - 1) {
    isPlaying.value = true
    runPlayback()
  }
}

const pause = () => {
  isPlaying.value = false
  if (playTimer) {
    clearInterval(playTimer)
    playTimer = null
  }
}

const reset = () => {
  pause()
  currentIndex.value = 0
}

const runPlayback = () => {
  pause()
  isPlaying.value = true
  
  const baseInterval = 1000 // 基础间隔 1秒
  const interval = baseInterval / playbackSpeed.value
  
  playTimer = window.setInterval(() => {
    if (currentIndex.value < props.track.length - 1) {
      currentIndex.value++
    } else {
      pause()
    }
  }, interval)
}

const handleSliderChange = (value: number) => {
  currentIndex.value = value
  if (isPlaying.value) {
    runPlayback()
  }
}

// 监听任务变化
watch(() => props.taskId, () => {
  reset()
})

// 清理
onUnmounted(() => {
  pause()
})

// 导出格式化函数供模板使用
defineExpose({ formatDuration })
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.progress-control {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #606266;
}

.progress-control .el-slider {
  flex: 1;
}

.track-display {
  height: 300px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafafa;
  overflow: hidden;
}

.track-svg {
  width: 100%;
  height: 100%;
}

.timeline-info {
  margin-top: 15px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>