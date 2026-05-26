<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <StatCard
          :value="dashboardData.robotCount"
          label="机器人总数"
          :icon="Monitor"
          color="#409eff"
          :sub-info="`在线: ${dashboardData.onlineRobotCount}`"
          :warning="dashboardData.offlineRobotCount > 0"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :value="dashboardData.taskCount"
          label="任务总数"
          :icon="Clock"
          color="#67c23a"
          :sub-info="`待执行: ${dashboardData.pendingTaskCount}`"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :value="dashboardData.alarmCount"
          label="告警总数"
          :icon="BellFilled"
          color="#e6a23c"
          :sub-info="`严重: ${dashboardData.criticalAlarmCount}`"
          :warning="dashboardData.alarmCount > 0"
          :danger="dashboardData.criticalAlarmCount > 0"
        />
      </el-col>
      <el-col :span="6">
        <StatCard
          :value="dashboardData.cowCount"
          label="牛只总数"
          :icon="Cow"
          color="#909399"
        />
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <ChartCard
          title="机器人状态分布"
          :options="robotStatusChartOptions"
          :height="300"
        />
      </el-col>
      <el-col :span="12">
        <ChartCard
          title="今日任务执行"
          :options="taskChartOptions"
          :height="300"
        />
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="recent-alarms-header">
              <span>最新告警</span>
              <el-button type="primary" link @click="$router.push('/alarms')">
                查看全部 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="recentAlarms" style="width: 100%">
            <el-table-column prop="level" label="级别" width="100">
              <template #default="{ row }">
                <el-tag :type="getAlarmTagType(row.level)">
                  {{ getAlarmLevelText(row.level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="告警信息" />
            <el-table-column prop="robotId" label="机器人" width="120" />
            <el-table-column prop="timestamp" label="时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    
    <div class="auto-refresh-indicator">
      <el-icon><Refresh /></el-icon>
      <span>自动刷新: {{ refreshInterval }}s</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import StatCard from '@/components/dashboard/StatCard.vue'
import ChartCard from '@/components/dashboard/ChartCard.vue'
import { getDashboardData, formatDashboardData } from '@/services/dashboard'
import { getAlarms } from '@/services/api'
import type { Alarm, DashboardData } from '@/types'
import { Monitor, Clock, BellFilled, Aim, ArrowRight, Refresh } from '@element-plus/icons-vue'

const router = useRouter()

// Dashboard data
const dashboardData = ref({
  robotCount: 0,
  onlineRobotCount: 0,
  offlineRobotCount: 0,
  taskCount: 0,
  pendingTaskCount: 0,
  completedTaskCount: 0,
  alarmCount: 0,
  criticalAlarmCount: 0,
  warningAlarmCount: 0,
  cowCount: 0,
})

const recentAlarms = ref<Alarm[]>([])
const refreshInterval = ref(5)
let refreshTimer: number | null = null

// Load dashboard data
const loadDashboardData = async () => {
  const data = await getDashboardData()
  if (data) {
    dashboardData.value = formatDashboardData(data)
  }
}

// Load recent alarms
const loadRecentAlarms = async () => {
  const response = await getAlarms()
  if (response.code === 200) {
    // Get top 5 most recent alarms
    recentAlarms.value = response.data
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }
}

// Chart options
const robotStatusChartOptions = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: {
    orient: 'vertical',
    left: 'left',
  },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: false,
        position: 'center',
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 20,
          fontWeight: 'bold',
        },
      },
      labelLine: { show: false },
      data: [
        { value: dashboardData.value.onlineRobotCount, name: '在线', itemStyle: { color: '#67c23a' } },
        { value: dashboardData.value.offlineRobotCount, name: '离线', itemStyle: { color: '#909399' } },
      ],
    },
  ],
}))

const taskChartOptions = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  },
  yAxis: { type: 'value' },
  series: [
    {
      name: '已完成',
      type: 'bar',
      stack: 'total',
      data: [2, 1, 5, 3, 4, 2],
      itemStyle: { color: '#67c23a' },
    },
    {
      name: '进行中',
      type: 'bar',
      stack: 'total',
      data: [1, 0, 2, 1, 1, 0],
      itemStyle: { color: '#409eff' },
    },
    {
      name: '待执行',
      type: 'bar',
      stack: 'total',
      data: [1, 2, 1, 0, 1, 2],
      itemStyle: { color: '#e6a23c' },
    },
  ],
}))

// Helper functions
const getAlarmTagType = (level: string) => {
  const map: Record<string, string> = {
    critical: 'danger',
    warning: 'warning',
    normal: 'success',
  }
  return map[level] || 'info'
}

const getAlarmLevelText = (level: string) => {
  const map: Record<string, string> = {
    critical: '严重',
    warning: '警告',
    normal: '正常',
  }
  return map[level] || level
}

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    confirmed: 'primary',
    resolved: 'success',
  }
  return map[status] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    confirmed: '已确认',
    resolved: '已解决',
  }
  return map[status] || status
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Auto refresh
const startAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  refreshTimer = window.setInterval(() => {
    loadDashboardData()
    loadRecentAlarms()
  }, refreshInterval.value * 1000)
}

onMounted(() => {
  loadDashboardData()
  loadRecentAlarms()
  startAutoRefresh()
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.dashboard {
  position: relative;
}

.recent-alarms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auto-refresh-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #fff;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  color: #909399;
  z-index: 100;
}

.auto-refresh-indicator .el-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>