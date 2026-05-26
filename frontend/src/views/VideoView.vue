<parameter name="text"><template>
  <div class="video-view">
    <div class="view-header">
      <h2>视频监控</h2>
      <div class="header-actions">
        <el-select 
          v-model="selectedRobotId" 
          placeholder="选择机器人" 
          style="width: 200px"
          @change="handleRobotChange"
        >
          <el-option
            v-for="robot in robots"
            :key="robot.id"
            :label="robot.name"
            :value="robot.id"
          >
            <span>{{ robot.name }}</span>
            <el-tag :type="getStatusType(robot.status)" size="small" style="margin-left: 8px">
              {{ getStatusText(robot.status) }}
            </el-tag>
          </el-option>
        </el-select>
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    
    <el-row :gutter="20">
      <!-- Video player -->
      <el-col :span="selectedRobotId ? 18 : 24">
        <el-card>
          <VideoPlayer
            v-if="selectedRobotId"
            :robot-id="selectedRobotId"
            :src="videoSrc"
            :autoplay="true"
            :show-controls="true"
            :show-stream-info="true"
            @status-change="handleStatusChange"
            @error="handleVideoError"
          />
          <div v-else class="empty-player">
            <el-empty description="请选择机器人以查看视频监控">
              <template #image>
                <el-icon :size="80"><VideoCamera /></el-icon>
              </template>
            </el-empty>
          </div>
        </el-card>
      </el-col>
      
      <!-- Robot info panel -->
      <el-col :span="6" v-if="selectedRobotId">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>机器人信息</span>
            </div>
          </template>
          
          <div v-if="selectedRobot" class="robot-info">
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="名称">{{ selectedRobot.name }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="getStatusType(selectedRobot.status)" size="small">
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
                  :stroke-width="8"
                />
              </el-descriptions-item>
              <el-descriptions-item label="速度" v-if="selectedRobot.speed">
                {{ selectedRobot.speed }} m/s
              </el-descriptions-item>
              <el-descriptions-item label="剩余水量" v-if="selectedRobot.waterRemaining">
                {{ selectedRobot.waterRemaining }}%
              </el-descriptions-item>
            </el-descriptions>
            
            <div class="robot-actions">
              <el-button type="primary" @click="openControlPanel">
                <el-icon><Operation /></el-icon>
                控制面板
              </el-button>
              <el-button @click="$router.push('/robots')">
                <el-icon><More /></el-icon>
                详细
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Robot list grid -->
    <el-card class="robot-grid-card" v-if="!selectedRobotId">
      <template #header>
        <div class="card-header">
          <span>选择机器人</span>
        </div>
      </template>
      
      <el-row :gutter="16">
        <el-col 
          v-for="robot in robots" 
          :key="robot.id" 
          :xs="12" 
          :sm="8" 
          :md="6" 
          :lg="4"
        >
          <div 
            class="robot-item" 
            :class="{ active: selectedRobotId === robot.id }"
            @click="selectRobot(robot)"
          >
            <div class="robot-icon">
              <el-icon :size="32"><VideoCamera /></el-icon>
            </div>
            <div class="robot-name">{{ robot.name }}</div>
            <el-tag :type="getStatusType(robot.status)" size="small">
              {{ getStatusText(robot.status) }}
            </el-tag>
            <div class="robot-battery">
              <el-progress 
                :percentage="robot.battery" 
                :color="getBatteryColor(robot.battery)"
                :show-text="false"
                :stroke-width="4"
              />
              <span>{{ robot.battery }}%</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- Control panel drawer -->
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
        @refresh="loadRobots"
      />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, VideoCamera, Operation, More } from '@element-plus/icons-vue'
import VideoPlayer from '@/components/video/VideoPlayer.vue'
import RobotControlPanel from '@/components/robot/RobotControlPanel.vue'
import type { Robot, RobotStatus } from '@/types'
import { getRobots } from '@/services/api'
import { sendCommand, getStatusText, getStatusType, getBatteryColor } from '@/services/robot'

const router = useRouter()

const robots = ref<Robot[]>([])
const selectedRobotId = ref<string>('')
const showControlPanel = ref(false)
const videoStatus = ref<string>('disconnected')
const videoSrc = ref<string>('')

let refreshTimer: number | null = null

// Selected robot
const selectedRobot = computed(() => {
  return robots.value.find(r => r.id === selectedRobotId.value) || null
})

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

// Select robot
const selectRobot = (robot: Robot) => {
  selectedRobotId.value = robot.id
}

const handleRobotChange = (robotId: string) => {
  selectedRobotId.value = robotId
  videoStatus.value = 'connecting'
}

// Control panel
const openControlPanel = () => {
  showControlPanel.value = true
}

// Handle video status change
const handleStatusChange = (status: string) => {
  videoStatus.value = status
}

// Handle video error
const handleVideoError = (error: Error) => {
  ElMessage.error('视频连接失���: ' + error.message)
}

// Handle command from control panel
const handleCommand = async (command: string) => {
  if (!selectedRobot.value) return
  
  const success = await sendCommand(selectedRobot.value.id, command as any)
  if (success) {
    ElMessage.success('指令发送成功')
    loadRobots()
  } else {
    ElMessage.error('指令发送失败')
  }
}

// Auto refresh
const startAutoRefresh = () => {
  refreshTimer = window.setInterval(() => {
    loadRobots()
  }, 3000)
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
.video-view {
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

.empty-player {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background-color: #1a1a1a;
  border-radius: 4px;
}

.info-card :deep(.el-card__body) {
  padding: 16px;
}

.robot-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.robot-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.robot-grid-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-size: 14px;
  font-weight: 600;
}

.robot-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.robot-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.robot-item.active {
  background-color: #ecf5ff;
  border: 2px solid #409eff;
}

.robot-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 50%;
}

.robot-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.robot-battery {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.robot-battery :deep(.el-progress) {
  flex: 1;
}

.robot-battery span {
  font-size: 12px;
  color: #909399;
  width: 35px;
  text-align: right;
}
</style>