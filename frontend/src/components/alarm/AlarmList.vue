<template>
  <div class="alarm-list">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-radio-group v-model="filterStatus" size="small">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="pending">待处理</el-radio-button>
        <el-radio-button label="confirmed">已确认</el-radio-button>
        <el-radio-button label="resolved">已解决</el-radio-button>
      </el-radio-group>
      
      <el-radio-group v-model="filterLevel" size="small">
        <el-radio-button label="all">全部级别</el-radio-button>
        <el-radio-button label="critical">严重</el-radio-button>
        <el-radio-button label="warning">警告</el-radio-button>
        <el-radio-button label="normal">普通</el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- 告警列表 -->
    <el-table 
      :data="filteredAlarms" 
      v-loading="loading"
      style="width: 100%"
      @row-click="handleRowClick"
    >
      <el-table-column prop="level" label="级别" width="80">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.level)">
            {{ getLevelText(row.level) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="告警信息" min-width="200" />
      <el-table-column prop="robotId" label="机器人" width="100" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">
          {{ getTypeText(row.type) }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.timestamp) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button 
            v-if="row.status === 'pending'" 
            type="primary" 
            link 
            size="small"
            @click.stop="handleConfirm(row)"
          >
            确认
          </el-button>
          <el-button 
            v-if="row.status !== 'resolved'" 
            type="success" 
            link 
            size="small"
            @click.stop="handleResolve(row)"
          >
            解决
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 统计信息 -->
    <div class="statistics">
      <span class="stat-item">
        <el-tag type="danger">严重: {{ criticalCount }}</el-tag>
      </span>
      <span class="stat-item">
        <el-tag type="warning">警告: {{ warningCount }}</el-tag>
      </span>
      <span class="stat-item">
        <el-tag type="success">普通: {{ normalCount }}</el-tag>
      </span>
      <span class="stat-item">
        待处理: {{ pendingCount }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Alarm, AlarmLevel, AlarmStatus, AlarmType } from '@/types'
import { useAuthStore } from '@/stores/auth'
import {
  confirmAlarm as confirmAlarmApi,
  resolveAlarm as resolveAlarmApi,
  getAlarmLevelText,
  getAlarmLevelType,
  getAlarmStatusText,
  getAlarmStatusType,
  getAlarmTypeText,
} from '@/services/alarm'

interface Props {
  alarms: Alarm[]
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  refresh: []
}>()

const authStore = useAuthStore()

const filterStatus = ref<'all' | AlarmStatus>('all')
const filterLevel = ref<'all' | AlarmLevel>('all')

// 筛选后的告警
const filteredAlarms = computed(() => {
  let result = [...props.alarms]
  
  if (filterStatus.value !== 'all') {
    result = result.filter(a => a.status === filterStatus.value)
  }
  
  if (filterLevel.value !== 'all') {
    result = result.filter(a => a.level === filterLevel.value)
  }
  
  // 按时间倒序
  return result.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
})

// 统计数据
const criticalCount = computed(() => 
  props.alarms.filter(a => a.level === 'critical' && a.status !== 'resolved').length
)
const warningCount = computed(() => 
  props.alarms.filter(a => a.level === 'warning' && a.status !== 'resolved').length
)
const normalCount = computed(() => 
  props.alarms.filter(a => a.level === 'normal' && a.status !== 'resolved').length
)
const pendingCount = computed(() => 
  props.alarms.filter(a => a.status === 'pending').length
)

// 格式化时间
const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 确认告警
const handleConfirm = async (alarm: Alarm) => {
  const userId = authStore.user?.id || 'unknown'
  const success = await confirmAlarmApi(alarm.id, userId)
  
  if (success) {
    ElMessage.success('告警已确认')
    emit('refresh')
  } else {
    ElMessage.error('操作失败')
  }
}

// 解决告警
const handleResolve = async (alarm: Alarm) => {
  const success = await resolveAlarmApi(alarm.id)
  
  if (success) {
    ElMessage.success('告警已解决')
    emit('refresh')
  } else {
    ElMessage.error('操作失败')
  }
}

// 行点击
const handleRowClick = (row: Alarm) => {
  // 可以添加详情查看逻辑
}

// 导出辅助函数供模板使用
defineExpose({
  getLevelType: (level: AlarmLevel) => getAlarmLevelType(level),
  getLevelText: (level: AlarmLevel) => getAlarmLevelText(level),
  getTypeText: (type: AlarmType) => getAlarmTypeText(type),
  getStatusType: (status: AlarmStatus) => getAlarmStatusType(status),
  getStatusText: (status: AlarmStatus) => getAlarmStatusText(status),
})
</script>

<style scoped>
.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.statistics {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>