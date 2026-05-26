<template>
  <div class="robot-manage-view">
    <div class="view-header">
      <h2>机器人管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    <RobotList
      :robots="robots"
      @select="handleSelect"
      @control="handleControl"
      @view="handleView"
    />
    
    <!-- Robot control panel drawer -->
    <el-drawer
      v-model="showControlPanel"
      :title="`控制: ${selectedRobot?.name}`"
      direction="rtl"
      size="450px"
    >
      <RobotControlPanel
        v-if="selectedRobot"
        :robot="selectedRobot"
        @command="handleCommand"
      />
    </el-drawer>
    
    <!-- Robot detail dialog -->
    <el-dialog
      v-model="showDetail"
      :title="`机器人详情: ${selectedRobot?.name}`"
      width="500px"
    >
      <el-descriptions v-if="selectedRobot" :column="1" border>
        <el-descriptions-item label="ID">{{ selectedRobot.id }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ selectedRobot.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(selectedRobot.status)">
            {{ getStatusText(selectedRobot.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="位置">
          ({{ selectedRobot.position.x }}, {{ selectedRobot.position.y }})
        </el-descriptions-item>
        <el-descriptions-item label="电池">
          <el-progress 
            :percentage="selectedRobot.battery" 
            :color="getBatteryColor(selectedRobot.battery)"
          />
        </el-descriptions-item>
        <el-descriptions-item label="速度" v-if="selectedRobot.speed">
          {{ selectedRobot.speed }} m/s
        </el-descriptions-item>
        <el-descriptions-item label="剩余水量" v-if="selectedRobot.waterRemaining">
          {{ selectedRobot.waterRemaining }}%
        </el-descriptions-item>
        <el-descriptions-item label="当前任务">
          {{ selectedRobot.currentTaskId || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="最后在线">
          {{ formatTime(selectedRobot.lastOnlineAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatTime(selectedRobot.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="primary" @click="openControlPanel">打开控制面板</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import RobotList from '@/components/robot/RobotList.vue'
import RobotControlPanel from '@/components/robot/RobotControlPanel.vue'
import type { Robot, RobotStatus } from '@/types'
import { getRobots, updateRobot } from '@/services/api'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const robots = ref<Robot[]>([])
const selectedRobot = ref<Robot | null>(null)
const showControlPanel = ref(false)
const showDetail = ref(false)

let refreshTimer: number | null = null

// Load robots
const loadRobots = async () => {
  const response = await getRobots()
  if (response.code === 200) {
    robots.value = response.data
  }
}

const refreshData = () => {
  loadRobots()
}

// Handlers
const handleSelect = (robot: Robot) => {
  selectedRobot.value = robot
}

const handleControl = (robot: Robot) => {
  selectedRobot.value = robot
  showControlPanel.value = true
}

const handleView = (robot: Robot) => {
  selectedRobot.value = robot
  showDetail.value = true
}

const openControlPanel = () => {
  showDetail.value = false
  showControlPanel.value = true
}

const handleCommand = async (command: string) => {
  if (!selectedRobot.value) return
  
  let newStatus: RobotStatus
  switch (command) {
    case 'pause':
      newStatus = 'paused'
      break
    case 'resume':
      newStatus = 'running'
      break
    case 'stop':
      newStatus = 'online'
      break
    case 'charge':
      newStatus = 'charging'
      break
    default:
      return
  }
  
  const response = await updateRobot(selectedRobot.value.id, { status: newStatus })
  if (response.code === 200) {
    ElMessage.success('指令发送成功')
    loadRobots()
  } else {
    ElMessage.error(response.message || '指令发送失败')
  }
}

// Helpers
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
  return new Date(timestamp).toLocaleString('zh-CN')
}

// Auto refresh
const startAutoRefresh = () => {
  refreshTimer = window.setInterval(() => {
    loadRobots()
  }, 2000)
}

onMounted(() => {
  loadRobots()
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.robot-manage-view {
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