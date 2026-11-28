export const APP_STORAGE_KEY = 'hsk_quest_30_clean_v4';

export function readAppCache(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function readAppCacheArray<T>(field: string): T[] | undefined {
  const parsed = readAppCache();
  const value = parsed?.[field];
  return Array.isArray(value) ? (value as T[]) : undefined;
}
