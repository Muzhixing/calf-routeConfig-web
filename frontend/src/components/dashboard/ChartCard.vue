<template>
  <el-card class="chart-card">
    <template #header>
      <div class="chart-header">
        <span class="chart-title">{{ title }}</span>
        <el-radio-group v-if="showTimeRange" v-model="timeRange" size="small">
          <el-radio-button label="week">本周</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
          <el-radio-button label="year">本年</el-radio-button>
        </el-radio-group>
      </div>
    </template>
    <div ref="chartRef" class="chart-content" :style="{ height: height + 'px' }"></div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

interface Props {
  title: string
  options: EChartsOption
  height?: number
  showTimeRange?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  showTimeRange: false,
})

const chartRef = ref<HTMLElement>()
const timeRange = ref('week')
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  chartInstance.setOption(props.options)
  
  window.addEventListener('resize', handleResize)
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(() => props.options, (newOptions) => {
  chartInstance?.setOption(newOptions)
}, { deep: true })

watch(timeRange, (newVal) => {
  // Emit event for parent to handle data change
  // eslint-disable-next-line vue/custom-event-name-casing
  emit('timeRangeChange', newVal)
})

const emit = defineEmits<{
  (e: 'timeRangeChange', value: string): void
}>()

onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})

// Expose resize method
defineExpose({
  resize: handleResize,
})
</script>

<style scoped>
.chart-card {
  height: 100%;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.chart-content {
  width: 100%;
}
</style>