interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export class Cache {
  private readonly store = new Map<string, CacheEntry>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSecs: number): void {
    this.store.set(key, {
      expiresAt: Date.now() + ttlSecs * 1000,
      value,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }
}
