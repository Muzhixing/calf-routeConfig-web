<template>
  <div class="cow-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>牛只列表</span>
          <el-button type="primary" @click="handleAdd">添加牛只</el-button>
        </div>
      </template>
      <el-table :data="tableData" stripe>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="breed" label="品种" width="120" />
        <el-table-column prop="age" label="年龄" width="80" />
        <el-table-column prop="healthStatus" label="健康状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getHealthTagType(row.healthStatus)">
              {{ row.healthStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="feedingStatus" label="喂养状态" width="100" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const tableData = ref([
  { id: 1, name: '牛牛1', breed: '荷斯坦', age: 3, healthStatus: '健康', feedingStatus: '正常' },
  { id: 2, name: '牛牛2', breed: '西门塔尔', age: 4, healthStatus: '健康', feedingStatus: '正常' },
  { id: 3, name: '牛牛3', breed: '荷斯坦', age: 2, healthStatus: '需关注', feedingStatus: '正常' }
])

const getHealthTagType = (status: string) => {
  const map: Record<string, string> = {
    '健康': 'success',
    '需关注': 'warning',
    '生病': 'danger'
  }
  return map[status] || 'info'
}

const handleAdd = () => {
  console.log('添加牛只')
}

const handleView = (row: any) => {
  router.push(`/cows/${row.id}`)
}

const handleEdit = (row: any) => {
  console.log('编辑牛只', row)
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>