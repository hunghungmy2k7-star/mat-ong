import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text, Textarea, Button, Switch, Spinner, useToast } from '@chakra-ui/react';
import { FiCheck, FiEye } from 'react-icons/fi';
import GameShell from '../GameShell';
import FeedbackSheet from '../FeedbackSheet';
import { REWARD, shuffle } from '../utils';
import { playSound } from '../sound';
import { showMeme } from '../meme';
import { api } from '../../api';
import { Btn3D } from '../../components/ui';

// Chuẩn hóa một token để so khớp: bỏ hoa/thường, dấu câu, thống nhất dấu nháy
const norm = (t) => String(t).toLowerCase().replace(/[’‘`´]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
export const tokenize = (s) => String(s || '').split(/\s+/).filter(Boolean);

/** Số token đầu tiên người dùng đã gõ đúng theo thứ tự */
export function matchedPrefix(input, target) {
  const a = tokenize(input).map(norm).filter(Boolean);
  const b = tokenize(target).map(norm).filter(Boolean);
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n += 1;
  return n;
}
export const sameSentence = (input, target) => {
  const a = tokenize(input).map(norm).filter(Boolean);
  const b = tokenize(target).map(norm).filter(Boolean);
  return a.length === b.length && a.every((x, i) => x === b[i]);
};

function MaskedSentence({ sentence, revealed }) {
  const words = tokenize(sentence);
  return (
    <Flex wrap="wrap" gap="8px" justify="center" data-testid="masked">
      {words.map((w, i) => (
        <Box key={i} px="10px" py="4px" borderRadius="10px" fontWeight={700} fontSize="17px"
          bg={i < revealed ? '#DCFCE7' : 'app.cell'} color={i < revealed ? '#15803D' : 'app.muted'}
          _dark={i < revealed ? { bg: 'green.900', color: 'green.200' } : {}} transition="all .15s">
          {i < revealed ? w : '*'.repeat(Math.min(6, Math.max(3, norm(w).length)))}
        </Box>
      ))}
    </Flex>
  );
}

export default function TranslateGame({ items, settings, onFinish, onExit, onRestart }) {
  const toast = useToast();
  const [list, setList] = useState(() => shuffle(items.filter((i) => i.example?.trim())));
  const [viMode, setViMode] = useState(false);
  const [loadingVi, setLoadingVi] = useState(false);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [hints, setHints] = useState(0);
  const [results, setResults] = useState([]);
  const [phase, setPhase] = useState('ask');
  const done = useRef(false);
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const inputRef = useRef(null);
  const item = list[idx];

  const typed = item ? matchedPrefix(input, item.example) : 0;
  const revealed = Math.max(typed, hints);
  const hasVi = Boolean(item?.exampleVi);

  useEffect(() => { inputRef.current?.focus(); }, [idx]);

  // Bật chế độ câu tiếng Việt: dịch các câu ví dụ còn thiếu bằng AI (nếu máy chủ đã cấu hình)
  const toggleVi = async (on) => {
    setViMode(on);
    if (!on || list.every((i) => i.exampleVi)) return;
    setLoadingVi(true);
    try {
      const r = await api('/ai/translate-examples', { method: 'POST', body: { ids: list.filter((i) => !i.exampleVi).map((i) => i.id) } });
      setList((l) => l.map((i) => (r.translations[i.id] ? { ...i, exampleVi: r.translations[i.id] } : i)));
    } catch (e) {
      toast({ status: 'info', title: 'Chưa có bản dịch câu ví dụ', description: e.message });
    } finally {
      setLoadingVi(false);
    }
  };

  const answer = useCallback((correct) => {
    if (phase !== 'ask') return;
    playSound(correct ? 'correct' : 'wrong', settings);
    showMeme(correct);
    setResults((r) => [...r, { item, correct }]);
    setPhase('feedback');
  }, [phase, item, settings]);

  const check = () => {
    if (!input.trim()) return;
    answer(sameSentence(input, item.example));
  };
  const hint = () => {
    const words = tokenize(item.example);
    const n = Math.min(words.length, revealed + 1);
    setHints(n);
    setInput(`${words.slice(0, n).join(' ')} `);
    inputRef.current?.focus();
  };

  const next = useCallback(() => {
    if (idx + 1 >= list.length) {
      if (!done.current) { done.current = true; onFinish(resultsRef.current); }
      return;
    }
    setIdx((i) => i + 1);
    setInput('');
    setHints(0);
    setPhase('ask');
  }, [idx, list.length, onFinish]);

  const override = () => setResults((r) => r.map((x, i) => (i === r.length - 1 ? { ...x, correct: !x.correct } : x)));
  const correctCount = results.filter((r) => r.correct).length;
  const last = results[results.length - 1];

  const prompt = useMemo(() => {
    if (!item) return null;
    if (viMode && hasVi) return { label: 'Dịch câu sau sang tiếng Anh', text: item.exampleVi };
    return { label: `Viết câu tiếng Anh dùng từ mang nghĩa "${item.meaning}"`, text: item.meaning };
  }, [item, viMode, hasVi]);

  if (!list.length) {
    return (
      <GameShell coins={0} current={0} total={1} label="Dịch câu" answered={0} onRestart={onRestart} onExit={onExit} onEnd={onExit}>
        <Box maxW="564px" mx="auto" textAlign="center" bg="app.card" borderRadius="24px" p="28px">
          <Text fontSize="40px">📝</Text>
          <Text fontWeight={800}>Các từ đã chọn chưa có câu ví dụ</Text>
          <Text color="app.muted" fontSize="14px" mt="6px">Dịch câu cần từ có câu ví dụ. Hãy thêm ví dụ ở trang Từ vựng hoặc chọn bộ từ khác.</Text>
          <Btn3D mt="16px" onClick={onExit}>Quay lại</Btn3D>
        </Box>
      </GameShell>
    );
  }

  return (
    <GameShell coins={correctCount * REWARD.translate} current={idx} total={list.length} label={`Câu ${Math.min(idx + 1, list.length)} / ${list.length}`}
      answered={results.length} onRestart={onRestart} onExit={onExit} onEnd={() => onFinish(results)} maxW="700px"
      extra={(
        <Flex as="label" align="center" gap="6px" fontSize="12px" fontWeight={700} color="app.muted" mr="6px" cursor="pointer">
          {loadingVi ? <Spinner size="xs" /> : <Switch size="sm" colorScheme="green" isChecked={viMode} onChange={(e) => toggleVi(e.target.checked)} data-testid="vi-mode" />}
          {viMode ? 'Câu TV → Câu TA' : 'Nghĩa → Câu TA'}
        </Flex>
      )}>
      <Box maxW="700px" mx="auto" bg="app.card" borderRadius="24px" border="2px solid" borderColor="app.line" p={{ base: '18px', md: '28px' }}>
        <Text fontSize="13px" fontWeight={700} color="app.muted" textAlign="center">{prompt.label}</Text>
        <Text fontSize={{ base: '20px', md: '24px' }} fontWeight={800} textAlign="center" mt="6px" mb="18px" data-testid="prompt">{prompt.text}</Text>
        {viMode && !hasVi && <Text fontSize="12px" color="#EA7E00" textAlign="center" mt="-12px" mb="12px">Câu này chưa có bản dịch, đang hiển thị nghĩa của từ.</Text>}
        <MaskedSentence sentence={item.example} revealed={phase === 'ask' ? revealed : 999} />
        <Textarea ref={inputRef} mt="18px" rows={2} borderRadius="16px" borderWidth="2px" focusBorderColor="#1CB0F6" placeholder="Nhập câu tiếng Anh..."
          value={input} isDisabled={phase !== 'ask'} onChange={(e) => setInput(e.target.value)} data-testid="answer-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); }
            if (e.key === ' ' && e.ctrlKey) { e.preventDefault(); hint(); }
          }} />
        <Flex mt="12px" gap="10px" justify="space-between" align="center" wrap="wrap">
          <Text fontSize="12px" color="app.muted">Ctrl+Space để hiện từ tiếp theo</Text>
          <Flex gap="8px">
            <Button borderRadius="16px" leftIcon={<FiEye />} variant="outline" onClick={hint} isDisabled={phase !== 'ask'}>Gợi ý</Button>
            <Btn3D leftIcon={<FiCheck />} onClick={check} isDisabled={phase !== 'ask' || !input.trim()}>Kiểm tra (Enter)</Btn3D>
          </Flex>
        </Flex>
      </Box>
      {phase === 'feedback' && last && (
        <FeedbackSheet item={item} correct={last.correct} settings={settings} onNext={next} onOverride={override} />
      )}
    </GameShell>
  );
}
