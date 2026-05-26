<template>
  <div class="alarms-view">
    <div class="view-header">
      <h2>告警中心</h2>
      <el-button @click="loadAlarms">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
    
    <el-card>
      <AlarmList
        :alarms="alarms"
        :loading="loading"
        @refresh="loadAlarms"
      />
    </el-card>
    
    <!-- 告警弹窗 -->
    <AlarmPopup
      :visible="showPopup"
      :alarm="currentAlarm"
      @close="closePopup"
      @confirm="handleConfirm"
      @resolve="handleResolve"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import AlarmList from '@/components/alarm/AlarmList.vue'
import AlarmPopup from '@/components/alarm/AlarmPopup.vue'
import type { Alarm } from '@/types'
import { fetchAlarms, confirmAlarm, resolveAlarm, addAlarmListener, getPendingCount, getCriticalCount } from '@/services/alarm'

const alarms = ref<Alarm[]>([])
const loading = ref(false)

// 弹窗相关
const showPopup = ref(false)
const currentAlarm = ref<Alarm | null>(null)

let popupCheckTimer: number | null = null

// 加载告警列表
const loadAlarms = async () => {
  loading.value = true
  try {
    alarms.value = await fetchAlarms()
  } finally {
    loading.value = false
  }
}

// 告警监听器
const handleNewAlarm = (newAlarms: Alarm[]) => {
  alarms.value = newAlarms
  
  // 检查是否有新的待处理告警
  const pendingCount = getPendingCount()
  if (pendingCount > 0 && !showPopup.value) {
    // 显示最新的严重告警弹窗
    const criticalAlarm = newAlarms.find(a => a.level === 'critical' && a.status === 'pending')
    if (criticalAlarm) {
      showPopup(criticalAlarm)
    }
  }
}

// 显示弹窗
const showPopup = (alarm: Alarm) => {
  currentAlarm.value = alarm
  showPopup.value = true
}

// 关闭弹窗
const closePopup = () => {
  showPopup.value = false
  currentAlarm.value = null
}

// 处理确认
const handleConfirm = async (alarm: Alarm) => {
  const userId = alarm.confirmedBy || 'unknown'
  await confirmAlarm(alarm.id, userId)
  loadAlarms()
}

// 处理解决
const handleResolve = async (alarm: Alarm) => {
  await resolveAlarm(alarm.id)
  loadAlarms()
}

// 定期检查新告警
const startPopupCheck = () => {
  popupCheckTimer = window.setInterval(() => {
    const criticalCount = getCriticalCount()
    if (criticalCount > 0 && !showPopup.value) {
      const criticalAlarm = alarms.value.find(a => a.level === 'critical' && a.status === 'pending')
      if (criticalAlarm) {
        showPopup(criticalAlarm)
      }
    }
  }, 5000)
}

onMounted(() => {
  loadAlarms()
  addAlarmListener(handleNewAlarm)
  startPopupCheck()
})

onUnmounted(() => {
  if (popupCheckTimer) {
    clearInterval(popupCheckTimer)
  }
})
</script>

<style scoped>
.alarms-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}
</style>