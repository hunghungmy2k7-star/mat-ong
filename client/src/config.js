// Cấu hình qua file client/.env (xem .env.example)
export const BRAND = 'Mật Ong';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const COMMUNITY = {
  facebook: import.meta.env.VITE_COMMUNITY_FACEBOOK || '',
  zalo: import.meta.env.VITE_COMMUNITY_ZALO || '',
};
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';
