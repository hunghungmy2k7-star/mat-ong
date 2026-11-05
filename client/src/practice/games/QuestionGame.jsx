import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text, Button, Input, Badge, Icon, Kbd, IconButton } from '@chakra-ui/react';
import { FiVolume2, FiEdit2, FiTarget, FiHeadphones } from 'react-icons/fi';
import GameShell, { useCountdown } from '../GameShell';
import FeedbackSheet from '../FeedbackSheet';
import { playSound } from '../sound';
import { showMeme } from '../meme';
import { REWARD, DEFAULT_SRS_MODES, buildOptions, maskWord, isCorrectWord, hintPattern, revealOne, shuffle } from '../utils';
import { speak } from '../../speech';
import { useAuth } from '../../auth/AuthContext';
import { Btn3D } from '../../components/ui';

const card = {
  maxW: '564px', mx: 'auto', bg: 'app.card', borderRadius: '32px', boxShadow: '0 4px 0 0 #E5E5E5', _dark: { boxShadow: '0 4px 0 0 #2D3748' },
  px: { base: '16px', md: '24px' }, py: '24px',
};

function useSay() {
  const { user } = useAuth();
  const s = user?.settings || {};
  return useCallback((text, rate) => speak(text, { voiceURI: s.voiceURI, rate: rate || s.speechRate || 1 }), [s.voiceURI, s.speechRate]);
}

function PosPill({ pos }) {
  return pos ? <Badge bg="#F3E8FF" color="#7C3AED" borderRadius="9999px" px="10px" py="3px" fontSize="11px">{pos.toUpperCase()}</Badge> : null;
}

// ---------- Trắc nghiệm ----------
function QuizQuestion({ q, onAnswer, answered }) {
  const say = useSay();
  const [chosen, setChosen] = useState(null);
  useEffect(() => setChosen(null), [q]);
  const pick = useCallback((opt) => {
    if (answered) return;
    setChosen(opt);
    onAnswer(opt === q.answer);
  }, [answered, onAnswer, q]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'x') { e.preventDefault(); say(q.item.word); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) pick(q.options[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, pick, say]);

  const state = (opt) => {
    if (!answered) return 'idle';
    if (opt === q.answer) return 'right';
    if (opt === chosen) return 'wrong';
    return 'dim';
  };
  const styles = {
    idle: { borderColor: '#91D5FF', bg: 'app.card', _hover: { bg: '#E6F7FF', borderColor: '#49C0F8', _dark: { bg: 'whiteAlpha.100' } } },
    right: { borderColor: '#23AC38', bg: '#F0FFF4', _dark: { bg: 'green.900' } },
    wrong: { borderColor: '#EF5350', bg: '#FFF5F5', _dark: { bg: 'red.900' } },
    dim: { borderColor: '#91D5FF', opacity: 0.5 },
  };

  return (
    <Box {...card}>
      {q.type === 'context' ? (
        <Box textAlign="center" mb="8px">
          <Text fontSize="12px" fontWeight={700} color="#9333EA" mb="6px">ĐIỀN TỪ VÀO CHỖ TRỐNG</Text>
          <Text fontSize="20px" fontWeight={700} lineHeight="30px">{q.prompt}</Text>
        </Box>
      ) : (
        <Text textAlign="center" fontSize="28px" fontWeight={800} data-testid="prompt">{q.prompt}</Text>
      )}
      <Flex justify="center" align="center" gap="8px" mt="6px">
        {q.type === 'w2m' && <IconButton aria-label="Phát âm" icon={<FiVolume2 />} size="xs" variant="ghost" color="#1CB0F6" onClick={() => say(q.item.word)} />}
        <PosPill pos={q.item.pos} />
        {q.type === 'w2m' && !q.noHint && q.item.ipa && <Text fontSize="14px" color="app.muted">{q.item.ipa}</Text>}
      </Flex>
      {q.type === 'w2m' && (
        <Flex justify="center" mt="10px">
          <Text fontSize="11px" bg="#E0F2FE" color="#0369A1" borderRadius="9999px" px="10px" py="3px">Phím tắt: <Kbd fontSize="10px">ctrl</Kbd> + <Kbd fontSize="10px">x</Kbd> để phát âm</Text>
        </Flex>
      )}
      <Box display="grid" gridTemplateColumns="1fr 1fr" gap="12px" mt="20px">
        {q.options.map((opt, i) => (
          <Button key={opt} onClick={() => pick(opt)} h="auto" minH="96px" p="14px" whiteSpace="normal" justifyContent="flex-start" alignItems="flex-start"
            textAlign="left" borderRadius="24px" border="2px solid" fontWeight={600} fontSize="15px" {...styles[state(opt)]} data-testid={`opt-${i + 1}`}
            data-correct={opt === q.answer ? 'true' : undefined} transition="all .15s">
            <Flex as="span" w="22px" h="22px" flexShrink={0} mr="10px" borderRadius="full" border="2px solid" borderColor="currentColor"
              color="#49C0F8" align="center" justify="center" fontSize="11px">{i + 1}</Flex>
            <Text as="span" color="app.text">{opt}</Text>
          </Button>
        ))}
      </Box>
      <Text textAlign="center" fontSize="11px" color="app.muted" mt="14px">Sử dụng phím số 1-{q.options.length} để chọn nhanh đáp án</Text>
    </Box>
  );
}

// ---------- Gõ từ / Nghe viết ----------
function TypeQuestion({ q, onAnswer, answered }) {
  const say = useSay();
  const listening = q.type === 'listening';
  const [value, setValue] = useState('');
  const [revealed, setRevealed] = useState(new Set());
  const [hints, setHints] = useState(3);
  const [showExample, setShowExample] = useState(false);
  const [slow, setSlow] = useState(false);
  const inputRef = useRef(null);
  const word = q.item.word;

  useEffect(() => {
    setValue('');
    setRevealed(new Set());
    setHints(3);
    setShowExample(false);
    inputRef.current?.focus();
    if (listening) setTimeout(() => say(word, slow ? 0.7 : undefined), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const applyHint = useCallback(() => {
    if (!hints || answered || q.noHint) return;
    setRevealed((r) => revealOne(word, r));
    setHints((h) => h - 1);
  }, [hints, answered, word, q.noHint]);

  const submit = () => {
    if (answered || !value.trim()) return;
    onAnswer(isCorrectWord(value, word));
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); applyHint(); }
      if (k === 'e') { e.preventDefault(); setShowExample(true); }
      if (k === 'x') { e.preventDefault(); say(word, slow ? 0.7 : undefined); }
      if (k === 'h' && listening) { e.preventDefault(); setSlow((s) => !s); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyHint, say, word, slow, listening]);

  const masked = maskWord(q.item.example, word);

  return (
    <Box {...card} position="relative">
      {listening ? (
        <Flex direction="column" align="center" gap="8px">
          <Text position="absolute" top="16px" right="20px" fontSize="11px" color="app.muted" cursor="pointer" onClick={() => setSlow((s) => !s)}>
            Nghe: {slow ? '0.7x' : '1x'} | Ctrl+H
          </Text>
          <Box position="relative">
            <IconButton aria-label="Nghe lại" icon={<FiHeadphones size={28} />} w="80px" h="80px" borderRadius="full" bg="#23AC38" color="white"
              boxShadow="0 4px 0 0 #1F8F31" _hover={{ bg: '#22A035' }} onClick={() => say(word, slow ? 0.7 : undefined)} />
            <Text position="absolute" bottom="-10px" left="50%" transform="translateX(-50%)" bg="#0E7490" color="white" fontSize="10px"
              fontWeight={700} px="6px" borderRadius="6px" whiteSpace="nowrap">CTRL + X</Text>
          </Box>
          <Text mt="10px" fontSize="17px" fontWeight={700}>Nghe và gõ từ tiếng Anh</Text>
          <PosPill pos={q.item.pos} />
        </Flex>
      ) : (
        <Flex direction="column" align="center" gap="6px">
          <Text fontSize="20px" fontWeight={800} textAlign="center" data-testid="prompt">{q.item.meaning}</Text>
          <Flex align="center" gap="8px">
            <IconButton aria-label="Phát âm" icon={<FiVolume2 />} size="xs" variant="ghost" color="#1CB0F6" onClick={() => say(word)} />
            <PosPill pos={q.item.pos} />
          </Flex>
        </Flex>
      )}

      <Text textAlign="center" mt="12px" minH="28px" fontSize={revealed.size ? '20px' : '12px'} fontWeight={revealed.size ? 800 : 400}
        color={revealed.size ? '#F59E0B' : 'app.muted'} fontStyle={revealed.size ? 'normal' : 'italic'} letterSpacing={revealed.size ? '0.1em' : 0}>
        {revealed.size ? hintPattern(word, revealed) : 'Chưa có gợi ý'}
      </Text>
      {showExample && (
        <Text textAlign="center" fontSize="14px" color="app.muted" mt="4px">{masked || 'Từ này chưa có ví dụ.'}</Text>
      )}

      <Input ref={inputRef} mt="12px" h="48px" textAlign="center" fontSize="17px" borderRadius="9999px" borderWidth="2px" focusBorderColor="#1CB0F6"
        placeholder={listening ? 'Gõ từ bạn nghe được...' : 'Gõ từ tiếng Anh...'} value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.ctrlKey && submit()} isReadOnly={answered} autoComplete="off" spellCheck={false} data-testid="answer-input" />

      <Flex mt="16px" gap="10px" justify="center" wrap="wrap">
        <Flex direction="column" align="center" gap="4px">
          <Button variant="outline" borderRadius="9999px" leftIcon={<FiEdit2 />} onClick={() => setShowExample(true)}>Xem ví dụ</Button>
          <Text fontSize="10px" color="app.muted">Ctrl + E</Text>
        </Flex>
        <Flex direction="column" align="center" gap="4px">
          <Button variant="outline" borderRadius="9999px" leftIcon={<Icon as={FiTarget} />} onClick={applyHint} isDisabled={!hints || answered || q.noHint}>{q.noHint ? 'Không gợi ý' : `Gợi ý (${hints})`}</Button>
          <Text fontSize="10px" color="app.muted">Ctrl + Space</Text>
        </Flex>
        <Flex direction="column" align="center" gap="4px">
          <Btn3D borderRadius="9999px" px="24px" onClick={submit} isDisabled={answered || !value.trim()}>Kiểm tra</Btn3D>
          <Text fontSize="10px" color="app.muted">Enter</Text>
        </Flex>
      </Flex>
    </Box>
  );
}

const MIXED_TYPES = ['w2m', 'm2w', 'typing', 'listening'];

const SRS_TYPE = { quiz: 'w2m', typing: 'typing', listening: 'listening' };

function buildQuestions(mode, quizType, items, pool, srsModes) {
  const candidates = [...items, ...pool];
  return items.map((item) => {
    let type = mode === 'quiz' ? quizType : mode === 'mixed' ? MIXED_TYPES[Math.floor(Math.random() * 4)] : mode;
    if (mode === 'srs') {
      type = SRS_TYPE[(srsModes || DEFAULT_SRS_MODES)[Math.min(4, item.srsLevel || 0)]] || 'w2m';
    }
    const noHint = mode === 'srs' && (item.srsLevel || 0) >= 3; // Lv3-4: tắt gợi ý
    let prompt = null;
    if (type === 'context') {
      prompt = maskWord(item.example, item.word);
      if (!prompt) type = 'w2m';
    }
    const others = candidates.filter((c) => c.id !== item.id);
    if (type === 'w2m') return { type, item, noHint, prompt: item.word, options: buildOptions(item, others, 'meaning'), answer: item.meaning };
    if (type === 'm2w' || type === 'context') {
      return { type, item, noHint, prompt: prompt || item.meaning, options: buildOptions(item, others, 'word'), answer: item.word };
    }
    return { type, item, noHint };
  });
}

/** Trắc nghiệm / Gõ từ / Nghe viết / Hỗn hợp */
export default function QuestionGame({ mode, quizType = 'w2m', items, pool, settings, srsModes, onFinish, onExit, onRestart }) {
  const questions = useMemo(() => buildQuestions(mode, quizType, shuffle(items), pool, srsModes), [mode, quizType, items, pool, srsModes]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]); // [{item, correct}]
  const [phase, setPhase] = useState('ask');
  const q = questions[idx];
  const done = useRef(false);
  const resultsRef = useRef(results);
  resultsRef.current = results;

  const answer = useCallback((correct) => {
    if (phase !== 'ask') return;
    playSound(correct ? 'correct' : 'wrong', settings);
    showMeme(correct);
    setResults((r) => [...r, { item: q.item, correct }]);
    setPhase('feedback');
  }, [phase, q, settings]);

  const next = useCallback(() => {
    if (idx + 1 >= questions.length) {
      if (!done.current) {
        done.current = true;
        onFinish(resultsRef.current);
      }
      return;
    }
    setIdx((i) => i + 1);
    setPhase('ask');
  }, [idx, questions.length, onFinish]);

  const override = () => setResults((r) => r.map((x, i) => (i === r.length - 1 ? { ...x, correct: !x.correct } : x)));

  const left = useCountdown(settings.questionTime, { resetKey: idx, paused: phase !== 'ask', onExpire: () => answer(false) });
  const correctCount = results.filter((r) => r.correct).length;
  const last = results[results.length - 1];

  return (
    <GameShell
      coins={correctCount * REWARD[mode]}
      current={idx}
      total={questions.length}
      label={`Câu ${Math.min(idx + 1, questions.length)} / ${questions.length}`}
      timer={{ left, total: settings.questionTime }}
      answered={results.length}
      onRestart={onRestart}
      onExit={onExit}
      onEnd={() => onFinish(results)}
    >
      {q.type === 'typing' || q.type === 'listening' ? (
        <TypeQuestion q={q} onAnswer={answer} answered={phase !== 'ask'} />
      ) : (
        <QuizQuestion q={q} onAnswer={answer} answered={phase !== 'ask'} />
      )}
      {phase === 'feedback' && last && (
        <FeedbackSheet item={q.item} correct={last.correct} settings={settings} onNext={next} onOverride={override} />
      )}
    </GameShell>
  );
}
