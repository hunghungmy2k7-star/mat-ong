import { useEffect, useState } from 'react';
import {
  Box, Flex, Grid, Text, Heading, Icon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button,
} from '@chakra-ui/react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FiPlus, FiZap, FiAward, FiUsers, FiArrowRight } from 'react-icons/fi';
import { api } from '../api';
import { COMMUNITY } from '../config';
import { useAuth } from '../auth/AuthContext';
import RoadmapSection from '../components/RoadmapSection';

const cardBase = {
  h: '206px',
  borderRadius: '20px',
  border: '2px solid',
  borderColor: 'app.line',
  boxShadow: '0 4px 0 0 #E5E5E5',
  _dark: { boxShadow: '0 4px 0 0 #2D3748' },
  overflow: 'hidden',
};

function StatCell({ value, label, color }) {
  return (
    <Flex direction="column" align="center" justify="center" bg="app.cell" borderRadius="12px" py="12px" px="8px">
      <Text fontSize="24px" fontWeight={800} color={color} lineHeight="29px">{value}</Text>
      <Text fontSize="12px" fontWeight={600} color="app.soft" mt="2px">{label}</Text>
    </Flex>
  );
}

function AvatarCard() {
  const { user } = useAuth();
  return (
    <Box {...cardBase} bg="app.card" position="relative">
      {user?.avatarUrl ? (
        <Box w="100%" h="100%" bgImage={`url(${user.avatarUrl})`} bgSize="cover" bgPos="center" />
      ) : (
        <Flex w="100%" h="100%" align="center" justify="center" direction="column" gap="6px"
          bgGradient="linear(135deg, #FFF7E0 0%, #FFE7A8 100%)" _dark={{ bgGradient: 'linear(135deg, #3B2F12, #1A202C)' }}>
          <Text fontSize="64px" lineHeight="1">🍯</Text>
          <Text fontSize="13px" fontWeight={700} color="#B45309">Mật Ong</Text>
        </Flex>
      )}
    </Box>
  );
}

function StatsCard({ stats }) {
  return (
    <Box {...cardBase} bg="app.card" p="20px">
      <Grid templateColumns="1fr 1fr" gap="12px" h="100%">
        <StatCell value={stats?.total ?? '–'} label="Tổng từ" color="#23AC38" />
        <StatCell value={stats?.learned ?? '–'} label="Đã thuộc" color="#FF9600" />
        <StatCell value={stats ? `${stats.progress}%` : '–'} label="Tiến độ" color="#1CB0F6" />
        <Flex
          position="relative"
          direction="column"
          align="center"
          justify="center"
          borderRadius="16px"
          bgGradient="linear(135deg, #FF6B6B, #FF8E53)"
          boxShadow="0 4px 15px rgba(255,107,107,0.4), 0 2px 4px rgba(0,0,0,0.1)"
          color="white"
        >
          <Text position="absolute" top="4px" right="8px" fontSize="12px">🔥</Text>
          <Text fontSize="28px" fontWeight={900} lineHeight="34px">{stats?.due ?? '–'}</Text>
          <Text fontSize="12px" fontWeight={700} opacity={0.95}>Từ đến hạn</Text>
        </Flex>
      </Grid>
    </Box>
  );
}

function StreakCard({ streak }) {
  return (
    <Box {...cardBase} border="none" position="relative" p="20px" color="white" className="mo-streak-card"
      bgGradient="linear(135deg, #FF9600, #FF7B00)" boxShadow="0 4px 0 0 #EA7E00">
      <Box position="absolute" top="-50px" right="-40px" w="150px" h="150px" borderRadius="full" bg="whiteAlpha.200" />
      <Flex align="center" gap="8px">
        <Text fontSize="20px">🔥</Text>
        <Text fontSize="12px" fontWeight={800} letterSpacing="0.06em">CHUỖI NGÀY HỌC</Text>
      </Flex>
      <Flex align="baseline" gap="8px" mt="10px">
        <Text fontSize="48px" fontWeight={900} lineHeight="48px">{streak?.streak ?? 0}</Text>
        <Text fontSize="16px" fontWeight={600}>ngày</Text>
      </Flex>
      <Flex justify="space-between" gap="4px" mt="16px" maxW="340px">
        {(streak?.week || []).map((d) => (
          <Flex key={d.day} direction="column" align="center" gap="6px" flexShrink={0}>
            <Flex
              w="28px" h="28px" borderRadius="full" align="center" justify="center"
              bg={d.active ? 'white' : 'whiteAlpha.300'}
              boxShadow={d.active ? '0 0 12px rgba(255,255,255,0.5)' : 'none'}
              border={d.isToday ? '2.6px solid white' : 'none'}
              fontSize="15px"
            >
              {d.active ? '🔥' : ''}
            </Flex>
            <Text fontSize="10px" fontWeight={700}>{d.label}</Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}

const QUICK = [
  { key: 'add', title: 'Thêm từ', desc: 'Tạo từ vựng cá nhân', icon: FiPlus, bg: '#E0F2FE', color: '#0284C7', to: '/words' },
  { key: 'practice', title: 'Luyện tập', desc: 'Flashcard & Games', icon: FiZap, bg: '#F3E8FF', color: '#9333EA', to: '/practice' },
  { key: 'rank', title: 'Xếp hạng', desc: 'Xem thành tích', icon: FiAward, bg: '#FFEDD5', color: '#EA580C', to: '/leaderboard' },
  { key: 'community', title: 'Cộng đồng', desc: 'Chọn Fb hoặc Zalo', icon: FiUsers, bg: '#DCFCE7', color: '#16A34A' },
];

function CommunityModal({ isOpen, onClose }) {
  const links = [
    { label: 'Facebook', url: COMMUNITY.facebook, bg: '#1877F2' },
    { label: 'Zalo', url: COMMUNITY.zalo, bg: '#0068FF' },
  ].filter((l) => l.url);
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="32px" maxW="448px" mx="12px">
        <ModalHeader fontSize="20px" fontWeight={600}>Chọn cộng đồng</ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody pb="24px">
          <Text fontSize="14px" color="app.muted" mb="16px">Tham gia nhóm cộng đồng trên kênh bạn thuận tiện nhất.</Text>
          {links.length ? (
            <Flex gap="12px">
              {links.map((l) => (
                <Button key={l.label} as="a" href={l.url} target="_blank" rel="noopener noreferrer" flex="1" h="44px"
                  borderRadius="16px" bg={l.bg} color="white" _hover={{ opacity: 0.9 }}>
                  {l.label}
                </Button>
              ))}
            </Flex>
          ) : (
            <Text fontSize="13px" color="app.muted">Chưa có nhóm cộng đồng nào được thiết lập.</Text>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { streak } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [communityOpen, setCommunityOpen] = useState(false);

  useEffect(() => {
    api('/vocabularies/stats').then(setStats).catch(() => {});
  }, []);

  return (
    <Box>
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap="16px">
        <AvatarCard />
        <StatsCard stats={stats} />
        <StreakCard streak={streak} />
      </Grid>

      <Heading as="h2" fontSize="20px" fontWeight={700} textAlign="center" mt="24px" mb="16px">
        Truy cập nhanh
      </Heading>
      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap="16px">
        {QUICK.map((q) => (
          <Flex
            key={q.key}
            as="article"
            role="button"
            tabIndex={0}
            onClick={() => (q.to ? navigate(q.to) : setCommunityOpen(true))}
            onKeyDown={(e) => e.key === 'Enter' && (q.to ? navigate(q.to) : setCommunityOpen(true))}
            align="center"
            gap="16px"
            p="20px"
            bg="app.card"
            borderRadius="24px"
            border="1px solid"
            borderColor="#E2E8F0"
            _dark={{ borderColor: 'whiteAlpha.300' }}
            boxShadow="0 1px 2px rgba(0,0,0,0.05)"
            cursor="pointer"
            transition="transform .15s ease, box-shadow .15s ease"
            _hover={{ transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}
          >
            <Flex w="48px" h="48px" flexShrink={0} borderRadius="16px" bg={q.bg} align="center" justify="center">
              <Icon as={q.icon} boxSize="22px" color={q.color} />
            </Flex>
            <Box flex="1" minW={0}>
              <Text fontSize="18px" fontWeight={700} lineHeight="24px">{q.title}</Text>
              <Text fontSize="14px" color="app.muted">{q.desc}</Text>
            </Box>
            <Icon as={FiArrowRight} color="#A0AEC0" boxSize="18px" />
          </Flex>
        ))}
      </Grid>

      <RoadmapSection />
      <CommunityModal isOpen={communityOpen} onClose={() => setCommunityOpen(false)} />
    </Box>
  );
}
