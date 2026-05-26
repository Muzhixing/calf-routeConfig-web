<template>
  <div class="statistics">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>数据统计</span>
          </template>
          <div ref="chartRef" style="height: 400px"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref<HTMLElement>()

onMounted(() => {
  if (chartRef.value) {
    const chart = echarts.init(chartRef.value)
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['牛只数量', '产奶量', '饲料消耗'] },
      xAxis: {
        type: 'category',
        data: ['1月', '2月', '3月', '4月', '5月', '6月']
      },
      yAxis: [
        { type: 'value', name: '牛只数量' },
        { type: 'value', name: '产量/消耗' }
      ],
      series: [
        { name: '牛只数量', type: 'bar', data: [120, 135, 142, 148, 152, 156] },
        { name: '产奶量', type: 'line', yAxisIndex: 1, data: [1200, 1350, 1420, 1500, 1580, 1650] },
        { name: '饲料消耗', type: 'line', yAxisIndex: 1, data: [800, 900, 950, 1020, 1080, 1150] }
      ]
    })
  }
})
</script>