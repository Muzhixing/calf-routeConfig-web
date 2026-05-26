<template>
  <div class="tasks-view">
    <div class="view-header">
      <h2>任务管理</h2>
    </div>
    <el-card>
      <el-table :data="tasks" style="width: 100%">
        <el-table-column prop="name" label="任务名称" width="200" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="robotId" label="机器人" width="120" />
        <el-table-column label="计划时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.scheduledTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="repeatType" label="重复类型" width="120">
          <template #default="{ row }">
            {{ getRepeatText(row.repeatType) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link>详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getTasks } from '@/services/api'
import type { Task } from '@/types'

const tasks = ref<Task[]>([])

const loadTasks = async () => {
  const response = await getTasks()
  if (response.code === 200) {
    tasks.value = response.data
  }
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    running: 'primary',
    completed: 'success',
    paused: 'warning',
    failed: 'danger',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待执行',
    running: '进行中',
    completed: '已完成',
    paused: '已暂停',
    failed: '失败',
  }
  return map[status] || status
}

const getRepeatText = (repeatType?: string) => {
  const map: Record<string, string> = {
    none: '不重复',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
  }
  return map[repeatType || 'none'] || repeatType
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}
</style>