import { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Textarea, SimpleGrid, Button, Text, Flex, Box, Radio, RadioGroup, Stack, useToast,
} from '@chakra-ui/react';
import { api } from '../../api';
import { Btn3D } from '../ui';

export const ICONS = ['📚', '📖', '📝', '✏️', '📕', '⭐', '🎯', '💡', '🔥', '💎', '🎓', '🌟'];

const modalContent = { borderRadius: '32px', maxW: '448px', mx: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' };
const inputStyle = { h: '40px', borderRadius: '16px', borderWidth: '2px', focusBorderColor: '#1CB0F6' };

// Tạo / sửa bộ từ
export function CategoryFormModal({ isOpen, onClose, category, folderId, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');
  const [busy, setBusy] = useState(false);
  const editing = Boolean(category);

  useEffect(() => {
    if (!isOpen) return;
    setName(category?.name || '');
    setDescription(category?.description || '');
    setIcon(category?.icon || '📚');
  }, [isOpen, category]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = editing
        ? await api(`/categories/${category.id}`, { method: 'PATCH', body: { name, description, icon } })
        : await api('/categories', { method: 'POST', body: { name, description, icon, folderId } });
      toast({ status: 'success', title: editing ? 'Đã cập nhật bộ từ' : 'Đã tạo bộ từ mới' });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast({ status: 'error', title: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={submit} {...modalContent}>
        <ModalHeader fontSize="20px" fontWeight={600}>{editing ? 'Sửa bộ từ' : 'Tạo bộ từ'}</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          <FormControl isRequired mb="16px">
            <FormLabel>Tên bộ từ</FormLabel>
            <Input {...inputStyle} placeholder="VD: IELTS Speaking" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
          </FormControl>
          <FormControl mb="16px">
            <FormLabel>Mô tả</FormLabel>
            <Textarea borderRadius="12px" placeholder="Mô tả về bộ từ này..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </FormControl>
          <FormControl>
            <FormLabel>Biểu tượng</FormLabel>
            <SimpleGrid columns={6} spacing="8px">
              {ICONS.map((ic) => (
                <Button
                  key={ic}
                  type="button"
                  h="40px"
                  minW={0}
                  fontSize="20px"
                  borderRadius="12px"
                  border="2px solid"
                  borderColor={icon === ic ? '#1CB0F6' : 'transparent'}
                  bg={icon === ic ? '#E0F2FE' : '#EDF2F7'}
                  _dark={{ bg: icon === ic ? 'blue.900' : 'whiteAlpha.100' }}
                  onClick={() => setIcon(ic)}
                  aria-label={`Biểu tượng ${ic}`}
                  aria-pressed={icon === ic}
                >
                  {ic}
                </Button>
              ))}
            </SimpleGrid>
          </FormControl>
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" borderRadius="24px" onClick={onClose}>Hủy</Button>
          <Btn3D type="submit" borderRadius="24px" isLoading={busy}>{editing ? 'Lưu' : 'Tạo mới'}</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Tạo / đổi tên thư mục
export function FolderFormModal({ isOpen, onClose, folder, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isOpen) setName(folder?.name || '');
  }, [isOpen, folder]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (folder) await api(`/folders/${folder.id}`, { method: 'PATCH', body: { name } });
      else await api('/folders', { method: 'POST', body: { name } });
      toast({ status: 'success', title: folder ? 'Đã đổi tên thư mục' : 'Đã tạo thư mục' });
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ status: 'error', title: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={submit} {...modalContent}>
        <ModalHeader fontSize="20px" fontWeight={600}>{folder ? 'Đổi tên thư mục' : 'Tạo thư mục'}</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          <FormControl isRequired>
            <FormLabel>Tên thư mục</FormLabel>
            <Input {...inputStyle} placeholder="VD: IELTS" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
          </FormControl>
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" borderRadius="24px" onClick={onClose}>Hủy</Button>
          <Btn3D type="submit" color="#1CB0F6" shadow="#1899D6" borderRadius="24px" isLoading={busy}>{folder ? 'Lưu' : 'Tạo thư mục'}</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Thêm các bộ từ đã chọn vào thư mục
export function MoveToFolderModal({ isOpen, onClose, folders, ids, onSaved, onCreateFolder }) {
  const toast = useToast();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isOpen) setTarget(folders[0] ? String(folders[0].id) : '');
  }, [isOpen, folders]);

  const submit = async () => {
    setBusy(true);
    try {
      await api('/categories/move', { method: 'POST', body: { ids, folderId: Number(target) } });
      toast({ status: 'success', title: `Đã thêm ${ids.length} bộ từ vào thư mục` });
      onSaved?.();
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
      <ModalContent {...modalContent}>
        <ModalHeader fontSize="20px" fontWeight={600}>Thêm {ids.length} bộ từ vào thư mục</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          {folders.length ? (
            <RadioGroup value={target} onChange={setTarget}>
              <Stack spacing="8px">
                {folders.map((f) => (
                  <Box key={f.id} as="label" display="flex" alignItems="center" gap="10px" p="12px" borderRadius="14px" border="2px solid"
                    borderColor={target === String(f.id) ? '#1CB0F6' : 'app.line'} cursor="pointer">
                    <Radio value={String(f.id)} />
                    <Text>📁 {f.name}</Text>
                    <Text ml="auto" fontSize="12px" color="app.muted">{f.categoryCount} bộ từ</Text>
                  </Box>
                ))}
              </Stack>
            </RadioGroup>
          ) : (
            <Flex direction="column" align="center" gap="10px" py="12px">
              <Text color="app.muted" fontSize="14px">Bạn chưa có thư mục nào.</Text>
              <Btn3D size="sm" color="#1CB0F6" shadow="#1899D6" onClick={onCreateFolder}>Tạo thư mục</Btn3D>
            </Flex>
          )}
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" borderRadius="24px" onClick={onClose}>Hủy</Button>
          <Btn3D color="#1CB0F6" shadow="#1899D6" borderRadius="24px" isDisabled={!target} isLoading={busy} onClick={submit}>Thêm vào thư mục</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
