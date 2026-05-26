<template>
  <div class="log-view">
    <div class="view-header">
      <h2>操作日志</h2>
      <el-button @click="handleExport">
        <el-icon><Download /></el-icon>
        导出
      </el-button>
    </div>
    
    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="模块">
          <el-select v-model="queryParams.module" placeholder="全部模块" clearable style="width: 120px">
            <el-option v-for="item in MODULE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="操作">
          <el-select v-model="queryParams.action" placeholder="全部操作" clearable style="width: 120px">
            <el-option v-for="item in ACTION_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="结果">
          <el-select v-model="queryParams.result" placeholder="全部" clearable style="width: 100px">
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" placeholder="搜索详情" clearable style="width: 160px" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 日志列表 -->
    <el-card>
      <LogList
        :logs="logList"
        :loading="loading"
        :total="total"
        :page="queryParams.page"
        :page-size="queryParams.pageSize"
        @change-page="handlePageChange"
        @change-page-size="handlePageSizeChange"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import LogList from '@/components/log/LogList.vue'
import type { OperationLog } from '@/types'
import { queryLogs, exportLogs, MODULE_OPTIONS, ACTION_OPTIONS, type LogQueryParams } from '@/services/log'

const logList = ref<OperationLog[]>([])
const total = ref(0)
const loading = ref(false)

const queryParams = reactive<LogQueryParams>({
  page: 1,
  pageSize: 20,
  module: '',
  action: '',
  result: undefined,
  keyword: '',
})

// 加载日志数据
const loadLogs = async () => {
  loading.value = true
  try {
    const result = await queryLogs({
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      module: queryParams.module || undefined,
      action: queryParams.action || undefined,
      result: queryParams.result,
      keyword: queryParams.keyword || undefined,
    })
    logList.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  queryParams.page = 1
  loadLogs()
}

// 重置
const handleReset = () => {
  queryParams.module = ''
  queryParams.action = ''
  queryParams.result = undefined
  queryParams.keyword = ''
  queryParams.page = 1
  loadLogs()
}

// 分页变化
const handlePageChange = (page: number) => {
  queryParams.page = page
  loadLogs()
}

const handlePageSizeChange = (pageSize: number) => {
  queryParams.pageSize = pageSize
  queryParams.page = 1
  loadLogs()
}

// 导出
const handleExport = async () => {
  try {
    await exportLogs({
      module: queryParams.module || undefined,
      action: queryParams.action || undefined,
      result: queryParams.result,
      keyword: queryParams.keyword || undefined,
    })
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.log-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.filter-card :deep(.el-card__body) {
  padding-bottom: 0;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>