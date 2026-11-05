import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Flex, Text, Button, Input, IconButton, Switch, Icon } from '@chakra-ui/react';
import { FiChevronLeft, FiChevronRight, FiVolume2, FiX, FiCheck } from 'react-icons/fi';
import GameShell from '../GameShell';
import { playSound } from '../sound';
import { showMeme } from '../meme';
import { REWARD, isCorrectMeaning, isCorrectWord } from '../utils';
import { speak } from '../../speech';
import { useAuth } from '../../auth/AuthContext';
import { Btn3D } from '../../components/ui';

const face = {
  position: 'absolute', inset: 0, borderRadius: '24px', color: 'white', p: '24px', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', backfaceVisibility: 'hidden',
};

function Hint({ children }) {
  return <Text fontSize="11px" color="#A0AEC0" mt="6px" textAlign="center">{children}</Text>;
}

/** Flashcard: lật thẻ, tự đánh giá Thuộc / Quên. Phím: Space lật, Ctrl+1/X quên, Ctrl+2/C thuộc, Ctrl+←/→, Ctrl+S phát âm */
export default function Flashcard({ items, settings, onFinish, onExit, onRestart, rewardKey = 'flashcard' }) {
  const { user } = useAuth();
  const s = user?.settings || {};
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [vnFirst, setVnFirst] = useState(false);
  const [marks, setMarks] = useState({}); // id -> true (thuộc) / false (quên)
  const [typed, setTyped] = useState('');
  const [check, setCheck] = useState(null);
  const item = items[idx];
  const say = useCallback((t) => speak(t, { voiceURI: s.voiceURI, rate: s.speechRate || 1 }), [s.voiceURI, s.speechRate]);

  const results = useMemo(() => items.filter((it) => it.id in marks).map((it) => ({ item: it, correct: marks[it.id] })), [items, marks]);

  useEffect(() => { setFlipped(false); setTyped(''); setCheck(null); }, [idx]);

  const go = useCallback((d) => {
    const n = idx + d;
    if (n < 0) return;
    if (n >= items.length) {
      onFinish(results);
      return;
    }
    setIdx(n);
  }, [idx, items.length, onFinish, results]);

  const mark = useCallback((known) => {
    playSound(known ? 'correct' : 'wrong', settings);
    showMeme(known);
    const nextMarks = { ...marks, [item.id]: known };
    setMarks(nextMarks);
    if (idx + 1 >= items.length) {
      onFinish(items.filter((it) => it.id in nextMarks).map((it) => ({ item: it, correct: nextMarks[it.id] })));
    } else setIdx(idx + 1);
  }, [marks, item, idx, items, onFinish, settings]);

  const flip = useCallback(() => { setFlipped((f) => !f); playSound('flip', settings); }, [settings]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = document.activeElement?.tagName === 'INPUT';
      const k = e.key.toLowerCase();
      if (e.ctrlKey) {
        if (k === '1' || k === 'x') { e.preventDefault(); mark(false); }
        else if (k === '2' || k === 'c') { e.preventDefault(); mark(true); }
        else if (k === 'arrowleft') { e.preventDefault(); go(-1); }
        else if (k === 'arrowright') { e.preventDefault(); go(1); }
        else if (k === 's') { e.preventDefault(); say(item.word); }
        return;
      }
      if (typing) return;
      if (k === ' ') { e.preventDefault(); flip(); }
      else if (k === 'arrowleft') go(-1);
      else if (k === 'arrowright') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mark, go, flip, say, item]);

  const doCheck = () => {
    if (!typed.trim()) return;
    const ok = vnFirst ? isCorrectWord(typed, item.word) : isCorrectMeaning(typed, item.meaning);
    setCheck(ok);
    setFlipped(true);
    playSound(ok ? 'correct' : 'wrong', settings);
    showMeme(ok);
  };

  const front = vnFirst
    ? { label: 'NGHĨA TIẾNG VIỆT', main: item.meaning }
    : { label: 'TỪ TIẾNG ANH', main: item.word };
  const correctCount = results.filter((r) => r.correct).length;

  return (
    <GameShell
      coins={correctCount * REWARD[rewardKey]}
      current={idx}
      total={items.length}
      answered={results.length}
      onRestart={onRestart}
      onExit={onExit}
      onEnd={() => onFinish(results)}
      extra={
        <Flex align="center" gap="6px" bg="#EDF2F7" _dark={{ bg: 'whiteAlpha.200' }} borderRadius="9999px" px="10px" h="26px" mr="4px">
          <Text fontSize="12px" fontWeight={700}>{vnFirst ? 'VN→EN' : 'EN→VN'}</Text>
          <Switch size="sm" isChecked={vnFirst} onChange={() => { setVnFirst((v) => !v); setFlipped(false); }} aria-label="Đổi chiều thẻ" />
        </Flex>
      }
    >
      <Box maxW="564px" mx="auto" h={{ base: '340px', md: '400px' }} sx={{ perspective: '1200px' }} cursor="pointer" onClick={flip} data-testid="flashcard">
        <Box position="relative" w="100%" h="100%" transition="transform .5s" sx={{ transformStyle: 'preserve-3d' }}
          transform={flipped ? 'rotateY(180deg)' : 'none'}>
          <Box {...face} bgGradient="linear(135deg, #667EEA 0%, #764BA2 100%)">
            <Text position="absolute" top="22px" fontSize="12px" fontWeight={600} letterSpacing="0.06em">{front.label}</Text>
            <Text fontSize={{ base: '36px', md: '48px' }} fontWeight={800} lineHeight="1.1" color={vnFirst ? 'white' : '#1A202C'} wordBreak="break-word">{front.main}</Text>
            {!vnFirst && item.pos && <Text mt="14px" bg="whiteAlpha.400" borderRadius="9999px" px="12px" py="3px" fontSize="14px" fontWeight={700}>{item.pos}</Text>}
            {!vnFirst && item.ipa && <Text mt="10px" fontSize="16px" fontStyle="italic">{item.ipa}</Text>}
            <Text position="absolute" bottom="22px" fontSize="12px">👆 Nhấn Space hoặc click để lật</Text>
          </Box>
          <Box {...face} bgGradient="linear(135deg, #38B2AC 0%, #4299E1 100%)" transform="rotateY(180deg)">
            <Text position="absolute" top="22px" fontSize="12px" fontWeight={600} letterSpacing="0.06em">{vnFirst ? 'TỪ TIẾNG ANH' : 'NGHĨA TIẾNG VIỆT'}</Text>
            <Text fontSize={{ base: '32px', md: '44px' }} fontWeight={800} lineHeight="1.15" color="#1A202C" wordBreak="break-word">{vnFirst ? item.word : item.meaning}</Text>
            {vnFirst && item.ipa && <Text mt="10px" fontStyle="italic">{item.ipa}</Text>}
            {item.example && (
              <Flex mt="18px" bg="whiteAlpha.300" borderRadius="12px" px="14px" py="12px" align="center" gap="8px" maxW="100%">
                <IconButton aria-label="Nghe ví dụ" icon={<FiVolume2 />} size="xs" variant="ghost" color="white"
                  onClick={(e) => { e.stopPropagation(); say(item.example); }} />
                <Text fontSize="15px" textAlign="left">Ví dụ: “{item.example}”</Text>
              </Flex>
            )}
            {item.note && <Text mt="10px" fontSize="13px" opacity={0.95}>{item.note}</Text>}
            <Text position="absolute" bottom="22px" fontSize="12px">👆 Nhấn Space hoặc click để lật lại</Text>
          </Box>
        </Box>
      </Box>

      <Flex maxW="420px" mx="auto" mt="24px" gap="8px">
        <Input value={typed} onChange={(e) => { setTyped(e.target.value); setCheck(null); }} onKeyDown={(e) => e.key === 'Enter' && !e.ctrlKey && doCheck()}
          placeholder={vnFirst ? 'Gõ từ tiếng Anh (đánh dấu đã thuộc nếu thấy đúng)' : 'Gõ nghĩa (đánh dấu đã thuộc nếu thấy đúng)'}
          borderRadius="16px" borderWidth="2px" focusBorderColor="#1CB0F6" bg="app.card"
          borderColor={check === null ? 'app.line' : check ? '#23AC38' : '#EF5350'} data-testid="fc-input" />
        <Btn3D borderRadius="24px" onClick={doCheck}>Check</Btn3D>
      </Flex>
      {check !== null && (
        <Text textAlign="center" mt="8px" fontWeight={700} color={check ? '#23AC38' : '#EF5350'}>
          {check ? '✓ Chính xác! Bấm "Thuộc" nếu bạn đã nhớ từ này.' : '✗ Chưa đúng – xem đáp án trên thẻ.'}
        </Text>
      )}

      <Flex justify="center" gap={{ base: '6px', md: '14px' }} mt="22px" wrap="wrap">
        <Box>
          <Button variant="ghost" color="#1CB0F6" leftIcon={<FiChevronLeft />} onClick={() => go(-1)} isDisabled={idx === 0}>Trước</Button>
          <Hint>Ctrl+← khi nhập</Hint>
        </Box>
        <Box>
          <IconButton aria-label="Phát âm" icon={<FiVolume2 />} borderRadius="9999px" w="48px" bg="#23AC38" color="white" _hover={{ bg: '#22A035' }}
            onClick={() => say(item.word)} />
          <Hint>Ctrl+S khi nhập</Hint>
        </Box>
        <Box>
          <Btn3D color="#FF4B4B" shadow="#D93636" borderRadius="24px" w="112px" leftIcon={<Icon as={FiX} />} onClick={() => mark(false)}>Quên</Btn3D>
          <Hint>Ctrl+1/X khi nhập</Hint>
        </Box>
        <Box>
          <Btn3D borderRadius="24px" w="118px" leftIcon={<Icon as={FiCheck} />} onClick={() => mark(true)}>Thuộc</Btn3D>
          <Hint>Ctrl+2/C khi nhập</Hint>
        </Box>
        <Box>
          <Button variant="ghost" color="#1CB0F6" rightIcon={<FiChevronRight />} onClick={() => go(1)}>Tiếp</Button>
          <Hint>Ctrl+→ khi nhập</Hint>
        </Box>
      </Flex>
    </GameShell>
  );
}
