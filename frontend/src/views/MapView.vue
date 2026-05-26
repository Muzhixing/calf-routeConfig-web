<template>
  <div class="map-view">
    <div class="map-header">
      <div class="map-title">
        <el-icon><Location /></el-icon>
        <span>牧场地图</span>
      </div>
      <div class="map-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="$router.push('/map-editor')">
          <el-icon><Edit /></el-icon>
          编辑路线
        </el-button>
      </div>
    </div>
    
    <el-card class="map-card">
      <GridMap
        ref="gridMapRef"
        :robots="robots"
        :map-elements="mapElements"
        :cows="cows"
        :grid-size="gridSize"
        @robot-click="handleRobotClick"
        @element-click="handleElementClick"
      />
    </el-card>
    
    <!-- Robot detail panel -->
    <el-drawer
      v-model="showRobotDetail"
      :title="selectedRobot?.name"
      direction="rtl"
      size="400px"
    >
      <div v-if="selectedRobot" class="robot-detail">
        <el-descriptions :column="1" border>
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
          <el-descriptions-item label="最后在线">
            {{ formatTime(selectedRobot.lastOnlineAt) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="robot-actions">
          <el-button type="primary">查看任务</el-button>
          <el-button>发送指令</el-button>
        </div>
      </div>
    </el-drawer>
    
    <!-- Map element detail panel -->
    <el-drawer
      v-model="showElementDetail"
      :title="selectedElement?.name"
      direction="rtl"
      size="400px"
    >
      <div v-if="selectedElement" class="element-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="类型">
            {{ getElementTypeText(selectedElement.type) }}
          </el-descriptions-item>
          <el-descriptions-item label="位置">
            ({{ selectedElement.position.x }}, {{ selectedElement.position.y }})
          </el-descriptions-item>
          <el-descriptions-item 
            v-for="(value, key) in selectedElement.properties" 
            :key="key"
            :label="key"
          >
            {{ value }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
    
    <!-- Cow area statistics -->
    <el-card class="cow-stats-card" v-if="cowAreas.length > 0">
      <template #header>
        <div class="card-header">
          <span>奶牛区域分布</span>
          <el-switch v-model="showCows" />
        </div>
      </template>
      <div class="cow-stats">
        <div v-for="area in cowAreas" :key="area.areaId" class="stat-item">
          <span class="area-name">{{ area.areaId }}</span>
          <span class="cow-count">{{ area.cowCount }} 头</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import GridMap from '@/components/map/GridMap.vue'
import { getRobots, getMapElements } from '@/services/api'
import { fetchCows, getAreaDistribution, type CowAreaStats } from '@/services/cow'
import type { Robot, MapElement, Cow } from '@/types'
import { Location, Refresh, Edit } from '@element-plus/icons-vue'

const gridMapRef = ref()
const robots = ref<Robot[]>([])
const mapElements = ref<MapElement[]>([])
const cows = ref<Cow[]>([])
const cowAreas = ref<CowAreaStats[]>([])
const gridSize = ref({ width: 30, height: 20 })
const showCows = ref(true)

const showRobotDetail = ref(false)
const selectedRobot = ref<Robot | null>(null)

const showElementDetail = ref(false)
const selectedElement = ref<MapElement | null>(null)

let refreshTimer: number | null = null

// Load data
const loadData = async () => {
  const [robotsRes, elementsRes, cowsData] = await Promise.all([
    getRobots(),
    getMapElements(),
    fetchCows(),
  ])
  
  if (robotsRes.code === 200) {
    robots.value = robotsRes.data
  }
  if (elementsRes.code === 200) {
    mapElements.value = elementsRes.data
  }
  
  // Load cow data
  cows.value = cowsData
  cowAreas.value = getAreaDistribution()
}

const refreshData = () => {
  loadData()
}

// Click handlers
const handleRobotClick = (robot: Robot) => {
  selectedRobot.value = robot
  showRobotDetail.value = true
}

const handleElementClick = (element: MapElement) => {
  selectedElement.value = element
  showElementDetail.value = true
}

// Helper functions
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    online: 'success',
    running: 'primary',
    charging: 'warning',
    paused: 'info',
    offline: 'info',
    error: 'danger',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    online: '在线',
    running: '运行中',
    charging: '充电中',
    paused: '已暂停',
    offline: '离线',
    error: '故障',
  }
  return map[status] || status
}

const getBatteryColor = (battery: number) => {
  if (battery <= 20) return '#f56c6c'
  if (battery <= 40) return '#e6a23c'
  return '#67c23a'
}

const getElementTypeText = (type: string) => {
  const map: Record<string, string> = {
    water_trough: '水槽',
    fence: '围栏',
    cow_area: '牛只区域',
    robot_area: '机器人区域',
    obstacle: '障碍物',
  }
  return map[type] || type
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// Auto refresh
const startAutoRefresh = () => {
  refreshTimer = window.setInterval(() => {
    loadData()
  }, 2000)
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
.map-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.map-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.map-actions {
  display: flex;
  gap: 12px;
}

.map-card {
  flex: 1;
  min-height: 0;
}

.map-card :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.robot-detail,
.element-detail {
  padding: 0 20px;
}

.robot-actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}

.cow-stats-card {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 200px;
  z-index: 100;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cow-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.area-name {
  font-size: 14px;
  color: #303133;
}

.cow-count {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}
</style>