<template>
  <div class="history-view">
    <div class="view-header">
      <h2>历史记录</h2>
      <el-button @click="loadData">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
    
    <el-row :gutter="20">
      <!-- 左侧：任务历史列表 -->
      <el-col :span="10">
        <TaskHistoryList
          :tasks="taskHistory"
          :loading="loading"
          :selected-task-id="selectedTaskId"
          @select="handleSelectTask"
        />
      </el-col>
      
      <!-- 右侧：轨迹回放 -->
      <el-col :span="14">
        <TrackPlayback
          v-if="selectedTaskId"
          :task-id="selectedTaskId"
          :track="currentTrack"
          :task-info="currentTaskInfo"
        />
        <el-card v-else class="empty-card">
          <el-empty description="请选择要查看的任务" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import TaskHistoryList from '@/components/history/TaskHistoryList.vue'
import TrackPlayback from '@/components/history/TrackPlayback.vue'
import { getTaskHistoryList, getTaskTrack, getTaskHistoryDetail, type TaskHistory, type TrackPoint } from '@/services/history'
import type { Task } from '@/types'

const taskHistory = ref<Task[]>([])
const selectedTaskId = ref<string | null>(null)
const currentTrack = ref<TrackPoint[]>([])
const currentTaskInfo = ref<TaskHistory | null>(null)
const loading = ref(false)

// 加载任务历史列表
const loadData = async () => {
  loading.value = true
  try {
    taskHistory.value = await getTaskHistoryList()
  } finally {
    loading.value = false
  }
}

// 选择任务
const handleSelectTask = async (task: Task) => {
  selectedTaskId.value = task.id
  currentTrack.value = await getTaskTrack(task.id)
  currentTaskInfo.value = await getTaskHistoryDetail(task.id)
}

// 自动加载第一个任务的轨迹
watch(taskHistory, (tasks) => {
  if (tasks.length > 0 && !selectedTaskId.value) {
    handleSelectTask(tasks[0])
  }
}, { immediate: true })

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.history-view {
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

.empty-card {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>