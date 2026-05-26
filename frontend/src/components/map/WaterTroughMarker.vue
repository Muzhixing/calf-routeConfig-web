<template>
  <div
    class="water-trough-marker"
    :style="markerStyle"
    @click.stop="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="trough-icon">
      <el-icon :size="18"><Coffee /></el-icon>
    </div>
    <div class="trough-name">{{ element.name }}</div>
    <div v-if="showDetails" class="trough-details">
      <div class="capacity">
        <el-icon><InfoFilled /></el-icon>
        容量: {{ capacity }}L
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MapElement, GridPosition } from '@/types'
import { Coffee, InfoFilled } from '@element-plus/icons-vue'

interface Props {
  element: MapElement
  cellSize: number
  origin: GridPosition
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click', element: MapElement): void
  (e: 'hover', element: MapElement, event: MouseEvent): void
}>()

const showDetails = ref(false)

const markerStyle = computed(() => {
  const x = (props.element.position.x - props.origin.x) * props.cellSize + props.cellSize / 2
  const y = (props.element.position.y - props.origin.y) * props.cellSize + props.cellSize / 2
  return {
    left: x + 'px',
    top: y + 'px',
  }
})

const capacity = computed(() => {
  return (props.element.properties?.capacity as number) || 0
})

const handleClick = () => {
  emit('click', props.element)
}

const handleMouseEnter = (event: MouseEvent) => {
  showDetails.value = true
  emit('hover', props.element, event)
}

const handleMouseLeave = () => {
  showDetails.value = false
}
</script>

<style scoped>
.water-trough-marker {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 5;
}

.trough-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #409eff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
  transition: transform 0.2s;
}

.water-trough-marker:hover .trough-icon {
  transform: scale(1.1);
}

.trough-name {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  color: #303133;
  background-color: #fff;
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.trough-details {
  margin-top: 4px;
  font-size: 10px;
  color: #606266;
  background-color: #fff;
  padding: 4px 8px;
  border-radius: 3px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.capacity {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>