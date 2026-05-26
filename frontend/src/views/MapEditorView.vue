<template>
  <div class="map-editor-view">
    <div class="editor-header">
      <div class="editor-title">
        <el-icon><EditPen /></el-icon>
        <span>路线编辑器</span>
      </div>
      <div class="editor-actions">
        <el-button @click="loadFromStorage">
          <el-icon><FolderOpened /></el-icon>
          加载路线
        </el-button>
        <el-button type="primary" @click="saveToStorage">
          <el-icon><FolderAdd /></el-icon>
          保存路线
        </el-button>
        <el-button type="danger" @click="clearRoute">
          <el-icon><Delete /></el-icon>
          清空路线
        </el-button>
      </div>
    </div>
    
    <div class="editor-content">
      <!-- Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-section">
          <span class="toolbar-label">当前路线:</span>
          <el-input v-model="routeName" placeholder="请输入路线名称" style="width: 200px" />
        </div>
        <div class="toolbar-section">
          <el-checkbox v-model="showGrid">显示网格</el-checkbox>
          <el-checkbox v-model="showRobots">显示机器人</el-checkbox>
          <el-checkbox v-model="showElements">显示地图元素</el-checkbox>
        </div>
        <div class="toolbar-section">
          <span class="toolbar-info">路线点数: {{ routePoints.length }}</span>
        </div>
      </div>
      
      <!-- Map area -->
      <div class="map-area" ref="mapAreaRef">
        <div class="map-container" :style="mapStyle" @click="handleMapClick">
          <!-- Grid layer -->
          <svg v-if="showGrid" class="grid-layer" :width="gridWidth" :height="gridHeight">
            <defs>
              <pattern id="grid" :width="cellSize" :height="cellSize" patternUnits="userSpaceOnUse">
                <path :d="`M ${cellSize} 0 L 0 0 0 ${cellSize}`" fill="none" stroke="#e8e8e8" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <line :x1="0" :y1="originY" :x2="gridWidth" :y2="originY" stroke="#bbb" stroke-width="2"/>
            <line :x1="originX" :y1="0" :x2="originX" :y2="gridHeight" stroke="#bbb" stroke-width="2"/>
          </svg>
          
          <!-- Map elements -->
          <div v-if="showElements" class="elements-layer">
            <div
              v-for="element in mapElements"
              :key="element.id"
              class="map-element"
              :style="getElementStyle(element)"
            >
              <el-icon v-if="element.type === 'water_trough'"><Coffee /></el-icon>
              <el-icon v-else-if="element.type === 'obstacle'"><WarningFilled /></el-icon>
              <span v-else>{{ element.name }}</span>
            </div>
          </div>
          
          <!-- Robots -->
          <div v-if="showRobots" class="robots-layer">
            <div
              v-for="robot in robots"
              :key="robot.id"
              class="robot-marker"
              :style="getRobotStyle(robot)"
            >
              <el-icon><Monitor /></el-icon>
            </div>
          </div>
          
          <!-- Route line -->
          <RouteLine
            v-if="routePoints.length > 0"
            :points="routePoints"
            :cell-size="cellSize"
            :origin="origin"
            :width="gridWidth"
            :height="gridHeight"
            :selected="selectedPointIndex !== null"
            :preview-point="previewPoint"
          />
          
          <!-- Route points -->
          <RoutePoint
            v-for="(point, index) in routePoints"
            :key="index"
            :position="point.position"
            :order="index + 1"
            :stay-duration="point.stayDuration"
            :cell-size="cellSize"
            :origin="origin"
            :selected="selectedPointIndex === index"
            @click="selectPoint(index)"
            @drag-start="handleDragStart(index, $event)"
            @drag="handleDrag(index, $event)"
            @drag-end="handleDragEnd(index)"
          />
        </div>
        
        <!-- Coordinate display -->
        <div class="coordinate-display">
          坐标: ({{ mouseGridPos.x }}, {{ mouseGridPos.y }})
        </div>
      </div>
      
      <!-- Sidebar -->
      <div class="editor-sidebar">
        <el-card>
          <template #header>
            <span>路线点详情</span>
          </template>
          
          <div v-if="selectedPointIndex !== null" class="point-details">
            <el-form label-width="80px">
              <el-form-item label="序号">
                <el-input :value="selectedPointIndex + 1" disabled />
              </el-form-item>
              <el-form-item label="坐标 X">
                <el-input-number 
                  v-model="routePoints[selectedPointIndex].position.x" 
                  :min="-20" 
                  :max="20"
                  @change="handlePointUpdate"
                />
              </el-form-item>
              <el-form-item label="坐标 Y">
                <el-input-number 
                  v-model="routePoints[selectedPointIndex].position.y" 
                  :min="-20" 
                  :max="20"
                  @change="handlePointUpdate"
                />
              </el-form-item>
              <el-form-item label="停留时间">
                <el-input-number 
                  v-model="routePoints[selectedPointIndex].stayDuration" 
                  :min="0" 
                  :max="300"
                  :step="5"
                />
                <span style="margin-left: 8px">秒</span>
              </el-form-item>
              <el-form-item>
                <el-button type="danger" @click="deletePoint(selectedPointIndex)">
                  删除该点
                </el-button>
                <el-button type="primary" @click="insertPointAfter(selectedPointIndex)">
                  插入新点
                </el-button>
              </el-form-item>
            </el-form>
          </div>
          
          <el-empty v-else description="请选择一个路线点" />
        </el-card>
        
        <el-card class="route-list-card" style="margin-top: 20px">
          <template #header>
            <span>已保存路线</span>
          </template>
          <el-empty v-if="savedRoutes.length === 0" description="暂无保存的路线" />
          <div v-else class="route-list">
            <div
              v-for="route in savedRoutes"
              :key="route.id"
              class="route-item"
              @click="loadRoute(route)"
            >
              <span class="route-name">{{ route.name }}</span>
              <span class="route-points">{{ route.points.length }} 个点</span>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import RoutePoint from '@/components/map/RoutePoint.vue'
import RouteLine from '@/components/map/RouteLine.vue'
import { getRobots, getMapElements } from '@/services/api'
import type { Robot, MapElement, GridPosition } from '@/types'
import { EditPen, FolderOpened, FolderAdd, Delete, Coffee, WarningFilled, Monitor } from '@element-plus/icons-vue'

interface RoutePointData {
  position: GridPosition
  stayDuration: number
}

interface SavedRoute {
  id: string
  name: string
  points: RoutePointData[]
}

// Constants
const cellSize = 40
const gridWidth = 30 * cellSize
const gridHeight = 20 * cellSize

const origin = computed(() => ({ x: 15, y: 10 }))
const originX = computed(() => origin.value.x * cellSize)
const originY = computed(() => origin.value.y * cellSize)

// State
const routeName = ref('新路线')
const routePoints = ref<RoutePointData[]>([])
const selectedPointIndex = ref<number | null>(null)
const showGrid = ref(true)
const showRobots = ref(true)
const showElements = ref(true)
const previewPoint = ref<{ x: number; y: number } | null>(null)
const savedRoutes = ref<SavedRoute[]>([])

const mapAreaRef = ref<HTMLElement>()
const mouseGridPos = ref({ x: 0, y: 0 })

const robots = ref<Robot[]>([])
const mapElements = ref<MapElement[]>([])

const mapStyle = computed(() => ({
  width: gridWidth + 'px',
  height: gridHeight + 'px',
}))

// Load data
const loadData = async () => {
  const [robotsRes, elementsRes] = await Promise.all([
    getRobots(),
    getMapElements(),
  ])
  
  if (robotsRes.code === 200) {
    robots.value = robotsRes.data
  }
  if (elementsRes.code === 200) {
    mapElements.value = elementsRes.data
  }
}

// Style helpers
const getElementStyle = (element: MapElement) => {
  const x = (element.position.x - origin.value.x) * cellSize + cellSize / 2
  const y = (element.position.y - origin.value.y) * cellSize + cellSize / 2
  return {
    left: x + 'px',
    top: y + 'px',
  }
}

const getRobotStyle = (robot: Robot) => {
  const x = (robot.position.x - origin.value.x) * cellSize + cellSize / 2
  const y = (robot.position.y - origin.value.y) * cellSize + cellSize / 2
  return {
    left: x + 'px',
    top: y + 'px',
  }
}

// Map click handler
const handleMapClick = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  const gridX = Math.floor(x / cellSize) - origin.value.x
  const gridY = Math.floor(y / cellSize) - origin.value.y
  
  // Add new point
  routePoints.value.push({
    position: { x: gridX, y: gridY },
    stayDuration: 30,
  })
  
  selectPoint(routePoints.value.length - 1)
}

// Point selection
const selectPoint = (index: number) => {
  selectedPointIndex.value = index
}

// Point manipulation
const deletePoint = (index: number) => {
  routePoints.value.splice(index, 1)
  selectedPointIndex.value = null
  ElMessage.success('删除成功')
}

const insertPointAfter = (index: number) => {
  const currentPoint = routePoints.value[index]
  const newPoint = {
    position: { 
      x: currentPoint.position.x + 1, 
      y: currentPoint.position.y 
    },
    stayDuration: 30,
  }
  routePoints.value.splice(index + 1, 0, newPoint)
  selectPoint(index + 1)
  ElMessage.success('插入成功')
}

const handlePointUpdate = () => {
  // Trigger any needed updates after point property changes
}

// Drag handlers
const handleDragStart = (index: number, event: MouseEvent) => {
  // Could store initial position for cancel functionality
}

const handleDrag = (index: number, event: MouseEvent) => {
  const target = mapAreaRef.value
  if (!target) return
  
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  const gridX = Math.floor(x / cellSize) - origin.value.x
  const gridY = Math.floor(y / cellSize) - origin.value.y
  
  routePoints.value[index].position = { 
    x: Math.max(-20, Math.min(20, gridX)), 
    y: Math.max(-20, Math.min(20, gridY)) 
  }
}

const handleDragEnd = (index: number) => {
  // Could save position or trigger updates
}

// Storage functions
const saveToStorage = () => {
  if (routePoints.value.length === 0) {
    ElMessage.warning('路线为空，无法保存')
    return
  }
  
  const route: SavedRoute = {
    id: Date.now().toString(),
    name: routeName.value,
    points: [...routePoints.value],
  }
  
  // Save to localStorage
  const routes = JSON.parse(localStorage.getItem('cowfarm_routes') || '[]')
  routes.push(route)
  localStorage.setItem('cowfarm_routes', JSON.stringify(routes))
  
  // Update saved routes
  loadSavedRoutes()
  
  ElMessage.success('路线保存成功')
}

const loadFromStorage = () => {
  loadSavedRoutes()
  if (savedRoutes.value.length > 0) {
    // Load the last saved route
    loadRoute(savedRoutes.value[savedRoutes.value.length - 1])
  }
}

const loadSavedRoutes = () => {
  const routes = JSON.parse(localStorage.getItem('cowfarm_routes') || '[]')
  savedRoutes.value = routes
}

const loadRoute = (route: SavedRoute) => {
  routeName.value = route.name
  routePoints.value = route.points.map(p => ({ ...p, position: { ...p.position } }))
  selectedPointIndex.value = null
  ElMessage.success(`已加载路线: ${route.name}`)
}

const clearRoute = () => {
  routePoints.value = []
  selectedPointIndex.value = null
  routeName.value = '新路线'
  ElMessage.success('路线已清空')
}

// Mouse position tracking
const handleMouseMove = (event: MouseEvent) => {
  const target = mapAreaRef.value
  if (!target) return
  
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  mouseGridPos.value = {
    x: Math.floor(x / cellSize) - origin.value.x,
    y: Math.floor(y / cellSize) - origin.value.y,
  }
  
  // Update preview point for line
  const pointX = mouseGridPos.value.x * cellSize + cellSize / 2
  const pointY = mouseGridPos.value.y * cellSize + cellSize / 2
  previewPoint.value = { x: pointX, y: pointY }
}

const handleMouseLeave = () => {
  previewPoint.value = null
}

onMounted(() => {
  loadData()
  loadSavedRoutes()
  
  // Add mouse move listener
  const mapArea = mapAreaRef.value
  if (mapArea) {
    mapArea.addEventListener('mousemove', handleMouseMove)
    mapArea.addEventListener('mouseleave', handleMouseLeave)
  }
})
</script>

<style scoped>
.map-editor-view {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.editor-actions {
  display: flex;
  gap: 12px;
}

.editor-content {
  flex: 1;
  display: flex;
  gap: 20px;
  min-height: 0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  background-color: #fff;
  border-radius: 4px;
  margin-bottom: 16px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-label {
  font-size: 14px;
  color: #606266;
}

.toolbar-info {
  font-size: 14px;
  color: #909399;
}

.map-area {
  flex: 1;
  position: relative;
  background-color: #f5f7fa;
  border-radius: 4px;
  overflow: auto;
}

.map-container {
  position: relative;
  cursor: crosshair;
}

.grid-layer {
  position: absolute;
  top: 0;
  left: 0;
}

.elements-layer,
.robots-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.map-element {
  position: absolute;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  color: #409eff;
  font-size: 12px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.robot-marker {
  position: absolute;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #67c23a;
  color: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.coordinate-display {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background-color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.editor-sidebar {
  width: 320px;
  flex-shrink: 0;
}

.point-details {
  padding: 0 10px;
}

.route-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.route-item:hover {
  background-color: #ecf5ff;
}

.route-name {
  font-size: 14px;
  color: #303133;
}

.route-points {
  font-size: 12px;
  color: #909399;
}
</style>