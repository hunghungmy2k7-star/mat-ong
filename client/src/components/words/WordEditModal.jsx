import { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel, Input,
  Textarea, Button, SimpleGrid, useToast,
} from '@chakra-ui/react';
import { api } from '../../api';
import { Btn3D } from '../ui';

const POS = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'preposition', 'pronoun', 'conjunction', 'idiom', 'phrasal verb'];
const inp = { borderRadius: '14px', borderWidth: '2px', focusBorderColor: '#1CB0F6' };

export default function WordEditModal({ word, isOpen, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isOpen && word) setF({ word: word.word || '', meaning: word.meaning || '', ipa: word.ipa || '', pos: word.pos || '', example: word.example || '', note: word.note || '' });
  }, [isOpen, word]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await api(`/vocabularies/${word.id}`, { method: 'PATCH', body: f });
      toast({ status: 'success', title: 'Đã cập nhật từ vựng' });
      onSaved?.(saved);
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
      <ModalContent as="form" onSubmit={submit} borderRadius="32px" maxW="576px" mx="12px">
        <ModalHeader fontSize="20px" fontWeight={600}>Chỉnh sửa từ vựng</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="14px">
            <FormControl isRequired><FormLabel>Từ vựng</FormLabel><Input {...inp} placeholder="VD: Apple" value={f.word || ''} onChange={set('word')} /></FormControl>
            <FormControl isRequired><FormLabel>Nghĩa</FormLabel><Input {...inp} placeholder="VD: Quả táo" value={f.meaning || ''} onChange={set('meaning')} /></FormControl>
            <FormControl><FormLabel>Phiên âm</FormLabel><Input {...inp} placeholder="/ˈæp.l̩/" value={f.ipa || ''} onChange={set('ipa')} /></FormControl>
            <FormControl>
              <FormLabel>Loại từ</FormLabel>
              <Input {...inp} list="pos-list" placeholder="Chọn loại từ" value={f.pos || ''} onChange={set('pos')} />
              <datalist id="pos-list">{POS.map((p) => <option key={p} value={p} />)}</datalist>
            </FormControl>
          </SimpleGrid>
          <FormControl mt="14px"><FormLabel>Ví dụ</FormLabel><Textarea {...inp} placeholder="VD: I eat an apple every day." value={f.example || ''} onChange={set('example')} /></FormControl>
          <FormControl mt="14px"><FormLabel>Ghi chú mở rộng</FormLabel><Textarea {...inp} placeholder="VD: Đồng nghĩa: big, enormous. Trái nghĩa: small" value={f.note || ''} onChange={set('note')} /></FormControl>
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" onClick={onClose}>Hủy</Button>
          <Btn3D type="submit" isLoading={busy}>Cập nhật</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
