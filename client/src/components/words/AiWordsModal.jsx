import { useEffect, useRef, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter, Flex, Box, Text, Textarea, Button, Badge,
  Tabs, TabList, Tab, TabPanels, TabPanel, Wrap, WrapItem, Tag, TagCloseButton, NumberInput, NumberInputField, useToast,
} from '@chakra-ui/react';
import { FiZap, FiImage } from 'react-icons/fi';
import { api } from '../../api';
import { Btn3D } from '../ui';

export function useAiStatus(deps = []) {
  const [s, setS] = useState(null);
  useEffect(() => {
    api('/ai/status').then(setS).catch(() => setS({ enabled: false, limit: 0, used: 0, remaining: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [s, setS];
}

export function AiQuota({ status }) {
  if (!status) return null;
  if (!status.enabled) return <Badge colorScheme="gray" borderRadius="8px">AI CHƯA BẬT</Badge>;
  return (
    <Flex gap="6px" wrap="wrap">
      <Badge colorScheme="green" borderRadius="8px" data-testid="ai-remaining">CÒN {status.remaining}/{status.limit} LƯỢT HÔM NAY</Badge>
      <Badge borderRadius="8px">ĐÃ DÙNG {status.used}</Badge>
    </Flex>
  );
}

const readFile = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

/** Tạo từ vựng với AI: theo chủ đề, từ đoạn văn (bôi đen để chọn), hoặc từ ảnh (OCR). Kết quả chuyển sang bảng "Thêm nhiều từ" để duyệt & lưu. */
export default function AiWordsModal({ isOpen, onClose, onGenerated, onCloseComplete }) {
  const toast = useToast();
  const [status, setStatus] = useAiStatus([isOpen]);
  const [tab, setTab] = useState(0);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState([]);
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (!isOpen || tab !== 2) return undefined;
    const onPaste = (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); takeImage(f); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab]);

  const takeImage = async (f) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { toast({ status: 'error', title: 'Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF' }); return; }
    if (f.size > 5 * 1024 * 1024) { toast({ status: 'error', title: 'Ảnh tối đa 5MB' }); return; }
    setImage(await readFile(f));
  };

  const addSelection = () => {
    const el = textRef.current;
    const sel = el ? el.value.slice(el.selectionStart, el.selectionEnd).trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '') : '';
    if (!sel) return;
    if (sel.length > 60) { toast({ status: 'warning', title: 'Hãy chọn một từ hoặc cụm từ ngắn' }); return; }
    setPicked((p) => (p.some((x) => x.toLowerCase() === sel.toLowerCase()) ? p : [...p, sel]));
  };

  const run = async () => {
    const body = tab === 0 ? { source: 'topic', topic, count } : tab === 1 ? { source: 'text', text, words: picked } : { source: 'image', image, count };
    setBusy(true);
    try {
      const r = await api('/ai/generate-words', { method: 'POST', body });
      setStatus({ enabled: true, limit: r.limit, used: r.used, remaining: r.remaining });
      toast({ status: 'success', title: `AI đã tạo ${r.words.length} từ. Kiểm tra lại rồi bấm Lưu nhé!` });
      onGenerated(r.words);
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setBusy(false);
    }
  };

  const ready = tab === 0 ? topic.trim() : tab === 1 ? picked.length : image;
  const disabled = !status?.enabled || status.remaining <= 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} onCloseComplete={onCloseComplete} size="3xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="24px" mx="12px">
        <ModalHeader fontWeight={800}>
          <Flex align="center" gap="8px"><FiZap color="#CE82FF" /> Tạo từ vựng với AI</Flex>
          <Box mt="6px"><AiQuota status={status} /></Box>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {status && !status.enabled && (
            <Box p="12px" mb="12px" borderRadius="12px" bg="#FFF7ED" color="#9A3412" fontSize="14px">
              Máy chủ chưa cấu hình khóa API của Claude (biến môi trường <b>ANTHROPIC_API_KEY</b>), nên chưa dùng được tính năng này.
            </Box>
          )}
          <Tabs variant="soft-rounded" colorScheme="purple" index={tab} onChange={setTab}>
            <TabList gap="6px" flexWrap="wrap">
              <Tab>Nhập chủ đề</Tab><Tab>Đọc hiểu</Tab><Tab>Hình ảnh</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <Textarea value={topic} maxLength={2000} rows={5} borderRadius="16px" onChange={(e) => setTopic(e.target.value)}
                  placeholder={'Ví dụ: "Từ vựng chủ đề sân bay cho người mới" hoặc dán danh sách từ: abandon, benefit, crucial...'} data-testid="ai-topic" />
                <Flex justify="space-between" mt="6px" fontSize="12px" color="app.muted" align="center" gap="10px">
                  <Flex align="center" gap="6px">Số từ tối đa
                    <NumberInput size="xs" w="70px" min={1} max={50} value={count} onChange={(_, v) => setCount(Number.isFinite(v) ? v : 10)}><NumberInputField borderRadius="8px" /></NumberInput>
                  </Flex>
                  <Text>{topic.length}/2000 · gợi ý ≤ 50 từ</Text>
                </Flex>
              </TabPanel>
              <TabPanel px={0}>
                <Text fontSize="13px" color="app.muted" mb="6px">Dán đoạn văn tiếng Anh, bôi đen từ muốn học rồi bấm "Thêm từ đã bôi đen".</Text>
                <Textarea ref={textRef} value={text} maxLength={6000} rows={7} borderRadius="16px" onChange={(e) => setText(e.target.value)}
                  onMouseUp={addSelection} onKeyUp={(e) => e.shiftKey && addSelection()} placeholder="Dán đoạn văn vào đây..." data-testid="ai-text" />
                <Button size="sm" mt="8px" borderRadius="999px" onClick={addSelection}>Thêm từ đã bôi đen</Button>
                <Wrap mt="10px">
                  {picked.map((w) => (
                    <WrapItem key={w}><Tag colorScheme="purple" borderRadius="999px">{w}<TagCloseButton onClick={() => setPicked((p) => p.filter((x) => x !== w))} /></Tag></WrapItem>
                  ))}
                </Wrap>
              </TabPanel>
              <TabPanel px={0}>
                <Flex direction="column" align="center" justify="center" gap="8px" minH="180px" border="2px dashed" borderColor="#CE82FF" borderRadius="16px"
                  p="16px" cursor="pointer" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) takeImage(f); }}>
                  {image ? <Box as="img" src={image} alt="Ảnh đã chọn" maxH="240px" borderRadius="12px" />
                    : (<><FiImage size={32} color="#CE82FF" /><Text fontWeight={700}>Kéo thả ảnh, bấm để chọn hoặc Ctrl+V</Text><Text fontSize="12px" color="app.muted">JPG, PNG, WEBP · tối đa 5MB · AI đọc chữ trong ảnh</Text></>)}
                </Flex>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden data-testid="ai-image"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) takeImage(f); }} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
        <ModalFooter flexDirection="column" gap="8px">
          <Btn3D w="100%" color="#CE82FF" shadow="#A855F7" leftIcon={<FiZap />} isLoading={busy} loadingText="AI đang soạn từ..."
            isDisabled={!ready || disabled} onClick={run} data-testid="ai-generate">Tạo từ vựng với AI</Btn3D>
          <Button w="100%" variant="ghost" borderRadius="16px" onClick={onClose}>Hủy</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
