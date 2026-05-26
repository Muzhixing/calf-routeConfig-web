<template>
  <div class="health-records">
    <el-card>
      <template #header>
        <span>健康记录</span>
      </template>
      <el-table :data="tableData" stripe>
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="cowName" label="牛只名称" width="120" />
        <el-table-column prop="type" label="记录类型" width="120" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="vet" label="兽医" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { date: '2024-01-20', cowName: '牛牛1', type: '体检', description: '例行体检,各项指标正常', vet: '张医生' },
  { date: '2024-01-19', cowName: '牛牛3', type: '治疗', description: '轻微感冒,已开药', vet: '李医生' },
  { date: '2024-01-18', cowName: '牛牛5', type: '疫苗', description: '完成疫苗接种', vet: '张医生' }
])
</script>