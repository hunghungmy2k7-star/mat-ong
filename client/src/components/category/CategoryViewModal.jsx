import { useEffect, useMemo, useState } from 'react';
import ShareModal from '../community/ShareModal';
import {
  Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Flex, Box, Text, Button, Menu, MenuButton, MenuList,
  MenuItem, Table, Thead, Tbody, Tr, Th, Td, Input, Textarea, IconButton, Spinner, useToast, Icon,
} from '@chakra-ui/react';
import { FiDownload, FiChevronDown, FiEdit2, FiX, FiTrash2, FiSave, FiFileText, FiGrid, FiShare2 } from 'react-icons/fi';
import { api } from '../../api';
import { exportCsv, exportExcel } from '../../lib/wordsFile';
import { Btn3D, PosBadge, SpeakButton, EmptyState } from '../ui';

const cellInput = { size: 'sm', borderRadius: '8px', variant: 'filled', bg: 'transparent', _hover: { bg: 'blackAlpha.50' }, _focus: { bg: 'app.card', borderColor: '#1CB0F6' } };
const FIELDS = ['word', 'ipa', 'pos', 'meaning', 'example', 'note'];

export default function CategoryViewModal({ categoryId, isOpen, onClose, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = () => api(`/categories/${categoryId}/vocabularies`).then(setData).catch((e) => toast({ status: 'error', title: e.message }));

  useEffect(() => {
    if (isOpen && categoryId) {
      setData(null);
      setEditing(false);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, categoryId]);

  const startEdit = () => {
    setDraft(data.items.map((w) => ({ ...w })));
    setDeleted([]);
    setEditing(true);
  };

  const changes = useMemo(() => {
    if (!editing || !data) return { updates: [], count: 0 };
    const orig = Object.fromEntries(data.items.map((w) => [w.id, w]));
    const updates = draft.filter((w) => FIELDS.some((f) => (w[f] || '') !== (orig[w.id]?.[f] || '')));
    return { updates, count: updates.length + deleted.length };
  }, [editing, draft, deleted, data]);

  const setField = (id, field, value) => setDraft((d) => d.map((w) => (w.id === id ? { ...w, [field]: value } : w)));

  const save = async () => {
    setSaving(true);
    try {
      await api(`/categories/${categoryId}/vocabularies`, { method: 'PUT', body: { updates: changes.updates, deletes: deleted } });
      toast({ status: 'success', title: 'Đã lưu thay đổi' });
      setEditing(false);
      await load();
      onChanged?.();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setSaving(false);
    }
  };

  const items = editing ? draft : data?.items || [];
  const name = data?.category?.name;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius={{ base: 0, md: '32px' }} maxW={{ base: '100%', md: 'min(1120px, calc(100vw - 48px))' }}
        my={{ base: 0, md: '32px' }} minH="auto" maxH={{ base: '100vh', md: 'calc(100vh - 64px)' }}>
        <ModalCloseButton top="18px" right="18px" />
        <Flex align="center" justify="space-between" gap="12px" wrap="wrap" px="24px" pt="22px" pb="14px" pr="64px">
          <Box minW={0}>
            <Text fontSize="20px" fontWeight={800} noOfLines={1}>{data?.category?.icon} {name || '...'}</Text>
            <Text fontSize="13px" color="app.muted">{data ? `${data.items.length} từ vựng` : ''}</Text>
          </Box>
          {data && (
            <Flex gap="8px">
              <Menu>
                <MenuButton as={Button} size="sm" variant="outline" borderRadius="999px" leftIcon={<FiDownload />} rightIcon={<FiChevronDown />} isDisabled={!data.items.length}>
                  Xuất
                </MenuButton>
                <MenuList>
                  <MenuItem icon={<FiFileText />} onClick={() => exportCsv(data.items, name)}>CSV</MenuItem>
                  <MenuItem icon={<FiGrid />} onClick={() => exportExcel(data.items, name)}>Excel</MenuItem>
                </MenuList>
              </Menu>
              {!data.category?.isPath && (
                <Button size="sm" variant="outline" borderRadius="999px" leftIcon={<FiShare2 />} onClick={() => setSharing(true)}>Chia sẻ</Button>
              )}
              {editing ? (
                <Button size="sm" variant="outline" borderRadius="999px" leftIcon={<FiX />} onClick={() => setEditing(false)}>Hủy</Button>
              ) : (
                <Btn3D size="sm" borderRadius="999px" leftIcon={<FiEdit2 />} onClick={startEdit} isDisabled={!data.items.length}>Chỉnh sửa</Btn3D>
              )}
            </Flex>
          )}
        </Flex>

        <ModalBody px={{ base: '8px', md: '16px' }} pb="16px">
          {!data ? (
            <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>
          ) : !items.length ? (
            <EmptyState emoji="📭" title="Bộ từ chưa có từ nào">Vào trang Từ vựng → "Thêm nhiều từ" để thêm từ hoặc nhập file CSV/Excel.</EmptyState>
          ) : (
            <Box overflowX="auto">
              <Table size="sm" sx={{ 'th': { fontSize: '11px', color: '#718096', letterSpacing: '0.04em' }, 'td': { borderColor: 'app.line' } }}>
                <Thead position="sticky" top={0} bg="app.card" zIndex={1}>
                  <Tr>
                    <Th w="40px">#</Th>
                    <Th minW="180px">Từ vựng</Th>
                    <Th minW="180px">Nghĩa</Th>
                    <Th minW="110px">Loại từ</Th>
                    <Th minW="240px">Ví dụ</Th>
                    {editing && <Th w="50px">Xóa</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {items.map((w, i) => (
                    <Tr key={w.id} _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.50' } }} verticalAlign="top">
                      <Td fontWeight={700} pt="14px">{i + 1}</Td>
                      {editing ? (
                        <>
                          <Td>
                            <Input {...cellInput} fontWeight={700} value={w.word || ''} onChange={(e) => setField(w.id, 'word', e.target.value)} placeholder="Từ vựng" />
                            <Input {...cellInput} mt="4px" value={w.ipa || ''} onChange={(e) => setField(w.id, 'ipa', e.target.value)} placeholder="/phiên âm/" />
                          </Td>
                          <Td><Input {...cellInput} value={w.meaning || ''} onChange={(e) => setField(w.id, 'meaning', e.target.value)} placeholder="Nghĩa" /></Td>
                          <Td><Input {...cellInput} value={w.pos || ''} onChange={(e) => setField(w.id, 'pos', e.target.value)} placeholder="Loại từ" /></Td>
                          <Td>
                            <Textarea {...cellInput} rows={2} value={w.example || ''} onChange={(e) => setField(w.id, 'example', e.target.value)} placeholder="Ví dụ" />
                            <Textarea {...cellInput} rows={2} mt="4px" value={w.note || ''} onChange={(e) => setField(w.id, 'note', e.target.value)} placeholder="Ghi chú" />
                          </Td>
                          <Td>
                            <IconButton size="sm" variant="ghost" color="#1CB0F6" aria-label="Xóa từ" icon={<FiTrash2 />}
                              onClick={() => { setDeleted((d) => [...d, w.id]); setDraft((d) => d.filter((x) => x.id !== w.id)); }} />
                          </Td>
                        </>
                      ) : (
                        <>
                          <Td>
                            <Flex align="center" gap="4px">
                              <SpeakButton text={w.word} />
                              <Text fontWeight={700}>{w.word}</Text>
                            </Flex>
                            {w.ipa && <Text fontSize="12px" color="app.muted" fontStyle="italic" pl="26px">{w.ipa}</Text>}
                          </Td>
                          <Td>{w.meaning}</Td>
                          <Td><PosBadge pos={w.pos} /></Td>
                          <Td fontSize="13px" color="app.muted">{w.example || '-'}</Td>
                        </>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </ModalBody>

        {editing && (
          <Flex align="center" justify="space-between" px="24px" py="14px" borderTop="1px solid" borderColor="app.line">
            <Text fontSize="13px" color="app.muted">{changes.count ? `${changes.count} thay đổi chưa lưu` : 'Chưa có thay đổi nào.'}</Text>
            <Flex gap="10px">
              <Button variant="ghost" color="#1CB0F6" onClick={() => setEditing(false)}>Hủy</Button>
              <Btn3D leftIcon={<Icon as={FiSave} />} isDisabled={!changes.count} isLoading={saving} onClick={save}>Lưu</Btn3D>
            </Flex>
          </Flex>
        )}
      </ModalContent>
      <ShareModal isOpen={sharing} kind="category" item={sharing ? { id: categoryId, name } : null} onClose={() => setSharing(false)} />
    </Modal>
  );
}
