/**
 * 告警服务
 * 提供告警管理相关功能
 */

import { ref } from 'vue'
import type { Alarm, AlarmLevel, AlarmStatus, AlarmType } from '../types'
import { getAlarms as apiGetAlarms, confirmAlarm as apiConfirmAlarm, resolveAlarm as apiResolveAlarm } from './api'
import { addMessageListener, removeMessageListener, type WebSocketMessage } from './websocket'

// 告警列表
const alarmList = ref<Alarm[]>([])

// 告警监听器
type AlarmListener = (alarms: Alarm[]) => void

const listeners: Set<AlarmListener> = new Set()

/**
 * 获取告警列表
 */
export async function fetchAlarms(): Promise<Alarm[]> {
  const response = await apiGetAlarms()
  if (response.code === 200) {
    alarmList.value = response.data
    notifyListeners()
    return response.data
  }
  return []
}

/**
 * 确认告警
 */
export async function confirmAlarm(id: string, userId: string): Promise<boolean> {
  const response = await apiConfirmAlarm(id, userId)
  if (response.code === 200) {
    const index = alarmList.value.findIndex(a => a.id === id)
    if (index >= 0) {
      alarmList.value[index] = response.data
    }
    notifyListeners()
    return true
  }
  return false
}

/**
 * 解决告警
 */
export async function resolveAlarm(id: string): Promise<boolean> {
  const response = await apiResolveAlarm(id)
  if (response.code === 200) {
    const index = alarmList.value.findIndex(a => a.id === id)
    if (index >= 0) {
      alarmList.value[index] = response.data
    }
    notifyListeners()
    return true
  }
  return false
}

/**
 * 添加告警监听器
 */
export function addAlarmListener(listener: AlarmListener): void {
  listeners.add(listener)
  // 首次添加时自动获取告警列表
  if (listeners.size === 1) {
    fetchAlarms()
  }
}

/**
 * 移除告警监听器
 */
export function removeAlarmListener(listener: AlarmListener): void {
  listeners.delete(listener)
}

/**
 * 通知所有监听器
 */
function notifyListeners(): void {
  listeners.forEach(listener => {
    listener(alarmList.value)
  })
}

/**
 * 处理WebSocket告警消息
 */
function handleAlarmMessage(message: WebSocketMessage): void {
  if (message.type === 'alarm') {
    const payload = message.payload as { action: string; alarm?: Alarm }
    
    if (payload.action === 'new' && payload.alarm) {
      // 新告警添加到列表顶部
      alarmList.value.unshift(payload.alarm)
      notifyListeners()
    } else if (payload.action === 'update' && payload.alarm) {
      // 更新告警
      const index = alarmList.value.findIndex(a => a.id === payload.alarm!.id)
      if (index >= 0) {
        alarmList.value[index] = payload.alarm
        notifyListeners()
      }
    }
  }
}

/**
 * 启动实时告警监听
 */
export function startAlarmRealtime(): void {
  addMessageListener('alarm', handleAlarmMessage)
}

/**
 * 停止实时告警监听
 */
export function stopAlarmRealtime(): void {
  removeMessageListener('alarm', handleAlarmMessage)
}

/**
 * 获取告警级别显示文本
 */
export function getAlarmLevelText(level: AlarmLevel): string {
  const map: Record<AlarmLevel, string> = {
    critical: '严重',
    warning: '警告',
    normal: '普通',
  }
  return map[level] || level
}

/**
 * 获取告警级别类型(Element Plus)
 */
export function getAlarmLevelType(level: AlarmLevel): string {
  const map: Record<AlarmLevel, string> = {
    critical: 'danger',
    warning: 'warning',
    normal: 'success',
  }
  return map[level] || 'info'
}

/**
 * 获取告警状态显示文本
 */
export function getAlarmStatusText(status: AlarmStatus): string {
  const map: Record<AlarmStatus, string> = {
    pending: '待处理',
    confirmed: '已确认',
    resolved: '已解决',
  }
  return map[status] || status
}

/**
 * 获取告警状态类型(Element Plus)
 */
export function getAlarmStatusType(status: AlarmStatus): string {
  const map: Record<AlarmStatus, string> = {
    pending: 'warning',
    confirmed: 'primary',
    resolved: 'success',
  }
  return map[status] || 'info'
}

/**
 * 获取告警类型显示文本
 */
export function getAlarmTypeText(type: AlarmType): string {
  const map: Record<AlarmType, string> = {
    battery_low: '电池低',
    robot_offline: '机器人离线',
    route_error: '路线错误',
    obstacle: '障碍物',
    video_stream: '视频信号',
    task_failed: '任务失败',
    robot_error: '机器人故障',
  }
  return map[type] || type
}

/**
 * 获取告警列表(响应式)
 */
export function useAlarms() {
  return {
    alarms: alarmList,
    fetchAlarms,
    confirmAlarm,
    resolveAlarm,
    addAlarmListener,
    removeAlarmListener,
  }
}

/**
 * 获取未处理告警数量
 */
export function getPendingCount(): number {
  return alarmList.value.filter(a => a.status === 'pending').length
}

/**
 * 获取严重告警数量
 */
export function getCriticalCount(): number {
  return alarmList.value.filter(a => a.level === 'critical' && a.status !== 'resolved').length
}