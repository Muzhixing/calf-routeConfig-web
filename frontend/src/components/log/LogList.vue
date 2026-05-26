<template>
  <div class="log-list">
    <el-table 
      :data="logs" 
      v-loading="loading"
      style="width: 100%"
      stripe
    >
      <el-table-column prop="timestamp" label="时间" width="170">
        <template #default="{ row }">
          {{ formatTime(row.timestamp) }}
        </template>
      </el-table-column>
      
      <el-table-column prop="module" label="模块" width="90">
        <template #default="{ row }">
          {{ getModuleText(row.module) }}
        </template>
      </el-table-column>
      
      <el-table-column prop="action" label="操作" width="90">
        <template #default="{ row }">
          {{ getActionText(row.action) }}
        </template>
      </el-table-column>
      
      <el-table-column prop="result" label="结果" width="70">
        <template #default="{ row }">
          <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
            {{ row.result === 'success' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
      
      <el-table-column prop="userId" label="用户" width="80" />
      
      <el-table-column prop="ip" label="IP" width="130" />
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="currentPageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OperationLog } from '@/types'
import { getModuleText, getActionText, formatLogTime } from '@/services/log'

interface Props {
  logs: OperationLog[]
  loading?: boolean
  total: number
  page: number
  pageSize: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'change-page': [page: number]
  'change-page-size': [pageSize: number]
}>()

const currentPage = computed({
  get: () => props.page,
  set: (val) => emit('change-page', val)
})

const currentPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('change-page-size', val)
})

const formatTime = (timestamp: string): string => {
  return formatLogTime(timestamp)
}

const handlePageChange = (page: number) => {
  emit('change-page', page)
}

const handleSizeChange = (size: number) => {
  emit('change-page-size', size)
}
</script>

<style scoped>
.log-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
</style>