import { useEffect, useState } from 'react';
import { Box, Flex, Text, Grid, Checkbox, Button, Icon, useToast } from '@chakra-ui/react';
import { FiCheck, FiX, FiSave, FiRotateCcw, FiRefreshCw, FiGrid } from 'react-icons/fi';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import CoinIcon from '../components/CoinIcon';
import { Btn3D, SpeakButton } from '../components/ui';
import { REWARD } from './utils';
import { playSound } from './sound';

function verdict(pct) {
  if (pct >= 90) return '🏆 Xuất sắc!';
  if (pct >= 70) return '🎉 Tốt lắm!';
  if (pct >= 50) return '👍 Khá ổn!';
  return '💪 Cố gắng!';
}

function WordList({ title, sub, rows, tone: t, checked, onToggle, onAll }) {
  const good = t === 'good' && Boolean(checked);
  const isGood = t === 'good';
  return (
    <Box>
      <Flex align="center" gap="10px" mb="8px">
        <Flex w="32px" h="32px" borderRadius="12px" bg={isGood ? '#C6F6D5' : '#FED7D7'} align="center" justify="center">
          <Icon as={isGood ? FiCheck : FiX} color={isGood ? '#23AC38' : '#E53E3E'} />
        </Flex>
        <Box flex="1">
          <Text fontWeight={700} color={isGood ? '#23AC38' : '#E53E3E'}>{title} ({rows.length})</Text>
          <Text fontSize="12px" color="app.muted">{sub}</Text>
        </Box>
        {good && rows.length > 0 && (
          <Button size="xs" bg="#23AC38" color="white" borderRadius="8px" leftIcon={<FiCheck />} onClick={onAll} _hover={{ bg: '#22A035' }}>Tất cả</Button>
        )}
      </Flex>
      <Box border="2px solid" borderColor={isGood ? '#9AE6B4' : '#FEB2B2'} bg={isGood ? '#F0FFF4' : '#FFF5F5'} _dark={{ bg: 'whiteAlpha.50' }}
        borderRadius="20px" maxH="300px" overflowY="auto" minH="120px">
        <Grid templateColumns={good ? '36px 1fr 1.2fr' : '1fr 1.2fr'} px="12px" py="8px" fontSize="11px" fontWeight={700} color="app.muted"
          borderBottom="1px solid" borderColor={isGood ? '#C6F6D5' : '#FED7D7'}>
          {good && <span />}<span>TỪ VỰNG</span><span>NGHĨA</span>
        </Grid>
        {rows.map(({ item }) => (
          <Grid key={item.id} templateColumns={good ? '36px 1fr 1.2fr' : '1fr 1.2fr'} px="12px" py="8px" alignItems="center"
            borderBottom="1px solid" borderColor={isGood ? '#C6F6D5' : '#FED7D7'} _last={{ borderBottom: 'none' }}>
            {good && <Checkbox colorScheme="green" isChecked={checked.has(item.id)} onChange={() => onToggle(item.id)} aria-label={`Đánh dấu ${item.word} đã thuộc`} />}
            <Flex align="center" gap="2px" minW={0}>
              <SpeakButton text={item.word} />
              <Text fontWeight={700} fontSize="14px" color={isGood ? 'app.text' : '#C53030'} noOfLines={2}>{item.word}</Text>
            </Flex>
            <Text fontSize="13px" color="app.muted" noOfLines={2}>{item.meaning}</Text>
          </Grid>
        ))}
      </Box>
    </Box>
  );
}

/** Màn kết quả sau mỗi lượt: lưu kết quả → cập nhật SRS, cộng xu, ghi lịch sử */
export default function ResultScreen({ mode, results, settings, onRetryWrong, onPlayAgain, onChooseOther, onSave, noMarkLearned, reward }) {
  const toast = useToast();
  const { user, setUser } = useAuth();
  const correct = results.filter((r) => r.correct);
  const wrong = results.filter((r) => !r.correct);
  const pct = results.length ? Math.round((correct.length / results.length) * 100) : 0;
  const coins = correct.length * (reward ?? REWARD[mode]);
  const [checked, setChecked] = useState(() => new Set(correct.map((r) => r.item.id)));
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const before = user?.coins ?? 0;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const body = { mode, results: results.map((x) => ({ id: x.item.id, correct: x.correct })), markLearned: noMarkLearned ? [] : [...checked] };
      const r = onSave ? await onSave(body) : await api('/practice/sessions', { method: 'POST', body });
      setSaved({ before, after: r.balance, coins: r.coins });
      setUser(r.user);
      playSound('coin', settings);
      toast({ status: 'success', title: `Đã lưu kết quả · +${r.coins} xu` });
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setBusy(false);
    }
  };

  const ringColor = pct >= 70 ? '#23AC38' : pct >= 50 ? '#F59E0B' : '#EF5350';

  return (
    <Box maxW="760px" mx="auto" data-testid="result">
      <Flex bg="app.card" borderRadius="24px" border="2px solid" borderColor="#1A202C" _dark={{ borderColor: 'whiteAlpha.400' }}
        p="20px" gap="16px" align="center" wrap="wrap">
        <Flex w="72px" h="72px" borderRadius="full" border="5px solid" borderColor={ringColor} align="center" justify="center" flexShrink={0}>
          <Text fontSize="20px" fontWeight={800} color={ringColor}>{pct}%</Text>
        </Flex>
        <Box flex="1" minW="180px">
          <Text fontSize="20px" fontWeight={800}>{verdict(pct)}</Text>
          <Flex gap="12px" fontSize="14px" color="app.muted" wrap="wrap">
            <Text>✓ {correct.length} đúng</Text><Text>✗ {wrong.length} sai</Text><Text>🎯 {coins} điểm</Text>
          </Flex>
        </Box>
        <Flex bg="#FFFBEB" border="2px solid #FDE68A" _dark={{ bg: 'whiteAlpha.100' }} borderRadius="20px" px="16px" py="10px" align="center" gap="14px">
          <Box>
            <Flex align="center" gap="6px" fontWeight={800} color="#92400E" _dark={{ color: 'yellow.300' }}><CoinIcon size={16} /> {saved ? 'Đã nhận' : 'Dự kiến'}</Flex>
            <Text fontSize="12px" color="app.muted">{saved ? 'Số dư coin sau khi lưu' : 'Số dư coin nếu lưu ngay'}</Text>
            <Text fontSize="13px" fontWeight={700} color="#B45309">
              {(saved?.before ?? before).toLocaleString('vi-VN')} → {(saved?.after ?? before + coins).toLocaleString('vi-VN')}
            </Text>
          </Box>
          <Flex align="center" gap="4px" bg="#FEF3C7" borderRadius="9999px" px="12px" py="6px" fontWeight={800} color="#92400E" data-testid="coin-gain">
            <CoinIcon size={16} /> {saved ? '' : '~ '}+{saved?.coins ?? coins}
          </Flex>
        </Flex>
      </Flex>

      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="16px" mt="20px">
        <WordList title="Trả lời đúng" sub={saved || noMarkLearned ? (saved ? 'Đã lưu' : '') : 'Chọn từ đánh dấu "Đã thuộc"'} rows={correct} tone="good" checked={noMarkLearned ? undefined : checked}
          onToggle={(id) => !saved && setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
          onAll={() => !saved && setChecked(new Set(correct.map((r) => r.item.id)))} />
        <WordList title="Trả lời sai" sub="Cần ôn lại" rows={wrong} tone="bad" />
      </Grid>

      <Flex justify="center" gap="12px" mt="24px" wrap="wrap">
        {!saved ? (
          <Btn3D h="48px" px="28px" leftIcon={<FiSave />} isLoading={busy} onClick={save}>Lưu &amp; Hoàn thành</Btn3D>
        ) : (
          <>
            {wrong.length > 0 && <Btn3D leftIcon={<FiRotateCcw />} onClick={() => onRetryWrong(wrong.map((w) => w.item))}>Làm lại câu sai ({wrong.length})</Btn3D>}
            <Btn3D leftIcon={<FiRefreshCw />} onClick={onPlayAgain}>Chơi tiếp</Btn3D>
            <Button variant="outline" borderRadius="16px" leftIcon={<FiGrid />} onClick={onChooseOther}>Chọn game khác</Button>
          </>
        )}
      </Flex>
    </Box>
  );
}
