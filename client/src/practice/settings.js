import { useCallback, useState } from 'react';

const KEY = 'matong.gameSettings';
export const DEFAULT_SETTINGS = {
  soundOn: true,
  volume: 70,
  coinSound: true,
  questionTime: 30, // giây – áp dụng cho Gõ từ, Nghe viết, Trắc nghiệm, Nối từ
  autoNext: true,
  autoDelay: 3, // giây chờ trước khi tự chuyển câu
};

function read() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
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
