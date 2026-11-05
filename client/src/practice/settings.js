import { useCallback, useState } from 'react';

const KEY = 'matong.gameSettings';
export const MIN_DELAY = 3;
/** Thời gian dừng lại sau mỗi câu trước khi sang từ khác (ms), áp dụng cho mọi dạng bài */
export const waitMs = (settings) => Math.max(MIN_DELAY, Number(settings?.autoDelay) || 4) * 1000;
export const DEFAULT_SETTINGS = {
  soundOn: true,
  volume: 70,
  coinSound: true,
  questionTime: 30, // giây – áp dụng cho Gõ từ, Nghe viết, Trắc nghiệm, Nối từ
  autoNext: true,
  autoDelay: 4, // giây chờ trước khi tự chuyển câu (tối thiểu MIN_DELAY)
};

function read() {
  try {
    const s = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    return { ...s, autoDelay: Math.max(MIN_DELAY, Number(s.autoDelay) || DEFAULT_SETTINGS.autoDelay) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useGameSettings() {
  const [settings, setSettings] = useState(read);
  const update = useCallback((patch) => {
    setSettings((s) => {
      const next = patch === null ? { ...DEFAULT_SETTINGS } : { ...s, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* trình duyệt chặn lưu trữ: vẫn dùng trong phiên */
      }
      return next;
    });
  }, []);
  return [settings, update];
}
