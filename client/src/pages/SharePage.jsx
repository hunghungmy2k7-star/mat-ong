import { useEffect, useState } from 'react';
import { Box, Flex, Text, Spinner, Button } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCopy, FiEye } from 'react-icons/fi';
import { api } from '../api';
import { Btn3D, EmptyState } from '../components/ui';
import PublicDeckModal from '../components/community/PublicDeckModal';
import { SharedFolderView, useCopyActions } from '../components/community/CommunityLibrary';

/** Trang mở link chia sẻ /share/:token (thư mục hoặc bộ từ) */
export default function SharePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState(false);
  const { copying, copyDeck } = useCopyActions(token);

  useEffect(() => {
    api(`/share/${encodeURIComponent(token)}`).then(setData).catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <Box textAlign="center">
        <EmptyState emoji="🔗" title="Không mở được link chia sẻ">{error}</EmptyState>
        <Button mt="-24px" borderRadius="999px" onClick={() => navigate('/category-list?tab=community')}>Đến Thư viện cộng đồng</Button>
      </Box>
    );
  }
  if (!data) return <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>;

  if (data.type === 'folder') return <SharedFolderView folder={data.folder} categories={data.categories} token={token} />;

  const c = data.category;
  return (
    <Flex justify="center" pt="20px">
      <Box w="100%" maxW="520px" bg="app.card" borderRadius="24px" border="2px solid" borderColor="app.line" p="28px" textAlign="center"
        boxShadow="0 4px 0 0 #E5E5E5" _dark={{ boxShadow: '0 4px 0 0 #2D3748' }}>
        <Text fontSize="48px" lineHeight="1">{c.icon || '📚'}</Text>
        <Text mt="10px" fontSize="13px" color="app.muted">{c.author} đã chia sẻ bộ từ</Text>
        <Text fontSize="24px" fontWeight={800}>{c.name}</Text>
        {c.description && <Text mt="6px" color="app.soft">{c.description}</Text>}
        <Text mt="6px" fontWeight={700} color="#23AC38">{c.wordCount} từ vựng</Text>
        <Flex gap="10px" justify="center" mt="20px" wrap="wrap">
          <Btn3D color="#6366F1" shadow="#4F46E5" leftIcon={<FiEye />} onClick={() => setView(true)}>Xem từ</Btn3D>
          <Btn3D leftIcon={<FiCopy />} isLoading={copying === `c${c.id}`} onClick={() => copyDeck(c)} data-testid="share-copy-deck">Sao chép bộ từ</Btn3D>
        </Flex>
      </Box>
      <PublicDeckModal isOpen={view} categoryId={c.id} token={token} onClose={() => setView(false)}
        onCopy={() => copyDeck(c)} copying={copying === `c${c.id}`} />
    </Flex>
  );
}
