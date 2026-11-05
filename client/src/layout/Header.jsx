import { Flex, Box, Text, IconButton, Icon } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { BRAND } from '../config';
import { useAuth } from '../auth/AuthContext';

/** Đếm ngược tới 00:00 (giờ Việt Nam) của ngày thi mục tiêu */
function ExamCountdown({ date }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = new Date(`${date}T00:00:00+07:00`).getTime();
  if (Number.isNaN(target)) return null;
  const ms = target - now;
  if (ms <= -86400000) return null;
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
  return (
    <Flex align="center" gap="6px" h="29px" px="11px" borderRadius="24px" bg="rgba(168,85,247,0.12)" color="#9333EA"
      fontSize="13px" fontWeight={800} title={`Ngày thi: ${date.split('-').reverse().join('/')}`} data-testid="exam-countdown">
      🎯 {ms <= 0 ? 'Hôm nay thi!' : <>{d} ngày<Text as="span" display={{ base: 'none', md: 'inline' }}>&nbsp;{hms}</Text></>}
    </Flex>
  );
}

export const HEADER_H = 60;

export default function Header({ streak, onOpenMenu }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const exam = user?.settings?.examDate;

  return (
    <Flex
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      h={`${HEADER_H}px`}
      zIndex={20}
      bg="app.panel"
      borderBottom="1px solid"
      borderColor="app.line"
      align="center"
      justify="space-between"
      px="20px"
    >
      <Flex align="center" gap="8px">
        <IconButton
          display={{ base: 'inline-flex', md: 'none' }}
          aria-label="Mở menu"
          icon={<Icon as={FiMenu} boxSize="22px" />}
          variant="ghost"
          onClick={onOpenMenu}
          ml="-8px"
        />
        <Box
          as="button"
          type="button"
          display={{ base: 'none', md: 'block' }}
          onClick={() => navigate('/home')}
          px="16px"
          ml="-16px"
        >
          <Text fontSize="1.4rem" fontWeight={700} color="#7C3AED" lineHeight="34px">
            {BRAND}
          </Text>
        </Box>
      </Flex>

      <Flex align="center" gap="12px">
        {exam && <ExamCountdown date={exam} />}
        <Flex
          align="center"
          gap="6px"
          h="29px"
          px="11px"
          borderRadius="24px"
          bgGradient="linear(135deg, rgba(255,150,0,0.15) 0%, rgba(255,75,75,0.15) 100%)"
          title="Chuỗi ngày học"
        >
          <Text fontSize="20px" lineHeight="22px">🔥</Text>
          <Text fontSize="14px" fontWeight={800} color="#FF9600">
            {streak ?? 0}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
}
