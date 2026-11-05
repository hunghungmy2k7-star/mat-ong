import { Box, Flex, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

// Màu thanh độ khó 1..5 (đo từ site mẫu)
export const DIFFICULTY = {
  1: ['#23AC38', '#86EFAC', 'rgba(35,172,56,0.25)'],
  2: ['#84CC16', '#BEF264', 'rgba(132,204,22,0.25)'],
  3: ['#F59E0B', '#FBBF24', 'rgba(245,158,11,0.28)'],
  4: ['#F97316', '#FB923C', 'rgba(249,115,22,0.28)'],
  5: ['#EF4444', '#F87171', 'rgba(239,68,68,0.28)'],
};

export default function PathCard({ path, minW = '200px' }) {
  const navigate = useNavigate();
  const [c1, c2, glow] = DIFFICULTY[path.difficulty] || DIFFICULTY[1];
  return (
    <Box
      as="button"
      type="button"
      onClick={() => navigate(`/roadmap/${path.slug}`)}
      position="relative"
      textAlign="left"
      flexShrink={0}
      minW={minW}
      maxW="260px"
      h="145px"
      p="12px"
      borderRadius="12px"
      border="2px solid #F59E0B"
      bgGradient="linear(135deg, #FFFBEB 0%, #FFFFFF 50%)"
      _dark={{ bgGradient: 'linear(135deg, #2D2A1F 0%, #1A202C 50%)' }}
      boxShadow="0 2px 8px rgba(0,0,0,0.06)"
      overflow="hidden"
      transition="border-color .15s ease, transform .15s ease"
      _hover={{ borderColor: '#23AC38', transform: 'translateY(-2px)' }}
      display="flex"
      flexDirection="column"
    >
      {/* góc gấp màu vàng */}
      <Box position="absolute" top={0} right={0} w="26px" h="26px"
        bgGradient="linear(225deg, #FCD34D 50%, transparent 50%)" />
      <Text fontSize="13px" fontWeight={700} color="#1A1A1A" _dark={{ color: 'white' }} noOfLines={2} lineHeight="18px" pr="18px" minH="36px">
        {path.name}
      </Text>
      <Box mt="6px">
        <Box as="span" display="inline-block" bg="#F5EFE8" _dark={{ bg: 'whiteAlpha.200' }} borderRadius="12px" px="8px" py="3px" fontSize="11px" fontWeight={600}>
          📚 {path.setCount} bộ từ
        </Box>
      </Box>
      <Box mt="auto" bg="rgba(248,250,252,0.95)" _dark={{ bg: 'whiteAlpha.100' }} border="1px solid rgba(148,163,184,0.22)" borderRadius="10px" px="10px" py="8px">
        <Flex justify="space-between" align="center" mb="6px">
          <Text fontSize="10px" fontWeight={700} color="#6B7280" textTransform="uppercase" letterSpacing="0.04em">Độ khó</Text>
          <Text fontSize="11px" fontWeight={800} color={c1}>{path.difficulty}/5</Text>
        </Flex>
        <Box h="8px" borderRadius="999px" bg="rgba(148,163,184,0.22)">
          <Box h="100%" w={`${path.difficulty * 20}%`} borderRadius="999px" bgGradient={`linear(90deg, ${c1}, ${c2})`} boxShadow={`0 0 12px ${glow}`} />
        </Box>
      </Box>
    </Box>
  );
}
