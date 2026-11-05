import { useEffect, useRef, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Flex, Box, Text, Table, Thead, Tbody, Tr, Th, Td, Spinner, useToast,
} from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import { api } from '../../api';
import { Btn3D, PosBadge, SpeakButton } from '../ui';

/** Xem (chỉ đọc) một bộ từ được chia sẻ, kèm nút Sao chép về tài khoản */
export default function PublicDeckModal({ categoryId, token, isOpen, onClose, onCopy, copying }) {
  const toast = useToast();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !categoryId) return;
    setData(null);
    api(`/community/categories/${categoryId}/words${token ? `?token=${encodeURIComponent(token)}` : ''}`)
      .then(setData)
      .catch((e) => { toast({ status: 'error', title: e.message }); closeRef.current(); });
  }, [isOpen, categoryId, token, toast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="32px" mx="12px" maxH="88vh">
        <ModalCloseButton />
        <ModalBody p={{ base: '18px', md: '28px' }}>
          {!data ? (
            <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>
          ) : (
            <>
              <Flex align={{ base: 'stretch', md: 'center' }} gap="12px" mb="18px" pr="36px" direction={{ base: 'column', md: 'row' }}>
                <Box flex="1" minW={0}>
                  <Text fontSize="24px" fontWeight={800} noOfLines={2}>{data.name}</Text>
                  <Text color="app.muted" fontSize="14px">{data.items.length} từ vựng</Text>
                </Box>
                {onCopy && (
                  <Btn3D leftIcon={<FiCopy />} isLoading={copying} onClick={() => onCopy(data)} data-testid="deck-copy">Sao chép bộ từ</Btn3D>
                )}
              </Flex>
              <Box overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th w="40px">#</Th><Th>Từ vựng</Th><Th>Nghĩa</Th><Th display={{ base: 'none', md: 'table-cell' }}>Loại từ</Th>
                      <Th display={{ base: 'none', lg: 'table-cell' }}>Ví dụ</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.items.map((w, i) => (
                      <Tr key={w.id} _odd={{ bg: 'app.cell' }}>
                        <Td color="app.muted">{i + 1}</Td>
                        <Td>
                          <Flex align="center" gap="6px">
                            <SpeakButton text={w.word} />
                            <Box>
                              <Text fontWeight={700}>{w.word}</Text>
                              {w.ipa && <Text fontSize="12px" fontStyle="italic" color="app.muted">{w.ipa}</Text>}
                            </Box>
                          </Flex>
                        </Td>
                        <Td>{w.meaning}</Td>
                        <Td display={{ base: 'none', md: 'table-cell' }}>{w.pos && <PosBadge pos={w.pos} />}</Td>
                        <Td display={{ base: 'none', lg: 'table-cell' }} fontSize="13px" color="app.soft">{w.example}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
