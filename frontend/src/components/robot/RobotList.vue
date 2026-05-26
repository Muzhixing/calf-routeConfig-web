<template>
  <div class="robot-list">
    <div class="list-header">
      <div class="filter-group">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="在线" value="online" />
          <el-option label="运行中" value="running" />
          <el-option label="充电中" value="charging" />
          <el-option label="已暂停" value="paused" />
          <el-option label="离线" value="offline" />
          <el-option label="故障" value="error" />
        </el-select>
      </div>
      <div class="stats">
        <span class="stat-item">
          <span class="stat-dot online"></span>
          在线: {{ onlineCount }}
        </span>
        <span class="stat-item">
          <span class="stat-dot offline"></span>
          离线: {{ offlineCount }}
        </span>
        <span class="stat-item">
          <span class="stat-dot error"></span>
          故障: {{ errorCount }}
        </span>
      </div>
    </div>
    
    <div class="list-content" v-if="filteredRobots.length > 0">
      <el-row :gutter="16">
        <el-col 
          v-for="robot in filteredRobots" 
          :key="robot.id" 
          :xs="24" 
          :sm="12" 
          :md="8" 
          :lg="6"
        >
          <RobotCard
            :robot="robot"
            :selected="selectedRobotId === robot.id"
            show-actions
            @click="handleSelect"
            @control="handleControl"
            @view="handleView"
          />
        </el-col>
      </el-row>
    </div>
    
    <el-empty v-else description="暂无机器人数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import RobotCard from './RobotCard.vue'
import type { Robot, RobotStatus } from '@/types'

const props = defineProps<{
  robots: Robot[]
}>()

const emit = defineEmits<{
  select: [robot: Robot]
  control: [robot: Robot]
  view: [robot: Robot]
}>()

const statusFilter = ref<RobotStatus | ''>('')
const selectedRobotId = ref<string>('')

const filteredRobots = computed(() => {
  if (!statusFilter.value) {
    return props.robots
  }
  return props.robots.filter(r => r.status === statusFilter.value)
})

const onlineCount = computed(() => 
  props.robots.filter(r => r.status === 'online' || r.status === 'running').length
)

const offlineCount = computed(() => 
  props.robots.filter(r => r.status === 'offline').length
)

const errorCount = computed(() => 
  props.robots.filter(r => r.status === 'error').length
)

const handleSelect = (robot: Robot) => {
  selectedRobotId.value = robot.id
  emit('select', robot)
}

const handleControl = (robot: Robot) => {
  emit('control', robot)
}

const handleView = (robot: Robot) => {
  emit('view', robot)
}
</script>

<style scoped>
.robot-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stat-dot.online {
  background-color: #67c23a;
}

.stat-dot.offline {
  background-color: #909399;
}

.stat-dot.error {
  background-color: #f56c6c;
}

.list-content {
  min-height: 200px;
}

.list-content :deep(.el-col) {
  margin-bottom: 16px;
}
</style>