/**
 * 奶牛服务
 * 提供奶牛位置管理相关功能
 */

import { ref } from 'vue'
import type { Cow, GridPosition, MapElement } from '../types'
import { mockCows, mockMapElements } from './mock'
import { getItem, StorageKeys } from '../utils/storage'

// 奶牛列表
const cowList = ref<Cow[]>([])

// 奶牛区域统计
export interface CowAreaStats {
  areaId: string
  cowCount: number
  lastUpdateTime: string
}

// 区域分布
const areaDistribution = ref<CowAreaStats[]>([])

// 奶牛监听器
type CowListener = (cows: Cow[]) => void
const listeners: Set<CowListener> = new Set()

/**
 * 获取奶牛列表
 */
export async function fetchCows(): Promise<Cow[]> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 200))
  
  cowList.value = [...mockCows]
  calculateAreaDistribution()
  notifyListeners()
  
  return cowList.value
}

/**
 * 更新奶牛位置
 */
export async function updateCowPosition(id: string, position: GridPosition): Promise<Cow | null> {
  const index = cowList.value.findIndex(c => c.id === id)
  if (index >= 0) {
    cowList.value[index].position = position
    cowList.value[index].lastSeenAt = new Date().toISOString()
    calculateAreaDistribution()
    notifyListeners()
    return cowList.value[index]
  }
  return null
}

/**
 * 获取奶牛区域分布统计
 */
export function getAreaDistribution(): CowAreaStats[] {
  return areaDistribution.value
}

/**
 * 计算区域分布
 */
function calculateAreaDistribution(): void {
  const areaMap = new Map<string, number>()
  
  cowList.value.forEach(cow => {
    const areaId = cow.areaId || '未知区域'
    areaMap.set(areaId, (areaMap.get(areaId) || 0) + 1)
  })
  
  areaDistribution.value = Array.from(areaMap.entries()).map(([areaId, cowCount]) => ({
    areaId,
    cowCount,
    lastUpdateTime: new Date().toISOString(),
  }))
}

/**
 * 添加奶牛监听器
 */
export function addCowListener(listener: CowListener): void {
  listeners.add(listener)
  if (listeners.size === 1) {
    fetchCows()
  }
}

/**
 * 移除奶牛监听器
 */
export function removeCowListener(listener: CowListener): void {
  listeners.delete(listener)
}

/**
 * 通知所有监听器
 */
function notifyListeners(): void {
  listeners.forEach(listener => {
    listener(cowList.value)
  })
}

/**
 * 根据区域获取奶牛
 */
export function getCowsByArea(areaId: string): Cow[] {
  return cowList.value.filter(c => c.areaId === areaId)
}

/**
 * 获取区域列表
 */
export function getAreaList(): string[] {
  const areas = new Set<string>()
  cowList.value.forEach(cow => {
    if (cow.areaId) {
      areas.add(cow.areaId)
    }
  })
  return Array.from(areas)
}

/**
 * 模拟奶牛位置移动(用于演示)
 */
export function simulateCowMovement(): void {
  cowList.value.forEach(cow => {
    // 随机小幅移动
    const dx = (Math.random() - 0.5) * 2
    const dy = (Math.random() - 0.5) * 2
    
    cow.position = {
      x: Math.round(cow.position.x + dx),
      y: Math.round(cow.position.y + dy),
    }
    cow.lastSeenAt = new Date().toISOString()
  })
  
  calculateAreaDistribution()
  notifyListeners()
}

/**
 * 启动奶牛位置模拟
 */
let simulateTimer: number | null = null

export function startCowSimulation(interval: number = 10000): void {
  stopCowSimulation()
  simulateTimer = window.setInterval(simulateCowMovement, interval)
}

export function stopCowSimulation(): void {
  if (simulateTimer) {
    clearInterval(simulateTimer)
    simulateTimer = null
  }
}

/**
 * 导出响应式状态
 */
export function useCows() {
  return {
    cows: cowList,
    areaDistribution,
    fetchCows,
    updateCowPosition,
    getAreaDistribution,
    addCowListener,
    removeCowListener,
    getCowsByArea,
    getAreaList,
  }
}