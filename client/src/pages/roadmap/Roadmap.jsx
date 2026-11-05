import { useEffect, useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';
import { api } from '../../api';
import RoadmapSection from '../../components/RoadmapSection';
import ImportPathModal from '../../components/roadmap/ImportPathModal';
import { Btn3D } from '../../components/ui';

export default function Roadmap() {
  const [meta, setMeta] = useState(null);
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { api('/paths/summary').then(setMeta).catch(() => {}); }, [refresh]);
  return (
    <Box>
      {meta?.isAdmin && (
        <Flex justify="flex-end" mb="-8px">
          <Btn3D size="sm" color="#1CB0F6" shadow="#1899D6" leftIcon={<FiUpload />} onClick={() => setOpen(true)}>Nhập lộ trình</Btn3D>
        </Flex>
      )}
      <RoadmapSection key={refresh} />
      <ImportPathModal isOpen={open} onClose={() => setOpen(false)} groups={meta?.groups || []} onSaved={() => setRefresh((r) => r + 1)} />
    </Box>
  );
}
