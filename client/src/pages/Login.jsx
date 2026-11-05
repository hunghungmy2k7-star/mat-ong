import { useEffect, useRef, useState } from 'react';
import {
  Box, Flex, Text, Heading, Button, Input, PinInput, PinInputField, HStack, Icon, Link, useToast,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { FiMail, FiLock, FiArrowLeft } from 'react-icons/fi';
import { FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { GOOGLE_CLIENT_ID } from '../config';

const btn = {
  w: '100%',
  h: '42px',
  borderRadius: '10px',
  border: '1.6px solid',
  fontSize: '13.6px',
  fontWeight: 500,
  boxShadow: '0 4px 0 0 #1F8F31',
  transition: 'transform .1s ease, box-shadow .1s ease',
  _active: { transform: 'translateY(3px)', boxShadow: '0 1px 0 0 #1F8F31' },
};

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo') || '/home';
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState('choose'); // choose | email | code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (user) navigate(returnTo, { replace: true });
  }, [user, navigate, returnTo]);

  // Google Identity Services – chỉ bật khi đã cấu hình VITE_GOOGLE_CLIENT_ID
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== 'choose') return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const { user } = await api('/auth/google', { method: 'POST', body: { credential } });
            setUser(user);
          } catch (e) {
            toast({ status: 'error', title: e.message });
          }
        },
      });
    };
    document.body.appendChild(s);
    return () => s.remove();
  }, [step, setUser, toast]);

  const notConfigured = (provider) =>
    toast({
      status: 'info',
      title: `Đăng nhập ${provider} chưa được thiết lập`,
      description: 'Vui lòng dùng "Tiếp tục với email" trong lúc chờ cấu hình.',
    });

  const requestCode = async () => {
    setBusy(true);
    try {
      const r = await api('/auth/email/request-code', { method: 'POST', body: { email } });
      setDevCode(r.devCode || '');
      setCode('');
      setStep('code');
      toast({ status: 'success', title: 'Đã gửi mã xác nhận', description: `Kiểm tra hộp thư ${email}` });
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6) return;
    setBusy(true);
    try {
      const { user } = await api('/auth/email/verify-code', { method: 'POST', body: { email, code: value } });
      setUser(user);
    } catch (e) {
      toast({ status: 'error', title: e.message });
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Flex minH="100vh" direction="column" align="center" justify="center" px="16px" py="40px"
      bgGradient="linear(180deg, #F7FAFC 0%, #FFF7E0 100%)" _dark={{ bgGradient: 'linear(180deg, #171923, #1A202C)' }}>
      <Flex w="70px" h="70px" borderRadius="16px" bg="white" boxShadow="0 8px 25px rgba(0,0,0,0.2)" align="center" justify="center" mb="20px">
        <img src="/favicon.svg" alt="Mật Ong" width="56" height="56" />
      </Flex>

      <Box w="100%" maxW="400px" bg="app.card" borderRadius="24px" boxShadow="0 20px 50px rgba(0,0,0,0.12)" px="32px" py="32px">
        {step === 'choose' && (
          <>
            <Heading as="h2" fontSize="30px" fontWeight={700} textAlign="center">Đăng nhập</Heading>
            <Text fontSize="13.6px" color="app.muted" textAlign="center" mt="6px" mb="24px">Tiếp tục hành trình học tập của bạn</Text>
            <Flex direction="column" gap="14px">
              {GOOGLE_CLIENT_ID ? (
                <Box ref={googleBtnRef}>
                  <Button {...btn} bg="white" color="#4A5568" borderColor="#E2E8F0" leftIcon={<FcGoogle size={18} />}
                    onClick={() => window.google?.accounts.id.prompt()}>
                    Tiếp tục với Google
                  </Button>
                </Box>
              ) : (
                <Button {...btn} bg="white" color="#4A5568" borderColor="#E2E8F0" leftIcon={<FcGoogle size={18} />} onClick={() => notConfigured('Google')}>
                  Tiếp tục với Google
                </Button>
              )}
              <Button {...btn} bg="black" color="white" borderColor="black" _hover={{ bg: '#111' }} leftIcon={<FaApple size={18} />} onClick={() => notConfigured('Apple')}>
                Tiếp tục với Apple
              </Button>
              <Button {...btn} bg="white" color="#4A5568" borderColor="#E2E8F0" leftIcon={<Icon as={FiMail} boxSize="17px" />} onClick={() => setStep('email')}>
                Tiếp tục với email
              </Button>
            </Flex>
            <Flex gap="8px" mt="22px" justify="center" color="#A0AEC0" fontSize="13.6px" textAlign="center">
              <Icon as={FiLock} mt="3px" flexShrink={0} />
              <Text color="app.muted">
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <Link as={RouterLink} to="/policy" color="#F97316" fontWeight={700}>Điều khoản sử dụng</Link> và{' '}
                <Link as={RouterLink} to="/privacy" color="#F97316" fontWeight={700}>Chính sách quyền riêng tư</Link> của chúng tôi.
              </Text>
            </Flex>
          </>
        )}

        {step === 'email' && (
          <form onSubmit={(e) => { e.preventDefault(); requestCode(); }}>
            <Button variant="ghost" size="sm" leftIcon={<FiArrowLeft />} ml="-12px" mb="8px" onClick={() => setStep('choose')}>Quay lại</Button>
            <Heading as="h2" fontSize="24px" fontWeight={700}>Đăng nhập bằng email</Heading>
            <Text fontSize="13.6px" color="app.muted" mt="6px" mb="20px">Chúng tôi sẽ gửi mã gồm 6 chữ số tới email của bạn.</Text>
            <Input type="email" required autoFocus placeholder="ban@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
              h="44px" borderRadius="12px" borderWidth="2px" focusBorderColor="#1CB0F6" />
            <Button type="submit" isLoading={busy} {...btn} mt="16px" bg="#23AC38" color="white" borderColor="#23AC38" _hover={{ bg: '#22A035' }}>
              Gửi mã
            </Button>
          </form>
        )}

        {step === 'code' && (
          <Box>
            <Button variant="ghost" size="sm" leftIcon={<FiArrowLeft />} ml="-12px" mb="8px" onClick={() => setStep('email')}>Đổi email</Button>
            <Heading as="h2" fontSize="24px" fontWeight={700}>Nhập mã xác nhận</Heading>
            <Text fontSize="13.6px" color="app.muted" mt="6px" mb="20px">Mã đã được gửi tới <b>{email}</b>. Mã có hiệu lực trong 10 phút.</Text>
            <HStack justify="center">
              <PinInput otp size="lg" value={code} onChange={setCode} onComplete={verify} isDisabled={busy} focusBorderColor="#1CB0F6" autoFocus>
                {Array.from({ length: 6 }, (_, i) => <PinInputField key={i} borderRadius="12px" borderWidth="2px" />)}
              </PinInput>
            </HStack>
            {devCode && (
              <Text mt="12px" fontSize="12px" color="#B45309" bg="#FFF7E0" borderRadius="8px" px="10px" py="6px" textAlign="center">
                Chế độ phát triển (chưa cấu hình gửi email): mã của bạn là <b>{devCode}</b>
              </Text>
            )}
            <Button isLoading={busy} {...btn} mt="18px" bg="#23AC38" color="white" borderColor="#23AC38" _hover={{ bg: '#22A035' }} onClick={() => verify()}>
              Xác nhận
            </Button>
            <Button variant="link" size="sm" mt="14px" w="100%" color="#1CB0F6" onClick={requestCode} isDisabled={busy}>Gửi lại mã</Button>
          </Box>
        )}
      </Box>

      <Text mt="24px" fontSize="14.4px" fontWeight={500} color="app.muted">Miễn phí • Thú vị • Hiệu quả</Text>
    </Flex>
  );
}
