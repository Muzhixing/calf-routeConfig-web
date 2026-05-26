<template>
  <div class="routes-view">
    <div class="view-header">
      <h2>路线管理</h2>
      <el-button type="primary" @click="$router.push('/map-editor')">
        <el-icon><EditPen /></el-icon>
        编辑路线
      </el-button>
    </div>
    <el-card>
      <el-table :data="routes" style="width: 100%">
        <el-table-column prop="name" label="路线名称" width="200" />
        <el-table-column label="路线点数量" width="150">
          <template #default="{ row }">
            {{ row.points.length }} 个点
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewOnMap(row)">在地图查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRoutes } from '@/services/api'
import type { Route } from '@/types'
import { EditPen } from '@element-plus/icons-vue'

const router = useRouter()
const routes = ref<Route[]>([])

const loadRoutes = async () => {
  const response = await getRoutes()
  if (response.code === 200) {
    routes.value = response.data
  }
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const viewOnMap = (route: Route) => {
  console.log('View on map:', route)
  router.push('/map')
}

onMounted(() => {
  loadRoutes()
})
</script>

<style scoped>
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}
</style>