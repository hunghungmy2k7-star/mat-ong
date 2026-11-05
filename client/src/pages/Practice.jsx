import { useCallback, useEffect, useState } from 'react';
import {
  Box, Flex, Grid, Text, Select, Icon, IconButton, Badge, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, Spinner, useToast,
} from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import { FiSettings, FiList, FiCheckSquare, FiGrid, FiType, FiHeadphones, FiShuffle, FiCalendar, FiClock, FiVolume2, FiBarChart2, FiRefreshCw, FiPlay } from 'react-icons/fi';
import { api } from '../api';
import CoinIcon from '../components/CoinIcon';
import { EmptyState } from '../components/ui';
import DeckPicker from '../practice/DeckPicker';
import SettingsModal from '../practice/SettingsModal';
import GameRunner from '../practice/GameRunner';
import SrsModal from '../practice/SrsModal';
import { useGameSettings } from '../practice/settings';
import { REWARD, DEFAULT_SRS_MODES } from '../practice/utils';
import { useAuth } from '../auth/AuthContext';

const MODES = [
  { key: 'flashcard', title: 'Flashcard', desc: 'Lật thẻ học từ vựng', icon: FiList, grad: 'linear(135deg, #667EEA 0%, #764BA2 100%)', min: 1 },
  { key: 'quiz', title: 'Trắc nghiệm', desc: 'Chọn đáp án đúng', icon: FiCheckSquare, grad: 'linear(135deg, #FF9600 0%, #FF6B00 100%)', min: 2 },
  { key: 'match', title: 'Nối từ với nghĩa', desc: 'Ghép đôi từ vựng và nghĩa', icon: FiGrid, grad: 'linear(135deg, #1CB0F6 0%, #0E7FC0 100%)', min: 2 },
  { key: 'typing', title: 'Gõ từ vựng', desc: 'Nhìn nghĩa và gõ từ tiếng Anh', icon: FiType, grad: 'linear(135deg, #23AC38 0%, #1F8F31 100%)', min: 1 },
  { key: 'listening', title: 'Nghe viết', desc: 'Nghe phát âm và viết từ', icon: FiHeadphones, grad: 'linear(135deg, #00B4D8 0%, #0077B6 100%)', min: 1 },
  { key: 'special', title: 'Đặc biệt', desc: 'Hỗn hợp trắc nghiệm, nghe viết, gõ từ', icon: FiShuffle, grad: 'linear(135deg, #F093FB 0%, #F5576C 100%)', hot: true, reward: REWARD.mixed },
];
const MODE_ICON = { flashcard: ['F', '#F3E8FF', '#7C3AED'], quiz: ['Q', '#FFEDD5', '#EA580C'], match: ['N', '#E0F2FE', '#0284C7'], typing: ['T', '#C6F6D5', '#23AC38'], listening: ['L', '#CFFAFE', '#0E7490'], mixed: ['H', '#FCE7F3', '#DB2777'], translate: ['D', '#E0E7FF', '#4F46E5'], sentence: ['C', '#FEF3C7', '#B45309'], flappy: ['🐝', '#E0F2FE', '#0369A1'], meteor: ['🚀', '#EDE9FE', '#6D28D9'] };
const QUIZ_TYPES = [
  { key: 'w2m', title: 'Từ -> Nghĩa', desc: 'Nhìn từ tiếng Anh, chọn nghĩa đúng', bg: '#BEE3F8', border: '#63B3ED', color: '#2B6CB0' },
  { key: 'context', title: 'Ngữ cảnh', desc: 'Che từ trong ví dụ, chọn đáp án phù hợp với câu', bg: '#FAF5FF', border: '#D6BCFA', color: '#805AD5' },
  { key: 'm2w', title: 'Nghĩa -> Từ', desc: 'Nhìn nghĩa tiếng Việt, chọn từ đúng', bg: '#F0FFF4', border: '#9AE6B4', color: '#2F855A' },
];
const CONFIG_KEY = 'matong.practiceConfig';

function loadConfig() {
  try {
    return { categoryIds: [], filter: 'notLearned', order: 'random', limit: 20, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') };
  } catch {
    return { categoryIds: [], filter: 'notLearned', order: 'random', limit: 20 };
  }
}

function ConfigBox({ label, children }) {
  return (
    <Flex direction="column" align="center" gap="8px" bg="app.card" border="2px solid" borderColor="#1A202C" _dark={{ borderColor: 'whiteAlpha.400' }}
      borderRadius="16px" boxShadow="0 4px 0 0 #E5E5E5" px="16px" py="12px">
      <Text fontSize="12px" fontWeight={600}>{label}</Text>
      {children}
    </Flex>
  );
}

const selectStyle = { h: '40px', maxW: '200px', borderRadius: '24px', borderWidth: '2px', borderColor: '#E2E8F0', bg: 'app.card' };

const SPECIALS = [
  { key: 'mixed', title: 'Luyện tập Hỗn hợp', badge: 'MẶC ĐỊNH', scheme: 'pink', emoji: '🔀', border: '#F687B3', bg: '#FFF5F7', desc: 'Random trắc nghiệm, nghe viết, gõ từ' },
  { key: 'translate', title: 'Dịch câu', badge: 'MỚI', scheme: 'purple', emoji: '📝', border: '#A3BFFA', bg: '#EBF4FF', desc: 'Gõ lại câu ví dụ tiếng Anh, các từ mở dần khi gõ đúng', example: true },
  { key: 'sentence', title: 'Luyện Đặt câu', badge: 'AI', scheme: 'orange', emoji: '✍️', border: '#F6AD55', bg: '#FFFAF0', desc: 'Tự đặt câu với từ, AI chấm điểm và sửa lỗi', max: 10 },
  { key: 'flappy', title: 'Chim Chăm Chỉ', badge: 'ARCADE', scheme: 'cyan', emoji: '🐝', border: '#76E4F7', bg: '#EDFDFD', desc: 'Bay qua ô có từ đúng nghĩa, 5 mạng', min: 2 },
  { key: 'meteor', title: 'Bắn thiên thạch', badge: 'MỚI', scheme: 'purple', emoji: '☄️', border: '#B794F4', bg: '#FAF5FF', desc: 'Gõ từ tiếng Anh để bắn thiên thạch mang nghĩa' },
];

function ChoiceModal({ isOpen, onClose, title, children, maxW = '448px' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="32px" maxW={maxW} mx="12px">
        <ModalHeader fontSize="20px" fontWeight={600}>{title}</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody pb="24px"><Flex direction="column" gap="12px">{children}</Flex></ModalBody>
      </ModalContent>
    </Modal>
  );
}

function History() {
  const [view, setView] = useState('list');
  const [rows, setRows] = useState(null);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api('/practice/history').then(setRows).catch(() => setRows([]));
    api('/practice/stats').then(setStats).catch(() => {});
  }, []);
  const fmt = (s) => {
    const d = new Date(`${s.replace(' ', 'T')}Z`);
    return `${d.toLocaleDateString('vi-VN')} • ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  };
  const accColor = (a) => (a >= 80 ? ['#C6F6D5', '#3D7200'] : ['#FEF3C7', '#92400E']);
  return (
    <Box mt="32px" borderRadius="32px" border="2px solid #E9D5FF" bgGradient="linear(to-br, #FAF5FF, #FDF2F8)"
      _dark={{ bgGradient: 'linear(to-br, #2D2440, #2D1F2B)', borderColor: 'purple.700' }} boxShadow="0 4px 20px rgba(138,43,226,0.1)" p="18px">
      <Flex align="center" justify="space-between" mb="14px">
        <Flex align="center" gap="12px">
          <Flex w="32px" h="40px" borderRadius="16px" bg="#CE82FF" align="center" justify="center"><Icon as={FiCalendar} color="white" /></Flex>
          <Text fontSize="18px" fontWeight={700}>{view === 'list' ? 'Lịch sử đấu' : 'Thống kê đấu'}</Text>
        </Flex>
        <Button size="sm" variant="ghost" color="#1CB0F6" leftIcon={view === 'list' ? <FiBarChart2 /> : <FiClock />} onClick={() => setView(view === 'list' ? 'stats' : 'list')}>
          {view === 'list' ? 'Xem thống kê' : 'Xem danh sách'}
        </Button>
      </Flex>
      {view === 'list' ? (
        !rows ? <Flex justify="center" py="20px"><Spinner color="#A855F7" /></Flex>
          : !rows.length ? <Text textAlign="center" color="app.muted" py="16px">Chưa có lượt chơi nào. Chọn một dạng bài ở trên để bắt đầu!</Text>
            : (
              <Flex direction="column" gap="12px" maxH="460px" overflowY="auto" p="2px">
                {rows.map((r) => {
                  const [ch, bg, fg] = MODE_ICON[r.mode] || ['?', '#EDF2F7', '#4A5568'];
                  const [abg, afg] = accColor(r.accuracy);
                  return (
                    <Flex key={r.id} align="center" gap="14px" bg="app.card" borderRadius="24px" border="2px solid" borderColor="#1A202C"
                      _dark={{ borderColor: 'whiteAlpha.400' }} boxShadow="0 4px 0 0 #E5E5E5" px="14px" py="12px">
                      <Flex w="32px" h="40px" borderRadius="16px" bg={bg} color={fg} fontWeight={800} align="center" justify="center">{ch}</Flex>
                      <Box flex="1" minW={0}>
                        <Text fontWeight={700} noOfLines={1}>{r.label}</Text>
                        <Text fontSize="12px" color="app.muted">{fmt(r.createdAt)} · {r.correct}/{r.total} câu</Text>
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="12px" color="app.muted">Độ chính xác</Text>
                        <Badge bg={abg} color={afg} borderRadius="9999px" px="8px">{r.accuracy}%</Badge>
                      </Box>
                      <Box textAlign="right" minW="48px">
                        <Text fontSize="12px" color="app.muted">Điểm</Text>
                        <Text fontWeight={700} color="#FF9600">+{r.score}</Text>
                      </Box>
                    </Flex>
                  );
                })}
              </Flex>
            )
      ) : (
        stats && (
          <>
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="12px">
              {[['Số lượt luyện tập', stats.sessions, '#1CB0F6', '#E0F2FE'], ['Độ chính xác TB', `${stats.accuracy}%`, '#23AC38', '#F0FFF4'],
                ['Tổng điểm', stats.totalScore, '#FF9600', '#FFF7ED'], ['Kỷ lục điểm số', stats.bestScore, '#A855F7', '#FAF5FF']].map(([l, v, c, bg]) => (
                <Box key={l} bg={bg} _dark={{ bg: 'whiteAlpha.100' }} border="2px solid" borderColor="#1A202C" borderRadius="16px" p="12px">
                  <Text fontSize="12px" color="app.muted">{l}</Text>
                  <Text fontSize="24px" fontWeight={800} color={c}>{v}</Text>
                </Box>
              ))}
            </Grid>
            <Box mt="14px" bg="app.card" border="2px solid" borderColor="#1A202C" borderRadius="20px" p="14px">
              <Text fontWeight={700} mb="8px">Thống kê theo dạng bài</Text>
              {stats.byMode.length ? stats.byMode.map((m) => (
                <Flex key={m.mode} justify="space-between" py="6px" borderBottom="1px solid" borderColor="app.line" _last={{ borderBottom: 'none' }}>
                  <Text>{m.label} <Text as="span" color="app.muted" fontSize="13px">({m.sessions} trận)</Text></Text>
                  <Text fontWeight={700} color="#23AC38">{m.accuracy}% chính xác</Text>
                </Flex>
              )) : <Text color="app.muted" fontSize="14px">Chưa có dữ liệu.</Text>}
            </Box>
          </>
        )
      )}
    </Box>
  );
}

export default function Practice() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [settings, setSettings] = useGameSettings();
  const [config, setConfig] = useState(() => {
    const c = loadConfig();
    const fromUrl = Number(params.get('category'));
    return fromUrl ? { ...c, categoryIds: [fromUrl] } : c;
  });
  const [folders, setFolders] = useState([]);
  const [cats, setCats] = useState([]);
  const [ready, setReady] = useState(null);
  const { user } = useAuth();
  const [game, setGame] = useState(null); // lượt đang chơi (null = đang ở menu)
  const [modal, setModal] = useState(null); // settings | quiz | special | srs
  const [loading, setLoading] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  // mở thẳng modal Ôn tập SRS khi đến từ thông báo nhắc học (/practice?srs=1)
  useEffect(() => { if (params.get('srs')) setModal('srs'); }, [params]);

  useEffect(() => {
    api('/folders').then(setFolders).catch(() => {});
    api('/categories?all=1').then(setCats).catch(() => {});
  }, []);

  const query = useCallback(
    (extra = {}) => new URLSearchParams({ categoryIds: config.categoryIds.join(','), filter: config.filter, order: config.order, ...extra }),
    [config]
  );

  useEffect(() => {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch { /* bỏ qua */ }
    if (!game) api(`/practice/ready-count?${query()}`).then((r) => setReady(r.count)).catch(() => setReady(0));
  }, [config, query, game]);

  const start = useCallback(async (spec, fetcher, minItems = 1) => {
    setModal(null);
    setLoading(true);
    try {
      const batch = await fetcher();
      if (!batch.items.length) {
        toast({ status: 'warning', title: 'Không có từ nào phù hợp', description: 'Hãy đổi bộ lọc (ví dụ "Tất cả") hoặc thêm từ vựng vào bộ từ.' });
        return;
      }
      if (batch.items.length < minItems) {
        toast({ status: 'warning', title: `Dạng bài này cần ít nhất ${minItems} từ trong lượt chơi` });
        return;
      }
      setGame({ ...spec, items: batch.items, pool: batch.pool, refetch: fetcher });
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const launch = (mode, quizType) => {
    const def = MODES.find((m) => m.key === mode) || {};
    start({ mode, quizType }, () => api(`/practice/batch?${query({ limit: String(config.limit) })}`), mode === 'match' ? 2 : def.min || 1);
  };

  const launchSpecial = (g) => {
    if (g.key === 'mixed') { launch('mixed'); return; }
    const limit = String(g.max ? Math.min(g.max, config.limit) : config.limit);
    const extra = g.example ? { limit, withExample: '1' } : { limit };
    start({ mode: g.key, kind: g.key }, () => api(`/practice/batch?${query(extra)}`), g.min || 1);
  };

  const launchSrs = ({ limit, categoryIds }) => {
    const srsModes = { ...DEFAULT_SRS_MODES, ...(user?.settings?.srsModes || {}) };
    const qs = new URLSearchParams({ limit: String(limit), categoryIds: categoryIds.join(',') });
    start({ mode: 'srs', kind: Object.values(srsModes).includes('flashcard') ? 'flashcard' : 'question', srsModes },
      () => api(`/srs/candidates?${qs}`));
  };

  const pick = (mode) => {
    if (mode === 'quiz') setModal('quiz');
    else if (mode === 'special') setModal('special');
    else launch(mode);
  };

  if (game) {
    return <GameRunner game={game} settings={settings} onClose={() => { setGame(null); setHistoryKey((k) => k + 1); }} />;
  }

  return (
    <Box>
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap="12px">
        <ConfigBox label="Bộ từ vựng">
          <DeckPicker folders={folders} categories={cats} value={config.categoryIds} onChange={(ids) => setConfig((c) => ({ ...c, categoryIds: ids }))} />
        </ConfigBox>
        <ConfigBox label="Bộ lọc">
          <Select {...selectStyle} value={config.filter} onChange={(e) => setConfig((c) => ({ ...c, filter: e.target.value }))} aria-label="Bộ lọc">
            <option value="notLearned">Chưa thuộc</option>
            <option value="learned">Đã thuộc</option>
            <option value="all">Tất cả</option>
          </Select>
        </ConfigBox>
        <ConfigBox label="Thứ tự">
          <Select {...selectStyle} value={config.order} onChange={(e) => setConfig((c) => ({ ...c, order: e.target.value }))} aria-label="Thứ tự">
            <option value="random">Ngẫu nhiên</option>
            <option value="ordered">Theo thứ tự</option>
          </Select>
        </ConfigBox>
        <ConfigBox label="Số lượng">
          <Select {...selectStyle} value={config.limit} onChange={(e) => setConfig((c) => ({ ...c, limit: Number(e.target.value) }))} aria-label="Số lượng">
            {[10, 20, 50, 100, 200].map((n) => <option key={n} value={n}>{n} từ</option>)}
          </Select>
        </ConfigBox>
      </Grid>

      <Flex align="center" justify="space-between" mt="20px" mb="14px" wrap="wrap" gap="8px">
        <Flex align="center" gap="6px">
          <Text fontWeight={600}>Chọn dạng bài:</Text>
          <IconButton aria-label="Cài đặt game" icon={<FiSettings />} variant="ghost" color="#1CB0F6" onClick={() => setModal('settings')} />
        </Flex>
        <Flex gap="8px">
          <Badge bg="#C6F6D5" color="#3D7200" borderRadius="9999px" px="10px" py="4px" display="flex" alignItems="center" gap="4px">
            <Icon as={FiVolume2} /> {settings.soundOn ? `${settings.volume}%` : 'Tắt'}
          </Badge>
          <Badge bg="#C6F6D5" color="#3D7200" borderRadius="9999px" px="12px" py="4px" fontSize="14px" data-testid="ready-count">
            {ready ?? '…'} từ sẵn sàng
          </Badge>
        </Flex>
      </Flex>

      {cats.length === 0 ? (
        <EmptyState emoji="📚" title="Chưa có từ vựng để học">Tạo bộ từ và thêm từ ở trang "Từ vựng" trước khi luyện tập.</EmptyState>
      ) : (
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }} gap="12px">
          {MODES.map((m) => (
            <Flex
              key={m.key}
              as="button"
              type="button"
              onClick={() => pick(m.key)}
              disabled={loading}
              direction="column"
              align="center"
              textAlign="center"
              position="relative"
              overflow="hidden"
              minH="201px"
              p="16px"
              borderRadius="24px"
              bgGradient={m.grad}
              color="white"
              boxShadow="0 0 0 2px rgba(255,255,255,0.9), 0 6px 14px rgba(0,0,0,0.12)"
              transition="transform .18s ease, box-shadow .18s ease"
              _hover={{ transform: 'translateY(-6px)', boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 14px 24px rgba(0,0,0,0.18)' }}
              data-testid={`mode-${m.key}`}
            >
              <Box position="absolute" top="-20px" right="-20px" w="80px" h="80px" borderRadius="full" bg="whiteAlpha.100" />
              {m.hot && <Badge position="absolute" top="10px" right="10px" bg="#FF4B4B" color="white" borderRadius="9999px" px="8px">HOT 🔥</Badge>}
              <Flex mt="16px" w="48px" h="52px" borderRadius="24px" bg="whiteAlpha.300" align="center" justify="center">
                <Icon as={m.icon} boxSize="22px" />
              </Flex>
              <Text mt="12px" fontSize="16px" fontWeight={700} lineHeight="22px">{m.title}</Text>
              <Text mt="6px" fontSize="12px" opacity={0.95} noOfLines={2}>{m.desc}</Text>
              <Flex mt="auto" pt="10px" align="center" gap="4px" bg="whiteAlpha.300" borderRadius="9999px" px="10px" py="3px" fontSize="12px" fontWeight={700}>
                +{m.reward || REWARD[m.key]} <CoinIcon size={13} />
              </Flex>
            </Flex>
          ))}
        </Grid>
      )}

      {cats.length > 0 && (
        <Flex mt="32px" position="relative" overflow="hidden" align="center" justify="space-between" gap="16px" wrap="wrap"
          bgGradient="linear(to-r, #FF86D0, #A855F7)" borderRadius="32px" px={{ base: '18px', md: '24px' }} py="22px"
          boxShadow="0 20px 25px -5px rgba(0,0,0,0.1)">
          <Box position="absolute" left="-80px" top="-80px" w="300px" h="300px" borderRadius="full" bg="whiteAlpha.100" />
          <Box position="relative">
            <Flex align="center" gap="8px"><Icon as={FiRefreshCw} color="white" boxSize="20px" />
              <Text fontSize="20px" fontWeight={800} color="#1A202C">Ôn tập ngắt quãng (SRS)</Text></Flex>
            <Text fontSize="14px" color="white" mt="2px">Hệ thống tự động nhắc lại các từ vựng bạn sắp quên. Học ít, nhớ lâu!</Text>
          </Box>
          <Button position="relative" h="48px" px="22px" bg="white" color="#DB2777" borderRadius="24px" fontSize="18px" fontWeight={700}
            leftIcon={<FiPlay />} boxShadow="0 10px 15px -3px rgba(0,0,0,0.1)" _hover={{ bg: '#FFF5F7' }} onClick={() => setModal('srs')}>
            Bắt đầu ôn tập
          </Button>
        </Flex>
      )}

      <History key={historyKey} />

      <SettingsModal isOpen={modal === 'settings'} onClose={() => setModal(null)} settings={settings} onChange={setSettings} />

      <SrsModal isOpen={modal === 'srs'} onClose={() => setModal(null)} categories={cats} onStart={launchSrs} />

      <ChoiceModal isOpen={modal === 'quiz'} onClose={() => setModal(null)} title="Chọn chế độ Quiz">
        {QUIZ_TYPES.map((t) => (
          <Box key={t.key} as="button" type="button" textAlign="left" p="16px" borderRadius="16px" border="2px solid" borderColor={t.border} bg={t.bg}
            _dark={{ bg: 'whiteAlpha.100' }} _hover={{ transform: 'translateY(-2px)' }} transition="transform .15s" onClick={() => launch('quiz', t.key)}>
            <Text fontWeight={800} color={t.color}>{t.title}</Text>
            <Text fontSize="13px" color="app.muted">{t.desc}</Text>
          </Box>
        ))}
      </ChoiceModal>

      <ChoiceModal isOpen={modal === 'special'} onClose={() => setModal(null)} title="Đặc biệt" maxW="768px">
        {SPECIALS.map((g) => (
          <Flex key={g.key} as="button" type="button" textAlign="left" p="12px" gap="14px" align="center" borderRadius="20px" border="2px solid" borderColor={g.border}
            bg={g.bg} _dark={{ bg: 'whiteAlpha.100' }} _hover={{ transform: 'translateY(-2px)' }} transition="transform .15s"
            onClick={() => launchSpecial(g)} data-testid={`special-${g.key}`}>
            <Flex w={{ base: '56px', md: '84px' }} h={{ base: '56px', md: '84px' }} flexShrink={0} borderRadius="16px" bg="whiteAlpha.900" _dark={{ bg: 'whiteAlpha.200' }}
              align="center" justify="center" fontSize={{ base: '28px', md: '40px' }}>{g.emoji}</Flex>
            <Box flex="1" minW={0}>
              <Flex align="center" gap="8px" wrap="wrap">
                <Text fontWeight={800}>{g.title}</Text>
                <Badge colorScheme={g.scheme} borderRadius="9999px">{g.badge}</Badge>
              </Flex>
              <Text fontSize="13px" color="app.muted" mt="4px">{g.desc} · +{REWARD[g.key]} xu mỗi câu đúng</Text>
            </Box>
          </Flex>
        ))}
      </ChoiceModal>
    </Box>
  );
}
