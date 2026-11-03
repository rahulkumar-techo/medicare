import { StorageAdapter } from './storage.interface';

class LocalStorageAdapterImpl implements StorageAdapter {
  private memoryStore: Map<string, string> = new Map();
  private cache: Map<string, unknown> = new Map();
  private subscribers: Map<string, Set<(newValue: unknown) => void>> = new Map();

  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private clone<T>(val: T): T {
    if (val === null || val === undefined) return val;
    if (typeof structuredClone === 'function') {
      return structuredClone(val);
    }
    return JSON.parse(JSON.stringify(val)) as T;
  }

  getItem<T>(key: string, defaultValue: T): T {
    if (this.cache.has(key)) {
      return this.clone(this.cache.get(key) as T);
    }

    try {
      if (this.isClient()) {
        const item = window.localStorage.getItem(key);
        if (item === null) {
          this.cache.set(key, this.clone(defaultValue));
          return defaultValue;
        }
        const parsed = JSON.parse(item) as T;
        this.cache.set(key, parsed);
        return this.clone(parsed);
      } else {
        const item = this.memoryStore.get(key);
        if (!item) {
          this.cache.set(key, this.clone(defaultValue));
          return defaultValue;
        }
        const parsed = JSON.parse(item) as T;
        this.cache.set(key, parsed);
        return this.clone(parsed);
      }
    } catch (error) {
      console.warn(`[LocalStorageAdapter] Error reading key "${key}":`, error);
      return defaultValue;
    }
  }

  setItem<T>(key: string, value: T): boolean {
    try {
      this.cache.set(key, this.clone(value));
      const serialized = JSON.stringify(value);
      if (this.isClient()) {
        window.localStorage.setItem(key, serialized);
      } else {
        this.memoryStore.set(key, serialized);
      }
      this.notifySubscribers(key, value);
      return true;
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error saving key "${key}":`, error);
      return false;
    }
  }

  removeItem(key: string): boolean {
    try {
      this.cache.delete(key);
      if (this.isClient()) {
        window.localStorage.removeItem(key);
      } else {
        this.memoryStore.delete(key);
      }
      this.notifySubscribers(key, null);
      return true;
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error removing key "${key}":`, error);
      return false;
    }
  }

  clear(): boolean {
    try {
      this.cache.clear();
      if (this.isClient()) {
        window.localStorage.clear();
      } else {
        this.memoryStore.clear();
      }
      this.subscribers.forEach((callbacks, key) => {
        callbacks.forEach((cb) => cb(null));
      });
      return true;
    } catch (error) {
      console.error('[LocalStorageAdapter] Error clearing storage:', error);
      return false;
    }
  }

  subscribe(key: string, callback: (newValue: unknown) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    const set = this.subscribers.get(key)!;
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  notifySubscribers(key: string, value: unknown): void {
    const set = this.subscribers.get(key);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(value);
        } catch (e) {
          console.error(`[LocalStorageAdapter] Subscriber error on key ${key}:`, e);
        }
      });
    }
  }
}

export const localStorageAdapter = new LocalStorageAdapterImpl();
