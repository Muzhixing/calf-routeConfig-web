/**
 * API 服务封装
 * 支持 Mock 数据和真实 API 切换
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
  LoginRequest,
  LoginResponse,
  ApiResponse,
  PageResult,
  GridPosition,
} from '../types';
import { setItem, getItem, removeItem, StorageKeys } from '../utils/storage';
import {
  mockUsers,
  mockRobots,
  mockRoutes,
  mockTasks,
  mockAlarms,
  mockLogs,
  mockCows,
  mockMapElements,
  mockDashboardData,
  generateId,
  getUserByUsername,
  getRobotById,
  getRouteById,
  getTaskById,
  getAlarmById,
} from './mock';

// ==================== 配置 ====================
const USE_MOCK = true; // 设置为 false 使用真实 API
const API_BASE_URL = '/api';

// ==================== 工具函数 ====================
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getToken(): string | undefined {
  return getItem<string>(StorageKeys.TOKEN);
}

function setToken(token: string): void {
  setItem(StorageKeys.TOKEN, token);
}

function clearToken(): void {
  removeItem(StorageKeys.TOKEN);
}

function getCurrentUser(): User | undefined {
  return getItem<User>(StorageKeys.USER);
}

function setCurrentUser(user: User): void {
  setItem(StorageKeys.USER, user);
}

// ==================== 认证 API ====================
export async function login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  if (USE_MOCK) {
    await delay(300);
    const user = getUserByUsername(credentials.username);
    if (user && user.password === credentials.password) {
      const token = generateId('token_');
      const responseUser = { ...user, token };
      setToken(token);
      setCurrentUser(responseUser);
      return {
        code: 200,
        data: { token, user: responseUser },
      };
    }
    return { code: 401, data: {} as LoginResponse, message: '用户名或密码错误' };
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return response.json();
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    await delay(100);
    clearToken();
    removeItem(StorageKeys.USER);
    return;
  }
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  clearToken();
}

export async function verifyToken(): Promise<ApiResponse<User>> {
  if (USE_MOCK) {
    await delay(100);
    const user = getCurrentUser();
    if (user && user.token) {
      return { code: 200, data: user };
    }
    return { code: 401, data: {} as User, message: '未登录' };
  }

  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

// ==================== 仪表盘 API ====================
export async function getDashboardData(): Promise<ApiResponse<DashboardData>> {
  if (USE_MOCK) {
    await delay(200);
    return { code: 200, data: mockDashboardData };
  }

  const response = await fetch(`${API_BASE_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

// ==================== 机器人 API ====================
export async function getRobots(): Promise<ApiResponse<Robot[]>> {
  if (USE_MOCK) {
    await delay(200);
    return { code: 200, data: [...mockRobots] };
  }

  const response = await fetch(`${API_BASE_URL}/robots`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function getRobotByIdApi(id: string): Promise<ApiResponse<Robot>> {
  if (USE_MOCK) {
    await delay(100);
    const robot = getRobotById(id);
    if (robot) {
      return { code: 200, data: robot };
    }
    return { code: 404, data: {} as Robot, message: '机器人不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/robots/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function createRobot(robot: Omit<Robot, 'id' | 'createdAt'>): Promise<ApiResponse<Robot>> {
  if (USE_MOCK) {
    await delay(300);
    const newRobot: Robot = {
      ...robot,
      id: generateId('r'),
      createdAt: new Date().toISOString(),
    };
    mockRobots.push(newRobot);
    return { code: 200, data: newRobot };
  }

  const response = await fetch(`${API_BASE_URL}/robots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(robot),
  });
  return response.json();
}

export async function updateRobot(id: string, robot: Partial<Robot>): Promise<ApiResponse<Robot>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockRobots.findIndex(r => r.id === id);
    if (index >= 0) {
      mockRobots[index] = { ...mockRobots[index], ...robot };
      return { code: 200, data: mockRobots[index] };
    }
    return { code: 404, data: {} as Robot, message: '机器人不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/robots/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(robot),
  });
  return response.json();
}

export async function deleteRobot(id: string): Promise<ApiResponse<void>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockRobots.findIndex(r => r.id === id);
    if (index >= 0) {
      mockRobots.splice(index, 1);
      return { code: 200, data: undefined };
    }
    return { code: 404, data: undefined, message: '机器人不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/robots/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

// ==================== 路线 API ====================
export async function getRoutes(): Promise<ApiResponse<Route[]>> {
  if (USE_MOCK) {
    await delay(200);
    return { code: 200, data: [...mockRoutes] };
  }

  const response = await fetch(`${API_BASE_URL}/routes`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function getRouteByIdApi(id: string): Promise<ApiResponse<Route>> {
  if (USE_MOCK) {
    await delay(100);
    const route = getRouteById(id);
    if (route) {
      return { code: 200, data: route };
    }
    return { code: 404, data: {} as Route, message: '路线不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/routes/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Route>> {
  if (USE_MOCK) {
    await delay(300);
    const now = new Date().toISOString();
    const newRoute: Route = {
      ...route,
      id: generateId('route'),
      createdAt: now,
      updatedAt: now,
    };
    mockRoutes.push(newRoute);
    return { code: 200, data: newRoute };
  }

  const response = await fetch(`${API_BASE_URL}/routes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(route),
  });
  return response.json();
}

export async function updateRoute(id: string, route: Partial<Route>): Promise<ApiResponse<Route>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockRoutes.findIndex(r => r.id === id);
    if (index >= 0) {
      mockRoutes[index] = { ...mockRoutes[index], ...route, updatedAt: new Date().toISOString() };
      return { code: 200, data: mockRoutes[index] };
    }
    return { code: 404, data: {} as Route, message: '路线不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/routes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(route),
  });
  return response.json();
}

export async function deleteRoute(id: string): Promise<ApiResponse<void>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockRoutes.findIndex(r => r.id === id);
    if (index >= 0) {
      mockRoutes.splice(index, 1);
      return { code: 200, data: undefined };
    }
    return { code: 404, data: undefined, message: '路线不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/routes/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

// ==================== 任务 API ====================
export async function getTasks(): Promise<ApiResponse<Task[]>> {
  if (USE_MOCK) {
    await delay(200);
    return { code: 200, data: [...mockTasks] };
  }

  const response = await fetch(`${API_BASE_URL}/tasks`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function getTaskByIdApi(id: string): Promise<ApiResponse<Task>> {
  if (USE_MOCK) {
    await delay(100);
    const task = getTaskById(id);
    if (task) {
      return { code: 200, data: task };
    }
    return { code: 404, data: {} as Task, message: '任务不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<ApiResponse<Task>> {
  if (USE_MOCK) {
    await delay(300);
    const newTask: Task = {
      ...task,
      id: generateId('t'),
      createdAt: new Date().toISOString(),
    };
    mockTasks.push(newTask);
    return { code: 200, data: newTask };
  }

  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(task),
  });
  return response.json();
}

export async function updateTask(id: string, task: Partial<Task>): Promise<ApiResponse<Task>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockTasks.findIndex(t => t.id === id);
    if (index >= 0) {
      mockTasks[index] = { ...mockTasks[index], ...task };
      return { code: 200, data: mockTasks[index] };
    }
    return { code: 404, data: {} as Task, message: '任务不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(task),
  });
  return response.json();
}

export async function deleteTask(id: string): Promise<ApiResponse<void>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockTasks.findIndex(t => t.id === id);
    if (index >= 0) {
      mockTasks.splice(index, 1);
      return { code: 200, data: undefined };
    }
    return { code: 404, data: undefined, message: '任务不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

// ==================== 告警 API ====================
export async function getAlarms(): Promise<ApiResponse<Alarm[]>> {
  if (USE_MOCK) {
    await delay(200);
    return { code: 200, data: [...mockAlarms] };
  }

  const response = await fetch(`${API_BASE_URL}/alarms`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function getAlarmByIdApi(id: string): Promise<ApiResponse<Alarm>> {
  if (USE_MOCK) {
    await delay(100);
    const alarm = getAlarmById(id);
    if (alarm) {
      return { code: 200, data: alarm };
    }
    return { code: 404, data: {} as Alarm, message: '告警不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/alarms/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function confirmAlarm(id: string, userId: string): Promise<ApiResponse<Alarm>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockAlarms.findIndex(a => a.id === id);
    if (index >= 0) {
      mockAlarms[index].status = 'confirmed';
      mockAlarms[index].confirmedAt = new Date().toISOString();
      mockAlarms[index].confirmedBy = userId;
      return { code: 200, data: mockAlarms[index] };
    }
    return { code: 404, data: {} as Alarm, message: '告警不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/alarms/${id}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ userId }),
  });
  return response.json();
}

export async function resolveAlarm(id: string): Promise<ApiResponse<Alarm>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockAlarms.findIndex(a => a.id === id);
    if (index >= 0) {
      mockAlarms[index].status = 'resolved';
      return { code: 200, data: mockAlarms[index] };
    }
    return { code: 404, data: {} as Alarm, message: '告警不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/alarms/${id}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

// ==================== 日志 API ====================
export async function getLogs(page: number = 1, pageSize: number = 20): Promise<ApiResponse<PageResult<OperationLog>>> {
  if (USE_MOCK) {
    await delay(200);
    const start = (page - 1) * pageSize;
    const list = mockLogs.slice(start, start + pageSize);
    return {
      code: 200,
      data: {
        list,
        total: mockLogs.length,
        page,
        pageSize,
      },
    };
  }

  const response = await fetch(`${API_BASE_URL}/logs?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

// ==================== 奶牛 API ====================
export async function getCows(): Promise<ApiResponse<Cow[]>> {
  if (USE_MOCK) {
    await delay(200);
    return { code: 200, data: [...mockCows] };
  }

  const response = await fetch(`${API_BASE_URL}/cows`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function updateCowPosition(id: string, position: GridPosition): Promise<ApiResponse<Cow>> {
  if (USE_MOCK) {
    await delay(100);
    const index = mockCows.findIndex(c => c.id === id);
    if (index >= 0) {
      mockCows[index].position = position;
      mockCows[index].lastSeenAt = new Date().toISOString();
      return { code: 200, data: mockCows[index] };
    }
    return { code: 404, data: {} as Cow, message: '奶牛不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/cows/${id}/position`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(position),
  });
  return response.json();
}

// ==================== 地图元素 API ====================
export async function getMapElements(): Promise<ApiResponse<MapElement[]>> {
  if (USE_MOCK) {
    await delay(200);
    return { code: 200, data: [...mockMapElements] };
  }

  const response = await fetch(`${API_BASE_URL}/map-elements`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}

export async function createMapElement(element: Omit<MapElement, 'id'>): Promise<ApiResponse<MapElement>> {
  if (USE_MOCK) {
    await delay(300);
    const newElement: MapElement = {
      ...element,
      id: generateId('me'),
    };
    mockMapElements.push(newElement);
    return { code: 200, data: newElement };
  }

  const response = await fetch(`${API_BASE_URL}/map-elements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(element),
  });
  return response.json();
}

export async function deleteMapElement(id: string): Promise<ApiResponse<void>> {
  if (USE_MOCK) {
    await delay(200);
    const index = mockMapElements.findIndex(e => e.id === id);
    if (index >= 0) {
      mockMapElements.splice(index, 1);
      return { code: 200, data: undefined };
    }
    return { code: 404, data: undefined, message: '地图元素不存在' };
  }

  const response = await fetch(`${API_BASE_URL}/map-elements/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return response.json();
}