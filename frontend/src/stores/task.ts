/**
 * 任务状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Task, TaskStatus } from '../types';
import * as api from '../services/api';

export const useTaskStore = defineStore('task', () => {
  // State
  const tasks = ref<Task[]>([]);
  const currentTask = ref<Task | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const taskCount = computed(() => tasks.value.length);
  
  const pendingTasks = computed(() => 
    tasks.value.filter(t => t.status === 'pending')
  );
  const pendingTaskCount = computed(() => pendingTasks.value.length);
  
  const runningTasks = computed(() => 
    tasks.value.filter(t => t.status === 'running')
  );
  
  const completedTasks = computed(() => 
    tasks.value.filter(t => t.status === 'completed')
  );
  
  const failedTasks = computed(() => 
    tasks.value.filter(t => t.status === 'failed')
  );

  const getTaskById = computed(() => (id: string) => 
    tasks.value.find(t => t.id === id)
  );

  const tasksByStatus = computed(() => (status: TaskStatus) =>
    tasks.value.filter(t => t.status === status)
  );

  const tasksByRobot = computed(() => (robotId: string) =>
    tasks.value.filter(t => t.robotId === robotId)
  );

  // Actions
  async function fetchTasks(): Promise<void> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getTasks();
      if (response.code === 200) {
        tasks.value = response.data;
      } else {
        error.value = response.message || '获取任务列表失败';
      }
    } catch (e) {
      error.value = '网络错误';
    } finally {
      loading.value = false;
    }
  }

  async function fetchTaskById(id: string): Promise<Task | null> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getTaskByIdApi(id);
      if (response.code === 200) {
        currentTask.value = response.data;
        return response.data;
      } else {
        error.value = response.message || '获取任务详情失败';
        return null;
      }
    } catch (e) {
      error.value = '网络错误';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.createTask(task);
      if (response.code === 200) {
        tasks.value.push(response.data);
        return response.data;
      } else {
        error.value = response.message || '创建任务失败';
        return null;
      }
    } catch (e) {
      error.value = '网络错误';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateTask(id: string, data: Partial<Task>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.updateTask(id, data);
      if (response.code === 200) {
        const index = tasks.value.findIndex(t => t.id === id);
        if (index >= 0) {
          tasks.value[index] = response.data;
        }
        if (currentTask.value?.id === id) {
          currentTask.value = response.data;
        }
        return true;
      } else {
        error.value = response.message || '更新任务失败';
        return false;
      }
    } catch (e) {
      error.value = '网络错误';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deleteTask(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.deleteTask(id);
      if (response.code === 200) {
        const index = tasks.value.findIndex(t => t.id === id);
        if (index >= 0) {
          tasks.value.splice(index, 1);
        }
        if (currentTask.value?.id === id) {
          currentTask.value = null;
        }
        return true;
      } else {
        error.value = response.message || '删除任务失败';
        return false;
      }
    } catch (e) {
      error.value = '网络错误';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function startTask(id: string): Promise<boolean> {
    return updateTask(id, { status: 'running', executedAt: new Date().toISOString() });
  }

  async function pauseTask(id: string): Promise<boolean> {
    return updateTask(id, { status: 'paused' });
  }

  async function cancelTask(id: string): Promise<boolean> {
    return updateTask(id, { status: 'cancelled' });
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    tasks,
    currentTask,
    loading,
    error,
    // Getters
    taskCount,
    pendingTasks,
    pendingTaskCount,
    runningTasks,
    completedTasks,
    failedTasks,
    getTaskById,
    tasksByStatus,
    tasksByRobot,
    // Actions
    fetchTasks,
    fetchTaskById,
    createTask,
    updateTask,
    deleteTask,
    startTask,
    pauseTask,
    cancelTask,
    clearError,
  };
});