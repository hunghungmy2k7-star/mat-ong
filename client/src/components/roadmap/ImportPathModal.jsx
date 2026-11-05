import { useEffect, useRef, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel, Input, Textarea,
  Select, Button, Text, Flex, Slider, SliderTrack, SliderFilledTrack, SliderThumb, useToast, Box,
} from '@chakra-ui/react';
import { FiUpload, FiDownload } from 'react-icons/fi';
import { api } from '../../api';
import { parsePathFile, downloadPathTemplate } from '../../lib/wordsFile';
import { Btn3D } from '../ui';
import { DIFFICULTY } from '../PathCard';

const NEW = '__new__';

/** Quản trị: nhập một lộ trình mới từ file CSV/Excel (cột Bộ từ, Từ vựng, Phiên âm, Loại từ, Nghĩa, Ví dụ) */
export default function ImportPathModal({ isOpen, onClose, groups, onSaved }) {
  const toast = useToast();
  const [group, setGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setGroup(groups[0]?.name || NEW); setNewGroup(''); setName(''); setDescription(''); setDifficulty(1); setRows([]); setFileName('');
  }, [isOpen, groups]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const r = await parsePathFile(f);
      if (!r.length) throw new Error('Không tìm thấy dòng hợp lệ trong file');
      setRows(r);
      setFileName(f.name);
      if (!name) setName(f.name.replace(/\.(csv|xlsx|txt)$/i, ''));
    } catch (err) {
      toast({ status: 'error', title: err.message });
    }
  };

  const sets = [...new Set(rows.map((r) => r.setName))];
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api('/admin/paths', { method: 'POST', body: { group: group === NEW ? newGroup : group, name, description, difficulty, rows } });
      toast({ status: 'success', title: `Đã tạo lộ trình với ${r.words} từ` });
      onSaved?.(r);
      onClose();
    } catch (err) {
      toast({ status: 'error', title: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="32px" maxW="520px" mx="12px">
        <ModalHeader fontSize="20px" fontWeight={600}>Nhập lộ trình từ file</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          <FormControl isRequired mb="12px">
            <FormLabel>Nhóm</FormLabel>
            <Select borderRadius="14px" value={group} onChange={(e) => setGroup(e.target.value)}>
              {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              <option value={NEW}>+ Nhóm mới…</option>
            </Select>
            {group === NEW && <Input mt="8px" borderRadius="14px" placeholder="Tên nhóm mới" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} />}
          </FormControl>
          <FormControl isRequired mb="12px">
            <FormLabel>Tên lộ trình</FormLabel>
            <Input borderRadius="14px" placeholder="VD: TOEIC 600+" value={name} onChange={(e) => setName(e.target.value)} />
          </FormControl>
          <FormControl mb="12px">
            <FormLabel>Mô tả</FormLabel>
            <Textarea borderRadius="14px" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormControl>
          <FormControl mb="16px">
            <FormLabel>Độ khó: <Text as="span" color={DIFFICULTY[difficulty][0]} fontWeight={800}>{difficulty}/5</Text></FormLabel>
            <Slider min={1} max={5} value={difficulty} onChange={setDifficulty} aria-label="Độ khó">
              <SliderTrack><SliderFilledTrack bg={DIFFICULTY[difficulty][0]} /></SliderTrack>
              <SliderThumb />
            </Slider>
          </FormControl>
          <Box border="2px dashed" borderColor="app.line" borderRadius="16px" p="14px" textAlign="center">
            <Text fontSize="13px" color="app.muted">Cột bắt buộc: <b>Bộ từ, Từ vựng, Nghĩa</b> (tùy chọn: Phiên âm, Loại từ, Ví dụ)</Text>
            <Flex justify="center" gap="8px" mt="10px">
              <Btn3D size="sm" leftIcon={<FiUpload />} onClick={() => fileRef.current.click()}>Chọn file CSV/Excel</Btn3D>
              <Button size="sm" variant="outline" borderRadius="12px" leftIcon={<FiDownload />} onClick={downloadPathTemplate}>File mẫu</Button>
            </Flex>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.txt" hidden onChange={onFile} data-testid="path-file" />
            {fileName && <Text mt="10px" fontSize="13px" color="#23AC38" fontWeight={700}>{fileName}: {rows.length} từ · {sets.length} bộ từ</Text>}
          </Box>
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" onClick={onClose}>Hủy</Button>
          <Btn3D isLoading={busy} isDisabled={!rows.length || !name.trim() || (group === NEW && !newGroup.trim())} onClick={submit}>Tạo lộ trình</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
