<template>
  <el-card class="robot-card" :class="{ 'is-selected': selected }" @click="$emit('click', robot)">
    <div class="card-header">
      <div class="robot-name">
        <el-icon class="status-icon" :class="robot.status">
          <component :is="getStatusIcon(robot.status)" />
        </el-icon>
        <span>{{ robot.name }}</span>
      </div>
      <el-tag :type="getStatusType(robot.status)" size="small">
        {{ getStatusText(robot.status) }}
      </el-tag>
    </div>
    
    <div class="card-body">
      <div class="info-row">
        <span class="label">位置:</span>
        <span class="value">({{ robot.position.x }}, {{ robot.position.y }})</span>
      </div>
      
      <div class="info-row">
        <span class="label">电池:</span>
        <div class="battery-bar">
          <el-progress 
            :percentage="robot.battery" 
            :color="getBatteryColor(robot.battery)"
            :stroke-width="8"
            :show-text="false"
          />
          <span class="battery-text">{{ robot.battery }}%</span>
        </div>
      </div>
      
      <div class="info-row" v-if="robot.speed !== undefined">
        <span class="label">速度:</span>
        <span class="value">{{ robot.speed }} m/s</span>
      </div>
      
      <div class="info-row" v-if="robot.waterRemaining !== undefined">
        <span class="label">水量:</span>
        <span class="value">{{ robot.waterRemaining }}%</span>
      </div>
      
      <div class="info-row">
        <span class="label">最后在线:</span>
        <span class="value">{{ formatTime(robot.lastOnlineAt) }}</span>
      </div>
    </div>
    
    <div class="card-footer" v-if="showActions">
      <el-button type="primary" size="small" @click.stop="$emit('control', robot)">
        <el-icon><Operation /></el-icon>
        控制
      </el-button>
      <el-button size="small" @click.stop="$emit('view', robot)">
        <el-icon><View /></el-icon>
        详情
      </el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Operation, View, VideoCamera, Charging } from '@element-plus/icons-vue'
import type { Robot, RobotStatus } from '@/types'

defineProps<{
  robot: Robot
  selected?: boolean
  showActions?: boolean
}>()

defineEmits<{
  click: [robot: Robot]
  control: [robot: Robot]
  view: [robot: Robot]
}>()

const getStatusIcon = (status: RobotStatus) => {
  const icons: Record<RobotStatus, string> = {
    online: 'VideoCamera',
    running: 'VideoCamera',
    charging: 'Charging',
    paused: 'VideoCamera',
    offline: 'VideoCamera',
    error: 'VideoCamera',
  }
  return icons[status] || 'VideoCamera'
}

const getStatusType = (status: RobotStatus): string => {
  const map: Record<RobotStatus, string> = {
    online: 'success',
    running: 'primary',
    charging: 'warning',
    paused: 'info',
    offline: 'info',
    error: 'danger',
  }
  return map[status] || 'info'
}

const getStatusText = (status: RobotStatus): string => {
  const map: Record<RobotStatus, string> = {
    online: '在线',
    running: '运行中',
    charging: '充电中',
    paused: '已暂停',
    offline: '离线',
    error: '故障',
  }
  return map[status] || status
}

const getBatteryColor = (battery: number): string => {
  if (battery <= 20) return '#f56c6c'
  if (battery <= 40) return '#e6a23c'
  return '#67c23a'
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.robot-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.robot-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.robot-card.is-selected {
  border-color: #409eff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.robot-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.status-icon {
  font-size: 18px;
}

.status-icon.online,
.status-icon.running {
  color: #67c23a;
}

.status-icon.charging {
  color: #e6a23c;
}

.status-icon.offline {
  color: #909399;
}

.status-icon.error {
  color: #f56c6c;
}

.status-icon.paused {
  color: #909399;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.label {
  color: #909399;
  width: 60px;
  flex-shrink: 0;
}

.value {
  color: #606266;
}

.battery-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.battery-bar :deep(.el-progress) {
  flex: 1;
}

.battery-text {
  width: 40px;
  text-align: right;
  color: #606266;
}

.card-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 8px;
}
</style>