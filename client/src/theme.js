import { extendTheme } from '@chakra-ui/react';

// Design tokens đo từ site mẫu (xem claude/luyentu-phan-tich.md, mục 8).
export const C = {
  green: '#23AC38',
  greenDark: '#1F8F31',
  blue: '#1CB0F6',
  blueDark: '#1899D6',
  orange: '#FF9600',
  orangeDark: '#EA7E00',
  purple: '#CE82FF',
  purpleDark: '#A855F7',
  violet: '#7C3AED',
  yellow: '#FFC800',
  yellowDark: '#E6B400',
  red: '#FF4B4B',
  text: '#1A202C',
  textMuted: '#718096',
  textSoft: '#6B6B6B',
  border: '#E5E5E5',
};

// Shadow đặc kiểu 3D: 0 4px 0 <màu đậm>
export const solid = (color, y = 4) => `0 ${y}px 0 0 ${color}`;

const theme = extendTheme({
  config: { initialColorMode: 'light', useSystemColorMode: false },
  fonts: {
    heading: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
    body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
  },
  semanticTokens: {
    colors: {
      'app.bg': { default: '#F7FAFC', _dark: '#171923' },
      'app.panel': { default: '#FFFFFF', _dark: '#1A1A1A' },
      'app.card': { default: '#FFFFFF', _dark: '#1A202C' },
      'app.line': { default: '#E5E5E5', _dark: '#3C3C3C' },
      'app.text': { default: '#1A202C', _dark: '#FFFFFF' },
      'app.muted': { default: '#718096', _dark: '#A0AEC0' },
      'app.soft': { default: '#6B6B6B', _dark: '#A0AEC0' },
      'app.cell': { default: '#F8F8F8', _dark: '#2D3748' },
    },
  },
  styles: {
    global: {
      body: { bg: 'app.bg', color: 'app.text' },
    },
  },
});

export default theme;
