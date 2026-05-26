/**
 * 奶牛牧场智能管理系统 - 类型定义
 */

// 用户相关
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'feeder' | 'guest';
  token?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// 机器人相关
export type RobotStatus = 'online' | 'offline' | 'running' | 'paused' | 'charging' | 'error';

export interface Robot {
  id: string;
  name: string;
  status: RobotStatus;
  position: GridPosition;
  battery: number;
  currentTaskId?: string;
  speed?: number;
  waterRemaining?: number;
  lastOnlineAt: string;
  createdAt: string;
}

// 网格坐标
export interface GridPosition {
  x: number;
  y: number;
}

// 路线相关
export interface RoutePoint {
  id: string;
  position: GridPosition;
  order: number;
  stayDuration: number;
}

export interface Route {
  id: string;
  name: string;
  points: RoutePoint[];
  createdAt: string;
  updatedAt: string;
}

// 任务相关
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'paused' | 'cancelled' | 'failed';

export interface Task {
  id: string;
  name: string;
  routeId: string;
  robotId?: string;
  scheduledTime: string;
  repeatType?: RepeatType;
  status: TaskStatus;
  executedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

// 告警相关
export type AlarmType = 'battery_low' | 'robot_offline' | 'route_error' | 'obstacle' | 'video_stream' | 'task_failed' | 'robot_error';

export type AlarmLevel = 'normal' | 'warning' | 'critical';

export type AlarmStatus = 'pending' | 'confirmed' | 'resolved';

export interface Alarm {
  id: string;
  robotId: string;
  type: AlarmType;
  level: AlarmLevel;
  message: string;
  timestamp: string;
  status: AlarmStatus;
  confirmedAt?: string;
  confirmedBy?: string;
}

// 操作日志
export interface OperationLog {
  id: string;
  userId: string;
  module: string;
  action: string;
  result: 'success' | 'failed';
  detail?: string;
  ip?: string;
  timestamp: string;
}

// 奶牛
export interface Cow {
  id: string;
  name?: string;
  position: GridPosition;
  areaId?: string;
  lastSeenAt: string;
}

// 地图元素
export type MapElementType = 'water_trough' | 'fence' | 'cow_area' | 'robot_area' | 'obstacle';

export interface MapElement {
  id: string;
  type: MapElementType;
  name: string;
  position: GridPosition;
  properties?: Record<string, unknown>;
}

// API 响应类型
export interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: User;
}

// 仪表盘数据
export interface DashboardData {
  robotCount: number;
  onlineRobotCount: number;
  taskCount: number;
  pendingTaskCount: number;
  alarmCount: number;
  criticalAlarmCount: number;
  cowCount: number;
}