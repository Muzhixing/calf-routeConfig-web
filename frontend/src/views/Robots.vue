<template>
  <div class="robots-view">
    <div class="view-header">
      <h2>机器人管理</h2>
    </div>
    <el-card>
      <el-table :data="robots" style="width: 100%">
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="位置" width="150">
          <template #default="{ row }">
            ({{ row.position.x }}, {{ row.position.y }})
          </template>
        </el-table-column>
        <el-table-column prop="battery" label="电池" width="200">
          <template #default="{ row }">
            <el-progress :percentage="row.battery" :color="getBatteryColor(row.battery)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getRobots } from '@/services/api'
import type { Robot } from '@/types'

const robots = ref<Robot[]>([])

const loadRobots = async () => {
  const response = await getRobots()
  if (response.code === 200) {
    robots.value = response.data
  }
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    online: 'success',
    running: 'primary',
    charging: 'warning',
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

const viewDetail = (robot: Robot) => {
  console.log('View detail:', robot)
}

onMounted(() => {
  loadRobots()
})
</script>

<style scoped>
.robots-view {
  padding: 0;
}
</style>