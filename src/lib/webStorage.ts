/*
╔══════════════════════════════════════════════════════════════════╗
║  JNK GENERAL TRADING LLC - Sales & Inventory Management System      ║
║                                                                  ║
║  Crafted with Excellence by: MAZHAR RONY                     ║
║  "Building tomorrow's business solutions today"               ║
║                                                                  ║
║  Connect: hello@meetmazhar.site | Portfolio: www.meetmazhar.site  ║
╚══════════════════════════════════════════════════════════════════╝
*/

import { useState, useEffect } from 'react';

export class WebStorageService {
  private static instance: WebStorageService;

  static getInstance(): WebStorageService {
    if (!WebStorageService.instance) {
      WebStorageService.instance = new WebStorageService();
    }
    return WebStorageService.instance;
  }

  isElectron(): boolean {
    return false; // Always false for web version
  }

  async saveData(key: string, data: unknown): Promise<{ success: boolean; error?: string }> {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(`jnk_nutrition_${key}`, jsonData);
      return { success: true };
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async loadData(key: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const jsonData = localStorage.getItem(`jnk_nutrition_${key}`);
      if (jsonData) {
        const data = JSON.parse(jsonData);
        return { success: true, data };
      }
      return { success: true, data: null };
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getAllStoredData(): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const allData: Record<string, unknown> = {};
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        if (key.startsWith('jnk_nutrition_')) {
          const cleanKey = key.replace('jnk_nutrition_', '');
          const value = localStorage.getItem(key);
          if (value) {
            try {
              allData[cleanKey] = JSON.parse(value);
            } catch {
              allData[cleanKey] = value;
            }
          }
        }
      }
      
      return { success: true, data: allData };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getUserDataPath(): Promise<string> {
    return 'localStorage'; // For web, just return a placeholder
  }

  getSystemInfo() {
    return {
      version: '1.2.0',
      platform: 'web',
      storage: 'localStorage'
    };
  }
}

// Hook for using web storage
export function useWebStorage<T>(key: string, defaultValue: T): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(defaultValue);
  const storage = WebStorageService.getInstance();

  useEffect(() => {
    const loadInitialValue = async () => {
      const result = await storage.loadData(key);
      if (result.success && result.data !== null) {
        setValue(result.data);
      }
    };
    loadInitialValue();
  }, [key]);

  const updateValue = async (newValue: T) => {
    setValue(newValue);
    await storage.saveData(key, newValue);
  };

  return [value, updateValue];
}

export default WebStorageService;