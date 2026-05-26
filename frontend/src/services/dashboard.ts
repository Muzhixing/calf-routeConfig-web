/**
 * 仪表盘数据服务
 */

import type { DashboardData, ApiResponse } from '../types';
import * as api from './api';

export async function getDashboardData(): Promise<DashboardData | null> {
  const response = await api.getDashboardData();
  if (response.code === 200) {
    return response.data;
  }
  return null;
}

export function formatDashboardData(data: DashboardData) {
  return {
    robotCount: data.robotCount,
    onlineRobotCount: data.onlineRobotCount,
    offlineRobotCount: data.robotCount - data.onlineRobotCount,
    taskCount: data.taskCount,
    pendingTaskCount: data.pendingTaskCount,
    completedTaskCount: data.taskCount - data.pendingTaskCount,
    alarmCount: data.alarmCount,
    criticalAlarmCount: data.criticalAlarmCount,
    warningAlarmCount: data.alarmCount - data.criticalAlarmCount,
    cowCount: data.cowCount,
  };
}