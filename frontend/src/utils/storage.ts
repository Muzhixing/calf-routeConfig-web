/**
 * LocalStorage 工具封装
 * 提供类型安全的 JSON 序列化和反序列化
 */

const STORAGE_PREFIX = 'cowfarm_';

/**
 * 设置存储项
 * @param key 存储键（会自动添加前缀）
 * @param value 要存储的值（会被 JSON 序列化）
 */
export function setItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
  } catch (error) {
    console.error(`[Storage] Error setting item "${key}":`, error);
  }
}

/**
 * 获取存储项
 * @param key 存储键（会自动添加前缀）
 * @param defaultValue 默认值（当键不存在时返回）
 * @returns 反序列化后的值或默认值
 */
export function getItem<T>(key: string, defaultValue?: T): T | undefined {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`[Storage] Error getting item "${key}":`, error);
    return defaultValue;
  }
}

/**
 * 移除存储项
 * @param key 存储键（会自动添加前缀）
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.error(`[Storage] Error removing item "${key}":`, error);
  }
}

/**
 * 清空所有应用存储
 */
export function clear(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('[Storage] Error clearing storage:', error);
  }
}

/**
 * 检查存储键是否存在
 * @param key 存储键（会自动添加前缀）
 */
export function hasItem(key: string): boolean {
  return localStorage.getItem(STORAGE_PREFIX + key) !== null;
}

// 常用存储键
export const StorageKeys = {
  TOKEN: 'token',
  USER: 'user',
  REMEMBER_ME: 'remember_me',
  THEME: 'theme',
} as const;