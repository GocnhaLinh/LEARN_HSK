export const DAYS_VI = [
  'CHỦ NHẬT',
  'THỨ HAI',
  'THỨ BA',
  'THỨ TƯ',
  'THỨ NĂM',
  'THỨ SÁU',
  'THỨ BẢY',
] as const;

export const SHORT_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
export const WEEKLY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'HN'] as const;

export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatClock(now: Date): { dateStr: string; timeStr: string } {
  const dateStr = `${DAYS_VI[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} THÁNG ${String(now.getMonth() + 1).padStart(2, '0')}, ${now.getFullYear()}`;
  const timeStr = now.toTimeString().slice(0, 8);
  return { dateStr, timeStr };
}
