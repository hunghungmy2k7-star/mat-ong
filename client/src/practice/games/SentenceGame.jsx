import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text, Input, Button, Badge, useToast } from '@chakra-ui/react';
import { FiCheck, FiSkipForward, FiEdit3, FiArrowRight, FiHelpCircle, FiVolume2 } from 'react-icons/fi';
import GameShell from '../GameShell';
import { REWARD, shuffle, maskWord } from '../utils';
import { playSound } from '../sound';
import { showMeme } from '../meme';
import { api } from '../../api';
import { speak, speakWord } from '../../speech';
import { useAuth } from '../../auth/AuthContext';
import { Btn3D, PosBadge } from '../../components/ui';
import { useAiStatus } from '../../components/words/AiWordsModal';

export const PASS_SCORE = 60;

function Review({ r }) {
  const color = r.score >= 80 ? '#23AC38' : r.score >= PASS_SCORE ? '#EA7E00' : '#E53E3E';
  const rows = [['Câu hay hơn', r.better], ['Sửa đúng', r.corrected], ['Nghĩa', r.meaning], ['Ngữ pháp', r.grammar], ['Từ vựng', r.vocabulary]].filter(([, v]) => v);
  return (
    <Box mt="16px" p="16px" borderRadius="16px" bg="#F0FFF4" border="2px solid #9AE6B4" _dark={{ bg: 'whiteAlpha.100' }} data-testid="ai-review">
      <Flex align="center" justify="space-between" mb="8px">
        <Text fontWeight={800} color="#15803D">✓ AI nhận xét</Text>
        <Badge bg={color} color="white" borderRadius="999px" px="10px" fontSize="14px" data-testid="ai-score">{r.score}/100</Badge>
      </Flex>
      {r.summary && <Text fontSize="14px" mb="6px">{r.summary}</Text>}
      {rows.map(([k, v]) => <Text key={k} fontSize="14px" mt="4px"><b>{k}:</b> {v}</Text>)}
    </Box>
  );
}

export default function SentenceGame({ items, settings, onFinish, onExit, onRestart }) {
  const toast = useToast();
  const { user } = useAuth();
  const [status, setStatus] = useAiStatus();
  const list = useMemo(() => shuffle(items), [items]);
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [review, setReview] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]);
  const done = useRef(false);
  const item = list[idx];
  const s = user?.settings || {};

  const record = useCallback((correct) => {
    const next = [...results, { item, correct }];
    setResults(next);
    if (idx + 1 >= list.length) {
      if (!done.current) { done.current = true; onFinish(next); }
      return;
    }
    setIdx((i) => i + 1);
    setText('');
    setReview(null);
    setShowHint(false);
  }, [results, item, idx, list.length, onFinish]);

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api('/ai/score-sentence', { method: 'POST', body: { word: item.word, meaning: item.meaning, sentence: text } });
      setStatus({ enabled: true, limit: r.limit, used: r.used, remaining: r.remaining });
      setReview(r);
      const ok = r.score >= PASS_SCORE;
      playSound(ok ? 'correct' : 'wrong', settings);
      showMeme(ok);
      speakWord(item.word, s);
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setBusy(false);
    }
  };

  const correctCount = results.filter((r) => r.correct).length;
  const hintText = maskWord(item?.example, item?.word) || item?.example;
  const label = `Từ ${Math.min(idx + 1, list.length)}/${list.length} · AI: ${status?.used ?? 0}/${status?.limit ?? 0}`;

  if (status && !status.enabled) {
    return (
      <GameShell coins={0} current={0} total={1} label="Luyện đặt câu" answered={0} onRestart={onRestart} onExit={onExit} onEnd={onExit}>
        <Box maxW="564px" mx="auto" textAlign="center" bg="app.card" borderRadius="24px" p="28px">
          <Text fontSize="40px">🤖</Text>
          <Text fontWeight={800}>Luyện đặt câu cần AI chấm điểm</Text>
          <Text color="app.muted" fontSize="14px" mt="6px">Máy chủ chưa cấu hình khóa API của Claude (ANTHROPIC_API_KEY). Hãy chọn game khác nhé.</Text>
          <Btn3D mt="16px" onClick={onExit}>Quay lại</Btn3D>
        </Box>
      </GameShell>
    );
  }

  return (
    <GameShell coins={correctCount * REWARD.sentence} current={idx} total={list.length} label={label} answered={results.length}
      onRestart={onRestart} onExit={onExit} onEnd={() => onFinish(results)} maxW="700px">
      <Box maxW="700px" mx="auto" bg="app.card" borderRadius="24px" border="2px solid" borderColor="app.line" p={{ base: '18px', md: '28px' }}>
        <Flex align="center" gap="10px" wrap="wrap">
          <Text fontSize="28px" fontWeight={900} data-testid="prompt">{item.word}</Text>
          {item.pos && <PosBadge pos={item.pos} />}
          {item.ipa && <Text color="#D53F8C" fontSize="15px">{item.ipa}</Text>}
          <Button size="sm" ml="auto" borderRadius="999px" leftIcon={<FiVolume2 />} variant="outline"
            onClick={() => speak(item.word, { voiceURI: s.voiceURI, rate: s.speechRate || 1 })}>Nghe</Button>
        </Flex>
        <Text mt="6px" fontSize="16px"><b>Nghĩa:</b> {item.meaning}</Text>
        <Text mt="18px" fontWeight={800}>Đặt câu với từ này</Text>
        <Input mt="8px" h="50px" borderRadius="16px" borderWidth="2px" focusBorderColor="#1CB0F6" placeholder={`Viết một câu tiếng Anh có dùng '${item.word}'`}
          value={text} onChange={(e) => setText(e.target.value)} isReadOnly={Boolean(review)} maxLength={500} autoFocus data-testid="answer-input"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (review) record(review.score >= PASS_SCORE); else submit(); } }} />
        {showHint && hintText && <Text mt="8px" fontSize="14px" color="app.muted"><b>Gợi ý:</b> <i>{hintText}</i></Text>}
        {review && <Review r={review} />}
        <Flex mt="16px" gap="8px" justify="flex-end" wrap="wrap">
          {!review ? (
            <>
              <Button borderRadius="16px" variant="ghost" leftIcon={<FiHelpCircle />} onClick={() => setShowHint(true)} isDisabled={!hintText}>Gợi ý</Button>
              <Button borderRadius="16px" variant="outline" leftIcon={<FiSkipForward />} onClick={() => { playSound('wrong', settings); speakWord(item.word, s); record(false); }}>Bỏ qua</Button>
              <Btn3D leftIcon={<FiCheck />} isLoading={busy} loadingText="AI đang chấm..." isDisabled={!text.trim() || status?.remaining === 0} onClick={submit} data-testid="submit">Nộp</Btn3D>
            </>
          ) : (
            <>
              <Button borderRadius="16px" variant="outline" leftIcon={<FiEdit3 />} onClick={() => setReview(null)}>Sửa câu</Button>
              <Btn3D rightIcon={<FiArrowRight />} onClick={() => record(review.score >= PASS_SCORE)} data-testid="next">Tiếp theo</Btn3D>
            </>
          )}
        </Flex>
        {status?.remaining === 0 && !review && <Text mt="8px" fontSize="13px" color="#E53E3E" textAlign="right">Bạn đã hết lượt AI hôm nay.</Text>}
      </Box>
    </GameShell>
  );
}
