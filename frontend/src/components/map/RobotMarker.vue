<template>
  <div
    class="robot-marker"
    :class="['robot-marker--' + robot.status]"
    :style="markerStyle"
    @click.stop="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="robot-icon">
      <el-icon :size="20"><Monitor /></el-icon>
    </div>
    <div class="robot-name">{{ robot.name }}</div>
    <div class="robot-battery" :class="batteryClass">
      <el-icon><Battery /></el-icon>
      <span>{{ robot.battery }}%</span>
    </div>
    
    <!-- Status indicator -->
    <div class="status-indicator"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Robot, GridPosition } from '@/types'
import { Monitor, Battery } from '@element-plus/icons-vue'

interface Props {
  robot: Robot
  cellSize: number
  origin: GridPosition
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click', robot: Robot): void
  (e: 'hover', robot: Robot, event: MouseEvent): void
}>()

const markerStyle = computed(() => {
  const x = (props.robot.position.x - props.origin.x) * props.cellSize + props.cellSize / 2
  const y = (props.robot.position.y - props.origin.y) * props.cellSize + props.cellSize / 2
  return {
    left: x + 'px',
    top: y + 'px',
  }
})

const batteryClass = computed(() => {
  if (props.robot.battery <= 20) return 'battery--critical'
  if (props.robot.battery <= 40) return 'battery--low'
  return 'battery--normal'
})

const handleClick = () => {
  emit('click', props.robot)
}

const handleMouseEnter = (event: MouseEvent) => {
  emit('hover', props.robot, event)
}

const handleMouseLeave = () => {
  // Could emit leave event
}
</script>

<style scoped>
.robot-marker {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  transition: transform 0.2s;
}

.robot-marker:hover {
  transform: translate(-50%, -50%) scale(1.1);
  z-index: 20;
}

.robot-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #409eff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
}

.robot-marker--online .robot-icon {
  background-color: #67c23a;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.4);
}

.robot-marker--running .robot-icon {
  background-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
  animation: pulse 1.5s infinite;
}

.robot-marker--charging .robot-icon {
  background-color: #e6a23c;
  box-shadow: 0 2px 8px rgba(230, 162, 60, 0.4);
}

.robot-marker--offline .robot-icon {
  background-color: #909399;
  box-shadow: 0 2px 8px rgba(144, 147, 153, 0.4);
}

.robot-marker--error .robot-icon {
  background-color: #f56c6c;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.4);
}

.robot-marker--paused .robot-icon {
  background-color: #c0c4cc;
  box-shadow: 0 2px 8px rgba(192, 196, 204, 0.4);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.robot-name {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #303133;
  background-color: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.robot-battery {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
  margin-top: 2px;
}

.battery--normal {
  color: #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
}

.battery--low {
  color: #e6a23c;
  background-color: rgba(230, 162, 60, 0.1);
}

.battery--critical {
  color: #f56c6c;
  background-color: rgba(245, 108, 108, 0.1);
}

.status-indicator {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #67c23a;
  border: 2px solid #fff;
}

.robot-marker--error .status-indicator {
  background-color: #f56c6c;
  animation: blink 1s infinite;
}

.robot-marker--offline .status-indicator {
  background-color: #909399;
}

.robot-marker--charging .status-indicator {
  background-color: #e6a23c;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>