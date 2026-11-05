import { useCallback, useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter, Box, Flex, Text, Badge, Input, Select,
  Table, Thead, Tbody, Tr, Th, Td, IconButton, Icon, Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow, Radio,
  RadioGroup, Stack, Button, NumberInput, NumberInputField, Spinner, useToast,
} from '@chakra-ui/react';
import { FiRefreshCw, FiHelpCircle, FiSettings, FiPlay, FiLock } from 'react-icons/fi';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Btn3D } from '../components/ui';
import { DEFAULT_SRS_MODES } from './utils';

export const LEVEL_COLORS = ['#A0AEC0', '#FF9600', '#FFC800', '#1CB0F6', '#CE82FF', '#23AC38'];
const MODE_LABELS = { flashcard: 'Thẻ', quiz: 'Quiz', typing: 'Gõ', listening: 'Nghe' };
const STEPS = ['0→1', '1→2', '2→3', '3→4', '4→5'];
const STEP_COLORS = ['#A0AEC0', '#FF9600', '#FFC800', '#1CB0F6', '#CE82FF'];

function relTime(iso) {
  if (!iso) return 'Ôn ngay';
  const d = (new Date(iso) - new Date()) / 864e5;
  if (d <= 0) return 'Đến hạn';
  if (d < 1) return `${Math.max(1, Math.round(d * 24))} giờ nữa`;
  return `${Math.round(d)} ngày nữa`;
}

export function SrsHelp() {
  return (
    <Popover placement="bottom-start">
      <PopoverTrigger><IconButton aria-label="SRS là gì?" icon={<FiHelpCircle />} size="xs" variant="ghost" color="#1CB0F6" /></PopoverTrigger>
      <PopoverContent w="340px" borderRadius="16px" fontSize="13px">
        <PopoverArrow />
        <PopoverBody p="14px">
          <Text fontWeight={800} mb="6px">Hệ thống Lặp lại Ngắt quãng (SRS)</Text>
          <Text>SRS giúp bạn ghi nhớ lâu bằng cách ôn tập đúng thời điểm sắp quên.</Text>
          <Text fontWeight={700} mt="8px">📈 Cách hoạt động:</Text>
          <Text>• Trả lời đúng → Tăng cấp, ôn lại sau lâu hơn</Text>
          <Text>• Trả lời sai → Giảm 1 cấp (tối thiểu Lv0), vào diện ôn ngay</Text>
          <Text fontWeight={700} mt="8px">⏰ Lịch ôn theo cấp độ:</Text>
          <Text>• Lv0: Từ mới, học ngay · Lv1: sau 1 ngày · Lv2: sau 3 ngày</Text>
          <Text>• Lv3: sau 7 ngày · Lv4: sau 14 ngày</Text>
          <Text>• Lv5: Đã thuộc, không còn lịch ôn (đổi ở "Chu kỳ ôn Level 5")</Text>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

function SrsSettingsModal({ isOpen, onClose }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [modes, setModes] = useState(DEFAULT_SRS_MODES);
  const [cycle, setCycle] = useState('0');
  useEffect(() => {
    if (!isOpen) return;
    setModes({ ...DEFAULT_SRS_MODES, ...(user?.settings?.srsModes || {}) });
    setCycle(String(user?.settings?.level5CycleDays || 0));
  }, [isOpen, user]);
  const save = async (m = modes, c = cycle) => {
    try {
      const r = await api('/srs/settings', { method: 'PUT', body: { modes: m, level5CycleDays: Number(c) } });
      setUser(r.user);
      toast({ status: 'success', title: 'Đã lưu cài đặt ôn tập' });
      onClose();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="32px" maxW="448px" mx="12px">
        <ModalHeader fontSize="18px" display="flex" alignItems="center" gap="8px"><Icon as={FiSettings} color="#23AC38" /> Dạng bài theo Level</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          <Stack spacing="8px">
            {STEPS.map((step, i) => (
              <Flex key={step} align="center" gap="10px" bg="#F7FAFC" _dark={{ bg: 'whiteAlpha.50' }} borderLeft="4px solid" borderColor={STEP_COLORS[i]} borderRadius="12px" px="10px" py="8px">
                <Badge bg="white" color={STEP_COLORS[i]} border="1px solid" borderColor={STEP_COLORS[i]} borderRadius="8px">{step}</Badge>
                {i >= 3 && <Icon as={FiLock} color="#F59E0B" boxSize="12px" title="Không có gợi ý" />}
                <RadioGroup ml="auto" value={modes[i]} onChange={(v) => setModes((m) => ({ ...m, [i]: v }))}>
                  <Flex gap="10px">
                    {Object.entries(MODE_LABELS).map(([k, l]) => <Radio key={k} value={k} size="sm" colorScheme="green"><Text fontSize="13px">{l}</Text></Radio>)}
                  </Flex>
                </RadioGroup>
              </Flex>
            ))}
          </Stack>
          <Text fontSize="12px" color="app.muted" mt="10px" textAlign="center">🔒 Level 3-4: tắt gợi ý. Chọn Thẻ ở một level sẽ áp dụng Flashcard cho toàn bộ phiên SRS.</Text>
          <Box mt="14px" bg="#EBF8FF" _dark={{ bg: 'whiteAlpha.100' }} border="2px solid #BEE3F8" borderRadius="16px" p="12px">
            <Flex align="center" gap="8px"><Text fontWeight={800}>Chu kỳ ôn Level 5</Text></Flex>
            <Text fontSize="12px" color="app.muted" mb="8px">Áp dụng ngay cho tất cả từ Level 5 hiện tại và các lần lên Lv5 sắp tới.</Text>
            <RadioGroup value={cycle} onChange={setCycle}>
              <Flex gap="12px" wrap="wrap">
                {[['0', 'Không ôn lại'], ['15', '15 ngày'], ['30', '30 ngày'], ['45', '45 ngày'], ['60', '60 ngày']].map(([v, l]) => (
                  <Radio key={v} value={v} size="sm"><Text fontSize="13px">{l}</Text></Radio>
                ))}
              </Flex>
            </RadioGroup>
          </Box>
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" onClick={() => save(DEFAULT_SRS_MODES, '0')}>Mặc định</Button>
          <Btn3D borderRadius="24px" onClick={() => save()}>Xong</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** Modal Ôn tập SRS: phân bố level, danh sách từ, bắt đầu phiên ôn. `pathId` để giới hạn trong một lộ trình */
export default function SrsModal({ isOpen, onClose, categories = [], pathId, title, onStart }) {
  const [data, setData] = useState(null);
  const [level, setLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [limit, setLimit] = useState(20);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ level, search });
    if (cat) qs.set('categoryIds', cat);
    if (pathId) qs.set('pathId', pathId);
    api(`/srs/overview?${qs}`).then(setData).catch(() => setData({ levels: [0, 0, 0, 0, 0, 0], due: 0, words: [], total: 0 }));
  }, [level, search, cat, pathId]);

  useEffect(() => {
    if (!isOpen) { setData(null); return undefined; }
    const t = setTimeout(load, data ? 200 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, load]);

  const max = Math.max(1, ...(data?.levels || [1]));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="32px" mx="12px">
        <ModalHeader display="flex" alignItems="center" gap="8px" pr="80px">
          <Icon as={FiRefreshCw} color="#23AC38" /> Ôn tập SRS
          {title && <Badge colorScheme="green" borderRadius="9999px" px="8px">{title}</Badge>}
          <SrsHelp />
        </ModalHeader>
        <IconButton aria-label="Cài đặt dạng bài theo level" icon={<FiSettings />} position="absolute" top="16px" right="52px" variant="ghost" color="#1CB0F6"
          onClick={() => setSettingsOpen(true)} />
        <ModalCloseButton top="18px" right="16px" />
        <ModalBody>
          <Box border="2px solid" borderColor="#1A202C" _dark={{ borderColor: 'whiteAlpha.400' }} borderRadius="24px" p="16px" boxShadow="0 4px 0 0 #E5E5E5">
            <Text fontSize="12px" fontWeight={800} color="app.muted" letterSpacing="0.04em">PHÂN BỐ TỪ VỰNG THEO CẤP ĐỘ</Text>
            <Flex justify="space-around" align="flex-end" h="110px" mt="10px" data-testid={data ? 'srs-levels' : undefined}>
              {(data?.levels || [0, 0, 0, 0, 0, 0]).map((n, i) => (
                <Flex key={i} direction="column" align="center" gap="4px" w="14%">
                  <Text fontSize="13px" fontWeight={800}>{n}</Text>
                  <Box w="36px" h={`${Math.max(6, (n / max) * 60)}px`} borderRadius="6px" bg={LEVEL_COLORS[i]} transition="height .3s" />
                  <Text fontSize="11px" fontWeight={700} color="app.muted">Lv{i}</Text>
                </Flex>
              ))}
            </Flex>
          </Box>

          <Flex align="center" gap="8px" mt="18px" mb="8px" wrap="wrap">
            <Text fontWeight={700} mr="auto">Từ vựng ({data?.total ?? 0})</Text>
            <Input size="sm" maxW="160px" borderRadius="9999px" placeholder="Tìm từ..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {!pathId && (
              <Select size="sm" maxW="170px" borderRadius="9999px" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">Tất cả bộ từ</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <Select size="sm" maxW="140px" borderRadius="9999px" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Lọc level">
              <option value="all">Tất cả level</option>
              <option value="due">Cần ôn</option>
              {[0, 1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Lvl {l}</option>)}
            </Select>
          </Flex>
          {!data ? <Flex justify="center" py="20px"><Spinner /></Flex> : (
            <Box maxH="260px" overflowY="auto" border="1px solid" borderColor="app.line" borderRadius="16px">
              <Table size="sm">
                <Thead position="sticky" top={0} bg="app.card"><Tr><Th>Từ vựng</Th><Th>Nghĩa</Th><Th>Level</Th><Th>Ôn tập</Th></Tr></Thead>
                <Tbody>
                  {data.words.length ? data.words.map((w) => (
                    <Tr key={w.id}>
                      <Td fontWeight={700}>{w.word}</Td>
                      <Td color="app.muted">{w.meaning}</Td>
                      <Td><Badge bg={LEVEL_COLORS[Math.min(5, w.level)]} color="white" borderRadius="9999px">Lv{w.level}</Badge></Td>
                      <Td>
                        {w.level >= 5 && !w.isDue ? <Badge colorScheme="green">Đã thuộc</Badge>
                          : w.isDue ? <Badge colorScheme="orange" variant="outline">{w.level === 0 ? 'Ôn ngay' : 'Đến hạn'}</Badge>
                            : <Text fontSize="12px" color="app.muted">{relTime(w.nextReviewAt)}</Text>}
                      </Td>
                    </Tr>
                  )) : <Tr><Td colSpan={4} textAlign="center" color="app.muted" py="20px">Không có từ nào</Td></Tr>}
                </Tbody>
              </Table>
            </Box>
          )}
        </ModalBody>
        <ModalFooter bg="#F7FAFC" _dark={{ bg: 'whiteAlpha.50' }} borderBottomRadius="32px" gap="10px" flexWrap="wrap">
          <Badge colorScheme={!data ? 'gray' : data.due ? 'orange' : 'green'} borderRadius="9999px" px="10px" py="4px" mr="auto"
            data-testid={data ? 'srs-due' : 'srs-loading'}>
            {!data ? 'Đang tải…' : data.due ? `🔥 ${data.due} TỪ CẦN ÔN` : '✅ HẾT TỪ CẦN ÔN'}
          </Badge>
          <Flex align="center" gap="6px">
            <Text fontSize="13px">Số từ:</Text>
            <NumberInput size="sm" maxW="70px" min={1} max={200} value={limit} onChange={(_, v) => setLimit(Number.isFinite(v) ? v : 20)}>
              <NumberInputField borderRadius="10px" />
            </NumberInput>
          </Flex>
          <Btn3D leftIcon={<FiPlay />} isDisabled={!data?.due} onClick={() => onStart({ limit, categoryIds: cat ? [Number(cat)] : [], pathId })}>
            Bắt đầu ôn tập
          </Btn3D>
        </ModalFooter>
      </ModalContent>
      <SrsSettingsModal isOpen={settingsOpen} onClose={() => { setSettingsOpen(false); load(); }} />
    </Modal>
  );
}
