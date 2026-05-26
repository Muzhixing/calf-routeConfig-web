/**
 * 机器人状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Robot, RobotStatus } from '../types';
import * as api from '../services/api';

export const useRobotStore = defineStore('robot', () => {
  // State
  const robots = ref<Robot[]>([]);
  const currentRobot = ref<Robot | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const robotCount = computed(() => robots.value.length);
  
  const onlineRobots = computed(() => 
    robots.value.filter(r => r.status === 'online' || r.status === 'running')
  );
  const onlineRobotCount = computed(() => onlineRobots.value.length);
  
  const offlineRobots = computed(() => 
    robots.value.filter(r => r.status === 'offline')
  );
  
  const chargingRobots = computed(() => 
    robots.value.filter(r => r.status === 'charging')
  );
  
  const errorRobots = computed(() => 
    robots.value.filter(r => r.status === 'error')
  );

  const getRobotById = computed(() => (id: string) => 
    robots.value.find(r => r.id === id)
  );

  const robotsByStatus = computed(() => (status: RobotStatus) =>
    robots.value.filter(r => r.status === status)
  );

  // Actions
  async function fetchRobots(): Promise<void> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getRobots();
      if (response.code === 200) {
        robots.value = response.data;
      } else {
        error.value = response.message || '获取机器人列表失败';
      }
    } catch (e) {
      error.value = '网络错误';
    } finally {
      loading.value = false;
    }
  }

  async function fetchRobotById(id: string): Promise<Robot | null> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getRobotByIdApi(id);
      if (response.code === 200) {
        currentRobot.value = response.data;
        return response.data;
      } else {
        error.value = response.message || '获取机器人详情失败';
        return null;
      }
    } catch (e) {
      error.value = '网络错误';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createRobot(robot: Omit<Robot, 'id' | 'createdAt'>): Promise<Robot | null> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.createRobot(robot);
      if (response.code === 200) {
        robots.value.push(response.data);
        return response.data;
      } else {
        error.value = response.message || '创建机器人失败';
        return null;
      }
    } catch (e) {
      error.value = '网络错误';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateRobot(id: string, data: Partial<Robot>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.updateRobot(id, data);
      if (response.code === 200) {
        const index = robots.value.findIndex(r => r.id === id);
        if (index >= 0) {
          robots.value[index] = response.data;
        }
        if (currentRobot.value?.id === id) {
          currentRobot.value = response.data;
        }
        return true;
      } else {
        error.value = response.message || '更新机器人失败';
        return false;
      }
    } catch (e) {
      error.value = '网络错误';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deleteRobot(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.deleteRobot(id);
      if (response.code === 200) {
        const index = robots.value.findIndex(r => r.id === id);
        if (index >= 0) {
          robots.value.splice(index, 1);
        }
        if (currentRobot.value?.id === id) {
          currentRobot.value = null;
        }
        return true;
      } else {
        error.value = response.message || '删除机器人失败';
        return false;
      }
    } catch (e) {
      error.value = '网络错误';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    robots,
    currentRobot,
    loading,
    error,
    // Getters
    robotCount,
    onlineRobots,
    onlineRobotCount,
    offlineRobots,
    chargingRobots,
    errorRobots,
    getRobotById,
    robotsByStatus,
    // Actions
    fetchRobots,
    fetchRobotById,
    createRobot,
    updateRobot,
    deleteRobot,
    clearError,
  };
});