<template>
  <svg class="route-line" :width="width" :height="height">
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#409eff" />
      </marker>
      <marker
        id="arrowhead-selected"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#67c23a" />
      </marker>
    </defs>
    
    <!-- Main line -->
    <polyline
      :points="linePoints"
      fill="none"
      :stroke="selected ? '#67c23a' : '#409eff'"
      stroke-width="3"
      :marker-end="selected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="route-line__main"
    />
    
    <!-- Dashed preview line -->
    <line
      v-if="previewPoint"
      :x1="lastPoint.x"
      :y1="lastPoint.y"
      :x2="previewPoint.x"
      :y2="previewPoint.y"
      stroke="#409eff"
      stroke-width="2"
      stroke-dasharray="5,5"
      class="route-line__preview"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GridPosition } from '@/types'

interface Props {
  points: GridPosition[]
  cellSize: number
  origin: GridPosition
  width: number
  height: number
  selected?: boolean
  previewPoint?: { x: number; y: number } | null
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  previewPoint: null,
})

const linePoints = computed(() => {
  return props.points
    .map(p => {
      const x = (p.x - props.origin.x) * props.cellSize + props.cellSize / 2
      const y = (p.y - props.origin.y) * props.cellSize + props.cellSize / 2
      return `${x},${y}`
    })
    .join(' ')
})

const lastPoint = computed(() => {
  if (props.points.length === 0) return { x: 0, y: 0 }
  const last = props.points[props.points.length - 1]
  return {
    x: (last.x - props.origin.x) * props.cellSize + props.cellSize / 2,
    y: (last.y - props.origin.y) * props.cellSize + props.cellSize / 2,
  }
})
</script>

<style scoped>
.route-line {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 5;
}

.route-line__main {
  transition: stroke 0.2s;
}

.route-line__preview {
  animation: dash 0.5s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}
</style>