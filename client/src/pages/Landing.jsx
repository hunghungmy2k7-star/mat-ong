import { Box, Flex, Grid, Text, Heading, Icon, Link, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon } from '@chakra-ui/react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  FiLayers, FiZap, FiRepeat, FiMap, FiUsers, FiGlobe, FiUpload, FiAward, FiShoppingBag, FiArrowRight, FiVolume2,
} from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { Btn3D } from '../components/ui';
import { BRAND } from '../config';
import { speak } from '../speech';

const FEATURES = [
  [FiLayers, '#23AC38', 'Bộ từ của riêng bạn', 'Tạo bộ từ, thư mục, thêm từ thủ công, dán nhanh hoặc nhập file CSV/Excel. Xuất lại bất cứ lúc nào.'],
  [FiZap, '#FF9600', '10+ cách luyện tập', 'Flashcard, trắc nghiệm, nối từ, gõ từ, nghe viết, dịch câu, đặt câu và hai trò chơi arcade.'],
  [FiRepeat, '#1CB0F6', 'Ôn tập ngắt quãng (SRS)', '5 cấp độ ghi nhớ, tự hẹn ngày ôn lại: 1, 3, 7, 14 ngày. Từ khó sẽ quay lại sớm hơn.'],
  [FiMap, '#CE82FF', 'Lộ trình theo trình độ', 'Bộ từ cơ bản sắp xếp theo level, học từng bộ và theo dõi tiến độ của mình.'],
  [FiUsers, '#0D9488', 'Lớp học', 'Giáo viên chia sẻ tài liệu, giao bài có hạn nộp và xem kết quả, tiến độ của từng học sinh.'],
  [FiGlobe, '#F5576C', 'Cộng đồng', 'Chia sẻ thư mục công khai, upvote, sao chép bộ từ hay của người khác chỉ với một cú bấm.'],
];
const STEPS = [
  [FiUpload, 'Thêm từ', 'Gõ tay, dán danh sách, nhập file hoặc để AI soạn từ theo chủ đề.'],
  [FiZap, 'Luyện tập mỗi ngày', 'Chọn dạng bài yêu thích, mỗi câu đúng nhận xu và giữ chuỗi ngày học.'],
  [FiAward, 'Ôn đúng lúc', 'SRS nhắc bạn ôn những từ sắp quên cho tới khi thuộc hẳn.'],
];
const FAQ = [
  ['Mật Ong có mất phí không?', 'Không. Mọi tính năng đều miễn phí, không có gói trả phí hay giới hạn tính năng theo gói.'],
  ['Xu dùng để làm gì?', 'Xu kiếm được khi học (mỗi câu đúng 50–200 xu). Bạn dùng xu để đổi ảnh đại diện, hình nền, meme, giao diện theo mùa hoặc đá giữ chuỗi ngày học trong Cửa hàng.'],
  ['Tính năng AI hoạt động thế nào?', 'AI giúp soạn từ vựng theo chủ đề, trích từ trong đoạn văn hoặc ảnh, và chấm câu bạn tự đặt. Mỗi tài khoản có cùng một số lượt AI mỗi ngày.'],
  ['Tôi có thể mang dữ liệu đi không?', 'Có. Mỗi bộ từ đều xuất được ra CSV hoặc Excel, và bạn có thể xóa tài khoản cùng toàn bộ dữ liệu trong phần Hồ sơ.'],
];

const card = { bg: 'app.card', borderRadius: '24px', border: '2px solid', borderColor: 'app.line', boxShadow: '0 4px 0 0 #E5E5E5', _dark: { boxShadow: '0 4px 0 0 #2D3748' } };

function DemoCard() {
  return (
    <Box position="relative" w="100%" maxW="420px" mx="auto">
      <Box position="absolute" inset="18px -14px -14px 18px" borderRadius="28px" bg="#FFE7A8" _dark={{ bg: '#3B2F12' }} />
      <Box position="relative" {...card} borderColor="#1A202C" boxShadow="0 6px 0 0 #1A202C" p="28px" textAlign="center">
        <Text fontSize="12px" fontWeight={800} color="#A855F7" letterSpacing="0.1em">FLASHCARD</Text>
        <Text fontSize="44px" fontWeight={900} mt="8px">honey</Text>
        <Text color="#D53F8C">/ˈhʌni/ · noun</Text>
        <Flex justify="center" mt="10px">
          <Flex as="button" type="button" align="center" gap="6px" px="12px" py="6px" borderRadius="999px" bg="#E0F2FE" color="#0369A1" fontWeight={700} fontSize="14px"
            onClick={() => speak('honey')} aria-label="Nghe phát âm honey">
            <Icon as={FiVolume2} /> Nghe
          </Flex>
        </Flex>
        <Box mt="18px" pt="16px" borderTop="2px dashed" borderColor="app.line">
          <Text fontSize="20px" fontWeight={800}>mật ong</Text>
          <Text fontSize="14px" color="app.muted" fontStyle="italic" mt="4px">Bees make honey from flowers.</Text>
        </Box>
        <Flex gap="10px" mt="20px">
          <Box flex="1" py="10px" borderRadius="16px" bg="#FEE2E2" color="#B91C1C" fontWeight={800} fontSize="14px">Chưa thuộc</Box>
          <Box flex="1" py="10px" borderRadius="16px" bg="#DCFCE7" color="#15803D" fontWeight={800} fontSize="14px">Đã thuộc</Box>
        </Flex>
      </Box>
    </Box>
  );
}

export function SiteFooter() {
  return (
    <Flex as="footer" maxW="1120px" mx="auto" px="20px" py="28px" gap="16px" justify="space-between" wrap="wrap" color="app.muted" fontSize="14px"
      borderTop="1px solid" borderColor="app.line">
      <Text>© {new Date().getFullYear()} {BRAND} · Học từ vựng tiếng Anh mỗi ngày</Text>
      <Flex gap="18px">
        <Link as={RouterLink} to="/policy">Điều khoản sử dụng</Link>
        <Link as={RouterLink} to="/privacy">Quyền riêng tư</Link>
      </Flex>
    </Flex>
  );
}

export function SiteHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <Flex as="header" position="sticky" top={0} zIndex={20} bg="app.bg" borderBottom="1px solid" borderColor="app.line">
      <Flex maxW="1120px" w="100%" mx="auto" px="20px" h="64px" align="center" gap="12px">
        <Link as={RouterLink} to="/" _hover={{ textDecoration: 'none' }} display="flex" alignItems="center" gap="8px">
          <Text fontSize="26px">🍯</Text>
          <Text fontSize="24px" fontWeight={800} color="#7C3AED">{BRAND}</Text>
        </Link>
        <Flex ml="auto" gap="8px" align="center">
          {user ? (
            <Btn3D size="sm" h="40px" onClick={() => navigate('/home')}>Vào học</Btn3D>
          ) : (
            <>
              <Link as={RouterLink} to="/login" fontWeight={700} px="10px" display={{ base: 'none', sm: 'block' }}>Đăng nhập</Link>
              <Btn3D size="sm" h="40px" onClick={() => navigate('/register')}>Bắt đầu miễn phí</Btn3D>
            </>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (!loading && user) return <Navigate to="/home" replace />;

  return (
    <Box minH="100vh">
      <SiteHeader />
      <Grid as="section" maxW="1120px" mx="auto" px="20px" py={{ base: '40px', md: '72px' }} templateColumns={{ base: '1fr', md: '1.1fr 1fr' }} gap="48px" alignItems="center">
        <Box>
          <Text display="inline-block" px="12px" py="4px" borderRadius="999px" bg="#F3E8FF" color="#9333EA" fontWeight={800} fontSize="13px">MIỄN PHÍ · KHÔNG QUẢNG CÁO</Text>
          <Heading as="h1" mt="16px" fontSize={{ base: '36px', md: '52px' }} lineHeight="1.1" fontWeight={900}>
            Học từ vựng tiếng Anh <Text as="span" color="#23AC38">ngọt như mật</Text>
          </Heading>
          <Text mt="16px" fontSize={{ base: '17px', md: '19px' }} color="app.soft" maxW="520px">
            Tự xây bộ từ, luyện bằng flashcard và trò chơi, để hệ thống ôn tập ngắt quãng nhắc bạn đúng lúc sắp quên.
          </Text>
          <Flex mt="28px" gap="12px" wrap="wrap">
            <Btn3D h="54px" px="28px" fontSize="17px" rightIcon={<FiArrowRight />} onClick={() => navigate('/register')}>Bắt đầu học ngay</Btn3D>
            <Btn3D h="54px" px="24px" fontSize="17px" color="white" textColor="#1A202C" shadow="#E5E5E5" border="2px solid #E5E5E5" onClick={() => navigate('/login')}>
              Tôi đã có tài khoản
            </Btn3D>
          </Flex>
        </Box>
        <DemoCard />
      </Grid>

      <Box as="section" maxW="1120px" mx="auto" px="20px" py="40px">
        <Heading as="h2" fontSize={{ base: '28px', md: '36px' }} fontWeight={900} textAlign="center">Mọi thứ để nhớ từ lâu hơn</Heading>
        <Grid mt="32px" templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap="18px">
          {FEATURES.map(([icon, color, title, desc]) => (
            <Box key={title} {...card} p="22px">
              <Flex w="48px" h="48px" borderRadius="16px" bg={`${color}22`} color={color} align="center" justify="center"><Icon as={icon} boxSize="22px" /></Flex>
              <Text mt="12px" fontWeight={800} fontSize="18px">{title}</Text>
              <Text mt="6px" color="app.muted" fontSize="15px">{desc}</Text>
            </Box>
          ))}
        </Grid>
      </Box>

      <Box as="section" maxW="1120px" mx="auto" px="20px" py="40px">
        <Heading as="h2" fontSize={{ base: '28px', md: '36px' }} fontWeight={900} textAlign="center">Bắt đầu trong 3 bước</Heading>
        <Grid mt="32px" templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap="18px">
          {STEPS.map(([icon, title, desc], i) => (
            <Flex key={title} {...card} p="22px" gap="14px" align="start">
              <Flex w="40px" h="40px" flexShrink={0} borderRadius="full" bg="#23AC38" color="white" fontWeight={900} align="center" justify="center">{i + 1}</Flex>
              <Box>
                <Flex align="center" gap="8px"><Icon as={icon} color="#23AC38" /><Text fontWeight={800} fontSize="17px">{title}</Text></Flex>
                <Text mt="4px" color="app.muted" fontSize="15px">{desc}</Text>
              </Box>
            </Flex>
          ))}
        </Grid>
      </Box>

      <Box as="section" maxW="1120px" mx="auto" px="20px" py="40px">
        <Flex {...card} p={{ base: '22px', md: '32px' }} gap="20px" align="center" direction={{ base: 'column', md: 'row' }}
          bgGradient="linear(135deg, #FFF7E0, #FFFFFF)" _dark={{ bgGradient: 'linear(135deg, #3B2F12, #1A202C)', boxShadow: '0 4px 0 0 #2D3748' }}>
          <Icon as={FiShoppingBag} boxSize="44px" color="#FF9600" />
          <Box flex="1">
            <Text fontWeight={900} fontSize="22px">Học càng chăm, xu càng nhiều</Text>
            <Text color="app.muted" mt="4px">Đổi xu lấy ảnh đại diện, hình nền, meme và giao diện theo mùa. Giữ chuỗi ngày học, lên bảng xếp hạng và học cùng bạn bè.</Text>
          </Box>
        </Flex>
      </Box>

      <Box as="section" maxW="760px" mx="auto" px="20px" py="40px">
        <Heading as="h2" fontSize={{ base: '28px', md: '36px' }} fontWeight={900} textAlign="center" mb="24px">Câu hỏi thường gặp</Heading>
        <Accordion allowToggle>
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} border="none" mb="10px" {...card} boxShadow="none">
              <AccordionButton px="20px" py="16px" borderRadius="24px" _hover={{ bg: 'transparent' }}>
                <Text flex="1" textAlign="left" fontWeight={800}>{q}</Text><AccordionIcon />
              </AccordionButton>
              <AccordionPanel px="20px" pb="18px" color="app.soft">{a}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
        <Flex justify="center" mt="32px">
          <Btn3D h="54px" px="32px" fontSize="17px" rightIcon={<FiArrowRight />} onClick={() => navigate('/register')}>Tạo tài khoản miễn phí</Btn3D>
        </Flex>
      </Box>
      <SiteFooter />
    </Box>
  );
}
