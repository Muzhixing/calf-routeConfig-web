<template>
  <el-card class="stat-card" :class="{ 'stat-card--warning': warning, 'stat-card--danger': danger }">
    <div class="stat-content">
      <div class="stat-icon" :style="{ background: iconColor }">
        <el-icon :size="30">
          <component :is="icon" />
        </el-icon>
      </div>
      <div class="stat-info">
        <div class="stat-value">{{ value }}</div>
        <div class="stat-label">{{ label }}</div>
      </div>
    </div>
    <div v-if="subInfo" class="stat-sub">
      {{ subInfo }}
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: number | string
  label: string
  icon: any
  color?: string
  subInfo?: string
  warning?: boolean
  danger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: '#409eff',
  warning: false,
  danger: false,
})

const iconColor = computed(() => {
  if (props.danger) return '#f56c6c'
  if (props.warning) return '#e6a23c'
  return props.color
})
</script>

<style scoped>
.stat-card {
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-card--warning {
  border-left: 4px solid #e6a23c;
}

.stat-card--danger {
  border-left: 4px solid #f56c6c;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.stat-sub {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
}
</style>