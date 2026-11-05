// Mọi "ngày học" tính theo giờ Việt Nam (UTC+7), giống site mẫu.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function vnDay(date = new Date()) {
  return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export function weekdayLabel(day) {
  return WEEKDAY_LABELS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}
