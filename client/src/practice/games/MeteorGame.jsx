import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text, Input, Button, Tooltip } from '@chakra-ui/react';
import { FiHelpCircle } from 'react-icons/fi';
import GameShell from '../GameShell';
import { REWARD, shuffle, normalizeAnswer } from '../utils';
import { playSound } from '../sound';
import { showMeme } from '../meme';
import { speak, speakWord } from '../../speech';
import { useAuth } from '../../auth/AuthContext';

const LIVES = 5;
const MAX_ON_SCREEN = 3;
const SHIPS = [['#38BDF8', 'Xanh'], ['#F472B6', 'Hồng'], ['#FACC15', 'Vàng']];

const pattern = (word, shown) => [...word].map((ch, i) => (/[a-z0-9]/i.test(ch) ? (i < shown ? ch : '_') : ch)).join(' ');

function wrapText(ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export default function MeteorGame({ items, settings, onFinish, onExit, onRestart }) {
  const { user } = useAuth();
  const s = user?.settings || {};
  const queue = useMemo(() => shuffle(items), [items]);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [size, setSize] = useState({ w: 640, h: 480 });
  const [hud, setHud] = useState({ done: 0, lives: LIVES, correct: 0 });
  const [text, setText] = useState('');
  const [miss, setMiss] = useState(false);
  const [ship, setShip] = useState(0);
  const st = useRef({ meteors: [], bullets: [], booms: [], next: 0, spawnIn: 30, lives: LIVES, correct: 0, done: 0, t: 0, stars: [] });
  const results = useRef([]);
  const finished = useRef(false);
  const say = useCallback((w) => speak(w, { voiceURI: s.voiceURI, rate: s.speechRate || 1 }), [s.voiceURI, s.speechRate]);

  useEffect(() => {
    const fit = () => {
      const w = Math.min(760, wrapRef.current?.clientWidth || 640);
      const h = Math.max(360, Math.min(560, window.innerHeight - 300));
      setSize({ w, h });
      st.current.stars = Array.from({ length: 70 }, (_, i) => [((i * 97) % 1000) / 1000 * w, ((i * 61) % 1000) / 1000 * h, (i % 3) + 1]);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish(results.current);
  }, [onFinish]);

  const record = useCallback((m, correct) => {
    const S = st.current;
    m.dead = true;
    results.current.push({ item: m.item, correct });
    S.done += 1;
    if (correct) S.correct += 1; else S.lives -= 1;
    speakWord(m.item.word, s);
    playSound(correct ? 'correct' : 'wrong', settings);
    showMeme(correct);
    setHud({ done: S.done, lives: S.lives, correct: S.correct });
    if (S.lives <= 0 || S.done >= queue.length) setTimeout(finish, 600);
  }, [settings, queue.length, finish, s]);

  // Mục tiêu gợi ý = thiên thạch thấp nhất (sắp chạm đất)
  const lowest = () => st.current.meteors.filter((m) => !m.dead && !m.targeted).sort((a, b) => b.y - a.y)[0];
  const hint = () => {
    const m = lowest();
    if (m) m.shown = Math.min(m.item.word.length, m.shown + 1);
    inputRef.current?.focus();
  };

  const fire = (value) => {
    const v = normalizeAnswer(value);
    if (!v) return false;
    const m = st.current.meteors.find((x) => !x.dead && !x.targeted && normalizeAnswer(x.item.word) === v);
    if (!m) return false;
    m.targeted = true;
    st.current.bullets.push({ x: size.w / 2, y: size.h - 50, target: m });
    setText('');
    return true;
  };

  const onChange = (e) => {
    setText(e.target.value);
    setMiss(false);
    fire(e.target.value);
  };
  const onKeyDown = (e) => {
    if (e.key === ' ' && e.ctrlKey) { e.preventDefault(); hint(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!fire(text)) { setMiss(true); setText(''); }
    }
  };
  const onKeyUp = (e) => {
    if (e.key === 'Control') { const m = lowest(); if (m) say(m.item.word); }
  };

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size.w * dpr;
    cv.height = size.h * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = size.w;
    const H = size.h;
    const groundY = H - 70;
    let raf;
    let last = performance.now();
    const step = (now) => {
      const S = st.current;
      const k = Math.min(3, (now - last) / 16.67);
      last = now;
      S.t += k;
      if (!finished.current) {
        S.spawnIn -= k;
        const alive = S.meteors.filter((m) => !m.dead).length;
        if (S.spawnIn <= 0 && S.next < queue.length && alive < MAX_ON_SCREEN) {
          const item = queue[S.next];
          S.next += 1;
          S.meteors.push({ item, x: 90 + Math.random() * (W - 180), y: -40, vy: (groundY + 40) / (60 * (13 + Math.random() * 4)), shown: 0, r: 46, rot: Math.random() * 6 });
          S.spawnIn = 60 * (alive === 0 ? 1 : 3.2);
        }
        S.meteors.forEach((m) => {
          if (m.dead) return;
          m.y += m.vy * k;
          m.rot += 0.01 * k;
          if (m.y + 20 > groundY && !m.targeted) {
            S.booms.push({ x: m.x, y: groundY, life: 30, color: '#EF4444' });
            record(m, false);
          }
        });
        S.bullets.forEach((b) => {
          const m = b.target;
          const dx = m.x - b.x;
          const dy = m.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < 14) {
            b.hit = true;
            if (!m.dead) { S.booms.push({ x: m.x, y: m.y, life: 30, color: '#FACC15' }); record(m, true); }
          } else { b.x += (dx / d) * 14 * k; b.y += (dy / d) * 14 * k; }
        });
        S.bullets = S.bullets.filter((b) => !b.hit);
        S.meteors = S.meteors.filter((m) => !m.dead);
      }
      // ---- vẽ ----
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0B1026'); g.addColorStop(1, '#312E81');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      S.stars.forEach(([x, y, r]) => { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * r})`; ctx.fillRect(x, (y + S.t * 0.2 * r) % H, r, r); });
      ctx.fillStyle = '#1E1B4B'; ctx.fillRect(0, groundY, W, H - groundY);
      ctx.strokeStyle = '#6366F1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
      S.meteors.forEach((m) => {
        ctx.save(); ctx.translate(m.x, m.y);
        ctx.fillStyle = 'rgba(251,146,60,0.35)';
        ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(0, -m.r - 40); ctx.lineTo(18, -20); ctx.fill();
        ctx.rotate(m.rot);
        ctx.fillStyle = '#78350F'; ctx.strokeStyle = '#B45309'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 9; i += 1) { const a = (i / 9) * Math.PI * 2; const rr = m.r * (0.85 + ((i * 37) % 10) / 60); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 13px system-ui, sans-serif';
        const lines = wrapText(ctx, m.item.meaning, m.r * 2 + 30);
        lines.forEach((ln, i) => ctx.fillText(ln, m.x, m.y - 8 - (lines.length - 1 - i) * 15));
        ctx.font = '700 14px ui-monospace, monospace'; ctx.fillStyle = '#FDE68A';
        ctx.fillText(pattern(m.item.word, m.shown), m.x, m.y + 16);
      });
      S.bullets.forEach((b) => { ctx.fillStyle = SHIPS[ship][0]; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fill(); });
      S.booms = S.booms.filter((b) => b.life > 0);
      S.booms.forEach((b) => {
        b.life -= k;
        ctx.globalAlpha = b.life / 30; ctx.strokeStyle = b.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(b.x, b.y, 50 - b.life, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      });
      // tàu
      const sx = W / 2;
      const sy = H - 38;
      ctx.fillStyle = SHIPS[ship][0];
      ctx.beginPath(); ctx.moveTo(sx, sy - 26); ctx.lineTo(sx + 20, sy + 14); ctx.lineTo(sx, sy + 6); ctx.lineTo(sx - 20, sy + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.moveTo(sx - 7, sy + 10); ctx.lineTo(sx, sy + 22 + Math.sin(S.t / 3) * 4); ctx.lineTo(sx + 7, sy + 10); ctx.fill();
      window.__meteorState = { words: S.meteors.filter((m) => !m.targeted).map((m) => m.item.word), done: S.done };
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size, queue, record, ship]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <GameShell coins={hud.correct * REWARD.meteor} current={hud.done} total={queue.length} label={`🚀 ${hud.done}/${queue.length} · ❤ ${hud.lives}`}
      answered={results.current.length} onRestart={onRestart} onExit={onExit} onEnd={finish} maxW="800px"
      extra={(
        <Flex gap="4px" mr="4px">
          {SHIPS.map(([c, n], i) => (
            <Tooltip key={c} label={`Tàu ${n}`}>
              <Box as="button" type="button" aria-label={`Chọn tàu ${n}`} w="18px" h="18px" borderRadius="full" bg={c}
                border="2px solid" borderColor={ship === i ? '#1A202C' : 'transparent'} onClick={() => setShip(i)} />
            </Tooltip>
          ))}
        </Flex>
      )}>
      <Box ref={wrapRef} maxW="760px" mx="auto">
        <Box borderRadius="20px" overflow="hidden" border="2px solid #1A202C" style={{ width: size.w, height: size.h, maxWidth: '100%' }}
          onPointerDown={() => inputRef.current?.focus()}>
          <canvas ref={canvasRef} style={{ width: size.w, height: size.h, display: 'block' }} data-testid="meteor-canvas" />
        </Box>
        <Flex mt="12px" gap="8px">
          <Input ref={inputRef} h="52px" borderRadius="16px" borderWidth="2px" fontSize="18px" fontWeight={700} bg="app.card"
            borderColor={miss ? '#E53E3E' : 'app.line'} focusBorderColor={miss ? '#E53E3E' : '#1CB0F6'} placeholder="Gõ từ tiếng Anh để bắn..."
            value={text} onChange={onChange} onKeyDown={onKeyDown} onKeyUp={onKeyUp} autoComplete="off" autoCapitalize="none" spellCheck={false}
            data-testid="answer-input" />
          <Button h="52px" borderRadius="16px" leftIcon={<FiHelpCircle />} onClick={hint}>Gợi ý</Button>
        </Flex>
        <Text mt="6px" fontSize="12px" color="app.muted" textAlign="center">⌨ Gõ từ tiếng Anh để bắn · Ctrl+Space: gợi ý · Ctrl: nghe từ</Text>
      </Box>
    </GameShell>
  );
}
