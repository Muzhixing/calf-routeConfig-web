<template>
  <div class="robot-control-panel">
    <!-- Robot status display -->
    <div class="status-section">
      <h4>机器人状态</h4>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(robot.status)" size="small">
            {{ getStatusText(robot.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="电池">
          <el-progress 
            :percentage="robot.battery" 
            :color="getBatteryColor(robot.battery)"
            :stroke-width="6"
            style="width: 100px"
          />
        </el-descriptions-item>
        <el-descriptions-item label="位置">
          ({{ robot.position.x }}, {{ robot.position.y }})
        </el-descriptions-item>
        <el-descriptions-item label="速度">
          {{ robot.speed || 0 }} m/s
        </el-descriptions-item>
      </el-descriptions>
    </div>
    
    <!-- Control buttons -->
    <div class="control-section">
      <h4>控制指令</h4>
      <div class="control-buttons">
        <el-button 
          v-if="canPause"
          type="warning" 
          @click="handleCommand('pause')"
          :loading="loading === 'pause'"
        >
          <el-icon><VideoPause /></el-icon>
          暂停
        </el-button>
        
        <el-button 
          v-if="canResume"
          type="success" 
          @click="handleCommand('resume')"
          :loading="loading === 'resume'"
        >
          <el-icon><VideoPlay /></el-icon>
          继续
        </el-button>
        
        <el-button 
          v-if="canStop"
          type="info" 
          @click="handleCommand('stop')"
          :loading="loading === 'stop'"
        >
          <el-icon><VideoCamera /></el-icon>
          停止
        </el-button>
        
        <el-button 
          v-if="canTerminate"
          type="danger" 
          @click="handleConfirmTerminate"
          :loading="loading === 'terminate'"
        >
          <el-icon><Delete /></el-icon>
          终止任务
        </el-button>
        
        <el-button 
          v-if="canCharge"
          type="warning" 
          @click="handleCommand('charge')"
          :loading="loading === 'charge'"
        >
          <el-icon><Charging /></el-icon>
          充电
        </el-button>
      </div>
      
      <!-- Emergency stop button -->
      <div class="emergency-section">
        <el-button 
          type="danger" 
          size="large" 
          class="emergency-btn"
          @click="handleEmergencyStop"
          :loading="loading === 'emergency_stop'"
        >
          <el-icon><WarningFilled /></el-icon>
          紧急停止
        </el-button>
        <p class="emergency-hint">* 紧急停止会立即停止机器人所有操作</p>
      </div>
    </div>
    
    <!-- Operation logs -->
    <div class="log-section">
      <h4>操作日志</h4>
      <el-scrollbar height="200px">
        <div class="log-list" v-if="operationLogs.length > 0">
          <div 
            v-for="log in operationLogs" 
            :key="log.id" 
            class="log-item"
            :class="log.result"
          >
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            <span class="log-command">{{ log.command }}</span>
            <el-tag :type="log.result === 'success' ? 'success' : 'danger'" size="small">
              {{ log.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </div>
        </div>
        <el-empty v-else description="暂无操作日志" :image-size="60" />
      </el-scrollbar>
      <el-button v-if="operationLogs.length > 0" text @click="clearLogs" size="small">
        清除日志
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  VideoPause, 
  VideoPlay, 
  VideoCamera, 
  Delete, 
  Charging, 
  WarningFilled 
} from '@element-plus/icons-vue'
import type { Robot } from '@/types'
import { 
  sendCommand, 
  getOperationLogs, 
  clearOperationLogs,
  getStatusText,
  getStatusType,
  getBatteryColor,
  type RobotOperationLog 
} from '@/services/robot'

const props = defineProps<{
  robot: Robot
}>()

const emit = defineEmits<{
  command: [command: string]
  refresh: []
}>()

const loading = ref<string | null>(null)
const operationLogs = ref<RobotOperationLog[]>([])

// Control button visibility based on robot status
const canPause = computed(() => 
  props.robot.status === 'running' || props.robot.status === 'online'
)

const canResume = computed(() => 
  props.robot.status === 'paused'
)

const canStop = computed(() => 
  props.robot.status === 'running' || props.robot.status === 'paused'
)

const canTerminate = computed(() => 
  props.robot.status === 'running' || props.robot.status === 'paused'
)

const canCharge = computed(() => 
  props.robot.status === 'online' || props.robot.status === 'paused'
)

// Load operation logs
const loadLogs = () => {
  operationLogs.value = getOperationLogs().filter(
    log => log.robotId === props.robot.id
  )
}

const clearLogs = () => {
  clearOperationLogs()
  loadLogs()
}

// Handle command
const handleCommand = async (command: string) => {
  loading.value = command
  
  try {
    const success = await sendCommand(props.robot.id, command as any)
    
    if (success) {
      ElMessage.success('指令发送成功')
      emit('command', command)
      emit('refresh')
    } else {
      ElMessage.error('指令发送失败')
    }
  } catch (e) {
    ElMessage.error('指令发送失败')
  } finally {
    loading.value = null
    loadLogs()
  }
}

// Handle terminate with confirmation
const handleConfirmTerminate = () => {
  ElMessageBox.confirm(
    '确定要终止当前任务吗？机器人将停止执行。',
    '确认终止',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    handleCommand('terminate')
  }).catch(() => {})
}

// Handle emergency stop
const handleEmergencyStop = async () => {
  try {
    await ElMessageBox.confirm(
      '紧急停止会立即停止机器人所有操作！\n\n此操作适用于：\n- 检测到障碍物或危险\n- 机器人行为异常\n- 紧急情况',
      '紧急停止确认',
      {
        confirmButtonText: '确认紧急停止',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger',
      }
    )
    
    loading.value = 'emergency_stop'
    
    const success = await sendCommand(props.robot.id, 'emergency_stop')
    
    if (success) {
      ElMessage.error('已发送紧急停止指令')
      emit('command', 'emergency_stop')
      emit('refresh')
    } else {
      ElMessage.error('紧急停止指令发送失败')
    }
  } catch (e) {
    // User cancelled
  } finally {
    loading.value = null
    loadLogs()
  }
}

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

onMounted(() => {
  loadLogs()
})
</script>

<style scoped>
.robot-control-panel {
  padding: 0 20px;
}

.status-section,
.control-section,
.log-section {
  margin-bottom: 24px;
}

h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.emergency-section {
  padding: 16px;
  background-color: #fef0f0;
  border-radius: 4px;
  text-align: center;
}

.emergency-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.emergency-btn :deep(.el-icon) {
  margin-right: 8px;
}

.emergency-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #909399;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
}

.log-time {
  color: #909399;
  flex-shrink: 0;
}

.log-command {
  flex: 1;
  color: #606266;
}
</style>