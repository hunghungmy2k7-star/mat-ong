import { useEffect, useRef, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Flex, Box, Text, Input, Switch, Spinner, useToast,
} from '@chakra-ui/react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { api } from '../../api';
import { Btn3D } from '../ui';

/** Chia sẻ thư mục (link + công khai lên Thư viện cộng đồng) hoặc bộ từ (link) */
export default function ShareModal({ isOpen, onClose, kind, item, onChanged }) {
  const toast = useToast();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [state, setState] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const base = kind === 'folder' ? `/folders/${item?.id}/share` : `/categories/${item?.id}/share`;

  useEffect(() => {
    if (!isOpen || !item) return;
    setState(null);
    setCopied(false);
    api(base, { method: 'POST', body: {} }).then(setState).catch((e) => { toast({ status: 'error', title: e.message }); closeRef.current(); });
  }, [isOpen, item, base, toast]);

  const link = state ? `${window.location.origin}/share/${state.token}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      document.getElementById('share-link')?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    toast({ status: 'success', title: 'Đã sao chép link', duration: 1500 });
  };
  const togglePublic = async (isPublic) => {
    setSaving(true);
    try {
      setState(await api(base, { method: 'POST', body: { isPublic } }));
      toast({ status: 'success', title: isPublic ? 'Thư mục đã hiện trong Thư viện cộng đồng' : 'Đã ẩn khỏi Thư viện cộng đồng', duration: 2000 });
      onChanged?.();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay />
      <ModalContent borderRadius="24px" mx="12px">
        <ModalHeader fontWeight={800}>Chia sẻ {kind === 'folder' ? 'thư mục' : 'bộ từ'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="24px">
          <Text fontSize="14px" color="app.muted" mb="12px">
            Ai có link đều có thể xem và sao chép <b>{item?.name}</b> vào tài khoản của họ. Tiến độ học của bạn không được chia sẻ.
          </Text>
          {!state ? (
            <Flex justify="center" py="20px"><Spinner color="#23AC38" /></Flex>
          ) : (
            <>
              <Flex gap="8px">
                <Input id="share-link" value={link} isReadOnly borderRadius="12px" fontSize="14px" onFocus={(e) => e.target.select()} data-testid="share-link" />
                <Btn3D px="16px" leftIcon={copied ? <FiCheck /> : <FiCopy />} onClick={copy}>{copied ? 'Đã chép' : 'Sao chép'}</Btn3D>
              </Flex>
              {kind === 'folder' && (
                <Flex mt="18px" p="14px" borderRadius="16px" bg="app.cell" align="center" gap="12px">
                  <Box flex="1">
                    <Text fontWeight={700} fontSize="15px">🌐 Công khai trong Thư viện cộng đồng</Text>
                    <Text fontSize="13px" color="app.muted">Mọi người có thể tìm thấy, upvote và sao chép thư mục này.</Text>
                  </Box>
                  <Switch colorScheme="green" size="lg" isChecked={state.isPublic} isDisabled={saving}
                    onChange={(e) => togglePublic(e.target.checked)} data-testid="share-public" />
                </Flex>
              )}
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
