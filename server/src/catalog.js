// Danh mục vật phẩm (giá tính bằng xu kiếm được khi học – không có thanh toán tiền thật)
export const CATALOG = [
  { id: 'avatar-upload', type: 'avatar', name: 'Ảnh đại diện tự upload', price: 10000, upload: true, changeCost: 5000 },
  { id: 'avatar-to-ong', type: 'avatar', name: 'Tổ ong', price: 0, asset: '/shop/to-ong.svg' },
  { id: 'avatar-hoa', type: 'avatar', name: 'Hoa hướng dương', price: 1000, asset: '/shop/hoa-huong-duong.svg' },
  { id: 'avatar-rung', type: 'avatar', name: 'Rừng thông', price: 2000, asset: '/shop/rung-thong.svg' },
  { id: 'avatar-meo', type: 'avatar', name: 'Mèo ngủ trưa', price: 3000, asset: '/shop/meo-ngu.svg' },
  { id: 'avatar-nui', type: 'avatar', name: 'Núi tuyết', price: 3000, asset: '/shop/nui-tuyet.svg' },
  { id: 'avatar-bien', type: 'avatar', name: 'Biển đêm', price: 5000, asset: '/shop/bien-dem.svg' },
  { id: 'avatar-pho', type: 'avatar', name: 'Thành phố hoàng hôn', price: 5000, asset: '/shop/thanh-pho.svg' },
  { id: 'avatar-vutru', type: 'avatar', name: 'Vũ trụ', price: 8000, asset: '/shop/vu-tru.svg' },

  { id: 'wall-upload', type: 'wallpaper', name: 'Hình nền tự upload', price: 20000, upload: true, changeCost: 5000 },
  { id: 'wall-sky', type: 'wallpaper', name: 'Bầu trời mới', price: 1000, css: 'linear-gradient(180deg, #E0F2FE 0%, #F7FAFC 60%)' },
  { id: 'wall-honey', type: 'wallpaper', name: 'Mật ngọt', price: 2000, css: 'radial-gradient(circle at 20% 10%, #FEF3C7 0, transparent 40%), radial-gradient(circle at 90% 80%, #FDE68A 0, transparent 35%), #FFFBEB' },
  { id: 'wall-dots', type: 'wallpaper', name: 'Chấm bi', price: 3000, css: 'radial-gradient(#E9D5FF 2px, transparent 2px) 0 0/22px 22px, #FAF5FF' },
  { id: 'wall-paper', type: 'wallpaper', name: 'Giấy kẻ ô', price: 3000, css: 'linear-gradient(#E2E8F0 1px, transparent 1px) 0 0/24px 24px, linear-gradient(90deg, #E2E8F0 1px, transparent 1px) 0 0/24px 24px, #FFFFFF' },
  { id: 'wall-leaf', type: 'wallpaper', name: 'Lá xanh', price: 5000, css: 'linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 50%, #ECFCCB 100%)' },
  { id: 'wall-sunset', type: 'wallpaper', name: 'Hoàng hôn', price: 7000, css: 'linear-gradient(180deg, #FFEDD5 0%, #FCE7F3 50%, #EDE9FE 100%)' },

  { id: 'meme-ong-like', type: 'memeCorrect', name: 'Ong khen ngợi', label: 'MEME ĐÚNG', price: 3000, asset: '/shop/meme-ong-like.svg' },
  { id: 'meme-meo-vui', type: 'memeCorrect', name: 'Mèo ăn mừng', label: 'MEME ĐÚNG', price: 5000, asset: '/shop/meme-meo-vui.svg' },
  { id: 'meme-cho-vui', type: 'memeCorrect', name: 'Cún vui vẻ', label: 'MEME ĐÚNG', price: 5000, asset: '/shop/meme-cho-vui.svg' },
  { id: 'meme-meo-hoi', type: 'memeWrong', name: 'Mèo chấm hỏi', label: 'MEME SAI', price: 3000, asset: '/shop/meme-meo-hoi.svg' },
  { id: 'meme-cho-nghi', type: 'memeWrong', name: 'Cún nghi ngờ', label: 'MEME SAI', price: 5000, asset: '/shop/meme-cho-nghi.svg' },
  { id: 'meme-ong-buon', type: 'memeWrong', name: 'Ong động viên', label: 'MEME SAI', price: 5000, asset: '/shop/meme-ong-buon.svg' },

  { id: 'streak-freeze', type: 'consumable', name: 'Đá streak', label: 'ĐẶC BIỆT', emoji: '❄️', price: 2000,
    description: 'Thêm 1 hoạt động vào ngày không có hoạt động gần nhất (14 ngày qua)' },

  { id: 'theme-autumn', type: 'theme', name: 'Giao diện Mùa thu', label: 'GIAO DIỆN', emoji: '🍁🍂', price: 20000, description: 'Vàng mù tạt, đất nung và lá phong rơi.' },
  { id: 'theme-winter', type: 'theme', name: 'Giao diện Mùa đông', label: 'GIAO DIỆN', emoji: '☃️❄️', price: 30000, description: 'Tuyết rơi, thẻ và thanh bên chuyển tông băng giá.' },
  { id: 'theme-christmas', type: 'theme', name: 'Giao diện Giáng sinh', label: 'GIAO DIỆN', emoji: '🎅🎄', price: 30000, description: 'Xanh thông, đỏ nhựa ruồi và tuyết trắng.' },
  { id: 'theme-tet', type: 'theme', name: 'Giao diện Tết', label: 'GIAO DIỆN', emoji: '🧧🏮🌼', price: 50000, description: 'Đỏ son, vàng kim và hoa mai rơi khắp trang.' },
  { id: 'theme-summer', type: 'theme', name: 'Giao diện Mùa hè', label: 'GIAO DIỆN', emoji: '🏖️☀️', price: 50000, description: 'Biển xanh ngọc, cát vàng và bong bóng nước.' },
];

const byId = new Map(CATALOG.map((it) => [it.id, it]));

/** Vật phẩm đang dùng → dữ liệu hiển thị cho client (ảnh đại diện, hình nền, meme, giao diện) */
export function resolveCosmetics(settings = {}) {
  const eq = settings.equipped || {};
  const up = settings.uploads || {};
  const val = (type) => {
    const it = byId.get(eq[type]);
    if (!it || it.type !== type) return null;
    if (it.upload) return up[it.id] ? { image: up[it.id] } : null;
    return it.asset ? { image: it.asset } : it.css ? { css: it.css } : { id: it.id };
  };
  const theme = byId.get(eq.theme);
  return {
    avatar: val('avatar')?.image || null,
    wallpaper: val('wallpaper'),
    memeCorrect: val('memeCorrect')?.image || null,
    memeWrong: val('memeWrong')?.image || null,
    theme: theme?.type === 'theme' ? theme.id.replace('theme-', '') : null,
  };
}

export const avatarOf = (u) => {
  try { return resolveCosmetics(JSON.parse(u.settings_json || '{}')).avatar || u.avatar_url || null; } catch { return u.avatar_url || null; }
};
