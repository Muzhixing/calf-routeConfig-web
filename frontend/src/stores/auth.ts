/**
 * 认证状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, LoginRequest } from '../types';
import * as api from '../services/api';
import { getItem, setItem, removeItem, StorageKeys } from '../utils/storage';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(getItem<User>(StorageKeys.USER) || null);
  const token = ref<string | undefined>(getItem<string>(StorageKeys.TOKEN));
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isFeeder = computed(() => user.value?.role === 'feeder');
  const isGuest = computed(() => user.value?.role === 'guest');
  const userRole = computed(() => user.value?.role);

  // Actions
  async function login(credentials: LoginRequest): Promise<boolean> {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.login(credentials);
      if (response.code === 200) {
        token.value = response.data.token;
        user.value = response.data.user;
        setItem(StorageKeys.TOKEN, response.data.token);
        setItem(StorageKeys.USER, response.data.user);
        return true;
      } else {
        error.value = response.message || '登录失败';
        return false;
      }
    } catch (e) {
      error.value = '网络错误';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await api.logout();
    } catch (e) {
      // 忽略登出错误
    } finally {
      token.value = undefined;
      user.value = null;
      removeItem(StorageKeys.TOKEN);
      removeItem(StorageKeys.USER);
      loading.value = false;
    }
  }

  async function verifyAuth(): Promise<boolean> {
    if (!token.value) return false;
    
    loading.value = true;
    try {
      const response = await api.verifyToken();
      if (response.code === 200) {
        user.value = response.data;
        setItem(StorageKeys.USER, response.data);
        return true;
      } else {
        await logout();
        return false;
      }
    } catch (e) {
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
    user,
    token,
    loading,
    error,
    // Getters
    isLoggedIn,
    isAdmin,
    isFeeder,
    isGuest,
    userRole,
    // Actions
    login,
    logout,
    verifyAuth,
    clearError,
  };
});