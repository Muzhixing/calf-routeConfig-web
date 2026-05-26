/**
 * 告警状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Alarm, AlarmStatus, AlarmLevel } from '../types';
import * as api from '../services/api';
import { useAuthStore } from './auth';

export const useAlarmStore = defineStore('alarm', () => {
  // State
  const alarms = ref<Alarm[]>([]);
  const currentAlarm = ref<Alarm | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const alarmCount = computed(() => alarms.value.length);
  
  const pendingAlarms = computed(() => 
    alarms.value.filter(a => a.status === 'pending')
  );
  const pendingAlarmCount = computed(() => pendingAlarms.value.length);
  
  const confirmedAlarms = computed(() => 
    alarms.value.filter(a => a.status === 'confirmed')
  );
  
  const resolvedAlarms = computed(() => 
    alarms.value.filter(a => a.status === 'resolved')
  );

  const criticalAlarms = computed(() => 
    alarms.value.filter(a => a.level === 'critical' && a.status !== 'resolved')
  );
  const criticalAlarmCount = computed(() => criticalAlarms.value.length);
  
  const warningAlarms = computed(() => 
    alarms.value.filter(a => a.level === 'warning' && a.status !== 'resolved')
  );

  const normalAlarms = computed(() => 
    alarms.value.filter(a => a.level === 'normal' && a.status !== 'resolved')
  );

  const getAlarmById = computed(() => (id: string) => 
    alarms.value.find(a => a.id === id)
  );

  const alarmsByStatus = computed(() => (status: AlarmStatus) =>
    alarms.value.filter(a => a.status === status)
  );

  const alarmsByLevel = computed(() => (level: AlarmLevel) =>
    alarms.value.filter(a => a.level === level)
  );

  const alarmsByRobot = computed(() => (robotId: string) =>
    alarms.value.filter(a => a.robotId === robotId)
  );

  // Actions
  async function fetchAlarms(): Promise<void> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getAlarms();
      if (response.code === 200) {
        alarms.value = response.data;
      } else {
        error.value = response.message || '获取告警列表失败';
      }
    } catch (e) {
      error.value = '网络错误';
    } finally {
      loading.value = false;
    }
  }

  async function fetchAlarmById(id: string): Promise<Alarm | null> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getAlarmByIdApi(id);
      if (response.code === 200) {
        currentAlarm.value = response.data;
        return response.data;
      } else {
        error.value = response.message || '获取告警详情失败';
        return null;
      }
    } catch (e) {
      error.value = '网络错误';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function confirmAlarm(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const authStore = useAuthStore();
      const userId = authStore.user?.id || 'unknown';
      const response = await api.confirmAlarm(id, userId);
      if (response.code === 200) {
        const index = alarms.value.findIndex(a => a.id === id);
        if (index >= 0) {
          alarms.value[index] = response.data;
        }
        if (currentAlarm.value?.id === id) {
          currentAlarm.value = response.data;
        }
        return true;
      } else {
        error.value = response.message || '确认告警失败';
        return false;
      }
    } catch (e) {
      error.value = '网络错误';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function resolveAlarm(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.resolveAlarm(id);
      if (response.code === 200) {
        const index = alarms.value.findIndex(a => a.id === id);
        if (index >= 0) {
          alarms.value[index] = response.data;
        }
        if (currentAlarm.value?.id === id) {
          currentAlarm.value = response.data;
        }
        return true;
      } else {
        error.value = response.message || '解决告警失败';
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
    alarms,
    currentAlarm,
    loading,
    error,
    // Getters
    alarmCount,
    pendingAlarms,
    pendingAlarmCount,
    confirmedAlarms,
    resolvedAlarms,
    criticalAlarms,
    criticalAlarmCount,
    warningAlarms,
    normalAlarms,
    getAlarmById,
    alarmsByStatus,
    alarmsByLevel,
    alarmsByRobot,
    // Actions
    fetchAlarms,
    fetchAlarmById,
    confirmAlarm,
    resolveAlarm,
    clearError,
  };
});