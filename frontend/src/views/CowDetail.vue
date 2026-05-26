<template>
  <div class="cow-detail">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>牛只详情</span>
          <el-button @click="goBack">返回</el-button>
        </div>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="编号">{{ cowData.id }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ cowData.name }}</el-descriptions-item>
        <el-descriptions-item label="品种">{{ cowData.breed }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ cowData.age }}岁</el-descriptions-item>
        <el-descriptions-item label="健康状态">
          <el-tag :type="getHealthTagType(cowData.healthStatus)">
            {{ cowData.healthStatus }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="喂养状态">{{ cowData.feedingStatus }}</el-descriptions-item>
        <el-descriptions-item label="体重">{{ cowData.weight }}kg</el-descriptions-item>
        <el-descriptions-item label="入场时间">{{ cowData.entryDate }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const cowData = ref({
  id: route.params.id,
  name: '牛牛1',
  breed: '荷斯坦',
  age: 3,
  healthStatus: '健康',
  feedingStatus: '正常',
  weight: 450,
  entryDate: '2024-01-15'
})

const getHealthTagType = (status: string) => {
  const map: Record<string, string> = {
    '健康': 'success',
    '需关注': 'warning',
    '生病': 'danger'
  }
  return map[status] || 'info'
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>