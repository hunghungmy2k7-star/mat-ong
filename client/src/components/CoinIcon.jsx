// Đồng xu vàng (thay cho icon "$" của site mẫu)
export default function CoinIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#FFC800" stroke="#E6A700" strokeWidth="2" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="#E6A700" strokeWidth="1.6" />
      <text x="12" y="15.6" textAnchor="middle" fontSize="10" fontWeight="800" fill="#B7791F" fontFamily="sans-serif">$</text>
    </svg>
  );
}
