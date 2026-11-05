import { useEffect, useRef, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, ModalHeader, ModalFooter, Flex, Box, Text, Button, Select,
  Menu, MenuButton, MenuList, MenuItem, Table, Thead, Tbody, Tr, Th, Td, Input, IconButton, Textarea, useToast,
  Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, Code,
} from '@chakra-ui/react';
import { FiUpload, FiChevronDown, FiHelpCircle, FiZap, FiPlus, FiTrash2, FiFileText, FiGrid, FiDownload } from 'react-icons/fi';
import { api } from '../../api';
import { parseWordsFile, parseQuickText, downloadTemplate } from '../../lib/wordsFile';
import { Btn3D } from '../ui';

let keySeq = 0;
const emptyRow = () => ({ key: ++keySeq, word: '', ipa: '', meaning: '', pos: '', example: '', note: '' });
const isBlank = (r) => !['word', 'ipa', 'meaning', 'pos', 'example', 'note'].some((f) => r[f]?.trim());
const isValid = (r) => r.word?.trim() && r.meaning?.trim();

const cell = { size: 'sm', borderRadius: '10px', borderWidth: '1px', focusBorderColor: '#1CB0F6' };

function QuickAddModal({ isOpen, onClose, onAdd }) {
  const [text, setText] = useState('');
  const rows = parseQuickText(text);
  useEffect(() => { if (isOpen) setText(''); }, [isOpen]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent borderRadius="32px" mx="12px">
        <ModalHeader fontSize="20px" fontWeight={600}>Thêm nhanh từ vựng (Paste)</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          <Box bg="#FFFBEB" _dark={{ bg: 'whiteAlpha.100' }} borderRadius="14px" p="12px" fontSize="13px" mb="12px">
            <Text fontWeight={700} mb="4px">💡 Định dạng: mỗi dòng 1 từ, các cột cách nhau bằng dấu |</Text>
            <Code fontSize="12px" bg="transparent" px={0}>từ vựng | /phiên âm/ | loại từ | nghĩa | ví dụ | ghi chú</Code>
            <Text mt="6px" color="app.muted">Mẹo: nhờ ChatGPT/Claude tạo danh sách theo đúng định dạng trên rồi dán vào đây.</Text>
          </Box>
          <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} borderRadius="14px" fontFamily="mono" fontSize="13px"
            placeholder={'apple | /ˈæp.əl/ | noun | quả táo | I eat an apple every day. |\nimprove | /ɪmˈpruːv/ | verb | cải thiện | Practice helps you improve. | đồng nghĩa: enhance'} />
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" onClick={onClose}>Hủy</Button>
          <Btn3D isDisabled={!rows.length} onClick={() => { onAdd(rows); onClose(); }}>Xem trước ({rows.length} dòng)</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function BulkAddModal({ isOpen, onClose, categories, defaultCategoryId, onSaved, onCreateCategory, initialRows }) {
  const toast = useToast();
  const [categoryId, setCategoryId] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const fileRef = useRef(null);
  const acceptRef = useRef('.csv');

  useEffect(() => {
    if (!isOpen) return;
    setRows(initialRows?.length ? initialRows.map((w) => ({ ...emptyRow(), ...w })) : [emptyRow()]);
    setCategoryId(String(defaultCategoryId || categories[0]?.id || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // khi vừa tạo bộ từ mới, tự chọn bộ đó
  useEffect(() => {
    if (isOpen && defaultCategoryId) setCategoryId(String(defaultCategoryId));
  }, [defaultCategoryId, isOpen]);

  const appendRows = (items) => {
    const mapped = items.map((w) => ({ ...emptyRow(), ...w }));
    setRows((r) => [...r.filter((x) => !isBlank(x)), ...mapped]);
  };

  const pickFile = (accept) => {
    acceptRef.current = accept;
    fileRef.current.accept = accept;
    fileRef.current.value = '';
    fileRef.current.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const items = await parseWordsFile(file);
      if (!items.length) throw new Error('Không tìm thấy dòng dữ liệu nào trong file');
      appendRows(items);
      toast({ status: 'success', title: `Đã đọc ${items.length} dòng từ "${file.name}"`, description: 'Kiểm tra lại rồi bấm Lưu.' });
    } catch (err) {
      toast({ status: 'error', title: err.message });
    }
  };

  const setField = (key, f, v) => setRows((r) => r.map((x) => (x.key === key ? { ...x, [f]: v } : x)));
  const filled = rows.filter((r) => !isBlank(r));
  const valid = filled.filter(isValid);
  const invalidCount = filled.length - valid.length;

  const save = async () => {
    setBusy(true);
    try {
      const r = await api('/vocabularies/bulk', { method: 'POST', body: { categoryId: Number(categoryId), items: valid } });
      toast({ status: 'success', title: `Đã lưu ${r.added} từ` });
      onSaved?.(Number(categoryId));
      onClose();
    } catch (err) {
      toast({ status: 'error', title: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="full" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius={{ base: 0, md: '32px' }} maxW={{ base: '100%', md: 'min(1360px, calc(100vw - 48px))' }}
          my={{ base: 0, md: '32px' }} minH="auto" maxH={{ base: '100vh', md: 'calc(100vh - 64px)' }}>
          <ModalCloseButton top="18px" right="18px" />
          <Box px="24px" pt="22px" pb="12px" pr="64px">
            <Flex align="center" gap="10px" wrap="wrap">
              <Text fontSize="18px" fontWeight={700}>Thêm vào bộ từ:</Text>
              <Select size="sm" w="auto" minW="200px" borderRadius="999px" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                placeholder={categories.length ? undefined : 'Chưa có bộ từ'}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button size="sm" variant="outline" borderRadius="999px" leftIcon={<FiPlus />} onClick={onCreateCategory}>Tạo mới</Button>
            </Flex>
            <Flex gap="8px" mt="12px" wrap="wrap">
              <Menu>
                <MenuButton as={Btn3D} size="sm" h="34px" borderRadius="999px" leftIcon={<FiUpload />} rightIcon={<FiChevronDown />}>Nhập file</MenuButton>
                <MenuList>
                  <MenuItem icon={<FiFileText />} onClick={() => pickFile('.csv,.txt')}>Nhập file CSV (.csv)</MenuItem>
                  <MenuItem icon={<FiGrid />} onClick={() => pickFile('.xlsx')}>Nhập file Excel (.xlsx)</MenuItem>
                </MenuList>
              </Menu>
              <Popover placement="bottom-start">
                <PopoverTrigger>
                  <Button size="sm" h="34px" variant="outline" borderRadius="999px" leftIcon={<FiHelpCircle />}>Hướng dẫn</Button>
                </PopoverTrigger>
                <PopoverContent borderRadius="16px" w="360px">
                  <PopoverArrow />
                  <PopoverBody fontSize="13px" p="14px">
                    <Text fontWeight={700} mb="6px">Nhập từ file CSV / Excel</Text>
                    <Text>Dòng đầu là tiêu đề cột: <b>Từ vựng, Phiên âm, Loại từ, Nghĩa, Ví dụ, Ghi chú</b> (chấp nhận cả tiêu đề tiếng Anh: word, ipa, pos, meaning, example, note).</Text>
                    <Text mt="6px">Bắt buộc có <b>Từ vựng</b> và <b>Nghĩa</b>. Nếu file không có tiêu đề, các cột được hiểu theo đúng thứ tự trên.</Text>
                    <Button size="xs" mt="10px" leftIcon={<FiDownload />} onClick={downloadTemplate}>Tải file mẫu (.csv)</Button>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
              <Btn3D size="sm" h="34px" borderRadius="999px" leftIcon={<FiZap />} onClick={() => setQuickOpen(true)}>Thêm nhanh</Btn3D>
            </Flex>
            <input ref={fileRef} type="file" hidden onChange={onFile} data-testid="file-input" />
          </Box>

          <ModalBody px={{ base: '8px', md: '24px' }}>
            <Box overflowX="auto">
              <Table size="sm" sx={{ th: { fontSize: '11px', color: '#718096', bg: '#F7FAFC', _dark: { bg: 'whiteAlpha.50' } }, td: { px: '4px', borderColor: 'app.line' } }}>
                <Thead>
                  <Tr>
                    <Th w="36px">#</Th>
                    <Th minW="150px">Từ vựng <Text as="span" color="red.400">*</Text></Th>
                    <Th minW="130px">Phiên âm</Th>
                    <Th minW="170px">Nghĩa <Text as="span" color="red.400">*</Text></Th>
                    <Th minW="100px">Loại từ</Th>
                    <Th minW="200px">Ví dụ</Th>
                    <Th minW="160px">Ghi chú</Th>
                    <Th w="40px" />
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((r, i) => {
                    const bad = !isBlank(r) && !isValid(r);
                    return (
                      <Tr key={r.key} bg={bad ? 'red.50' : undefined} _dark={{ bg: bad ? 'red.900' : undefined }}>
                        <Td fontWeight={700} px="8px !important">{i + 1}</Td>
                        <Td><Input {...cell} placeholder={i === 0 ? 'Hello' : undefined} value={r.word} onChange={(e) => setField(r.key, 'word', e.target.value)} isInvalid={bad && !r.word.trim()} /></Td>
                        <Td><Input {...cell} placeholder={i === 0 ? '/həˈləʊ/' : undefined} value={r.ipa} onChange={(e) => setField(r.key, 'ipa', e.target.value)} /></Td>
                        <Td><Input {...cell} placeholder={i === 0 ? 'Xin chào' : undefined} value={r.meaning} onChange={(e) => setField(r.key, 'meaning', e.target.value)} isInvalid={bad && !r.meaning.trim()} /></Td>
                        <Td><Input {...cell} placeholder={i === 0 ? 'noun' : undefined} value={r.pos} onChange={(e) => setField(r.key, 'pos', e.target.value)} /></Td>
                        <Td><Input {...cell} placeholder={i === 0 ? 'Hello world' : undefined} value={r.example} onChange={(e) => setField(r.key, 'example', e.target.value)} /></Td>
                        <Td><Input {...cell} placeholder={i === 0 ? 'Đồng/trái nghĩa...' : undefined} value={r.note} onChange={(e) => setField(r.key, 'note', e.target.value)} /></Td>
                        <Td>
                          <IconButton size="sm" variant="ghost" color="#1CB0F6" aria-label="Xóa dòng" icon={<FiTrash2 />}
                            onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [emptyRow()]))} />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
            <Button mt="10px" w="100%" variant="outline" borderStyle="dashed" borderRadius="14px" leftIcon={<FiPlus />}
              onClick={() => setRows((r) => [...r, emptyRow()])}>
              Thêm dòng
            </Button>
          </ModalBody>

          <Flex align="center" justify="space-between" gap="10px" px="24px" py="14px" borderTop="1px solid" borderColor="app.line" wrap="wrap">
            <Text fontSize="13px" color={invalidCount ? 'red.500' : 'app.muted'}>
              {invalidCount ? `${invalidCount} dòng thiếu Từ vựng hoặc Nghĩa sẽ bị bỏ qua` : `${valid.length} từ hợp lệ`}
            </Text>
            <Flex gap="10px">
              <Button variant="ghost" color="#1CB0F6" onClick={onClose}>Hủy</Button>
              <Btn3D isDisabled={!valid.length || !categoryId} isLoading={busy} onClick={save}>Lưu {valid.length} từ</Btn3D>
            </Flex>
          </Flex>
        </ModalContent>
      </Modal>
      <QuickAddModal isOpen={quickOpen} onClose={() => setQuickOpen(false)} onAdd={appendRows} />
    </>
  );
}
