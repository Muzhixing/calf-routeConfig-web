<template>
  <div class="task-view">
    <div class="view-header">
      <h2>任务管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          创建任务
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    <!-- Task list -->
    <TaskList
      :tasks="tasks"
      :routes="routes"
      @edit="openEditDialog"
      @execute="handleExecute"
      @pause="handlePause"
      @delete="handleDelete"
      @select="handleSelect"
    />
    
    <!-- Create/Edit dialog -->
    <el-dialog
      v-model="showDialog"
      :title="isEditing ? '编辑任务' : '创建任务'"
      width="550px"
    >
      <TaskForm
        :task="selectedTask"
        :routes="routes"
        :robots="robots"
        :is-edit="isEditing"
        @submit="handleSubmit"
        @cancel="showDialog = false"
      />
    </el-dialog>
    
    <!-- Task detail dialog -->
    <el-dialog
      v-model="showDetail"
      :title="`任务详情: ${selectedTask?.name}`"
      width="500px"
    >
      <el-descriptions v-if="selectedTask" :column="1" border>
        <el-descriptions-item label="任务名称">{{ selectedTask.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(selectedTask.status)">
            {{ getStatusText(selectedTask.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="路线">{{ getRouteName(selectedTask.routeId) }}</el-descriptions-item>
        <el-descriptions-item label="机器人">{{ selectedTask.robotId || '未分配' }}</el-descriptions-item>
        <el-descriptions-item label="计划时间">{{ formatTime(selectedTask.scheduledTime) }}</el-descriptions-item>
        <el-descriptions-item label="重复类型">{{ getRepeatText(selectedTask.repeatType) }}</el-descriptions-item>
        <el-descriptions-item v-if="selectedTask.executedAt" label="执行时间">
          {{ formatTime(selectedTask.executedAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="selectedTask.completedAt" label="完成时间">
          {{ formatTime(selectedTask.completedAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="selectedTask.errorMessage" label="错误信息">
          <span style="color: #f56c6c">{{ selectedTask.errorMessage }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(selectedTask.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="primary" @click="openEditDialog(selectedTask!)">编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import TaskList from '@/components/task/TaskList.vue'
import TaskForm from '@/components/task/TaskForm.vue'
import type { Task, TaskStatus, RepeatType, Route, Robot } from '@/types'
import { getTasks, getRoutes } from '@/services/api'
import { executeTask, pauseTask, deleteTaskById } from '@/services/task'

const tasks = ref<Task[]>([])
const routes = ref<Route[]>([])
const robots = ref<Robot[]>([])

const selectedTask = ref<Task | null>(null)
const showDialog = ref(false)
const showDetail = ref(false)
const isEditing = ref(false)

let refreshTimer: number | null = null

// Load data
const loadData = async () => {
  const [tasksRes, routesRes, robotsRes] = await Promise.all([
    getTasks(),
    getRoutes(),
    getTasks(),
  ])
  
  if (tasksRes.code === 200) {
    tasks.value = tasksRes.data
  }
  if (routesRes.code === 200) {
    routes.value = routesRes.data
  }
  // Get robots from robot store or API
  const { getRobots } = await import('@/services/api')
  const robotsRes2 = await getRobots()
  if (robotsRes2.code === 200) {
    robots.value = robotsRes2.data
  }
}

const refreshData = () => {
  loadData()
}

// Dialog handlers
const openCreateDialog = () => {
  selectedTask.value = null
  isEditing.value = false
  showDialog.value = true
}

const openEditDialog = (task: Task) => {
  selectedTask.value = task
  isEditing.value = true
  showDetail.value = false
  showDialog.value = true
}

const handleSelect = (task: Task) => {
  selectedTask.value = task
  showDetail.value = true
}

// Task operations
const handleSubmit = async (data: Partial<Task>) => {
  const { createTask, updateTaskById } = await import('@/services/task')
  
  let success: boolean
  if (isEditing.value && selectedTask.value) {
    success = await updateTaskById(selectedTask.value.id, data)
    if (success) {
      ElMessage.success('任务更新成功')
    }
  } else {
    const newTask = await createTask(data as any)
    success = newTask !== null
    if (success) {
      ElMessage.success('任务创建成功')
    }
  }
  
  if (success) {
    showDialog.value = false
    loadData()
  } else {
    ElMessage.error('操作失败')
  }
}

const handleExecute = async (task: Task) => {
  try {
    await ElMessageBox.confirm('确定要执行此任务吗？', '确认执行', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
    
    const success = await executeTask(task.id)
    if (success) {
      ElMessage.success('任务已开始执行')
      loadData()
    } else {
      ElMessage.error('任务执行失败')
    }
  } catch (e) {
    // User cancelled
  }
}

const handlePause = async (task: Task) => {
  const success = await pauseTask(task.id)
  if (success) {
    ElMessage.success('任务已暂停')
    loadData()
  } else {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (task: Task) => {
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    const success = await deleteTaskById(task.id)
    if (success) {
      ElMessage.success('任务已删除')
      loadData()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (e) {
    // User cancelled
  }
}

// Helper functions
const getRouteName = (routeId: string): string => {
  const route = routes.value.find(r => r.id === routeId)
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

// Auto refresh
const startAutoRefresh = () => {
  refreshTimer = window.setInterval(() => {
    loadData()
  }, 3000)
}

onMounted(() => {
  loadData()
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.task-view {
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

.header-actions {
  display: flex;
  gap: 12px;
}
</style>