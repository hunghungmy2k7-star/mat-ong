import { useEffect, useMemo, useState } from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import { Global } from '@emotion/react';
import { useAuth } from '../auth/AuthContext';

// Giao diện mùa: đổi màu thanh bên, card chuỗi ngày và thêm hiệu ứng rơi.
const THEMES = {
  autumn: {
    sidebar: 'linear-gradient(180deg, #FFF7ED 0%, #FDE68A 100%)',
    streak: 'linear-gradient(135deg, #D97706, #9A3412)', streakShadow: '#7C2D12',
    particles: ['🍁', '🍂', '🍁'],
  },
  winter: {
    sidebar: 'linear-gradient(180deg, #F0F9FF 0%, #DBEAFE 100%)',
    streak: 'linear-gradient(135deg, #38BDF8, #6366F1)', streakShadow: '#4338CA',
    particles: ['❄', '❅', '❆'], color: '#93C5FD',
  },
  christmas: {
    sidebar: 'linear-gradient(180deg, #FAF9F6 0%, #E8EFE3 100%)',
    streak: 'linear-gradient(135deg, #DC2626, #991B1B)', streakShadow: '#7F1D1D',
    particles: ['●'], color: '#FFFFFF', dot: true,
  },
  tet: {
    sidebar: 'linear-gradient(180deg, #FFF7ED 0%, #FEE2E2 100%)',
    streak: 'linear-gradient(135deg, #EF4444, #B91C1C)', streakShadow: '#7F1D1D',
    particles: ['🌼', '🏮', '🌼'],
  },
  summer: {
    sidebar: 'linear-gradient(180deg, #ECFEFF 0%, #FEF9C3 100%)',
    streak: 'linear-gradient(135deg, #06B6D4, #0EA5E9)', streakShadow: '#0369A1',
    particles: ['🫧', '☀️', '🫧'],
  },
};

function Particles({ theme }) {
  const conf = THEMES[theme];
  const flakes = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    left: (i * 53) % 100,
    delay: -((i * 1.7) % 12),
    dur: 9 + ((i * 7) % 8),
    size: conf.dot ? 8 + ((i * 5) % 12) : 14 + ((i * 3) % 10),
    ch: conf.particles[i % conf.particles.length],
  })), [conf]);
  return (
    <Box position="fixed" inset={0} pointerEvents="none" zIndex={5} overflow="hidden" aria-hidden="true" data-testid={`particles-${theme}`}
      sx={{
        '@keyframes moFall': { from: { transform: 'translate3d(0,-40px,0) rotate(0deg)' }, to: { transform: 'translate3d(30px,105vh,0) rotate(220deg)' } },
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
      }}>
      {flakes.map((f, i) => (
        <Box key={i} position="absolute" top={0} left={`${f.left}%`} fontSize={`${f.size}px`} lineHeight={1}
          color={conf.color} opacity={0.75}
          style={{ animation: `moFall ${f.dur}s linear ${f.delay}s infinite`, textShadow: conf.dot ? '0 0 4px rgba(0,0,0,.15)' : undefined }}>
          {f.ch}
        </Box>
      ))}
    </Box>
  );
}

function MemeHost({ correctSrc, wrongSrc }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    let t;
    const on = (e) => {
      const src = e.detail.correct ? correctSrc : wrongSrc;
      if (!src) return;
      clearTimeout(t);
      setShown({ src, key: Date.now(), correct: e.detail.correct });
      t = setTimeout(() => setShown(null), 1600);
    };
    window.addEventListener('matong:meme', on);
    return () => { window.removeEventListener('matong:meme', on); clearTimeout(t); };
  }, [correctSrc, wrongSrc]);
  if (!shown) return null;
  return (
    <Box key={shown.key} position="fixed" top="18%" left="50%" zIndex={60} pointerEvents="none"
      w={{ base: '180px', md: '240px' }} borderRadius="24px" overflow="hidden" bg="white"
      border="3px solid" borderColor={shown.correct ? '#23AC38' : '#EF5350'} boxShadow="0 10px 30px rgba(0,0,0,.25)"
      data-testid={shown.correct ? 'meme-correct' : 'meme-wrong'}
      sx={{ transform: 'translateX(-50%)', animation: 'moMeme 1.6s ease forwards',
        '@keyframes moMeme': {
          '0%': { opacity: 0, transform: 'translateX(-50%) scale(.6)' },
          '12%': { opacity: 1, transform: 'translateX(-50%) scale(1.05)' },
          '20%': { transform: 'translateX(-50%) scale(1)' },
          '85%': { opacity: 1 },
          '100%': { opacity: 0, transform: 'translateX(-50%) translateY(-10px)' },
        } }}>
      <Box as="img" src={shown.src} alt="" w="100%" display="block" />
    </Box>
  );
}

/** Áp vật phẩm đang dùng lên toàn site: data-theme-style, hình nền, hiệu ứng mùa */
export default function Cosmetics() {
  const { user } = useAuth();
  const { colorMode } = useColorMode();
  const cos = user?.cosmetics || {};
  const theme = THEMES[cos.theme] ? cos.theme : null;

  useEffect(() => {
    const el = document.documentElement;
    if (theme) el.setAttribute('data-theme-style', theme);
    else el.removeAttribute('data-theme-style');
    return () => el.removeAttribute('data-theme-style');
  }, [theme]);

  const wp = cos.wallpaper;
  const wallpaperBg = wp?.image ? `center / cover no-repeat url(${wp.image})` : wp?.css || null;

  return (
    <>
      {theme && colorMode === 'light' && (
        <Global styles={{
          '.mo-sidebar': { background: `${THEMES[theme].sidebar} !important` },
          '.mo-streak-card': { background: `${THEMES[theme].streak} !important`, boxShadow: `0 4px 0 0 ${THEMES[theme].streakShadow} !important` },
        }} />
      )}
      {theme && colorMode === 'dark' && (
        <Global styles={{ '.mo-streak-card': { background: `${THEMES[theme].streak} !important`, boxShadow: `0 4px 0 0 ${THEMES[theme].streakShadow} !important` } }} />
      )}
      {wallpaperBg && (
        <Box position="fixed" inset={0} zIndex={-1} style={{ background: wallpaperBg }} data-testid="wallpaper">
          {colorMode === 'dark' && <Box position="absolute" inset={0} bg="blackAlpha.700" />}
        </Box>
      )}
      {wallpaperBg && <Global styles={{ body: { background: 'transparent !important' } }} />}
      {theme && <Particles theme={theme} />}
      <MemeHost correctSrc={cos.memeCorrect} wrongSrc={cos.memeWrong} />
    </>
  );
}
