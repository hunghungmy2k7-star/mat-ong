import { useMemo, useState } from 'react';
import {
  Popover, PopoverTrigger, PopoverContent, PopoverBody, Button, Input, Box, Flex, Text, Checkbox, Collapse, Icon, Badge,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight, FiFolder } from 'react-icons/fi';

/** Chọn một hoặc nhiều bộ từ; cây thư mục có thể mở rộng. value = mảng id ([] = tất cả bộ từ) */
export default function DeckPicker({ folders, categories, value, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState({});
  const selected = new Set(value);
  const term = q.trim().toLowerCase();
  const match = (c) => !term || c.name.toLowerCase().includes(term);

  const label = useMemo(() => {
    if (!value.length) return 'Tất cả bộ từ';
    if (value.length === 1) return categories.find((c) => c.id === value[0])?.name || '1 bộ từ';
    return `${value.length} bộ từ`;
  }, [value, categories]);

  const toggle = (id) => onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  const root = categories.filter((c) => !c.folderId && match(c));

  const Row = ({ c, indent }) => (
    <Flex as="label" align="center" gap="10px" pl={indent ? '34px' : '8px'} pr="8px" py="6px" borderRadius="8px" cursor="pointer"
      _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}>
      <Checkbox isChecked={selected.has(c.id)} onChange={() => toggle(c.id)} />
      <Text fontSize="14px" noOfLines={1} flex="1">{c.icon} {c.name}</Text>
      <Text fontSize="11px" color="app.muted">{c.wordCount}</Text>
    </Flex>
  );

  return (
    <Popover placement="bottom-start" isLazy>
      <PopoverTrigger>
        <Button w="100%" maxW="200px" h="40px" borderRadius="24px" variant="outline" bg="app.card" borderColor="#E2E8F0" fontWeight={400}
          rightIcon={<FiChevronDown />} justifyContent="space-between" data-testid="deck-picker">
          <Text noOfLines={1}>{label}</Text>
        </Button>
      </PopoverTrigger>
      <PopoverContent w="300px" borderRadius="12px">
        <PopoverBody p="10px" maxH="360px" overflowY="auto">
          <Input size="sm" borderRadius="9999px" placeholder="Tìm kiếm bộ từ..." value={q} onChange={(e) => setQ(e.target.value)} mb="8px" />
          <Flex as="label" align="center" gap="10px" px="8px" py="6px" borderRadius="8px" cursor="pointer" _hover={{ bg: 'blackAlpha.50' }}>
            <Checkbox isChecked={!value.length} onChange={() => onChange([])} />
            <Text fontSize="14px" fontWeight={600}>Tất cả bộ từ</Text>
          </Flex>
          {folders.map((f) => {
            const inside = categories.filter((c) => c.folderId === f.id && match(c));
            if (term && !inside.length) return null;
            const count = inside.filter((c) => selected.has(c.id)).length;
            const isOpen = open[f.id] || Boolean(term);
            return (
              <Box key={f.id}>
                <Flex align="center" gap="6px" px="6px" py="6px" borderRadius="8px" cursor="pointer" _hover={{ bg: 'blackAlpha.50' }}
                  onClick={() => setOpen((o) => ({ ...o, [f.id]: !o[f.id] }))}>
                  <Icon as={isOpen ? FiChevronDown : FiChevronRight} color="app.muted" />
                  <Icon as={FiFolder} color="#F59E0B" />
                  <Text fontSize="14px" fontWeight={600} flex="1" noOfLines={1}>{f.name}</Text>
                  {count > 0 && <Badge colorScheme="blue" borderRadius="9999px">{count}</Badge>}
                </Flex>
                <Collapse in={isOpen} animateOpacity>
                  {inside.length ? inside.map((c) => <Row key={c.id} c={c} indent />) : <Text pl="34px" fontSize="12px" color="app.muted" py="4px">Thư mục trống</Text>}
                </Collapse>
              </Box>
            );
          })}
          {root.map((c) => <Row key={c.id} c={c} />)}
          {!categories.length && <Text fontSize="13px" color="app.muted" p="8px">Bạn chưa có bộ từ nào.</Text>}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
