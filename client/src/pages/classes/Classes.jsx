import { useEffect, useState } from 'react';
import { Box, Flex, Grid, Text, Heading, Input, Icon, Badge, Spinner, useToast } from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiPlus, FiUsers, FiBookOpen, FiClipboard, FiBarChart2, FiShare2, FiAward, FiChevronRight } from 'react-icons/fi';
import { api } from '../../api';
import { Btn3D } from '../../components/ui';

const card = {
  bg: 'app.card', borderRadius: '24px', border: '2px solid', borderColor: 'app.line', p: '22px',
  boxShadow: '0 4px 0 0 #E5E5E5', _dark: { boxShadow: '0 4px 0 0 #2D3748' },
};

const BENEFITS = [
  [FiShare2, 'Chia sẻ tài liệu tức thì', 'Giáo viên chia sẻ thư mục hoặc bộ từ cho cả lớp, học sinh xem và sao chép về tài khoản chỉ với một cú bấm.'],
  [FiClipboard, 'Giao bài có hạn nộp', 'Chọn bộ từ, dạng bài và số câu đúng cần đạt. Đồng hồ đếm ngược giúp học sinh không quên hạn.'],
  [FiAward, 'Bảng kết quả rõ ràng', 'Mỗi bài tập có bảng xếp hạng: số lần làm, kết quả tốt nhất, tỷ lệ đúng và trạng thái Đạt / Chưa đạt.'],
  [FiBarChart2, 'Theo dõi tiến độ từng em', 'Xem số từ đã thuộc, chưa thuộc và lịch hoạt động học tập của từng học sinh theo từng ngày.'],
  [FiUsers, 'Vào lớp bằng mã', 'Học sinh chỉ cần nhập mã 6 ký tự hoặc mở link mời là tham gia được lớp, không cần cài đặt gì thêm.'],
];

export default function Classes() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [classes, setClasses] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState((params.get('join') || '').toUpperCase());
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api('/classes').then(setClasses).catch((e) => toast({ status: 'error', title: e.message }));
  }, [toast]);

  const create = async (e) => {
    e.preventDefault();
    setBusy('create');
    try {
      const c = await api('/classes', { method: 'POST', body: { name } });
      toast({ status: 'success', title: `Đã tạo lớp "${c.name}" · Mã lớp ${c.code}` });
      navigate(`/classes/${c.id}?tab=members`);
    } catch (err) {
      toast({ status: 'error', title: err.message });
    } finally {
      setBusy(null);
    }
  };
  const join = async (e) => {
    e.preventDefault();
    setBusy('join');
    try {
      const c = await api('/classes/join', { method: 'POST', body: { code } });
      toast({ status: 'success', title: `Đã vào lớp "${c.name}"` });
      navigate(`/classes/${c.id}`);
    } catch (err) {
      toast({ status: 'error', title: err.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box maxW="1100px" mx="auto">
      <Heading fontSize={{ base: '26px', md: '32px' }} fontWeight={800} mb="20px">Lớp học</Heading>
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="20px">
        <Box as="form" onSubmit={create} {...card}>
          <Text fontSize="18px" fontWeight={800} mb="12px">Tạo lớp</Text>
          <Input h="48px" borderRadius="16px" borderWidth="2px" placeholder="Tên lớp" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <Btn3D type="submit" mt="12px" w="100%" h="48px" leftIcon={<FiPlus />} isDisabled={!name.trim()} isLoading={busy === 'create'}>Tạo</Btn3D>
        </Box>
        <Box as="form" onSubmit={join} {...card}>
          <Text fontSize="18px" fontWeight={800} mb="12px">Vào lớp</Text>
          <Input h="48px" borderRadius="16px" borderWidth="2px" placeholder="MÃ LỚP" value={code} maxLength={6} textTransform="uppercase"
            letterSpacing="0.2em" fontWeight={700} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <Btn3D type="submit" mt="12px" w="100%" h="48px" color="#1CB0F6" shadow="#1899D6" leftIcon={<FiUsers />}
            isDisabled={code.trim().length !== 6} isLoading={busy === 'join'}>Tham gia</Btn3D>
        </Box>
      </Grid>

      <Text fontSize="20px" fontWeight={800} mt="32px" mb="12px">Lớp của tôi</Text>
      {!classes ? (
        <Flex justify="center" py="30px"><Spinner color="#23AC38" /></Flex>
      ) : classes.length === 0 ? (
        <Text color="app.muted" fontSize="14px">Bạn chưa tham gia lớp nào. Tạo lớp mới hoặc nhập mã lớp giáo viên gửi để bắt đầu.</Text>
      ) : (
        <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap="16px">
          {classes.map((c) => (
            <Flex key={c.id} {...card} p="18px" role="button" tabIndex={0} cursor="pointer" align="center" gap="12px"
              onClick={() => navigate(`/classes/${c.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/classes/${c.id}`)}
              _hover={{ borderColor: '#23AC38' }} data-testid={`class-${c.id}`}>
              <Flex w="48px" h="48px" borderRadius="16px" bg="#CCFBF1" color="#0D9488" align="center" justify="center" flexShrink={0}>
                <Icon as={FiBookOpen} boxSize="22px" />
              </Flex>
              <Box flex="1" minW={0}>
                <Text fontWeight={800} fontSize="16px" noOfLines={1}>{c.name}</Text>
                <Flex gap="6px" mt="4px" wrap="wrap">
                  <Badge colorScheme={c.role === 'teacher' ? 'purple' : 'blue'} borderRadius="6px">{c.role === 'teacher' ? 'GIÁO VIÊN' : 'HỌC SINH'}</Badge>
                  <Badge borderRadius="6px">{c.students}/{c.slots} HS</Badge>
                </Flex>
                {c.role !== 'teacher' && <Text fontSize="12px" color="app.muted" mt="4px" noOfLines={1}>GV: {c.teacher}</Text>}
              </Box>
              <Icon as={FiChevronRight} color="app.muted" />
            </Flex>
          ))}
        </Grid>
      )}

      <Text fontSize="20px" fontWeight={800} mt="36px" mb="12px">Lợi ích của lớp học</Text>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap="16px">
        {BENEFITS.map(([icon, title, desc]) => (
          <Box key={title} {...card} p="20px">
            <Flex w="44px" h="44px" borderRadius="14px" bg="#CCFBF1" color="#0D9488" align="center" justify="center" mb="10px">
              <Icon as={icon} boxSize="20px" />
            </Flex>
            <Text fontWeight={800}>{title}</Text>
            <Text fontSize="14px" color="app.muted" mt="4px">{desc}</Text>
          </Box>
        ))}
      </Grid>
    </Box>
  );
}
