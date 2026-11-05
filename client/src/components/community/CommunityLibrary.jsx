import { useCallback, useEffect, useState } from 'react';
import { Box, Flex, Grid, Text, Icon, Input, InputGroup, InputLeftElement, Button, Badge, Spinner, useToast } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiTrendingUp, FiFolder, FiArrowUp, FiArrowLeft, FiChevronRight, FiUsers, FiList, FiCopy, FiChevronLeft } from 'react-icons/fi';
import { api } from '../../api';
import { Btn3D, EmptyState } from '../ui';
import PublicDeckModal from './PublicDeckModal';

const GRID = 'repeat(auto-fill, minmax(max(160px, calc((100% - 64px) / 5)), 1fr))';

export function PublicFolderCard({ folder, onOpen, onVote }) {
  return (
    <Box role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      position="relative" minH="168px" p="16px" borderRadius="24px" bg="#FFD54F" border="1px solid rgba(0,0,0,0.06)"
      boxShadow="0 1px 4px rgba(0,0,0,0.07)" cursor="pointer" display="flex" flexDirection="column" color="#1A202C"
      transition="transform .15s ease, box-shadow .15s ease" _hover={{ transform: 'translateY(-3px)', boxShadow: '0 8px 18px rgba(0,0,0,0.12)' }}
      data-testid={`public-folder-${folder.id}`}>
      <Box position="absolute" top="-10px" left="18px" w="56px" h="20px" bg="#FFCA28" borderRadius="8px" />
      <Flex justify="space-between" align="start" position="relative">
        <Badge bg="whiteAlpha.800" color="#166534" borderRadius="8px" px="8px" fontSize="10px">🌐 CÔNG KHAI</Badge>
        <Button size="xs" h="28px" borderRadius="999px" leftIcon={<FiArrowUp />} data-testid={`vote-${folder.id}`}
          bg={folder.voted ? '#23AC38' : 'whiteAlpha.800'} color={folder.voted ? 'white' : '#1A202C'}
          _hover={{ bg: folder.voted ? '#1F8F31' : 'white' }} aria-pressed={folder.voted}
          onClick={(e) => { e.stopPropagation(); onVote(folder); }}>
          {folder.upvotes}
        </Button>
      </Flex>
      <Text mt="auto" pt="14px" fontSize="16px" fontWeight={700} noOfLines={2} lineHeight="20px">{folder.name}</Text>
      <Flex align="center" gap="4px" mt="6px" color="#4A5568" fontSize="12px" fontWeight={500}>
        <Icon as={FiList} boxSize="12px" /> {folder.categoryCount} bộ từ
      </Flex>
      <Flex align="center" gap="4px" mt="2px" color="#5F4B00" fontSize="12px" fontWeight={600}>
        <Icon as={FiUsers} boxSize="12px" /> <Text noOfLines={1}>{folder.author}</Text>
      </Flex>
    </Box>
  );
}

export function PublicDeckCard({ cat, onView, onCopy, copying }) {
  return (
    <Flex direction="column" minH="160px" borderRadius="16px" bg="app.card" border="1px solid" borderColor="app.line"
      boxShadow="0 4px 0 0 #E5E5E5" _dark={{ boxShadow: '0 4px 0 0 #2D3748' }} data-testid={`public-deck-${cat.id}`}>
      <Box p="12px" flex="1">
        <Flex gap="8px" align="start">
          <Flex w="28px" h="28px" flexShrink={0} borderRadius="6px" bg="#EDF2F7" _dark={{ bg: 'whiteAlpha.200' }} align="center" justify="center" fontSize="16px">{cat.icon || '📚'}</Flex>
          <Text flex="1" fontSize="16px" fontWeight={800} lineHeight="22px" noOfLines={2}>{cat.name}</Text>
        </Flex>
        <Text mt="8px" fontSize="12px" color="app.muted" noOfLines={2}>{cat.description || 'Không có mô tả'}</Text>
        <Flex align="center" gap="6px" mt="8px" color="#A0AEC0"><Icon as={FiList} boxSize="14px" /><Text fontSize="14px" fontWeight={600}>{cat.wordCount} từ</Text></Flex>
      </Box>
      <Flex gap="8px" px="10px" py="8px" borderTop="1px solid" borderColor="app.line">
        <Button size="xs" h="32px" px="12px" borderRadius="24px" bg="#6366F1" color="white" boxShadow="0 3px 0 0 #4F46E5" _hover={{ bg: '#5B5EF0' }} onClick={onView}>Xem</Button>
        <Button size="xs" h="32px" px="12px" ml="auto" borderRadius="24px" leftIcon={<FiCopy />} variant="outline" borderWidth="2px"
          borderColor="#23AC38" color="#23AC38" isLoading={copying} onClick={onCopy} data-testid={`copy-deck-${cat.id}`}>Sao chép</Button>
      </Flex>
    </Flex>
  );
}

/** Hook dùng chung: sao chép bộ từ / thư mục về tài khoản, kèm toast có nút mở */
export function useCopyActions(token) {
  const toast = useToast();
  const navigate = useNavigate();
  const [copying, setCopying] = useState(null);
  const copyDeck = async (cat) => {
    setCopying(`c${cat.id}`);
    try {
      const r = await api(`/community/categories/${cat.id}/copy`, { method: 'POST', body: { token } });
      toast({ status: 'success', title: `Đã sao chép "${cat.name}" (${r.words} từ) vào Bộ từ của tôi` });
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setCopying(null);
    }
  };
  const copyFolder = async (folder) => {
    setCopying(`f${folder.id}`);
    try {
      const r = await api(`/community/folders/${folder.id}/copy`, { method: 'POST', body: { token } });
      toast({ status: 'success', title: `Đã sao chép thư mục "${folder.name}" (${r.categories} bộ từ, ${r.words} từ)` });
      navigate(`/category-list?folder=${r.folderId}`);
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setCopying(null);
    }
  };
  return { copying, copyDeck, copyFolder };
}

/** Nội dung một thư mục được chia sẻ (dùng ở tab Cộng đồng và trang /share/:token) */
export function SharedFolderView({ folder, categories, token, onBack }) {
  const { copying, copyDeck, copyFolder } = useCopyActions(token);
  const [view, setView] = useState(null);
  return (
    <>
      <Flex align="center" gap="10px" mb="16px" wrap="wrap">
        {onBack && (
          <Button size="sm" h="36px" variant="outline" borderRadius="9999px" borderWidth="2px" borderColor="#1CB0F6" color="#1CB0F6"
            leftIcon={<FiArrowLeft />} fontWeight={800} textTransform="uppercase" fontSize="13px" onClick={onBack}>Quay lại</Button>
        )}
        {onBack && <Icon as={FiChevronRight} color="app.muted" />}
        <Icon as={FiFolder} color="#F59E0B" />
        <Text fontSize="16px" fontWeight={800} textTransform="uppercase">{folder.name}</Text>
        <Badge borderRadius="999px" px="10px" py="2px" colorScheme="purple" textTransform="uppercase"><Icon as={FiUsers} mr="4px" />{folder.author}</Badge>
        <Btn3D ml={{ base: 0, md: 'auto' }} size="sm" leftIcon={<FiCopy />} isLoading={copying === `f${folder.id}`}
          isDisabled={!categories.length} onClick={() => copyFolder(folder)} data-testid="copy-folder">Sao chép folder</Btn3D>
      </Flex>
      {categories.length === 0 ? (
        <EmptyState emoji="📂" title="Thư mục này chưa có bộ từ nào" />
      ) : (
        <Grid templateColumns={GRID} gap="16px">
          {categories.map((c) => (
            <PublicDeckCard key={c.id} cat={c} onView={() => setView(c)} onCopy={() => copyDeck(c)} copying={copying === `c${c.id}`} />
          ))}
        </Grid>
      )}
      <PublicDeckModal isOpen={Boolean(view)} categoryId={view?.id} token={token} onClose={() => setView(null)}
        onCopy={(d) => copyDeck({ id: d.id, name: d.name })} copying={copying === `c${view?.id}`} />
    </>
  );
}

export default function CommunityLibrary() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const openId = params.get('cfolder') ? Number(params.get('cfolder')) : null;
  const sort = params.get('sort') === 'newest' ? 'newest' : 'trending';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null);

  const setP = (patch) => {
    const next = { tab: 'community', sort, page: String(page), q, ...patch };
    Object.keys(next).forEach((k) => (!next[k] || (k === 'page' && next[k] === '1') || (k === 'sort' && next[k] === 'trending')) && delete next[k]);
    setParams({ ...next, tab: 'community' });
  };

  const load = useCallback(() => {
    setList(null);
    api(`/community/folders?sort=${sort}&page=${page}&q=${encodeURIComponent(q)}`).then(setList).catch((e) => toast({ status: 'error', title: e.message }));
  }, [sort, page, q, toast]);

  useEffect(() => { if (!openId) load(); }, [load, openId]);
  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    api(`/community/folders/${openId}`).then(setDetail).catch((e) => { toast({ status: 'error', title: e.message }); setP({ cfolder: null }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const vote = async (f) => {
    try {
      const r = await api(`/community/folders/${f.id}/vote`, { method: 'POST' });
      setList((l) => ({ ...l, items: l.items.map((x) => (x.id === f.id ? r : x)) }));
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };

  if (openId) {
    return !detail ? <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>
      : <SharedFolderView folder={detail.folder} categories={detail.categories} onBack={() => setP({ cfolder: null })} />;
  }

  return (
    <Box>
      <Flex as="form" gap="10px" mb="16px" onSubmit={(e) => { e.preventDefault(); setP({ q: input.trim(), page: '1' }); }}>
        <InputGroup maxW="520px">
          <InputLeftElement h="48px" pointerEvents="none"><FiSearch color="#A0AEC0" /></InputLeftElement>
          <Input h="48px" borderRadius="16px" borderWidth="2px" placeholder="Tìm kiếm thư mục..." value={input} onChange={(e) => setInput(e.target.value)} />
        </InputGroup>
        <Btn3D type="submit" h="48px" px="22px" color="#1CB0F6" shadow="#1899D6" textTransform="uppercase">Tìm kiếm</Btn3D>
      </Flex>
      <Flex gap="8px" mb="18px">
        {[['trending', '↗ Thịnh hành', FiTrendingUp], ['newest', '📁 Mới nhất', FiFolder]].map(([k, label]) => (
          <Button key={k} h="38px" borderRadius="999px" fontWeight={700} border="2px solid"
            borderColor={sort === k ? '#9333EA' : 'app.line'} bg={sort === k ? '#F3E8FF' : 'app.card'} color={sort === k ? '#9333EA' : 'app.soft'}
            _dark={sort === k ? { bg: 'purple.900', color: 'purple.200' } : {}} onClick={() => setP({ sort: k, page: '1' })}>
            {label}
          </Button>
        ))}
      </Flex>

      {!list ? (
        <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>
      ) : list.items.length === 0 ? (
        <EmptyState emoji="🌍" title={q ? `Không có thư mục nào khớp "${q}"` : 'Chưa có thư mục công khai nào'}>
          Mở menu ⋮ trên thư mục của bạn → "Chia sẻ" → bật "Công khai" để đóng góp cho thư viện.
        </EmptyState>
      ) : (
        <>
          <Grid templateColumns={GRID} gap="16px" pt="10px">
            {list.items.map((f) => <PublicFolderCard key={f.id} folder={f} onOpen={() => setP({ cfolder: String(f.id) })} onVote={vote} />)}
          </Grid>
          <Flex justify="center" align="center" gap="12px" mt="24px">
            <Button size="sm" borderRadius="999px" leftIcon={<FiChevronLeft />} isDisabled={page <= 1} onClick={() => setP({ page: String(page - 1) })}>Trước</Button>
            <Text fontSize="14px" color="app.muted" data-testid="community-pages">Trang {list.page}/{list.pages} ({list.total} thư mục)</Text>
            <Button size="sm" borderRadius="999px" rightIcon={<FiChevronRight />} isDisabled={page >= list.pages} onClick={() => setP({ page: String(page + 1) })}>Sau</Button>
          </Flex>
        </>
      )}
    </Box>
  );
}
