import { Flex, Text, Button, Heading } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <Flex direction="column" align="center" justify="center" textAlign="center" minH="80vh" px="20px" gap="12px">
      <Text fontSize="56px">🐝</Text>
      <Heading fontSize="28px">Không tìm thấy trang</Heading>
      <Text color="app.muted" maxW="420px">Đường dẫn có thể đã sai hoặc trang đã bị xóa.</Text>
      <Button mt="8px" bg="#23AC38" color="white" borderRadius="16px" boxShadow="0 4px 0 0 #1F8F31" _hover={{ bg: '#22A035' }}
        onClick={() => navigate(user ? '/home' : '/')}>
        {user ? 'Về trang chủ' : 'Về trang giới thiệu'}
      </Button>
    </Flex>
  );
}
