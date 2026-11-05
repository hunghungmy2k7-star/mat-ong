import { useCallback, useEffect, useState } from 'react';
import { Box, Flex, Grid, Text, Icon, IconButton, Badge, Button, Progress, Spinner, useToast } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPlay, FiFolder, FiClock, FiTrash2 } from 'react-icons/fi';
import { api } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import SrsModal from '../../practice/SrsModal';
import GameRunner from '../../practice/GameRunner';
import { useGameSettings } from '../../practice/settings';
import { DEFAULT_SRS_MODES } from '../../practice/utils';
import PathLeaderboardModal from '../../components/roadmap/PathLeaderboardModal';
import { ConfirmDialog, EmptyState } from '../../components/ui';

const card = { bg: 'app.card', borderRadius: '24px', border: '1px solid', borderColor: 'app.line', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

function SquareBtn({ children, active, ...rest }) {
  return (
    <Button h="58px" w="76px" flexDirection="column" gap="2px" borderRadius="12px" variant="outline" borderWidth="2px"
      borderColor={active ? '#F59E0B' : 'app.line'} bg={active ? '#FFFBEB' : 'app.card'} fontSize="12px" fontWeight={700} {...rest}>
      {children}
    </Button>
  );
}

export default function RoadmapDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [settings] = useGameSettings();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [game, setGame] = useState(null);

  const load = useCallback(() => api(`/paths/${slug}`).then(setData).catch((e) => setData({ error: e.message })), [slug]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>;
  if (data.error) return <EmptyState emoji="🗺️" title={data.error} />;
  const { path, sets } = data;

  if (game) return <GameRunner game={game} settings={settings} onClose={() => { setGame(null); load(); }} />;

  const pin = async () => {
    const r = await api(`/paths/${path.id}/pin`, { method: 'POST' });
    toast({ status: 'success', title: r.pinned ? 'Đã ghim lộ trình' : 'Đã bỏ ghim' });
    load();
  };

  const startSrs = ({ limit }) => {
    const srsModes = { ...DEFAULT_SRS_MODES, ...(user?.settings?.srsModes || {}) };
    const fetcher = () => api(`/srs/candidates?${new URLSearchParams({ limit: String(limit), pathId: String(path.id) })}`);
    setModal(null);
    fetcher().then((b) => {
      if (!b.items.length) { toast({ status: 'info', title: 'Không có từ cần ôn trong lộ trình này' }); return; }
      setGame({ mode: 'srs', kind: Object.values(srsModes).includes('flashcard') ? 'flashcard' : 'question', srsModes, ...b, refetch: fetcher });
    });
  };

  const removePath = async () => {
    await api(`/admin/paths/${path.id}`, { method: 'DELETE' });
    toast({ status: 'success', title: 'Đã xóa lộ trình' });
    navigate('/roadmap');
  };

  return (
    <Box>
      <Box {...card} p={{ base: '16px', md: '20px' }}>
        <Flex gap="14px" align="flex-start" wrap="wrap">
          <IconButton aria-label="Quay lại" icon={<FiArrowLeft />} borderRadius="12px" bg="#F5EFE8" _dark={{ bg: 'whiteAlpha.200' }} onClick={() => navigate('/roadmap')} />
          <Box flex="1" minW="200px">
            <Text fontSize="20px" fontWeight={800}>📚 {path.name}</Text>
            {path.description && <Text fontSize="13px" color="app.muted">{path.description}</Text>}
            <Flex gap="8px" mt="10px" wrap="wrap">
              <Badge bg="#F5EFE8" color="#4A5568" borderRadius="9999px" px="10px" py="3px" textTransform="none">{path.setCount} bộ từ</Badge>
              <Badge bg="#C6F6D5" color="#276749" borderRadius="9999px" px="10px" py="3px" textTransform="none">{path.wordCount} từ vựng</Badge>
              <Badge bg="#E9D8FD" color="#553C9A" borderRadius="9999px" px="10px" py="3px" textTransform="none">{path.progress}% hoàn thành</Badge>
            </Flex>
          </Box>
          <Flex direction="column" gap="8px" align="stretch">
            <Flex gap="8px">
              <SquareBtn active={path.pinned} onClick={pin}>📌<span>{path.pinned ? 'Đã ghim' : 'Ghim'}</span></SquareBtn>
              <SquareBtn onClick={() => setModal('bxh')}>🏆<span>BXH</span></SquareBtn>
              {path.isAdmin && <SquareBtn color="red.500" onClick={() => setModal('delete')}><Icon as={FiTrash2} /><span>Xóa</span></SquareBtn>}
            </Flex>
            <Button bgGradient="linear(to-r, #23AC38, #14B8A6)" color="white" borderRadius="12px" leftIcon={<FiClock />} _hover={{ opacity: 0.9 }}
              onClick={() => setModal('srs')}>
              Học ngắt quãng
            </Button>
          </Flex>
        </Flex>
        <Text fontSize="12px" color="app.muted" mt="14px">Tiến độ: {path.learned}/{path.wordCount} từ</Text>
        <Progress value={path.progress} mt="6px" size="sm" borderRadius="9999px" colorScheme="green" bg="#F5EFE8" />
      </Box>

      <Text fontWeight={800} mt="24px" mb="12px">Các bộ từ</Text>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap="14px">
        {sets.map((s, i) => {
          const pct = s.wordCount ? Math.round((s.learned / s.wordCount) * 100) : 0;
          return (
            <Flex key={s.id} {...card} role="button" tabIndex={0} p="14px" gap="12px" align="center" cursor="pointer" transition="all .15s"
              _hover={{ borderColor: '#23AC38', '.play': { bg: '#23AC38', color: 'white' } }}
              onClick={() => navigate(`/roadmap/${slug}/set/${s.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/roadmap/${slug}/set/${s.id}`)}
              data-testid={`set-${i + 1}`}>
              <Flex direction="column" align="center" gap="2px">
                <Flex w="44px" h="44px" borderRadius="14px" bg="#EBF8FF" align="center" justify="center"><Icon as={FiFolder} color="#F59E0B" boxSize="20px" /></Flex>
                <Text fontSize="11px" color="app.muted">#{i + 1}</Text>
              </Flex>
              <Box flex="1" minW={0}>
                <Text fontWeight={700} noOfLines={1}>{s.name}</Text>
                <Flex justify="space-between" fontSize="12px" color="app.muted" mt="2px">
                  <Text>{s.learned} / {s.wordCount} từ</Text>
                  <Text color="#23AC38" fontWeight={700}>{pct}%</Text>
                </Flex>
                <Progress value={pct} size="xs" mt="4px" borderRadius="9999px" colorScheme="green" bg="#F5EFE8" />
              </Box>
              <Flex className="play" w="38px" h="38px" borderRadius="full" bg="#EDF2F7" _dark={{ bg: 'whiteAlpha.200' }} align="center" justify="center" transition="all .15s">
                <Icon as={FiPlay} />
              </Flex>
            </Flex>
          );
        })}
      </Grid>

      <SrsModal isOpen={modal === 'srs'} onClose={() => setModal(null)} pathId={path.id} title={path.name} onStart={startSrs} />
      <PathLeaderboardModal isOpen={modal === 'bxh'} onClose={() => setModal(null)} path={path} />
      <ConfirmDialog isOpen={modal === 'delete'} onClose={() => setModal(null)} onConfirm={removePath} title="Xóa lộ trình?"
        message={`Lộ trình "${path.name}" và toàn bộ bộ từ bên trong sẽ bị xóa khỏi hệ thống. Tiến độ người học vẫn được giữ trong kho từ của họ.`} />
    </Box>
  );
}
