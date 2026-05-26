/**
 * 日志服务
 * 提供操作日志查询相关功能
 */

import type { OperationLog, PageResult } from '../types'
import { getLogs as apiGetLogs } from './api'

// 日志筛选参数
export interface LogQueryParams {
  page?: number
  pageSize?: number
  module?: string
  action?: string
  result?: 'success' | 'failed'
  startTime?: string
  endTime?: string
  userId?: string
  keyword?: string
}

// 模块选项
export const MODULE_OPTIONS = [
  { label: '全部模块', value: '' },
  { label: '认证', value: 'auth' },
  { label: '任务', value: 'task' },
  { label: '机器人', value: 'robot' },
  { label: '路线', value: 'route' },
  { label: '告警', value: 'alarm' },
  { label: '奶牛', value: 'cow' },
  { label: '系统', value: 'system' },
]

// 操作选项
export const ACTION_OPTIONS = [
  { label: '全部操作', value: '' },
  { label: '登录', value: 'login' },
  { label: '登出', value: 'logout' },
  { label: '创建', value: 'create' },
  { label: '更新', value: 'update' },
  { label: '删除', value: 'delete' },
  { label: '执行', value: 'execute' },
  { label: '确认', value: 'confirm' },
  { label: '解决', value: 'resolve' },
]

/**
 * 查询日志列表
 */
export async function queryLogs(params: LogQueryParams = {}): Promise<PageResult<OperationLog>> {
  const response = await apiGetLogs(params.page || 1, params.pageSize || 20)
  
  if (response.code === 200) {
    let list = response.data.list
    
    // 客户端筛选(如果需要)
    if (params.module) {
      list = list.filter(log => log.module === params.module)
    }
    if (params.action) {
      list = list.filter(log => log.action === params.action)
    }
    if (params.result) {
      list = list.filter(log => log.result === params.result)
    }
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase()
      list = list.filter(log => 
        log.detail?.toLowerCase().includes(keyword) ||
        log.module.toLowerCase().includes(keyword) ||
        log.action.toLowerCase().includes(keyword)
      )
    }
    
    return {
      list,
      total: list.length,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    }
  }
  
  return {
    list: [],
    total: 0,
    page: params.page || 1,
    pageSize: params.pageSize || 20,
  }
}

/**
 * 获取模块显示文本
 */
export function getModuleText(module: string): string {
  const map: Record<string, string> = {
    auth: '认证',
    task: '任务',
    robot: '机器人',
    route: '路线',
    alarm: '告警',
    cow: '奶牛',
    system: '系统',
  }
  return map[module] || module
}

/**
 * 获取操作显示文本
 */
export function getActionText(action: string): string {
  const map: Record<string, string> = {
    login: '登录',
    logout: '登出',
    create: '创建',
    update: '更新',
    delete: '删除',
    execute: '执行',
    confirm: '确认',
    resolve: '解决',
  }
  return map[action] || action
}

/**
 * 获取结果类型
 */
export function getResultType(result: 'success' | 'failed'): string {
  return result === 'success' ? 'success' : 'danger'
}

/**
 * 格式化时间
 */
export function formatLogTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * 导出日志
 */
export async function exportLogs(params: LogQueryParams = {}): Promise<void> {
  const result = await queryLogs({ ...params, page: 1, pageSize: 10000 })
  
  // 生成CSV
  const headers = ['时间', '模块', '操作', '结果', '详情', '用户ID', 'IP']
  const rows = result.list.map(log => [
    formatLogTime(log.timestamp),
    getModuleText(log.module),
    getActionText(log.action),
    log.result === 'success' ? '成功' : '失败',
    log.detail || '',
    log.userId,
    log.ip || '',
  ])
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
  
  // 下载
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `操作日志_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}