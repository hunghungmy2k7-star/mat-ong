import { FiHome, FiGrid, FiBook, FiPlay, FiShoppingBag, FiAward } from 'react-icons/fi';

// 6 mục sidebar, mỗi mục có màu riêng giống site mẫu
export const NAV_ITEMS = [
  { to: '/home', label: 'Trang chủ', icon: FiHome, color: '#1CB0F6' },
  { to: '/category-list', label: 'Bộ từ vựng', icon: FiGrid, color: '#CE82FF' },
  { to: '/words', label: 'Từ vựng', icon: FiBook, color: '#23AC38' },
  { to: '/practice', label: 'Học từ vựng', icon: FiPlay, color: '#FF9600' },
  { to: '/store', label: 'Cửa hàng', icon: FiShoppingBag, color: '#FFC800' },
  { to: '/leaderboard', label: 'Xếp hạng', icon: FiAward, color: '#FF4B4B' },
];

export const hexAlpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
