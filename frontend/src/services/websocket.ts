/**
 * WebSocket 服务
 * 提供实时双向通信功能
 */

import { ref } from 'vue'

// WebSocket 状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// 消息类型
export type MessageType = 
  | 'robot_status' 
  | 'task_update' 
  | 'alarm' 
  | 'command_response'
  | 'video_stream'
  | 'system'

// WebSocket 消息
export interface WebSocketMessage {
  type: MessageType
  payload: unknown
  timestamp: string
}

// 消息监听器类型
type MessageHandler = (message: WebSocketMessage) => void

// 当前连接状态
const connectionStatus = ref<ConnectionStatus>('disconnected')

// WebSocket 实例
let ws: WebSocket | null = null

// 消息监听器
const messageListeners: Map<MessageType, Set<MessageHandler>> = new Map()

// 通用消息监听器
const generalListeners: Set<MessageHandler> = new Set()

// 重连配置
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000
let reconnectTimer: number | null = null

// 是否手动断开
let manualDisconnect = false

// WebSocket URL
let wsUrl = ''

/**
 * 连接到 WebSocket 服务器
 */
export function connect(url: string): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.warn('[WebSocket] Already connected')
    return
  }

  wsUrl = url
  manualDisconnect = false
  reconnectAttempts = 0
  
  doConnect()
}

/**
 * 执行连接
 */
function doConnect(): void {
  if (manualDisconnect) return
  
  connectionStatus.value = 'connecting'
  
  try {
    ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      console.log('[WebSocket] Connected')
      connectionStatus.value = 'connected'
      reconnectAttempts = 0
      
      // 发送心跳
      startHeartbeat()
    }
    
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (e) {
        console.error('[WebSocket] Failed to parse message:', e)
      }
    }
    
    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
      connectionStatus.value = 'error'
    }
    
    ws.onclose = () => {
      console.log('[WebSocket] Disconnected')
      connectionStatus.value = 'disconnected'
      stopHeartbeat()
      
      // 如果不是手动断开，尝试重连
      if (!manualDisconnect) {
        attemptReconnect()
      }
    }
  } catch (e) {
    console.error('[WebSocket] Connection failed:', e)
    connectionStatus.value = 'error'
    attemptReconnect()
  }
}

/**
 * 断开连接
 */
export function disconnect(): void {
  manualDisconnect = true
  stopReconnect()
  
  if (ws) {
    ws.close()
    ws = null
  }
  
  connectionStatus.value = 'disconnected'
}

/**
 * 发送消息
 */
export function send(type: MessageType, payload: unknown): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[WebSocket] Not connected')
    return false
  }
  
  const message: WebSocketMessage = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  }
  
  try {
    ws.send(JSON.stringify(message))
    return true
  } catch (e) {
    console.error('[WebSocket] Send failed:', e)
    return false
  }
}

/**
 * 发送机器人控制指令
 */
export function sendRobotCommand(
  robotId: string, 
  command: string, 
  params?: Record<string, unknown>
): boolean {
  return send('robot_status', {
    action: 'command',
    robotId,
    command,
    ...params,
  })
}

/**
 * 订阅机器人状态更新
 */
export function subscribeRobotStatus(robotId?: string): boolean {
  return send('robot_status', {
    action: 'subscribe',
    robotId,
  })
}

/**
 * 处理接收到的消息
 */
function handleMessage(message: WebSocketMessage): void {
  // 触发特定类型监听器
  const typeListeners = messageListeners.get(message.type)
  if (typeListeners) {
    typeListeners.forEach(handler => handler(message))
  }
  
  // 触发通用监听器
  generalListeners.forEach(handler => handler(message))
}

/**
 * 添加消息监听器
 */
export function addMessageListener(type: MessageType, handler: MessageHandler): void {
  if (!messageListeners.has(type)) {
    messageListeners.set(type, new Set())
  }
  messageListeners.get(type)!.add(handler)
}

/**
 * 移除消息监听器
 */
export function removeMessageListener(type: MessageType, handler: MessageHandler): void {
  const typeListeners = messageListeners.get(type)
  if (typeListeners) {
    typeListeners.delete(handler)
  }
}

/**
 * 添加通用消息监听器
 */
export function addGeneralMessageListener(handler: MessageHandler): void {
  generalListeners.add(handler)
}

/**
 * 移除通用消息监听器
 */
export function removeGeneralMessageListener(handler: MessageHandler): void {
  generalListeners.delete(handler)
}

// ==================== 心跳 ====================

let heartbeatTimer: number | null = null
const HEARTBEAT_INTERVAL = 30000

function startHeartbeat(): void {
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    send('system', { action: 'ping' })
  }, HEARTBEAT_INTERVAL)
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// ==================== 重连 ====================

function attemptReconnect(): void {
  if (manualDisconnect) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[WebSocket] Max reconnect attempts reached')
    return
  }
  
  reconnectAttempts++
  console.log(`[WebSocket] Reconnecting... Attempt ${reconnectAttempts}`)
  
  reconnectTimer = window.setTimeout(() => {
    doConnect()
  }, RECONNECT_DELAY)
}

function stopReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

// ==================== 导出响应式状态 ====================

export { connectionStatus }

// ==================== 模拟 WebSocket (开发环境使用) ====================

// 模拟数据更新间隔
let mockUpdateTimer: number | null = null
let mockRobots: unknown[] = []

/**
 * 启动模拟 WebSocket (用于开发测试)
 */
export function startMockWebSocket(robots: unknown[]): void {
  mockRobots = robots
  connectionStatus.value = 'connected'
  
  // 模拟机器人状态更新
  mockUpdateTimer = window.setInterval(() => {
    // 随机更新机器人状态
    const message: WebSocketMessage = {
      type: 'robot_status',
      payload: {
        action: 'update',
        robots: mockRobots,
      },
      timestamp: new Date().toISOString(),
    }
    
    handleMessage(message)
  }, 3000)
}

/**
 * 停止模拟 WebSocket
 */
export function stopMockWebSocket(): void {
  if (mockUpdateTimer) {
    clearInterval(mockUpdateTimer)
    mockUpdateTimer = null
  }
  connectionStatus.value = 'disconnected'
}

/**
 * 检查连接状态
 */
export function isConnected(): boolean {
  return connectionStatus.value === 'connected'
}

/**
 * 获取连接状态文本
 */
export function getConnectionStatusText(): string {
  const map: Record<ConnectionStatus, string> = {
    connecting: '连接中',
    connected: '已连接',
    disconnected: '已断开',
    error: '连接错误',
  }
  return map[connectionStatus.value]
}