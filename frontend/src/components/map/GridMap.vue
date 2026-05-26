<template>
  <div class="grid-map" ref="mapContainer" @wheel.prevent="handleWheel">
    <div class="map-content" :style="mapStyle">
      <!-- Grid lines -->
      <svg class="grid-layer" :width="gridWidth" :height="gridHeight">
        <defs>
          <pattern id="grid" :width="cellSize" :height="cellSize" patternUnits="userSpaceOnUse">
            <path :d="`M ${cellSize} 0 L 0 0 0 ${cellSize}`" fill="none" stroke="#e8e8e8" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- Coordinate axis -->
        <line :x1="0" :y1="originY" :x2="gridWidth" :y2="originY" stroke="#bbb" stroke-width="2"/>
        <line :x1="originX" :y1="0" :x2="originX" :y2="gridHeight" stroke="#bbb" stroke-width="2"/>
        
        <!-- Grid lines for major coordinates -->
        <g v-for="i in Math.floor(gridWidth / cellSize / 5)" :key="'vx' + i">
          <line 
            :x1="i * 5 * cellSize" 
            :y1="0" 
            :x2="i * 5 * cellSize" 
            :y2="gridHeight" 
            stroke="#ddd" 
            stroke-width="1" 
            stroke-dasharray="4"
          />
        </g>
        <g v-for="i in Math.floor(gridHeight / cellSize / 5)" :key="'hy' + i">
          <line 
            :x1="0" 
            :y1="i * 5 * cellSize" 
            :x2="gridWidth" 
            :y2="i * 5 * cellSize" 
            stroke="#ddd" 
            stroke-width="1" 
            stroke-dasharray="4"
          />
        </g>
      </svg>
      
      <!-- Map elements layer -->
      <div class="elements-layer">
        <!-- Water troughs -->
        <WaterTroughMarker
          v-for="element in waterTroughs"
          :key="element.id"
          :element="element"
          :cell-size="cellSize"
          :origin="origin"
          @click="handleElementClick(element)"
          @hover="handleElementHover(element, $event)"
        />
        
        <!-- Cow areas -->
        <div
          v-for="area in cowAreas"
          :key="area.id"
          class="map-area cow-area"
          :style="getAreaStyle(area)"
        >
          <span class="area-label">{{ area.name }}</span>
          <span class="area-count">牛只: {{ area.properties?.cowCount || 0 }}</span>
        </div>
        
        <!-- Obstacles -->
        <div
          v-for="obstacle in obstacles"
          :key="obstacle.id"
          class="map-element obstacle"
          :style="getElementStyle(obstacle)"
          @mouseenter="showTooltip(obstacle, $event)"
          @mouseleave="hideTooltip"
        >
          <el-icon><WarningFilled /></el-icon>
        </div>
      </div>
      
      <!-- Robots layer -->
      <RobotMarker
        v-for="robot in robots"
        :key="robot.id"
        :robot="robot"
        :cell-size="cellSize"
        :origin="origin"
        @click="handleRobotClick(robot)"
        @hover="handleRobotHover(robot, $event)"
      />
      
      <!-- Cows layer -->
      <template v-if="cows && cows.length > 0">
        <div
          v-for="cow in cows"
          :key="cow.id"
          class="cow-marker"
          :style="getCowStyle(cow)"
          :title="cow.name || cow.id"
        >
          <span class="cow-icon">🐄</span>
          <span class="cow-name">{{ cow.name || cow.id }}</span>
        </div>
      </template>
      
      <!-- Tooltip -->
      <div
        v-if="tooltip.visible"
        class="map-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      >
        {{ tooltip.content }}
      </div>
    </div>
    
    <!-- Zoom controls -->
    <div class="zoom-controls">
      <el-button-group>
        <el-button :icon="ZoomIn" @click="zoomIn" />
        <el-button :icon="ZoomOut" @click="zoomOut" />
        <el-button :icon="Refresh" @click="resetView" />
      </el-button-group>
    </div>
    
    <!-- Coordinate display -->
    <div class="coordinate-display">
      坐标: ({{ mousePosition.x }}, {{ mousePosition.y }})
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Robot, MapElement, GridPosition, Cow } from '@/types'
import RobotMarker from './RobotMarker.vue'
import WaterTroughMarker from './WaterTroughMarker.vue'
import { ZoomIn, ZoomOut, Refresh, WarningFilled } from '@element-plus/icons-vue'

interface Props {
  robots?: Robot[]
  mapElements?: MapElement[]
  cows?: Cow[]
  gridSize?: { width: number; height: number }
}

const props = withDefaults(defineProps<Props>(), {
  robots: () => [],
  mapElements: () => [],
  cows: () => [],
  gridSize: () => ({ width: 30, height: 20 }),
})

const emit = defineEmits<{
  (e: 'robotClick', robot: Robot): void
  (e: 'elementClick', element: MapElement): void
  (e: 'robotHover', robot: Robot, event: MouseEvent): void
  (e: 'elementHover', element: MapElement, event: MouseEvent): void
}>()

const mapContainer = ref<HTMLElement>()
const cellSize = ref(40)
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const mousePosition = ref({ x: 0, y: 0 })

const origin = computed(() => ({
  x: Math.floor(props.gridSize.width / 2),
  y: Math.floor(props.gridSize.height / 2),
}))

const originX = computed(() => origin.value.x * cellSize.value * scale.value)
const originY = computed(() => origin.value.y * cellSize.value * scale.value)

const gridWidth = computed(() => props.gridSize.width * cellSize.value * scale.value)
const gridHeight = computed(() => props.gridSize.height * cellSize.value * scale.value)

const mapStyle = computed(() => ({
  width: gridWidth.value + 'px',
  height: gridHeight.value + 'px',
  transform: `translate(${offset.value.x}px, ${offset.value.y}px)`,
}))

// Filter elements by type
const waterTroughs = computed(() => 
  props.mapElements.filter(e => e.type === 'water_trough')
)

const cowAreas = computed(() => 
  props.mapElements.filter(e => e.type === 'cow_area')
)

const obstacles = computed(() => 
  props.mapElements.filter(e => e.type === 'obstacle')
)

// Style helpers
const getAreaStyle = (area: MapElement) => {
  const x = (area.position.x - origin.value.x) * cellSize.value * scale.value + originX.value
  const y = (area.position.y - origin.value.y) * cellSize.value * scale.value + originY.value
  const size = (area.properties?.area as number) || 3
  return {
    left: x + 'px',
    top: y + 'px',
    width: size * cellSize.value * scale.value + 'px',
    height: size * cellSize.value * scale.value + 'px',
  }
}

const getElementStyle = (element: MapElement) => {
  const x = (element.position.x - origin.value.x) * cellSize.value * scale.value + originX.value
  const y = (element.position.y - origin.value.y) * cellSize.value * scale.value + originY.value
  return {
    left: x + 'px',
    top: y + 'px',
  }
}

const getCowStyle = (cow: Cow) => {
  const x = (cow.position.x - origin.value.x) * cellSize.value * scale.value + originX.value
  const y = (cow.position.y - origin.value.y) * cellSize.value * scale.value + originY.value
  return {
    left: x + 'px',
    top: y + 'px',
  }
}

// Tooltip
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  content: '',
})

const showTooltip = (element: MapElement, event: MouseEvent) => {
  const rect = mapContainer.value?.getBoundingClientRect()
  if (!rect) return
  tooltip.value = {
    visible: true,
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 30,
    content: `${element.name} (${element.position.x}, ${element.position.y})`,
  }
}

const hideTooltip = () => {
  tooltip.value.visible = false
}

// Zoom controls
const zoomIn = () => {
  scale.value = Math.min(scale.value * 1.2, 3)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value / 1.2, 0.5)
}

const resetView = () => {
  scale.value = 1
  offset.value = { x: 0, y: 0 }
}

const handleWheel = (event: WheelEvent) => {
  if (event.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// Mouse handlers
const handleMouseMove = (event: MouseEvent) => {
  const rect = mapContainer.value?.getBoundingClientRect()
  if (!rect) return
  
  // Calculate grid position
  const x = Math.floor((event.clientX - rect.left - offset.value.x - originX.value) / (cellSize.value * scale.value) + origin.value.x)
  const y = Math.floor((event.clientY - rect.top - offset.value.y - originY.value) / (cellSize.value * scale.value) + origin.value.y)
  mousePosition.value = { x, y }
  
  if (isDragging.value) {
    offset.value = {
      x: offset.value.x + (event.clientX - dragStart.value.x),
      y: offset.value.y + (event.clientY - dragStart.value.y),
    }
    dragStart.value = { x: event.clientX, y: event.clientY }
  }
}

const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true
  dragStart.value = { x: event.clientX, y: event.clientY }
}

const handleMouseUp = () => {
  isDragging.value = false
}

// Click handlers
const handleRobotClick = (robot: Robot) => {
  emit('robotClick', robot)
}

const handleElementClick = (element: MapElement) => {
  emit('elementClick', element)
}

const handleRobotHover = (robot: Robot, event: MouseEvent) => {
  emit('robotHover', robot, event)
}

const handleElementHover = (element: MapElement, event: MouseEvent) => {
  emit('elementHover', element, event)
}

onMounted(() => {
  const container = mapContainer.value
  if (container) {
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', handleMouseUp)
  }
})

onUnmounted(() => {
  const container = mapContainer.value
  if (container) {
    container.removeEventListener('mousemove', handleMouseMove)
    container.removeEventListener('mousedown', handleMouseDown)
    container.removeEventListener('mouseup', handleMouseUp)
    container.removeEventListener('mouseleave', handleMouseUp)
  }
})
</script>

<style scoped>
.grid-map {
  width: 100%;
  height: 100%;
  min-height: 500px;
  position: relative;
  overflow: hidden;
  background-color: #f5f7fa;
  cursor: grab;
}

.grid-map:active {
  cursor: grabbing;
}

.map-content {
  position: absolute;
  transform-origin: 0 0;
}

.grid-layer {
  position: absolute;
  top: 0;
  left: 0;
}

.elements-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.elements-layer > * {
  pointer-events: auto;
}

.map-area {
  position: absolute;
  background-color: rgba(64, 158, 255, 0.2);
  border: 2px dashed #409eff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.area-label {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.area-count {
  font-size: 12px;
  color: #409eff;
}

.map-element.obstacle {
  position: absolute;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f56c6c;
  font-size: 24px;
  transform: translate(-50%, -50%);
}

.map-tooltip {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 100;
}

.coordinate-display {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #606266;
  z-index: 100;
}

.cow-marker {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.2s;
}

.cow-marker:hover {
  transform: translate(-50%, -50%) scale(1.2);
}

.cow-icon {
  font-size: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.cow-name {
  font-size: 10px;
  color: #606266;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
}
</style>