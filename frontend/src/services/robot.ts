/**
 * 机器人服务
 * 提供机器人状态监控和控制相关功能
 */

import { ref } from 'vue'
import type { Robot, RobotStatus, ApiResponse } from '../types'
import { getRobots, getRobotByIdApi, updateRobot } from './api'
import { setItem, getItem, StorageKeys } from '../utils/storage'

// 机器人状态刷新间隔(毫秒)
const DEFAULT_REFRESH_INTERVAL = 2000

// 存储键
const OperationLogsKey = 'robot_operation_logs'

// 操作日志类型
export interface RobotOperationLog {
  id: string
  robotId: string
  robotName: string
  command: string
  timestamp: string
  result: 'success' | 'failed'
  message?: string
}

// 机器人状态监听器
type StatusListener = (robots: Robot[]) => void

// 当前机器人列表
const currentRobots = ref<Robot[]>([])

// 刷新定时器
let refreshTimer: number | null = null

// 状态监听器列表
const listeners: Set<StatusListener> = new Set()

/**
 * 获取机器人列表
 */
export async function fetchRobots(): Promise<Robot[]> {
  const response = await getRobots()
  if (response.code === 200) {
    currentRobots.value = response.data
    notifyListeners()
    return response.data
  }
  return []
}

/**
 * 获取单个机器人详情
 */
export async function fetchRobotById(id: string): Promise<Robot | null> {
  const response = await getRobotByIdApi(id)
  if (response.code === 200) {
    return response.data
  }
  return null
}

/**
 * 发送控制指令到机器人
 */
export async function sendCommand(
  robotId: string, 
  command: 'pause' | 'resume' | 'stop' | 'terminate' | 'emergency_stop' | 'charge'
): Promise<boolean> {
  let newStatus: RobotStatus
  
  switch (command) {
    case 'pause':
      newStatus = 'paused'
      break
    case 'resume':
      newStatus = 'running'
      break
    case 'stop':
      newStatus = 'online'
      break
    case 'charge':
      newStatus = 'charging'
      break
    case 'terminate':
      newStatus = 'offline'
      break
    case 'emergency_stop':
      // 紧急停止立即停止所有操作
      newStatus = 'error'
      break
    default:
      return false
  }
  
  const response = await updateRobot(robotId, { status: newStatus })
  
  // 记录操作日志
  addOperationLog({
    id: generateLogId(),
    robotId,
    robotName: getRobotName(robotId),
    command: getCommandText(command),
    timestamp: new Date().toISOString(),
    result: response.code === 200 ? 'success' : 'failed',
    message: response.message,
  })
  
  if (response.code === 200) {
    // 刷新机器人状态
    await fetchRobots()
    return true
  }
  
  return false
}

/**
 * 启动自动刷新
 */
export function startAutoRefresh(interval: number = DEFAULT_REFRESH_INTERVAL): void {
  stopAutoRefresh()
  refreshTimer = window.setInterval(() => {
    fetchRobots()
  }, interval)
}

/**
 * 停止自动刷新
 */
export function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

/**
 * 添加状态监听器
 */
export function addStatusListener(listener: StatusListener): void {
  listeners.add(listener)
}

/**
 * 移除状态监听器
 */
export function removeStatusListener(listener: StatusListener): void {
  listeners.delete(listener)
}

/**
 * 通知所有监听器
 */
function notifyListeners(): void {
  listeners.forEach(listener => {
    listener(currentRobots.value)
  })
}

/**
 * 获取机器人名称
 */
function getRobotName(robotId: string): string {
  const robot = currentRobots.value.find(r => r.id === robotId)
  return robot?.name || robotId
}

/**
 * 生成日志ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 获取指令文本
 */
function getCommandText(command: string): string {
  const map: Record<string, string> = {
    pause: '暂停',
    resume: '继续',
    stop: '停止',
    terminate: '终止',
    emergency_stop: '紧急停止',
    charge: '充电',
  }
  return map[command] || command
}

// ==================== 操作日志 ====================

/**
 * 获取操作日志列表
 */
export function getOperationLogs(): RobotOperationLog[] {
  return getItem<RobotOperationLog[]>(OperationLogsKey) || []
}

/**
 * 添加操作日志
 */
export function addOperationLog(log: RobotOperationLog): void {
  const logs = getOperationLogs()
  logs.unshift(log)
  
  // 只保留最近100条日志
  if (logs.length > 100) {
    logs.splice(100)
  }
  
  setItem(OperationLogsKey, logs)
}

/**
 * 清除操作日志
 */
export function clearOperationLogs(): void {
  setItem(OperationLogsKey, [])
}

/**
 * 获取状态显示文本
 */
export function getStatusText(status: RobotStatus): string {
  const map: Record<RobotStatus, string> = {
    online: '在线',
    running: '运行中',
    charging: '充电中',
    paused: '已暂停',
    offline: '离线',
    error: '故障',
  }
  return map[status] || status
}

/**
 * 获取状态类型(Element Plus tag)
 */
export function getStatusType(status: RobotStatus): string {
  const map: Record<RobotStatus, string> = {
    online: 'success',
    running: 'primary',
    charging: 'warning',
    paused: 'info',
    offline: 'info',
    error: 'danger',
  }
  return map[status] || 'info'
}

/**
 * 获取电池颜色
 */
export function getBatteryColor(battery: number): string {
  if (battery <= 20) return '#f56c6c'
  if (battery <= 40) return '#e6a23c'
  return '#67c23a'
}