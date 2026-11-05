import { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton, Flex, Box, Text, Avatar, Badge, Table, Thead, Tbody, Tr, Th, Td,
  Progress, Spinner,
} from '@chakra-ui/react';
import { api } from '../../api';

const PODIUM = [
  { place: 2, h: '40px', bg: '#718096' },
  { place: 1, h: '58px', bg: '#F6AD55' },
  { place: 3, h: '30px', bg: '#DD6B20' },
];

export default function PathLeaderboardModal({ isOpen, onClose, path }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (isOpen && path) api(`/paths/${path.id}/leaderboard`).then(setData).catch(() => setData({ rows: [], total: 0 }));
  }, [isOpen, path]);
  const top = data?.rows.slice(0, 3) || [];
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="24px" mx="12px" overflow="hidden">
        <ModalCloseButton top="16px" right="16px" />
        <Flex bgGradient="linear(to-r, #FFFBEB, #FFFFFF)" _dark={{ bgGradient: 'none', bg: 'whiteAlpha.100' }} px="24px" py="18px" gap="14px" align="center">
          <Text fontSize="32px">🏆</Text>
          <Box>
            <Flex align="center" gap="8px">
              <Text fontSize="18px" fontWeight={800} color="#D69E2E">Bảng xếp hạng</Text>
              <Badge bg="#F6E05E" color="#744210" borderRadius="9999px">TOP 100</Badge>
            </Flex>
            <Text fontSize="13px" color="app.muted">Xếp theo tiến độ hoàn thành "{path?.name}"</Text>
          </Box>
        </Flex>
        <ModalBody pb="20px">
          {!data ? <Flex justify="center" py="40px"><Spinner /></Flex> : !data.rows.length ? (
            <Text textAlign="center" color="app.muted" py="40px">Chưa có ai học lộ trình này. Hãy là người đầu tiên! 🚀</Text>
          ) : (
            <>
              <Flex justify="center" align="flex-end" gap="18px" py="16px">
                {PODIUM.map(({ place, h, bg }) => {
                  const u = top[place - 1];
                  if (!u) return <Box key={place} w="80px" />;
                  return (
                    <Flex key={place} direction="column" align="center" w="90px" gap="4px">
                      {place === 1 && <Text fontSize="20px" lineHeight="1">👑</Text>}
                      <Avatar size={place === 1 ? 'lg' : 'md'} name={u.name} src={u.avatarUrl || undefined} border="3px solid" borderColor={bg} />
                      <Text fontSize="13px" fontWeight={700} noOfLines={1}>{u.name}</Text>
                      <Text fontSize="12px" fontWeight={700} color="#23AC38">{u.progress}%</Text>
                      <Flex w="56px" h={h} bg={bg} color="white" fontWeight={800} fontSize="20px" borderTopRadius="8px" align="center" justify="center">{place}</Flex>
                    </Flex>
                  );
                })}
              </Flex>
              <Table size="sm">
                <Thead><Tr><Th>#</Th><Th>Người dùng</Th><Th>Tiến độ</Th><Th isNumeric>Đã học</Th></Tr></Thead>
                <Tbody>
                  {data.rows.map((r) => (
                    <Tr key={r.id} bg={r.isMe ? '#F0FFF4' : undefined} _dark={{ bg: r.isMe ? 'green.900' : undefined }}>
                      <Td>{r.rank}</Td>
                      <Td><Flex align="center" gap="8px"><Avatar size="xs" name={r.name} src={r.avatarUrl || undefined} />{r.name}{r.isMe && ' (bạn)'}</Flex></Td>
                      <Td minW="140px"><Flex align="center" gap="8px"><Progress value={r.progress} colorScheme="green" borderRadius="9999px" flex="1" size="sm" /><Text fontSize="12px" fontWeight={700} color="#23AC38">{r.progress}%</Text></Flex></Td>
                      <Td isNumeric fontWeight={700}>{r.learned} <Text as="span" fontSize="11px" color="app.muted">từ</Text></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
