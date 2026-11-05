import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import GameShell from '../GameShell';
import { REWARD, shuffle } from '../utils';
import { playSound } from '../sound';
import { showMeme } from '../meme';
import { speakWord } from '../../speech';
import { waitMs } from '../settings';
import { useAuth } from '../../auth/AuthContext';

const LIVES = 5;
const GROUND = 56;
const GATE_W = 78;
const GAP = 128;
const BIRD_X = 90;
const BIRD_R = 15;
const GRAVITY = 0.34;
const FLAP = -6.4;
const SPEED = 2.1;

function pickDistractor(item, pool) {
  const c = shuffle(pool.filter((p) => p.id !== item.id && p.word.toLowerCase() !== item.word.toLowerCase()));
  return c[0]?.word || `${item.word.slice(0, -1)}${item.word.endsWith('s') ? 'e' : 's'}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBee(ctx, x, y, vy, t, blink) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.max(-0.5, Math.min(0.8, vy / 10)));
  if (blink) ctx.globalAlpha = 0.45;
  // cánh
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const flap = Math.sin(t / 50) * 4;
  ctx.beginPath(); ctx.ellipse(-4, -14 - flap, 9, 6, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -13 - flap, 8, 5, 0.4, 0, Math.PI * 2); ctx.fill();
  // thân
  ctx.fillStyle = '#FFC800';
  ctx.beginPath(); ctx.ellipse(0, 0, BIRD_R + 3, BIRD_R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1A202C'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1A202C';
  for (const sx of [-8, 0]) { ctx.fillRect(sx - 2, -BIRD_R + 2, 4, BIRD_R * 2 - 4); }
  // mắt + mỏ
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(10, -4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1A202C'; ctx.beginPath(); ctx.arc(11.5, -4, 2.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FF9600'; ctx.beginPath(); ctx.moveTo(17, 1); ctx.lineTo(24, 3); ctx.lineTo(17, 6); ctx.fill();
  ctx.restore();
}

export default function FlappyGame({ items, pool = [], settings, onFinish, onExit, onRestart }) {
  const { user } = useAuth();
  const s = user?.settings || {};
  const questions = useMemo(() => shuffle(items).map((it) => {
    const top = Math.random() < 0.5;
    const other = pickDistractor(it, [...items, ...pool]);
    return { item: it, top: top ? it.word : other, bottom: top ? other : it.word, correctTop: top };
  }), [items, pool]);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 480, h: 600 });
  const [phase, setPhase] = useState('ready'); // ready | playing | over
  const [hud, setHud] = useState({ q: 0, done: 0, lives: LIVES, correct: 0 });
  const [last, setLast] = useState(null); // câu vừa trả lời: hiện đáp án trong lúc chờ cột tiếp theo
  const st = useRef(null);
  const results = useRef([]);
  const finished = useRef(false);

  // Kích thước canvas theo khung nhìn (mobile dọc)
  useEffect(() => {
    const fit = () => {
      const w = Math.min(520, (wrapRef.current?.clientWidth || 480));
      const h = Math.max(420, Math.min(640, window.innerHeight - 230));
      setSize({ w, h });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setPhase('over');
    onFinish(results.current);
  }, [onFinish]);

  const reset = useCallback(() => {
    st.current = {
      y: size.h / 3, vy: 0, t: 0, q: 0, lives: LIVES, correct: 0, inv: 0,
      gate: { x: size.w + 40, resolved: false }, popups: [], clouds: [[60, 70], [260, 40], [420, 110]],
    };
  }, [size]);

  useEffect(() => { reset(); }, [reset]);

  const flap = useCallback(() => {
    if (phase === 'over') return;
    if (phase === 'ready') { setPhase('playing'); }
    if (st.current) st.current.vy = FLAP;
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); flap(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  // Vòng lặp vẽ + vật lý
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !st.current) return undefined;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size.w * dpr;
    cv.height = size.h * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = size.w;
    const H = size.h;
    const playH = H - GROUND;
    const o1 = playH * 0.3;
    const o2 = playH * 0.72;
    let raf;
    let lastT = performance.now();

    const resolve = (correct, msg) => {
      const S = st.current;
      const q = questions[S.q];
      S.gate.resolved = true;
      results.current.push({ item: q.item, correct });
      if (correct) S.correct += 1; else { S.lives -= 1; S.inv = 60; }
      S.popups.push({ x: BIRD_X, y: S.y - 30, text: msg, color: correct ? '#23AC38' : '#E53E3E', life: 60 });
      playSound(correct ? 'correct' : 'wrong', settings);
      showMeme(correct);
      speakWord(q.item.word, s);
      // dừng vài giây (không có cột mới) để người chơi xem đáp án rồi mới sang từ tiếp theo
      S.holdUntil = S.t + waitMs(settings);
      setLast({ item: q.item, ok: correct });
      setHud((h) => ({ ...h, done: h.done + 1, lives: S.lives, correct: S.correct }));
      if (S.lives <= 0 || S.q + 1 >= questions.length) setTimeout(finish, waitMs(settings));
    };

    const step = (now) => {
      const S = st.current;
      const k = Math.min(3, (now - lastT) / 16.67);
      lastT = now;
      S.t += 16.67 * k;
      const q = questions[S.q];
      if (phase === 'playing' && q && !finished.current) {
        S.vy += GRAVITY * k;
        S.y += S.vy * k;
        if (S.gate) S.gate.x -= SPEED * k;
        if (S.inv > 0) S.inv -= k;
        // chạm đất / trần
        if (S.y > playH - BIRD_R) {
          S.y = playH - BIRD_R; S.vy = FLAP;
          if (S.gate && !S.gate.resolved && S.inv <= 0) resolve(false, 'Chạm đất!');
        }
        if (S.y < BIRD_R) { S.y = BIRD_R; S.vy = 0; }
        // va chạm cột khi đang đi qua
        const g = S.gate;
        const inX = g && BIRD_X + BIRD_R > g.x && BIRD_X - BIRD_R < g.x + GATE_W;
        if (inX && !g.resolved) {
          const inTop = Math.abs(S.y - o1) < GAP / 2 - BIRD_R + 4;
          const inBottom = Math.abs(S.y - o2) < GAP / 2 - BIRD_R + 4;
          if (!inTop && !inBottom && S.inv <= 0) resolve(false, 'Đâm cột!');
          else if (BIRD_X > g.x + GATE_W / 2 && (inTop || inBottom)) {
            const ok = inTop === q.correctTop;
            resolve(ok, ok ? `+${REWARD.flappy}` : `Sai! ${q.item.word}`);
          }
        }
        if (g && g.x + GATE_W < -10) {
          if (!g.resolved) resolve(false, 'Bỏ lỡ!');
          S.gate = null;
        }
        // hết thời gian chờ → câu tiếp theo + cột mới
        if (!S.gate && S.t >= (S.holdUntil || 0) && S.q + 1 < questions.length && S.lives > 0) {
          S.q += 1;
          S.gate = { x: W + 20, resolved: false };
          setHud((h) => ({ ...h, q: S.q }));
          setLast(null);
        }
      }
      // ---- vẽ ----
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#7DD3FC'); sky.addColorStop(1, '#E0F2FE');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      S.clouds.forEach((c) => {
        if (phase === 'playing') c[0] -= 0.3 * k;
        if (c[0] < -80) c[0] = W + 40;
        ctx.beginPath(); ctx.arc(c[0], c[1], 18, 0, 7); ctx.arc(c[0] + 20, c[1] - 8, 22, 0, 7); ctx.arc(c[0] + 44, c[1], 17, 0, 7); ctx.fill();
      });
      if (q && S.gate) {
        const g = S.gate;
        ctx.fillStyle = '#22C55E'; ctx.strokeStyle = '#15803D'; ctx.lineWidth = 3;
        for (const [y0, y1] of [[0, o1 - GAP / 2], [o1 + GAP / 2, o2 - GAP / 2], [o2 + GAP / 2, playH]]) {
          roundRect(ctx, g.x, y0 - 6, GATE_W, y1 - y0 + 12, 8); ctx.fill(); ctx.stroke();
        }
        ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (const [cy, label] of [[o1, q.top], [o2, q.bottom]]) {
          const tw = Math.min(150, ctx.measureText(label).width + 18);
          ctx.fillStyle = g.resolved ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.95)';
          roundRect(ctx, g.x + GATE_W / 2 - tw / 2, cy - 14, tw, 28, 14); ctx.fill();
          ctx.fillStyle = '#1A202C';
          ctx.fillText(label.length > 16 ? `${label.slice(0, 15)}…` : label, g.x + GATE_W / 2, cy + 1);
        }
      }
      ctx.fillStyle = '#65A30D'; ctx.fillRect(0, playH, W, GROUND);
      ctx.fillStyle = '#84CC16'; ctx.fillRect(0, playH, W, 10);
      drawBee(ctx, BIRD_X, S.y, S.vy, S.t, S.inv > 0 && Math.floor(S.t / 100) % 2 === 0);
      S.popups = S.popups.filter((p) => p.life > 0);
      S.popups.forEach((p) => {
        p.life -= k; p.y -= 0.6 * k;
        ctx.globalAlpha = Math.max(0, p.life / 60);
        ctx.fillStyle = p.color; ctx.font = '800 18px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(p.text, p.x + 20, p.y);
        ctx.globalAlpha = 1;
      });
      window.__flappyState = { y: S.y, vy: S.vy, gateX: S.gate ? S.gate.x : null, target: q && S.gate ? (q.correctTop ? o1 : o2) : (o1 + o2) / 2, q: S.q, phase };
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size, phase, questions, settings, finish, s.voiceURI, s.speechRate]);

  const q = questions[Math.min(hud.q, questions.length - 1)];

  return (
    <GameShell coins={hud.correct * REWARD.flappy} current={hud.done} total={questions.length} label={`📚 ${hud.done}/${questions.length} · ❤ ${hud.lives}`}
      answered={results.current.length} onRestart={onRestart} onExit={onExit} onEnd={finish} maxW="560px">
      <Box ref={wrapRef} maxW="520px" mx="auto">
        <Flex bg="app.card" borderRadius="16px" px="14px" py="10px" mb="10px" align="center" gap="8px" border="2px solid" borderColor="app.line">
          {last ? (
            <Text fontWeight={800} fontSize="16px" color={last.ok ? '#23AC38' : '#EF5350'} noOfLines={2} data-testid="flappy-last">
              {last.ok ? '✓ Đúng' : '✗ Sai'}: {last.item.word}{last.item.ipa ? ` ${last.item.ipa}` : ''} = {last.item.meaning}
            </Text>
          ) : (
            <>
              <Text fontSize="13px" color="app.muted" flexShrink={0}>Bay qua ô có nghĩa:</Text>
              <Text fontWeight={800} fontSize="17px" noOfLines={2} data-testid="prompt">{q?.item.meaning}</Text>
            </>
          )}
        </Flex>
        <Box position="relative" borderRadius="20px" overflow="hidden" border="2px solid #1A202C" onPointerDown={(e) => { e.preventDefault(); flap(); }}
          style={{ touchAction: 'none', width: size.w, height: size.h, maxWidth: '100%' }}>
          <canvas ref={canvasRef} style={{ width: size.w, height: size.h, display: 'block' }} data-testid="flappy-canvas" />
          {phase === 'ready' && (
            <Flex position="absolute" inset={0} bg="blackAlpha.400" align="center" justify="center" p="24px" textAlign="center" pointerEvents="none">
              <Box bg="white" color="#1A202C" borderRadius="20px" p="20px" maxW="320px" boxShadow="lg">
                <Text fontSize="36px">🐝</Text>
                <Text fontWeight={800} fontSize="17px">Chạm màn hình hoặc nhấn Space để bắt đầu!</Text>
                <Text fontSize="13px" color="gray.600" mt="6px">Bay qua ô có từ tiếng Anh đúng nghĩa. Trả lời sai bị trừ 1 mạng (tổng {LIVES} mạng).</Text>
              </Box>
            </Flex>
          )}
        </Box>
      </Box>
    </GameShell>
  );
}
