import { useCallback, useEffect, useState } from 'react';
import {
  Box, Flex, Grid, Text, Icon, Input, InputGroup, InputLeftElement, Select, Table, Thead, Tbody, Tr, Th, Td, Checkbox, Switch,
  Button, Spinner, useToast,
} from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import { FiBook, FiCheckCircle, FiClock, FiPercent, FiSearch, FiLayers, FiZap } from 'react-icons/fi';
import { api } from '../api';
import { Btn3D, PosBadge, SpeakButton, ConfirmDialog, EmptyState } from '../components/ui';
import BulkAddModal from '../components/words/BulkAddModal';
import AiWordsModal from '../components/words/AiWordsModal';
import WordEditModal from '../components/words/WordEditModal';
import { CategoryFormModal } from '../components/category/FormModals';

const PAGE_SIZE = 40;

const STAT_CARDS = [
  { key: 'total', label: 'Tổng', icon: FiBook, grad: 'linear(135deg, #1CB0F6 0%, #49C0F8 100%)', shadow: '#1899D6' },
  { key: 'learned', label: 'Thuộc', icon: FiCheckCircle, grad: 'linear(135deg, #23AC38 0%, #4FC766 100%)', shadow: '#1F8F31' },
  { key: 'notLearned', label: 'Chưa', icon: FiClock, grad: 'linear(135deg, #FF9600 0%, #FFAB33 100%)', shadow: '#EA7E00' },
  { key: 'progress', label: '%', icon: FiPercent, grad: 'linear(135deg, #CE82FF 0%, #DDA0FF 100%)', shadow: '#A855F7', suffix: '%' },
];

const card = { bg: 'app.card', border: '2px solid', borderColor: '#1A202C', _dark: { borderColor: 'whiteAlpha.400' } };

function pageList(page, total) {
  const start = Math.max(1, Math.min(page - 2, total - 4));
  return Array.from({ length: Math.min(5, total) }, (_, i) => start + i);
}

function PageBtn({ active, children, ...rest }) {
  return (
    <Button size="sm" h="32px" minW="32px" px="10px" borderRadius="24px" fontSize="14px" fontWeight={700}
      bg={active ? '#23AC38' : 'transparent'} color={active ? 'white' : 'app.text'} border={active ? 'none' : '1px solid'}
      borderColor="app.line" boxShadow={active ? '0 4px 0 0 #1F8F31' : 'none'} _hover={{ bg: active ? '#23AC38' : 'blackAlpha.50' }} {...rest}>
      {children}
    </Button>
  );
}

export default function Words() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category') || '';
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [cats, setCats] = useState([]);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRows, setAiRows] = useState(null);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [createdCatId, setCreatedCatId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // tìm kiếm có debounce
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadMeta = useCallback(() => {
    api('/vocabularies/stats').then(setStats).catch(() => {});
    api('/categories?all=1').then(setCats).catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (query) qs.set('search', query);
    if (categoryId) qs.set('categoryId', categoryId);
    try {
      setData(await api(`/vocabularies?${qs}`));
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  }, [page, query, categoryId, toast]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadList(); setSelected([]); }, [loadList]);

  const refresh = () => { loadMeta(); loadList(); };

  const toggleLearned = async (w) => {
    setData((d) => ({ ...d, items: d.items.map((x) => (x.id === w.id ? { ...x, isLearned: !w.isLearned } : x)) }));
    try {
      await api(`/vocabularies/${w.id}`, { method: 'PATCH', body: { isLearned: !w.isLearned } });
      api('/vocabularies/stats').then(setStats);
    } catch (e) {
      toast({ status: 'error', title: e.message });
      loadList();
    }
  };

  const bulkLearned = async (isLearned) => {
    await api('/vocabularies/bulk-update', { method: 'POST', body: { ids: selected, isLearned } });
    toast({ status: 'success', title: `Đã đánh dấu ${selected.length} từ là ${isLearned ? 'đã thuộc' : 'chưa thuộc'}` });
    setSelected([]);
    refresh();
  };

  const bulkDelete = async () => {
    setBusy(true);
    try {
      await api('/vocabularies/bulk-delete', { method: 'POST', body: { ids: selected } });
      toast({ status: 'success', title: `Đã xóa ${selected.length} từ` });
      setSelected([]);
      setConfirmDelete(false);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items || [];
  const allChecked = items.length > 0 && items.every((w) => selected.includes(w.id));

  return (
    <Box>
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap="16px">
        {STAT_CARDS.map((s) => (
          <Flex key={s.key} {...card} borderRadius="24px" boxShadow={`0 4px 0 0 ${s.shadow}`} align="center" gap="16px" p={{ base: '14px', md: '20px' }}>
            <Flex w="52px" h="52px" flexShrink={0} borderRadius="24px" bgGradient={s.grad} align="center" justify="center" boxShadow="0 4px 12px rgba(0,0,0,0.15)">
              <Icon as={s.icon} color="white" boxSize="24px" />
            </Flex>
            <Box minW={0}>
              <Text fontSize="14px" fontWeight={600} color="app.muted" textTransform="uppercase">{s.label}</Text>
              <Text fontSize="24px" fontWeight={800} lineHeight="28px">{stats ? `${stats[s.key]}${s.suffix || ''}` : '–'}</Text>
            </Box>
          </Flex>
        ))}
      </Grid>

      <Flex {...card} borderRadius="32px" mt="24px" p="16px 20px" gap="10px" align="center" wrap="wrap" boxShadow="0 1px 2px rgba(0,0,0,0.05)">
        <InputGroup maxW={{ base: '100%', md: '250px' }}>
          <InputLeftElement pointerEvents="none"><Icon as={FiSearch} color="app.muted" /></InputLeftElement>
          <Input placeholder="Tìm từ..." value={search} onChange={(e) => setSearch(e.target.value)} borderRadius="24px" borderWidth="2px" focusBorderColor="#1CB0F6" />
        </InputGroup>
        <Select maxW={{ base: '100%', md: '200px' }} borderRadius="24px" borderWidth="2px" value={categoryId}
          onChange={(e) => { setPage(1); setParams(e.target.value ? { category: e.target.value } : {}); }}>
          <option value="">Tất cả</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Flex ml={{ md: 'auto' }} gap="10px">
          <Btn3D size="sm" h="32px" color="#CE82FF" shadow="#A855F7" leftIcon={<FiZap />} onClick={() => setAiOpen(true)}>Thêm từ với AI</Btn3D>
          <Btn3D size="sm" h="32px" leftIcon={<FiLayers />} onClick={() => { setAiRows(null); setBulkOpen(true); }}>Thêm nhiều từ</Btn3D>
        </Flex>
      </Flex>

      {selected.length > 0 && (
        <Flex mt="16px" p="10px 16px" borderRadius="20px" bg="#E0F2FE" _dark={{ bg: 'blue.900' }} align="center" gap="8px" wrap="wrap">
          <Text fontWeight={700} fontSize="14px" mr="auto">Đã chọn {selected.length} từ</Text>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Bỏ chọn</Button>
          <Button size="sm" colorScheme="green" variant="outline" onClick={() => bulkLearned(true)}>Thuộc</Button>
          <Button size="sm" colorScheme="orange" variant="outline" onClick={() => bulkLearned(false)}>Chưa thuộc</Button>
          <Button size="sm" colorScheme="red" onClick={() => setConfirmDelete(true)}>Xóa</Button>
        </Flex>
      )}

      <Box {...card} borderRadius="32px" mt="16px" boxShadow="0 8px 0 0 #E5E5E5" _dark={{ boxShadow: '0 8px 0 0 #2D3748', borderColor: 'whiteAlpha.400' }} overflow="hidden">
        {!data ? (
          <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>
        ) : !items.length ? (
          query || categoryId ? (
            <EmptyState emoji="🔍" title="Không tìm thấy từ nào">Thử từ khóa khác hoặc chọn "Tất cả" bộ từ.</EmptyState>
          ) : (
            <EmptyState emoji="📝" title="Chưa có từ vựng">
              Bấm "Thêm nhiều từ" để nhập từ thủ công, dán nhanh, hoặc nhập file CSV/Excel.
            </EmptyState>
          )
        ) : (
          <Box overflowX="auto">
            <Table sx={{ 'th, td': { px: { base: '8px', md: '16px' } }, th: { fontSize: '12px', fontWeight: 700, color: '#4A5568', _dark: { color: 'gray.300' }, bg: 'app.bg', py: '20px' }, td: { borderColor: 'app.line' } }}>
              <Thead>
                <Tr>
                  <Th w="36px" pr={0}>
                    <Checkbox isChecked={allChecked} isIndeterminate={!allChecked && selected.length > 0} aria-label="Chọn tất cả"
                      onChange={() => setSelected(allChecked ? [] : items.map((w) => w.id))} />
                  </Th>
                  <Th>Từ vựng</Th>
                  <Th>Nghĩa</Th>
                  <Th display={{ base: 'none', md: 'table-cell' }}>Loại từ</Th>
                  <Th display={{ base: 'none', lg: 'table-cell' }}>Ví dụ</Th>
                  <Th textAlign="center">Thuộc</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((w, i) => (
                  <Tr key={w.id} bg={i % 2 === 0 ? 'app.bg' : 'transparent'} cursor="pointer" onClick={() => setEditing(w)}
                    _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.50' } }}>
                    <Td pr={0} onClick={(e) => e.stopPropagation()}>
                      <Checkbox isChecked={selected.includes(w.id)} aria-label={`Chọn ${w.word}`}
                        onChange={() => setSelected((s) => (s.includes(w.id) ? s.filter((x) => x !== w.id) : [...s, w.id]))} />
                    </Td>
                    <Td>
                      <Flex align="center" gap="4px">
                        <SpeakButton text={w.word} />
                        <Text fontSize={{ base: '15px', md: '16px' }} fontWeight={700} wordBreak="break-word">{w.word}</Text>
                      </Flex>
                      {w.ipa && <Text fontSize="12px" color="app.muted" pl="26px">{w.ipa}</Text>}
                    </Td>
                    <Td fontSize={{ base: '14px', md: '16px' }} fontWeight={500}>{w.meaning}</Td>
                    <Td display={{ base: 'none', md: 'table-cell' }}><PosBadge pos={w.pos} /></Td>
                    <Td display={{ base: 'none', lg: 'table-cell' }} maxW="260px">
                      <Text fontSize="14px" color="#2D3748" _dark={{ color: 'gray.300' }} noOfLines={3}>{w.example || '-'}</Text>
                    </Td>
                    <Td textAlign="center" onClick={(e) => e.stopPropagation()}>
                      <Switch colorScheme="green" isChecked={w.isLearned} onChange={() => toggleLearned(w)} aria-label={`Đánh dấu ${w.word} đã thuộc`} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}

        {data && data.totalPages > 1 && (
          <Flex justify="center" align="center" gap="6px" py="20px" wrap="wrap">
            <PageBtn isDisabled={page === 1} onClick={() => setPage(1)}>«</PageBtn>
            <PageBtn isDisabled={page === 1} onClick={() => setPage(page - 1)}>Trước</PageBtn>
            {pageList(page, data.totalPages).map((p) => (
              <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
            ))}
            <PageBtn isDisabled={page === data.totalPages} onClick={() => setPage(page + 1)}>Sau</PageBtn>
            <PageBtn isDisabled={page === data.totalPages} onClick={() => setPage(data.totalPages)}>»</PageBtn>
          </Flex>
        )}
      </Box>

      <BulkAddModal
        isOpen={bulkOpen}
        onClose={() => { setBulkOpen(false); setCreatedCatId(null); setAiRows(null); }}
        initialRows={aiRows}
        categories={cats}
        defaultCategoryId={createdCatId || categoryId || null}
        onCreateCategory={() => setNewCatOpen(true)}
        onSaved={() => refresh()}
      />
      <AiWordsModal isOpen={aiOpen} onClose={() => setAiOpen(false)} onGenerated={(words) => { setAiRows(words); setAiOpen(false); }}
        onCloseComplete={() => { if (aiRows?.length) setBulkOpen(true); }} />
      <CategoryFormModal
        isOpen={newCatOpen}
        onClose={() => setNewCatOpen(false)}
        onSaved={(c) => { setCats((cs) => [c, ...cs]); setCreatedCatId(c.id); }}
      />
      <WordEditModal word={editing} isOpen={Boolean(editing)} onClose={() => setEditing(null)} onSaved={() => refresh()} />
      <ConfirmDialog isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={bulkDelete} isLoading={busy}
        title={`Xóa ${selected.length} từ?`} message="Các từ đã chọn sẽ bị xóa vĩnh viễn khỏi bộ từ của bạn." />
    </Box>
  );
}
