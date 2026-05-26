/**
 * 地图状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MapElement, Cow, GridPosition, MapElementType } from '../types';
import * as api from '../services/api';

export const useMapStore = defineStore('map', () => {
  // State
  const mapElements = ref<MapElement[]>([]);
  const cows = ref<Cow[]>([]);
  const viewCenter = ref<GridPosition>({ x: 0, y: 0 });
  const zoomLevel = ref(1);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const waterTroughs = computed(() => 
    mapElements.value.filter(e => e.type === 'water_trough')
  );
  
  const fences = computed(() => 
    mapElements.value.filter(e => e.type === 'fence')
  );
  
  const cowAreas = computed(() => 
    mapElements.value.filter(e => e.type === 'cow_area')
  );
  
  const robotAreas = computed(() => 
    mapElements.value.filter(e => e.type === 'robot_area')
  );
  
  const obstacles = computed(() => 
    mapElements.value.filter(e => e.type === 'obstacle')
  );

  const elementsByType = computed(() => (type: MapElementType) =>
    mapElements.value.filter(e => e.type === type)
  );

  const cowCount = computed(() => cows.value.length);

  const cowsByArea = computed(() => (areaId: string) =>
    cows.value.filter(c => c.areaId === areaId)
  );

  // Actions
  async function fetchMapElements(): Promise<void> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getMapElements();
      if (response.code === 200) {
        mapElements.value = response.data;
      } else {
        error.value = response.message || '获取地图元素失败';
      }
    } catch (e) {
      error.value = '网络错误';
    } finally {
      loading.value = false;
    }
  }

  async function fetchCows(): Promise<void> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.getCows();
      if (response.code === 200) {
        cows.value = response.data;
      } else {
        error.value = response.message || '获取奶牛列表失败';
      }
    } catch (e) {
      error.value = '网络错误';
    } finally {
      loading.value = false;
    }
  }

  async function createMapElement(element: Omit<MapElement, 'id'>): Promise<MapElement | null> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.createMapElement(element);
      if (response.code === 200) {
        mapElements.value.push(response.data);
        return response.data;
      } else {
        error.value = response.message || '创建地图元素失败';
        return null;
      }
    } catch (e) {
      error.value = '网络错误';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function deleteMapElement(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.deleteMapElement(id);
      if (response.code === 200) {
        const index = mapElements.value.findIndex(e => e.id === id);
        if (index >= 0) {
          mapElements.value.splice(index, 1);
        }
        return true;
      } else {
        error.value = response.message || '删除地图元素失败';
        return false;
      }
    } catch (e) {
      error.value = '网络错误';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updateCowPosition(id: string, position: GridPosition): Promise<boolean> {
    try {
      const response = await api.updateCowPosition(id, position);
      if (response.code === 200) {
        const index = cows.value.findIndex(c => c.id === id);
        if (index >= 0) {
          cows.value[index] = response.data;
        }
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function setViewCenter(position: GridPosition): void {
    viewCenter.value = position;
  }

  function setZoomLevel(level: number): void {
    zoomLevel.value = Math.max(0.1, Math.min(3, level));
  }

  function clearError(): void {
    error.value = null;
  }

  return {
    // State
    mapElements,
    cows,
    viewCenter,
    zoomLevel,
    loading,
    error,
    // Getters
    waterTroughs,
    fences,
    cowAreas,
    robotAreas,
    obstacles,
    elementsByType,
    cowCount,
    cowsByArea,
    // Actions
    fetchMapElements,
    fetchCows,
    createMapElement,
    deleteMapElement,
    updateCowPosition,
    setViewCenter,
    setZoomLevel,
    clearError,
  };
});