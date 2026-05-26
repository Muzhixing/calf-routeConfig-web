<template>
  <transition name="alarm-fade">
    <div v-if="visible && alarm" class="alarm-popup" :class="`level-${alarm.level}`">
      <div class="popup-header">
        <el-icon :size="20"><BellFilled /></el-icon>
        <span class="popup-title">{{ getLevelTitle(alarm.level) }}</span>
        <el-button class="close-btn" type="text" @click="handleClose">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      
      <div class="popup-content">
        <div class="alarm-message">{{ alarm.message }}</div>
        <div class="alarm-meta">
          <span>机器人: {{ alarm.robotId }}</span>
          <span>{{ formatTime(alarm.timestamp) }}</span>
        </div>
      </div>
      
      <div class="popup-actions">
        <el-button size="small" @click="handleConfirm">确认</el-button>
        <el-button size="small" type="primary" @click="handleResolve">解决</el-button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { ElMessage } from 'element-plus'
import { BellFilled, Close } from '@element-plus/icons-vue'
import type { Alarm, AlarmLevel } from '@/types'
import { confirmAlarm as confirmAlarmApi, resolveAlarm as resolveAlarmApi } from '@/services/alarm'
import { useAuthStore } from '@/stores/auth'

interface Props {
  visible: boolean
  alarm: Alarm | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  confirm: [alarm: Alarm]
  resolve: [alarm: Alarm]
}>()

const authStore = useAuthStore()

const getLevelTitle = (level: AlarmLevel): string => {
  const map: Record<AlarmLevel, string> = {
    critical: '严重告警',
    warning: '警告',
    normal: '普通告警',
  }
  return map[level] || '告警'
}

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const handleClose = () => {
  emit('close')
}

const handleConfirm = async () => {
  if (!props.alarm) return
  
  const userId = authStore.user?.id || 'unknown'
  const success = await confirmAlarmApi(props.alarm.id, userId)
  
  if (success) {
    ElMessage.success('告警已确认')
    emit('confirm', props.alarm)
    emit('close')
  } else {
    ElMessage.error('操作失败')
  }
}

const handleResolve = async () => {
  if (!props.alarm) return
  
  const success = await resolveAlarmApi(props.alarm.id)
  
  if (success) {
    ElMessage.success('告警已解决')
    emit('resolve', props.alarm)
    emit('close')
  } else {
    ElMessage.error('操作失败')
  }
}

// 自动关闭延迟
let autoCloseTimer: number | null = null

watch(() => props.visible, (visible) => {
  if (visible) {
    // 严重告警10秒后自动关闭
    if (props.alarm?.level === 'critical') {
      autoCloseTimer = window.setTimeout(() => {
        emit('close')
      }, 10000)
    }
  } else if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
})
</script>

<style scoped>
.alarm-popup {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 360px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  overflow: hidden;
}

.alarm-popup.level-critical {
  border-left: 4px solid #f56c6c;
}

.alarm-popup.level-warning {
  border-left: 4px solid #e6a23c;
}

.alarm-popup.level-normal {
  border-left: 4px solid #67c23a;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f5f7fa;
  color: #303133;
}

.popup-header .el-icon {
  color: inherit;
}

.level-critical .popup-header {
  background: #fef0f0;
  color: #f56c6c;
}

.level-warning .popup-header {
  background: #fdf6ec;
  color: #e6a23c;
}

.popup-title {
  flex: 1;
  font-weight: 500;
}

.close-btn {
  padding: 4px;
  color: #909399;
}

.close-btn:hover {
  color: #606266;
}

.popup-content {
  padding: 16px;
}

.alarm-message {
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  margin-bottom: 12px;
}

.alarm-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}

.popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
}

.alarm-fade-enter-active,
.alarm-fade-leave-active {
  transition: all 0.3s ease;
}

.alarm-fade-enter-from,
.alarm-fade-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>