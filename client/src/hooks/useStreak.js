import { useEffect, useState } from 'react';
import { api } from '../api';

// Tải lại streak mỗi khi đổi trang (sau khi học xong game, streak có thể tăng)
export function useStreak(dep) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    api('/activity/streak')
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [dep]);
  return data;
}
