<template>
  <div class="feeding">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>喂养管理</span>
          <el-button type="primary" @click="handleAdd">添加喂养计划</el-button>
        </div>
      </template>
      <el-table :data="tableData" stripe>
        <el-table-column prop="name" label="计划名称" width="150" />
        <el-table-column prop="target" label="适用牛只" width="120" />
        <el-table-column prop="food" label="饲料类型" width="120" />
        <el-table-column prop="amount" label="投喂量(kg)" width="100" />
        <el-table-column prop="frequency" label="投喂频率" width="100" />
        <el-table-column prop="time" label="投喂时间" width="150" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { name: '幼牛喂养计划', target: '幼牛', food: '犊牛料', amount: 2, frequency: '每日3次', time: '6:00,12:00,18:00' },
  { name: '成牛喂养计划', target: '成牛', food: '育成料', amount: 8, frequency: '每日2次', time: '7:00,17:00' },
  { name: '高产奶计划', target: '高产奶', food: '高产料', amount: 12, frequency: '每日3次', time: '5:00,11:00,17:00' }
])

const handleAdd = () => {
  console.log('添加喂养计划')
}

const handleEdit = (row: any) => {
  console.log('编辑', row)
}

const handleDelete = (row: any) => {
  console.log('删除', row)
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>