/**
 * 历史记录服务
 * 提供任务历史和轨迹回放相关功能
 */

import type { Task, GridPosition } from '../types';
import { mockTasks } from './mock';

// 轨迹点类型
export interface TrackPoint {
  position: GridPosition;
  timestamp: string;
  status?: string;
}

// 任务历史记录
export interface TaskHistory {
  task: Task;
  track: TrackPoint[];
  duration: number;
  distance: number;
}

// 模拟轨迹数据
const mockTracks: Record<string, TrackPoint[]> = {
  't5': [
    { position: { x: 0, y: 0 }, timestamp: '2024-05-31T22:00:00Z', status: 'started' },
    { position: { x: 2, y: 0 }, timestamp: '2024-05-31T22:01:30Z' },
    { position: { x: 5, y: 0 }, timestamp: '2024-05-31T22:03:00Z' },
    { position: { x: 8, y: 0 }, timestamp: '2024-05-31T22:04:30Z' },
    { position: { x: 10, y: 2 }, timestamp: '2024-05-31T22:06:00Z' },
    { position: { x: 12, y: 4 }, timestamp: '2024-05-31T22:07:30Z' },
    { position: { x: 12, y: 6 }, timestamp: '2024-05-31T22:09:00Z' },
    { position: { x: 10, y: 8 }, timestamp: '2024-05-31T22:10:30Z' },
    { position: { x: 8, y: 8 }, timestamp: '2024-05-31T22:12:00Z' },
    { position: { x: 5, y: 8 }, timestamp: '2024-05-31T22:13:30Z' },
    { position: { x: 5, y: 5 }, timestamp: '2024-05-31T22:15:00Z' },
    { position: { x: 5, y: 2 }, timestamp: '2024-05-31T22:16:30Z' },
    { position: { x: 2, y: 2 }, timestamp: '2024-05-31T22:18:00Z' },
    { position: { x: 0, y: 0 }, timestamp: '2024-05-31T22:20:00Z', status: 'completed' },
  ],
  't1': [
    { position: { x: 0, y: 0 }, timestamp: '2024-06-01T06:00:00Z', status: 'started' },
    { position: { x: 1, y: 0 }, timestamp: '2024-06-01T06:00:30Z' },
    { position: { x: 3, y: 0 }, timestamp: '2024-06-01T06:01:00Z' },
    { position: { x: 5, y: 0 }, timestamp: '2024-06-01T06:01:30Z' },
    { position: { x: 5, y: 1 }, timestamp: '2024-06-01T06:02:00Z' },
    { position: { x: 5, y: 3 }, timestamp: '2024-06-01T06:02:30Z' },
    { position: { x: 5, y: 4 }, timestamp: '2024-06-01T06:03:00Z' },
    { position: { x: 4, y: 5 }, timestamp: '2024-06-01T06:03:30Z' },
    { position: { x: 2, y: 5 }, timestamp: '2024-06-01T06:04:00Z' },
    { position: { x: 0, y: 5 }, timestamp: '2024-06-01T06:04:30Z', status: 'completed' },
  ],
  't2': [
    { position: { x: 10, y: -5 }, timestamp: '2024-06-01T14:00:00Z', status: 'started' },
    { position: { x: 11, y: -5 }, timestamp: '2024-06-01T14:00:20Z' },
    { position: { x: 13, y: -5 }, timestamp: '2024-06-01T14:00:40Z' },
    { position: { x: 15, y: -5 }, timestamp: '2024-06-01T14:01:00Z' },
    { position: { x: 15, y: -3 }, timestamp: '2024-06-01T14:01:20Z' },
    { position: { x: 15, y: 0 }, timestamp: '2024-06-01T14:01:40Z' },
    { position: { x: 15, y: 3 }, timestamp: '2024-06-01T14:02:00Z' },
    { position: { x: 15, y: 5 }, timestamp: '2024-06-01T14:02:20Z' },
    { position: { x: 14, y: 5 }, timestamp: '2024-06-01T14:02:40Z' },
    { position: { x: 12, y: 5 }, timestamp: '2024-06-01T14:03:00Z' },
    { position: { x: 10, y: 5 }, timestamp: '2024-06-01T14:03:20Z' },
    { position: { x: 10, y: 3 }, timestamp: '2024-06-01T14:03:40Z' },
    { position: { x: 10, y: 0 }, timestamp: '2024-06-01T14:04:00Z' },
    { position: { x: 10, y: -3 }, timestamp: '2024-06-01T14:04:20Z' },
    { position: { x: 10, y: -5 }, timestamp: '2024-06-01T14:04:40Z', status: 'completed' },
  ],
};

/**
 * 获取已完成的任务历史列表
 */
export async function getTaskHistoryList(): Promise<Task[]> {
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // 返回已完成和失败的任务
  return mockTasks.filter(t => 
    t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
  );
}

/**
 * 获取任务的轨迹数据
 */
export async function getTaskTrack(taskId: string): Promise<TrackPoint[]> {
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // 返回模拟轨迹，如果没有则生成一个
  return mockTracks[taskId] || generateMockTrack(taskId);
}

/**
 * 生成模拟轨迹
 */
function generateMockTrack(taskId: string): TrackPoint[] {
  const task = mockTasks.find(t => t.id === taskId);
  if (!task) return [];
  
  const startTime = new Date(task.scheduledTime).getTime();
  const points: TrackPoint[] = [];
  
  // 简单的环形轨迹模拟
  const waypoints = [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 5, y: 5 },
    { x: 0, y: 5 },
  ];
  
  for (let i = 0; i <= 20; i++) {
    const progress = i / 20;
    const waypointIndex = Math.floor(progress * (waypoints.length - 1));
    const nextIndex = Math.min(waypointIndex + 1, waypoints.length - 1);
    const localProgress = (progress * (waypoints.length - 1)) % 1;
    
    const pos = {
      x: waypoints[waypointIndex].x + (waypoints[nextIndex].x - waypoints[waypointIndex].x) * localProgress,
      y: waypoints[waypointIndex].y + (waypoints[nextIndex].y - waypoints[waypointIndex].y) * localProgress,
    };
    
    points.push({
      position: pos,
      timestamp: new Date(startTime + progress * 3600000).toISOString(),
      status: i === 0 ? 'started' : i === 20 ? 'completed' : undefined,
    });
  }
  
  return points;
}

/**
 * 获取任务历史详情
 */
export async function getTaskHistoryDetail(taskId: string): Promise<TaskHistory | null> {
  const task = mockTasks.find(t => t.id === taskId);
  if (!task) return null;
  
  const track = await getTaskTrack(taskId);
  
  // 计算总时长
  let duration = 0;
  if (track.length >= 2) {
    const start = new Date(track[0].timestamp).getTime();
    const end = new Date(track[track.length - 1].timestamp).getTime();
    duration = Math.round((end - start) / 1000);
  }
  
  // 计算总距离
  let distance = 0;
  for (let i = 1; i < track.length; i++) {
    const prev = track[i - 1].position;
    const curr = track[i].position;
    distance += Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
  }
  
  return {
    task,
    track,
    duration,
    distance: Math.round(distance * 10) / 10,
  };
}

/**
 * 格式化时长
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  }
  return `${secs}秒`;
}