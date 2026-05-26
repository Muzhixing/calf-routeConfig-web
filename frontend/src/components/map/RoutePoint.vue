<template>
  <div
    class="route-point"
    :class="{ 'route-point--selected': selected, 'route-point--dragging': isDragging }"
    :style="pointStyle"
    @mousedown.stop="handleMouseDown"
    @click.stop="handleClick"
  >
    <div class="point-marker">
      <span class="point-order">{{ order }}</span>
    </div>
    <div class="point-info" v-if="showInfo">
      <div class="point-duration">
        停留: {{ stayDuration }}s
      </div>
    </div>
    
    <!-- Connection line handle -->
    <div class="connection-handle" v-if="selected">
      <el-icon><Connection /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GridPosition } from '@/types'
import { Connection } from '@element-plus/icons-vue'

interface Props {
  position: GridPosition
  order: number
  stayDuration: number
  cellSize: number
  origin: GridPosition
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
})

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'dragStart', event: MouseEvent): void
  (e: 'drag', event: MouseEvent): void
  (e: 'dragEnd'): void
}>()

const isDragging = ref(false)
const showInfo = ref(false)

const pointStyle = computed(() => {
  const x = (props.position.x - props.origin.x) * props.cellSize + props.cellSize / 2
  const y = (props.position.y - props.origin.y) * props.cellSize + props.cellSize / 2
  return {
    left: x + 'px',
    top: y + 'px',
  }
})

const handleClick = () => {
  emit('click')
}

const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true
  emit('dragStart', event)
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.value) {
      emit('drag', e)
    }
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    emit('dragEnd')
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.route-point {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
}

.point-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
  transition: transform 0.2s;
}

.route-point:hover .point-marker,
.route-point--selected .point-marker {
  transform: scale(1.2);
}

.route-point--selected .point-marker {
  background-color: #67c23a;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.4);
}

.point-info {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  background-color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #606266;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.connection-handle {
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #fff;
  border: 2px solid #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #409eff;
  cursor: crosshair;
}
</style>