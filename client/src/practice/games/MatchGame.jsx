import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text, Button, Grid } from '@chakra-ui/react';
import GameShell, { useCountdown } from '../GameShell';
import { playSound } from '../sound';
import { speakWord } from '../../speech';
import { useAuth } from '../../auth/AuthContext';
import { showMeme } from '../meme';
import { REWARD, shuffle } from '../utils';
import { waitMs } from '../settings';

const PAIRS_PER_ROUND = 8;
const LIVES = 5;

/** Nối từ với nghĩa: mỗi vòng tối đa 8 cặp, 5 mạng cho cả lượt, đồng hồ đếm ngược mỗi vòng */
export default function MatchGame({ items, settings, onFinish, onExit, onRestart }) {
  const rounds = useMemo(() => {
    const s = shuffle(items);
    const out = [];
    for (let i = 0; i < s.length; i += PAIRS_PER_ROUND) out.push(s.slice(i, i + PAIRS_PER_ROUND));
    return out;
  }, [items]);
  const [round, setRound] = useState(0);
  const { user } = useAuth();
  const [lives, setLives] = useState(LIVES);
  const [matched, setMatched] = useState(new Set()); // id đã ghép trong vòng
  const [mistakes, setMistakes] = useState(new Set()); // id từng chọn sai
  const [results, setResults] = useState({}); // id -> bool
  const [sel, setSel] = useState(null); // {side, id}
  const [flash, setFlash] = useState(null); // {ids:[], ok}
  const [last, setLast] = useState(null); // cặp vừa chọn: {item, ok} – hiện đáp án trong lúc chờ
  const ended = useRef(false);
  const resultsRef = useRef(results);
  resultsRef.current = results;

  const cur = rounds[round] || [];
  const left = useMemo(() => shuffle(cur), [cur]);
  const right = useMemo(() => shuffle(cur), [cur]);
  const roundTime = Math.max(settings.questionTime, cur.length * 6);

  const finish = useCallback((final) => {
    if (ended.current) return;
    ended.current = true;
    onFinish(items.filter((it) => it.id in final).map((it) => ({ item: it, correct: final[it.id] })));
  }, [items, onFinish]);

  // Hết vòng (ghép đủ / hết giờ / hết mạng): các cặp chưa ghép tính là sai
  const closeRound = useCallback((res, livesLeft) => {
    const final = { ...res };
    cur.forEach((it) => { if (!(it.id in final)) final[it.id] = false; });
    setResults(final);
    if (livesLeft <= 0 || round + 1 >= rounds.length) {
      if (livesLeft <= 0) items.forEach((it) => { if (!(it.id in final)) final[it.id] = false; });
      finish(final);
      return;
    }
    setRound((r) => r + 1);
    setMatched(new Set());
    setSel(null);
  }, [cur, round, rounds.length, finish, items]);

  const timeLeft = useCountdown(roundTime, { resetKey: round, paused: ended.current || Boolean(flash), onExpire: () => closeRound(resultsRef.current, lives) });

  const choose = (side, id) => {
    if (matched.has(id) || flash) return;
    if (!sel || sel.side === side) {
      setSel(sel?.side === side && sel.id === id ? null : { side, id });
      return;
    }
    const leftId = side === 'L' ? id : sel.id;
    const rightId = side === 'R' ? id : sel.id;
    const leftItem = cur.find((it) => it.id === leftId);
    if (leftItem) speakWord(leftItem.word, user?.settings || {});
    const wait = waitMs(settings);
    setLast({ item: leftItem, ok: leftId === rightId });
    if (leftId === rightId) {
      playSound('correct', settings);
      showMeme(true);
      const res = { ...results, [leftId]: !mistakes.has(leftId) };
      setResults(res);
      setSel(null);
      // giữ cặp đúng sáng xanh vài giây rồi mới ẩn, sau đó mới sang vòng mới
      setFlash({ ids: [leftId], ok: true, side: { L: leftId, R: leftId } });
      setTimeout(() => {
        const m = new Set(matched).add(leftId);
        setMatched(m);
        setFlash(null);
        if (m.size === cur.length) closeRound(res, lives);
      }, wait);
    } else {
      playSound('wrong', settings);
      showMeme(false);
      setMistakes((s) => new Set(s).add(leftId));
      const l = lives - 1;
      setLives(l);
      setFlash({ ids: [leftId, rightId], ok: false, side: { L: leftId, R: rightId } });
      setTimeout(() => { setFlash(null); setSel(null); if (l <= 0) closeRound(results, 0); }, wait);
    }
  };

  const btnStyle = (side, id) => {
    const selected = sel?.side === side && sel.id === id;
    const bad = flash && !flash.ok && flash.side?.[side] === id;
    const good = flash && flash.ok && flash.ids.includes(id);
    if (good) return { bg: '#23AC38', color: 'white', borderColor: '#23AC38', boxShadow: '0 3px 0 0 #1F8F31' };
    if (bad) return { bg: '#EF5350', color: 'white', borderColor: '#EF5350', boxShadow: '0 3px 0 0 #C62828' };
    if (selected) return { bg: '#4CC764', color: 'white', borderColor: '#4CC764', boxShadow: '0 3px 0 0 #1F8F31' };
    return { bg: 'app.card', color: 'app.text', borderColor: 'app.line', boxShadow: '0 2px 0 0 #E5E5E5' };
  };

  const totalDone = Object.keys(results).length;
  const correctCount = Object.values(results).filter(Boolean).length;

  return (
    <GameShell
      coins={correctCount * REWARD.match}
      current={totalDone}
      total={items.length}
      label={
        <Flex as="span" align="center" gap="8px">
          <Text as="span" bg="#F3E8FF" color="#7C3AED" fontSize="12px" fontWeight={800} px="8px" py="2px" borderRadius="8px">VÒNG {round + 1}/{rounds.length}</Text>
          <Text as="span">Đã ghép {matched.size} / {cur.length}</Text>
          <Text as="span" fontSize="12px" color="app.muted">· tổng {totalDone}/{items.length}</Text>
        </Flex>
      }
      timer={{ left: timeLeft, total: roundTime }}
      answered={totalDone + matched.size}
      onRestart={onRestart}
      onExit={onExit}
      onEnd={() => finish(results)}
    >
      <Box maxW="564px" mx="auto" bg="app.card" borderRadius="32px" p={{ base: '14px', md: '20px' }} boxShadow="0 4px 0 0 #E5E5E5">
        <Flex justify="space-between" align="center" bg="#F7FAFC" _dark={{ bg: 'whiteAlpha.50' }} borderRadius="16px" px="12px" py="8px" mb="16px">
          <Text fontSize="20px" letterSpacing="2px" aria-label={`${lives} mạng`}>{'❤️'.repeat(lives)}{'🤍'.repeat(LIVES - lives)}</Text>
          <Text bg="#C6F6D5" color="#22543D" fontWeight={800} px="10px" py="2px" borderRadius="9999px">⏱ {timeLeft}S</Text>
        </Flex>
        <Grid templateColumns="1fr 1fr" gap="10px">
          <Text textAlign="center" fontWeight={700}>Tiếng Anh</Text>
          <Text textAlign="center" fontWeight={700}>Tiếng Việt</Text>
          <Flex direction="column" gap="8px">
            {left.map((it) => (
              <Button key={`L${it.id}`} visibility={matched.has(it.id) ? 'hidden' : 'visible'} onClick={() => choose('L', it.id)} h="auto" minH="38px"
                py="6px" whiteSpace="normal" borderRadius="9999px" border="1px solid" fontSize="13px" fontWeight={700} {...btnStyle('L', it.id)}
                data-testid={`L-${it.id}`}>
                {it.word}
              </Button>
            ))}
          </Flex>
          <Flex direction="column" gap="8px">
            {right.map((it) => (
              <Button key={`R${it.id}`} visibility={matched.has(it.id) ? 'hidden' : 'visible'} onClick={() => choose('R', it.id)} h="auto" minH="38px"
                py="6px" whiteSpace="normal" borderRadius="9999px" border="1px solid" fontSize="14px" fontWeight={700} {...btnStyle('R', it.id)}
                data-testid={`R-${it.id}`}>
                {it.meaning}
              </Button>
            ))}
          </Flex>
        </Grid>
        <Text textAlign="center" mt="14px" fontWeight={700}>Đã ghép: {matched.size} / {cur.length}</Text>
        {last?.item && (
          <Text textAlign="center" mt="8px" fontSize="15px" fontWeight={700} color={last.ok ? '#23AC38' : '#EF5350'} data-testid="match-last">
            {last.ok ? '✓' : '✗'} {last.item.word}{last.item.ipa ? ` ${last.item.ipa}` : ''} = {last.item.meaning}
          </Text>
        )}
      </Box>
    </GameShell>
  );
}
