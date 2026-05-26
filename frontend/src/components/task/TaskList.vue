<template>
  <div class="task-list">
    <div class="list-header">
      <div class="filter-group">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="待执行" value="pending" />
          <el-option label="进行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="已暂停" value="paused" />
          <el-option label="已取消" value="cancelled" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-select v-model="repeatFilter" placeholder="重复类型" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="不重复" value="none" />
          <el-option label="每天" value="daily" />
          <el-option label="每周" value="weekly" />
          <el-option label="每月" value="monthly" />
        </el-select>
      </div>
    </div>
    
    <el-table 
      :data="filteredTasks" 
      style="width: 100%"
      @row-click="handleRowClick"
      :row-class-name="getRowClassName"
    >
      <el-table-column prop="name" label="任务名称" min-width="180">
        <template #default="{ row }">
          <div class="task-name">
            <el-icon v-if="row.repeatType && row.repeatType !== 'none'" color="#409eff">
              <Clock />
            </el-icon>
            <span>{{ row.name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="robotId" label="机器人" width="120">
        <template #default="{ row }">
          {{ row.robotId || '未分配' }}
        </template>
      </el-table-column>
      <el-table-column prop="routeId" label="路线" width="120">
        <template #default="{ row }">
          {{ getRouteName(row.routeId) }}
        </template>
      </el-table-column>
      <el-table-column label="计划时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.scheduledTime) }}
        </template>
      </el-table-column>
      <el-table-column prop="repeatType" label="重复" width="100">
        <template #default="{ row }">
          {{ getRepeatText(row.repeatType) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click.stop="$emit('edit', row)">编辑</el-button>
          <el-button 
            type="success" 
            link 
            @click.stop="$emit('execute', row)"
            v-if="row.status === 'pending'"
          >
            执行
          </el-button>
          <el-button 
            type="warning" 
            link 
            @click.stop="$emit('pause', row)"
            v-if="row.status === 'running'"
          >
            暂停
          </el-button>
          <el-button 
            type="danger" 
            link 
            @click.stop="$emit('delete', row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock } from '@element-plus/icons-vue'
import type { Task, TaskStatus, RepeatType } from '@/types'
import type { Route } from '@/types'

const props = defineProps<{
  tasks: Task[]
  routes: Route[]
}>()

const emit = defineEmits<{
  edit: [task: Task]
  execute: [task: Task]
  pause: [task: Task]
  delete: [task: Task]
  select: [task: Task]
}>()

const statusFilter = ref<TaskStatus | ''>('')
const repeatFilter = ref<RepeatType | ''>('')

const filteredTasks = computed(() => {
  let result = props.tasks
  
  if (statusFilter.value) {
    result = result.filter(t => t.status === statusFilter.value)
  }
  
  if (repeatFilter.value) {
    result = result.filter(t => t.repeatType === repeatFilter.value)
  }
  
  return result
})

const getRouteName = (routeId: string): string => {
  const route = props.routes.find(r => r.id === routeId)
  return route?.name || routeId
}

const getStatusType = (status: TaskStatus): string => {
  const map: Record<TaskStatus, string> = {
    pending: 'info',
    running: 'primary',
    completed: 'success',
    paused: 'warning',
    cancelled: 'info',
    failed: 'danger',
  }
  return map[status] || 'info'
}

const getStatusText = (status: TaskStatus): string => {
  const map: Record<TaskStatus, string> = {
    pending: '待执行',
    running: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消',
    failed: '失败',
  }
  return map[status] || status
}

const getRepeatText = (repeatType?: RepeatType): string => {
  const map: Record<RepeatType, string> = {
    none: '不重复',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
  }
  return map[repeatType || 'none'] || repeatType || ''
}

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getRowClassName = ({ row }: { row: Task }) => {
  if (row.status === 'failed') return 'error-row'
  if (row.status === 'running') return 'running-row'
  return ''
}

const handleRowClick = (row: Task) => {
  emit('select', row)
}
</script>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.task-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-table .error-row) {
  background-color: #fef0f0;
}

:deep(.el-table .running-row) {
  background-color: #f0f9ff;
}
</style>