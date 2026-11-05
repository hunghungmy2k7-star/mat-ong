import { useEffect, useState } from 'react';
import { Box, Flex, Text, Heading, Spinner } from '@chakra-ui/react';
import { api } from '../api';
import PathCard from './PathCard';

const chipStyle = (active) => ({
  h: '40px',
  px: '16px',
  borderRadius: '20px',
  border: '2px solid',
  borderColor: active ? '#23AC38' : '#E8E0D5',
  bg: active ? undefined : 'app.card',
  bgGradient: active ? 'linear(135deg, #23AC38, #14B8A6)' : undefined,
  color: active ? 'white' : 'app.text',
  fontSize: '13px',
  fontWeight: 600,
  transition: 'all .15s ease',
});

const scrollRow = {
  gap: '12px',
  overflowX: 'auto',
  pb: '10px',
  pt: '4px',
  px: '4px',
  sx: {
    '&::-webkit-scrollbar': { height: '6px' },
    '&::-webkit-scrollbar-thumb': { background: '#23AC38', borderRadius: '999px' },
    '&::-webkit-scrollbar-track': { background: '#F5EFE8', borderRadius: '999px' },
  },
};

export default function RoadmapSection({ showTitle = true }) {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api('/paths/summary').then(setData).catch(() => setData({ pinned: [], groups: [] }));
  }, []);

  if (!data) return <Flex justify="center" py="40px"><Spinner color="#23AC38" /></Flex>;

  // "Tất cả": chỉ hiện nhóm có lộ trình; chọn một nhóm cụ thể thì luôn hiện (kể cả trống)
  const groups = data.groups.filter((g) => (filter === 'all' ? g.paths.length > 0 : g.id === filter));

  return (
    <Box>
      {showTitle && (
        <Heading as="h2" fontSize="16px" fontWeight={400} textAlign="center" letterSpacing="0.06em" my="24px">
          LỘ TRÌNH HỌC
        </Heading>
      )}

      {data.pinned.length > 0 && (
        <Box mb="20px">
          <Flex align="center" gap="8px" mb="12px" px="4px">
            <Text>📌</Text>
            <Text fontWeight={700} fontSize="16px">Lộ trình đã ghim</Text>
          </Flex>
          <Flex {...scrollRow}>
            {data.pinned.map((p) => <PathCard key={p.id} path={p} minW="170px" />)}
          </Flex>
        </Box>
      )}

      <Flex wrap="wrap" justify="center" gap="8px" mb="24px">
        <Box as="button" type="button" {...chipStyle(filter === 'all')} onClick={() => setFilter('all')}>Tất cả</Box>
        {data.groups.map((g) => (
          <Box as="button" type="button" key={g.id} {...chipStyle(filter === g.id)} onClick={() => setFilter(g.id)}>
            {g.name}
          </Box>
        ))}
      </Flex>

      {groups.map((g) => (
        <Box key={g.id} mb="28px">
          <Flex align="center" gap="10px" mb="12px">
            <Heading as="h3" fontSize="18px" fontWeight={700}>{g.name}</Heading>
            <Box bg="#F5EFE8" _dark={{ bg: 'whiteAlpha.200' }} color="#6B7280" fontSize="12px" px="10px" py="4px" borderRadius="20px">
              {g.paths.length} lộ trình
            </Box>
          </Flex>
          {g.paths.length ? (
            <Flex {...scrollRow}>
              {g.paths.map((p) => <PathCard key={p.id} path={p} />)}
            </Flex>
          ) : (
            <Text fontSize="14px" color="app.muted" px="4px">Chưa có lộ trình trong nhóm này.</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
