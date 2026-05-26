/**
 * 任务服务
 * 提供任务管理相关功能
 */

import { ref } from 'vue'
import type { Task, TaskStatus, RepeatType, ApiResponse } from '../types'
import { getTasks, getTaskByIdApi, createTask as apiCreateTask, updateTask, deleteTask as apiDeleteTask } from './api'

// 任务刷新间隔(毫秒)
const DEFAULT_REFRESH_INTERVAL = 3000

// 当前任务列表
const currentTasks = ref<Task[]>([])

// 刷新定时器
let refreshTimer: number | null = null

// 任务监听器类型
type TaskListener = (tasks: Task[]) => void

// 任务监听器列表
const listeners: Set<TaskListener> = new Set()

/**
 * 获取任务列表
 */
export async function fetchTasks(): Promise<Task[]> {
  const response = await getTasks()
  if (response.code === 200) {
    currentTasks.value = response.data
    notifyListeners()
    return response.data
  }
  return []
}

/**
 * 获取单个任务详情
 */
export async function fetchTaskById(id: string): Promise<Task | null> {
  const response = await getTaskByIdApi(id)
  if (response.code === 200) {
    return response.data
  }
  return null
}

/**
 * 创建任务
 */
export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> {
  const response = await apiCreateTask(task)
  if (response.code === 200) {
    currentTasks.value.push(response.data)
    notifyListeners()
    return response.data
  }
  return null
}

/**
 * 更新任务
 */
export async function updateTaskById(id: string, data: Partial<Task>): Promise<boolean> {
  const response = await updateTask(id, data)
  if (response.code === 200) {
    const index = currentTasks.value.findIndex(t => t.id === id)
    if (index >= 0) {
      currentTasks.value[index] = response.data
    }
    notifyListeners()
    return true
  }
  return false
}

/**
 * 删除任务
 */
export async function deleteTaskById(id: string): Promise<boolean> {
  const response = await apiDeleteTask(id)
  if (response.code === 200) {
    const index = currentTasks.value.findIndex(t => t.id === id)
    if (index >= 0) {
      currentTasks.value.splice(index, 1)
    }
    notifyListeners()
    return true
  }
  return false
}

/**
 * 执行任务
 */
export async function executeTask(id: string): Promise<boolean> {
  return updateTaskById(id, { 
    status: 'running', 
    executedAt: new Date().toISOString() 
  })
}

/**
 * 暂停任务
 */
export async function pauseTask(id: string): Promise<boolean> {
  return updateTaskById(id, { status: 'paused' })
}

/**
 * 取消任务
 */
export async function cancelTaskById(id: string): Promise<boolean> {
  return updateTaskById(id, { status: 'cancelled' })
}

/**
 * 完成任务
 */
export async function completeTask(id: string): Promise<boolean> {
  return updateTaskById(id, { 
    status: 'completed', 
    completedAt: new Date().toISOString() 
  })
}

/**
 * 启动自动刷新
 */
export function startAutoRefresh(interval: number = DEFAULT_REFRESH_INTERVAL): void {
  stopAutoRefresh()
  refreshTimer = window.setInterval(() => {
    fetchTasks()
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
 * 添加任务监听器
 */
export function addTaskListener(listener: TaskListener): void {
  listeners.add(listener)
}

/**
 * 移除任务监听器
 */
export function removeTaskListener(listener: TaskListener): void {
  listeners.delete(listener)
}

/**
 * 通知所有监听器
 */
function notifyListeners(): void {
  listeners.forEach(listener => {
    listener(currentTasks.value)
  })
}

/**
 * 获取状态显示文本
 */
export function getTaskStatusText(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    pending: '待执行',
    running: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消',
    failed: '失败',
  }
  return map[status] || status
}

/**
 * 获取状态类型(Element Plus tag)
 */
export function getTaskStatusType(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    pending: 'info',
    running: 'primary',
    completed: 'success',
    paused: 'warning',
    cancelled: 'info',
    failed: 'danger',
  }
  return map[status] || 'info'
}

/**
 * 获取重复类型显示文本
 */
export function getRepeatTypeText(repeatType?: RepeatType): string {
  const map: Record<RepeatType, string> = {
    none: '不重复',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
  }
  return map[repeatType || 'none'] || repeatType || ''
}

/**
 * 格式化任务时间
 */
export function formatTaskTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}

/**
 * 检查任务是否即将执行(5分钟内)
 */
export function isTaskImminent(task: Task): boolean {
  if (task.status !== 'pending') return false
  
  const now = new Date().getTime()
  const scheduled = new Date(task.scheduledTime).getTime()
  const diff = scheduled - now
  
  return diff > 0 && diff <= 5 * 60 * 1000
}

/**
 * 检查任务是否超时
 */
export function isTaskOverdue(task: Task): boolean {
  if (task.status !== 'pending') return false
  
  const now = new Date().getTime()
  const scheduled = new Date(task.scheduledTime).getTime()
  
  return now > scheduled
}