import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Flex, Grid, Text, Icon, IconButton, Badge, Select, Input, Table, Thead, Tbody, Tr, Th, Td, Switch, Progress, Spinner, useToast,
} from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSettings, FiList, FiCheckSquare, FiHeadphones, FiType, FiGrid, FiShuffle, FiBook, FiHash, FiShuffle as FiOrder } from 'react-icons/fi';
import { api } from '../../api';
import GameRunner from '../../practice/GameRunner';
import ModeCard from '../../practice/ModeCard';
import SettingsModal from '../../practice/SettingsModal';
import { useGameSettings } from '../../practice/settings';
import { REWARD } from '../../practice/utils';
import { PosBadge, SpeakButton, EmptyState } from '../../components/ui';

const MODES = [
  { key: 'flashcard', title: 'Flashcard', desc: 'Lật thẻ để học từ vựng', icon: FiList, grad: 'linear(135deg, #667EEA 0%, #764BA2 100%)' },
  { key: 'quiz', title: 'Quiz', desc: 'Trắc nghiệm chọn đáp án đúng', icon: FiCheckSquare, grad: 'linear(135deg, #FF9600 0%, #FF6B00 100%)' },
  { key: 'listening', title: 'Listening', desc: 'Nghe từ và gõ lại', icon: FiHeadphones, grad: 'linear(135deg, #00B4D8 0%, #0077B6 100%)' },
  { key: 'typing', title: 'Typing', desc: 'Xem nghĩa, gõ từ tiếng Anh', icon: FiType, grad: 'linear(135deg, #23AC38 0%, #1F8F31 100%)' },
  { key: 'match', title: 'Ghép cặp', desc: 'Nối từ với nghĩa', icon: FiGrid, grad: 'linear(135deg, #1CB0F6 0%, #0E7FC0 100%)' },
  { key: 'mixed', title: 'Đặc biệt', desc: 'Hỗn hợp trắc nghiệm, nghe, gõ', icon: FiShuffle, grad: 'linear(135deg, #F093FB 0%, #F5576C 100%)', hot: true },
];

const box = { bg: 'app.card', borderRadius: '24px', border: '1px solid', borderColor: 'app.line', p: { base: '14px', md: '20px' }, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

function Opt({ label, icon, children }) {
  return (
    <Box flex="1" minW="150px">
      <Text fontSize="11px" fontWeight={700} color="app.muted" mb="6px" textTransform="uppercase">{label}</Text>
      <Flex align="center" border="2px solid" borderColor="app.line" borderRadius="12px" px="10px" gap="6px">
        <Icon as={icon} color="#1CB0F6" />{children}
      </Flex>
    </Box>
  );
}

export default function WordSet() {
  const { slug, setId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useGameSettings();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('notLearned');
  const [count, setCount] = useState('all');
  const [order, setOrder] = useState('random');
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [game, setGame] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(() => api(`/word-sets/${setId}`).then(setData).catch((e) => setData({ error: e.message })), [setId]);
  useEffect(() => { load(); }, [load]);

  const words = data?.words || [];
  const learned = words.filter((w) => w.isLearned).length;
  const available = words.filter((w) => (filter === 'all' ? true : filter === 'learned' ? w.isLearned : !w.isLearned)).length;
  const shown = useMemo(() => words.filter((w) =>
    (listFilter === 'all' || (listFilter === 'learned' ? w.isLearned : !w.isLearned))
    && (!search || `${w.word} ${w.meaning}`.toLowerCase().includes(search.toLowerCase()))), [words, listFilter, search]);

  if (!data) return <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>;
  if (data.error) return <EmptyState emoji="🗺️" title={data.error} />;
  if (game) return <GameRunner game={game} settings={settings} onClose={() => { setGame(null); load(); }} />;

  const ensureCategory = async () => (await api(`/word-sets/${setId}/start`, { method: 'POST' })).categoryId;

  const start = async (mode) => {
    try {
      const categoryId = await ensureCategory();
      const limit = count === 'all' ? 200 : Number(count);
      const fetcher = () => api(`/practice/batch?${new URLSearchParams({ categoryIds: String(categoryId), filter, order, limit: String(limit) })}`);
      const b = await fetcher();
      if (!b.items.length) {
        toast({ status: 'info', title: filter === 'notLearned' ? 'Bạn đã thuộc hết bộ từ này 🎉' : 'Không có từ phù hợp', description: 'Đổi "Trạng thái" thành "Tất cả" để ôn lại.' });
        return;
      }
      if (mode === 'match' && b.items.length < 2) { toast({ status: 'warning', title: 'Ghép cặp cần ít nhất 2 từ' }); return; }
      setGame({ mode, quizType: 'w2m', ...b, refetch: fetcher });
      load();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };

  const toggleLearned = async (w) => {
    try {
      let vocabId = w.vocabId;
      if (!vocabId) {
        await ensureCategory();
        const fresh = await api(`/word-sets/${setId}`);
        vocabId = fresh.words.find((x) => x.id === w.id)?.vocabId;
      }
      await api(`/vocabularies/${vocabId}`, { method: 'PATCH', body: { isLearned: !w.isLearned } });
      load();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };

  return (
    <Box>
      <Box {...box}>
        <Flex align="center" gap="12px">
          <IconButton aria-label="Quay lại" icon={<FiArrowLeft />} borderRadius="12px" bg="#F5EFE8" _dark={{ bg: 'whiteAlpha.200' }} onClick={() => navigate(`/roadmap/${slug}`)} />
          <Box flex="1" minW={0}>
            <Text fontSize="12px" color="app.muted" noOfLines={1}>{data.set.pathName}</Text>
            <Text fontSize="22px" fontWeight={800} noOfLines={1}>{data.set.name}</Text>
          </Box>
        </Flex>
        <Flex gap="8px" mt="10px">
          <Badge bg="#F5EFE8" color="#4A5568" borderRadius="9999px" px="10px" textTransform="none">{words.length} từ vựng</Badge>
          <Badge bg="#C6F6D5" color="#276749" borderRadius="9999px" px="10px" textTransform="none">{learned}/{words.length} đã học ({words.length ? Math.round((learned / words.length) * 100) : 0}%)</Badge>
        </Flex>
        <Progress value={words.length ? (learned / words.length) * 100 : 0} mt="12px" size="sm" borderRadius="9999px" colorScheme="green" bg="#F5EFE8" />
      </Box>

      <Box {...box} mt="16px">
        <Flex justify="space-between" align="center" mb="12px">
          <Flex align="center" gap="8px"><Icon as={FiSettings} color="#A855F7" /><Text fontWeight={800}>Tùy chỉnh</Text></Flex>
          <Badge bg="#23AC38" color="white" borderRadius="9999px" px="10px" py="3px">{count === 'all' ? available : Math.min(available, Number(count))}/{words.length} từ</Badge>
        </Flex>
        <Flex gap="12px" wrap="wrap">
          <Opt label="Trạng thái" icon={FiBook}>
            <Select variant="unstyled" h="40px" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Trạng thái">
              <option value="notLearned">Chưa thuộc</option><option value="learned">Đã thuộc</option><option value="all">Tất cả</option>
            </Select>
          </Opt>
          <Opt label="Số lượng" icon={FiHash}>
            <Select variant="unstyled" h="40px" value={count} onChange={(e) => setCount(e.target.value)} aria-label="Số lượng">
              <option value="all">Toàn bộ</option>{[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} từ</option>)}
            </Select>
          </Opt>
          <Opt label="Thứ tự" icon={FiOrder}>
            <Select variant="unstyled" h="40px" value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Thứ tự">
              <option value="random">Ngẫu nhiên</option><option value="ordered">Theo thứ tự</option>
            </Select>
          </Opt>
        </Flex>
      </Box>

      <Box {...box} mt="16px">
        <Flex justify="space-between" align="center" mb="12px">
          <Text fontWeight={800}>Chọn chế độ học</Text>
          <IconButton aria-label="Cài đặt game" icon={<FiSettings />} variant="ghost" color="#1CB0F6" onClick={() => setSettingsOpen(true)} />
        </Flex>
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }} gap="12px">
          {MODES.map((m) => <ModeCard key={m.key} {...m} reward={REWARD[m.key]} onClick={() => start(m.key)} testId={`set-mode-${m.key}`} />)}
        </Grid>
      </Box>

      <Box {...box} mt="16px">
        <Flex justify="space-between" align="center" mb="10px" wrap="wrap" gap="8px">
          <Text fontWeight={800}>Danh sách từ vựng</Text>
          <Text fontSize="13px" color="app.muted">{shown.length} từ</Text>
        </Flex>
        <Flex gap="8px" mb="10px">
          <Input placeholder="Tìm kiếm từ vựng..." borderRadius="9999px" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select maxW="150px" borderRadius="9999px" value={listFilter} onChange={(e) => setListFilter(e.target.value)} aria-label="Lọc danh sách">
            <option value="all">Tất cả</option><option value="learned">Đã thuộc</option><option value="notLearned">Chưa thuộc</option>
          </Select>
        </Flex>
        <Box overflowX="auto">
          <Table size="sm" sx={{ 'th, td': { px: { base: '6px', md: '12px' } } }}>
            <Thead><Tr><Th>Từ vựng</Th><Th>Nghĩa</Th><Th display={{ base: 'none', md: 'table-cell' }}>Loại từ</Th><Th display={{ base: 'none', lg: 'table-cell' }}>Ví dụ</Th><Th textAlign="center">Thuộc</Th></Tr></Thead>
            <Tbody>
              {shown.map((w) => (
                <Tr key={w.id}>
                  <Td><Flex align="center" gap="4px"><SpeakButton text={w.word} /><Box><Text fontWeight={700}>{w.word}</Text>{w.ipa && <Text fontSize="12px" color="app.muted">{w.ipa}</Text>}</Box></Flex></Td>
                  <Td>{w.meaning}</Td>
                  <Td display={{ base: 'none', md: 'table-cell' }}><PosBadge pos={w.pos} /></Td>
                  <Td display={{ base: 'none', lg: 'table-cell' }} fontSize="13px" color="app.muted" maxW="280px">{w.example}</Td>
                  <Td textAlign="center"><Switch colorScheme="green" isChecked={w.isLearned} onChange={() => toggleLearned(w)} aria-label={`Đã thuộc ${w.word}`} /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onChange={setSettings} />
    </Box>
  );
}
