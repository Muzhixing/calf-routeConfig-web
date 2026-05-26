<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>任务历史</span>
        <el-tag type="info">{{ tasks.length }} 条记录</el-tag>
      </div>
    </template>
    
    <el-table 
      :data="tasks" 
      v-loading="loading"
      style="width: 100%"
      @row-click="handleRowClick"
      :row-class-name="getRowClassName"
      highlight-current-row
    >
      <el-table-column prop="name" label="任务名称" min-width="120" />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行时间" width="100">
        <template #default="{ row }">
          {{ formatDate(row.executedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="完成时间" width="100">
        <template #default="{ row }">
          {{ formatDate(row.completedAt) }}
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import type { Task, TaskStatus } from '@/types'

interface Props {
  tasks: Task[]
  loading?: boolean
  selectedTaskId?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [task: Task]
}>()

const handleRowClick = (row: Task) => {
  emit('select', row)
}

const getRowClassName = ({ row }: { row: Task }) => {
  return row.id === props.selectedTaskId ? 'selected-row' : ''
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

const formatDate = (timestamp?: string): string => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.selected-row) {
  background-color: #ecf5ff !important;
}

:deep(.el-table__row) {
  cursor: pointer;
}
</style>