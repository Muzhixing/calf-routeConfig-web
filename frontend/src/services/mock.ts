/**
 * Mock 数据服务
 * 提供模拟数据用于开发和测试
 */

import type {
  User,
  Robot,
  Route,
  Task,
  Alarm,
  OperationLog,
  Cow,
  MapElement,
  DashboardData,
  GridPosition,
} from '../types';

// ==================== Mock Users ====================
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2024-06-01T10:30:00Z',
  },
  {
    id: '2',
    username: 'feeder01',
    password: 'feeder123',
    role: 'feeder',
    createdAt: '2024-01-15T00:00:00Z',
    lastLoginAt: '2024-06-01T08:00:00Z',
  },
  {
    id: '3',
    username: 'guest',
    password: 'guest123',
    role: 'guest',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

// ==================== Mock Robots ====================
export const mockRobots: Robot[] = [
  {
    id: 'r1',
    name: 'Robot-Alpha',
    status: 'online',
    position: { x: 5, y: 3 },
    battery: 85,
    currentTaskId: 't1',
    speed: 1.5,
    waterRemaining: 90,
    lastOnlineAt: '2024-06-01T10:00:00Z',
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'r2',
    name: 'Robot-Beta',
    status: 'running',
    position: { x: 10, y: -2 },
    battery: 62,
    currentTaskId: 't2',
    speed: 1.2,
    waterRemaining: 75,
    lastOnlineAt: '2024-06-01T10:00:00Z',
    createdAt: '2024-01-12T00:00:00Z',
  },
  {
    id: 'r3',
    name: 'Robot-Gamma',
    status: 'charging',
    position: { x: 0, y: 0 },
    battery: 45,
    speed: 1.0,
    waterRemaining: 50,
    lastOnlineAt: '2024-06-01T09:55:00Z',
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'r4',
    name: 'Robot-Delta',
    status: 'offline',
    position: { x: -3, y: 5 },
    battery: 20,
    speed: 1.3,
    waterRemaining: 30,
    lastOnlineAt: '2024-05-31T20:00:00Z',
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 'r5',
    name: 'Robot-Epsilon',
    status: 'error',
    position: { x: 8, y: 12 },
    battery: 15,
    speed: 0,
    waterRemaining: 10,
    lastOnlineAt: '2024-06-01T08:30:00Z',
    createdAt: '2024-03-01T00:00:00Z',
  },
];

// ==================== Mock Routes ====================
export const mockRoutes: Route[] = [
  {
    id: 'route1',
    name: 'A区喂养路线',
    points: [
      { id: 'p1', position: { x: 0, y: 0 }, order: 1, stayDuration: 30 },
      { id: 'p2', position: { x: 5, y: 0 }, order: 2, stayDuration: 20 },
      { id: 'p3', position: { x: 5, y: 5 }, order: 3, stayDuration: 25 },
      { id: 'p4', position: { x: 0, y: 5 }, order: 4, stayDuration: 15 },
    ],
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-05-15T00:00:00Z',
  },
  {
    id: 'route2',
    name: 'B区巡逻路线',
    points: [
      { id: 'p5', position: { x: 10, y: -5 }, order: 1, stayDuration: 10 },
      { id: 'p6', position: { x: 15, y: -5 }, order: 2, stayDuration: 10 },
      { id: 'p7', position: { x: 15, y: 5 }, order: 3, stayDuration: 10 },
      { id: 'p8', position: { x: 10, y: 5 }, order: 4, stayDuration: 10 },
    ],
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-04-20T00:00:00Z',
  },
  {
    id: 'route3',
    name: 'C区清洁路线',
    points: [
      { id: 'p9', position: { x: -5, y: -5 }, order: 1, stayDuration: 60 },
      { id: 'p10', position: { x: -10, y: -5 }, order: 2, stayDuration: 45 },
      { id: 'p11', position: { x: -10, y: 0 }, order: 3, stayDuration: 50 },
    ],
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
];

// ==================== Mock Tasks ====================
export const mockTasks: Task[] = [
  {
    id: 't1',
    name: '早晨喂养任务',
    routeId: 'route1',
    robotId: 'r1',
    scheduledTime: '2024-06-01T06:00:00Z',
    repeatType: 'daily',
    status: 'running',
    executedAt: '2024-06-01T06:00:05Z',
    createdAt: '2024-05-31T00:00:00Z',
  },
  {
    id: 't2',
    name: '下午巡逻任务',
    routeId: 'route2',
    robotId: 'r2',
    scheduledTime: '2024-06-01T14:00:00Z',
    repeatType: 'daily',
    status: 'running',
    executedAt: '2024-06-01T14:00:00Z',
    createdAt: '2024-05-31T00:00:00Z',
  },
  {
    id: 't3',
    name: 'C区清洁任务',
    routeId: 'route3',
    robotId: 'r3',
    scheduledTime: '2024-06-02T08:00:00Z',
    repeatType: 'weekly',
    status: 'pending',
    createdAt: '2024-05-30T00:00:00Z',
  },
  {
    id: 't4',
    name: '紧急加餐任务',
    routeId: 'route1',
    scheduledTime: '2024-06-01T16:30:00Z',
    repeatType: 'none',
    status: 'pending',
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 't5',
    name: '昨天夜间巡逻',
    routeId: 'route2',
    robotId: 'r4',
    scheduledTime: '2024-05-31T22:00:00Z',
    repeatType: 'none',
    status: 'completed',
    executedAt: '2024-05-31T22:00:00Z',
    completedAt: '2024-05-31T23:30:00Z',
    createdAt: '2024-05-30T00:00:00Z',
  },
];

// ==================== Mock Alarms ====================
export const mockAlarms: Alarm[] = [
  {
    id: 'a1',
    robotId: 'r5',
    type: 'battery_low',
    level: 'critical',
    message: 'Robot-Epsilon 电池电量过低 (15%)',
    timestamp: '2024-06-01T08:30:00Z',
    status: 'pending',
  },
  {
    id: 'a2',
    robotId: 'r4',
    type: 'robot_offline',
    level: 'warning',
    message: 'Robot-Delta 已离线超过12小时',
    timestamp: '2024-05-31T20:00:00Z',
    status: 'confirmed',
    confirmedAt: '2024-06-01T09:00:00Z',
    confirmedBy: 'admin',
  },
  {
    id: 'a3',
    robotId: 'r2',
    type: 'video_stream',
    level: 'normal',
    message: 'Robot-Beta 视频信号不稳定',
    timestamp: '2024-06-01T09:15:00Z',
    status: 'resolved',
    confirmedAt: '2024-06-01T09:20:00Z',
    confirmedBy: 'feeder01',
  },
  {
    id: 'a4',
    robotId: 'r5',
    type: 'robot_error',
    level: 'critical',
    message: 'Robot-Epsilon 电机故障',
    timestamp: '2024-06-01T08:35:00Z',
    status: 'pending',
  },
  {
    id: 'a5',
    robotId: 'r1',
    type: 'obstacle',
    level: 'warning',
    message: 'Robot-Alpha 检测到路线前方有障碍物',
    timestamp: '2024-06-01T10:05:00Z',
    status: 'pending',
  },
];

// ==================== Mock Logs ====================
export const mockLogs: OperationLog[] = [
  {
    id: 'log1',
    userId: '1',
    module: 'auth',
    action: 'login',
    result: 'success',
    detail: '用户 admin 登录成功',
    ip: '192.168.1.100',
    timestamp: '2024-06-01T10:30:00Z',
  },
  {
    id: 'log2',
    userId: '2',
    module: 'task',
    action: 'create',
    result: 'success',
    detail: '创建任务: 紧急加餐任务',
    ip: '192.168.1.101',
    timestamp: '2024-06-01T10:00:00Z',
  },
  {
    id: 'log3',
    userId: '1',
    module: 'robot',
    action: 'update',
    result: 'success',
    detail: '更新机器人 Robot-Epsilon 状态',
    ip: '192.168.1.100',
    timestamp: '2024-06-01T09:00:00Z',
  },
  {
    id: 'log4',
    userId: '2',
    module: 'alarm',
    action: 'confirm',
    result: 'success',
    detail: '确认告警: Robot-Delta 已离线',
    ip: '192.168.1.101',
    timestamp: '2024-06-01T09:00:00Z',
  },
  {
    id: '5',
    userId: '1',
    module: 'route',
    action: 'create',
    result: 'failed',
    detail: '创建路线失败: 路线点坐标无效',
    ip: '192.168.1.100',
    timestamp: '2024-05-31T15:30:00Z',
  },
];

// ==================== Mock Cows ====================
export const mockCows: Cow[] = [
  { id: 'c1', name: '黑白花', position: { x: 2, y: 1 }, areaId: 'A区', lastSeenAt: '2024-06-01T10:00:00Z' },
  { id: 'c2', name: '黄白花', position: { x: 3, y: 2 }, areaId: 'A区', lastSeenAt: '2024-06-01T09:55:00Z' },
  { id: 'c3', name: '棕白花', position: { x: 1, y: 3 }, areaId: 'A区', lastSeenAt: '2024-06-01T10:05:00Z' },
  { id: 'c4', name: '全黑', position: { x: 6, y: -1 }, areaId: 'B区', lastSeenAt: '2024-06-01T09:50:00Z' },
  { id: 'c5', name: '全白', position: { x: 7, y: 0 }, areaId: 'B区', lastSeenAt: '2024-06-01T10:10:00Z' },
  { id: 'c6', name: '花色01', position: { x: -2, y: 2 }, areaId: 'C区', lastSeenAt: '2024-06-01T08:30:00Z' },
  { id: 'c7', name: '花色02', position: { x: -3, y: 3 }, areaId: 'C区', lastSeenAt: '2024-06-01T08:35:00Z' },
  { id: 'c8', name: '花色03', position: { x: -1, y: 1 }, areaId: 'C区', lastSeenAt: '2024-06-01T08:40:00Z' },
];

// ==================== Mock Map Elements ====================
export const mockMapElements: MapElement[] = [
  { id: 'me1', type: 'water_trough', name: 'A区水槽1', position: { x: 2, y: 0 }, properties: { capacity: 200 } },
  { id: 'me2', type: 'water_trough', name: 'A区水槽2', position: { x: 4, y: 4 }, properties: { capacity: 200 } },
  { id: 'me3', type: 'water_trough', name: 'B区水槽1', position: { x: 12, y: 0 }, properties: { capacity: 150 } },
  { id: 'me4', type: 'fence', name: 'A区围栏', position: { x: 0, y: 6 }, properties: { length: 20 } },
  { id: 'me5', type: 'fence', name: 'B区围栏', position: { x: 10, y: 6 }, properties: { length: 15 } },
  { id: 'me6', type: 'cow_area', name: 'A区', position: { x: 2, y: 2 }, properties: { area: 25, cowCount: 3 } },
  { id: 'me7', type: 'cow_area', name: 'B区', position: { x: 8, y: 0 }, properties: { area: 20, cowCount: 2 } },
  { id: 'me8', type: 'cow_area', name: 'C区', position: { x: -2, y: 2 }, properties: { area: 30, cowCount: 3 } },
  { id: 'me9', type: 'robot_area', name: '机器人充电区', position: { x: 0, y: 0 }, properties: { capacity: 5 } },
  { id: 'me10', type: 'obstacle', name: '石堆', position: { x: 5, y: 3 }, properties: { size: 'large' } },
];

// ==================== Dashboard Data ====================
export const mockDashboardData: DashboardData = {
  robotCount: 5,
  onlineRobotCount: 3,
  taskCount: 5,
  pendingTaskCount: 2,
  alarmCount: 5,
  criticalAlarmCount: 2,
  cowCount: 8,
};

// ==================== Helper Functions ====================

/**
 * 生成唯一ID
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 根据ID获取机器人
 */
export function getRobotById(id: string): Robot | undefined {
  return mockRobots.find(r => r.id === id);
}

/**
 * 根据ID获取路线
 */
export function getRouteById(id: string): Route | undefined {
  return mockRoutes.find(r => r.id === id);
}

/**
 * 根据ID获取任务
 */
export function getTaskById(id: string): Task | undefined {
  return mockTasks.find(t => t.id === id);
}

/**
 * 根据ID获取告警
 */
export function getAlarmById(id: string): Alarm | undefined {
  return mockAlarms.find(a => a.id === id);
}

/**
 * 根据ID获取用户
 */
export function getUserById(id: string): User | undefined {
  return mockUsers.find(u => u.id === id);
}

/**
 * 根据用户名获取用户
 */
export function getUserByUsername(username: string): User | undefined {
  return mockUsers.find(u => u.username === username);
}