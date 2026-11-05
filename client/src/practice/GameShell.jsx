import { useEffect, useRef, useState } from 'react';
import {
  Box, Flex, Text, Button, Icon, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { FiRotateCw } from 'react-icons/fi';
import CoinIcon from '../components/CoinIcon';

// Đếm ngược theo giây; reset khi `resetKey` đổi; dừng khi `paused`
export function useCountdown(seconds, { resetKey, paused, onExpire }) {
  const [left, setLeft] = useState(seconds);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  useEffect(() => setLeft(seconds), [seconds, resetKey]);
  useEffect(() => {
    if (paused || !seconds) return undefined;
    if (left <= 0) {
      expireRef.current?.();
      return undefined;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, seconds]);
  return left;
}

function ConfirmExit({ isOpen, answered, onStay, onExit, onEnd }) {
  const ref = useRef();
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={ref} onClose={onStay} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent borderRadius="24px" mx="12px">
          <AlertDialogHeader fontSize="18px">{answered ? 'Kết thúc lượt học?' : 'Thoát game?'}</AlertDialogHeader>
          <AlertDialogBody fontSize="14px">
            {answered
              ? `Bạn đã làm ${answered} từ. Kết quả các từ này sẽ được tính như khi học xong, những từ chưa làm được bỏ qua.`
              : 'Bạn có chắc muốn thoát? Tiến trình sẽ không được lưu.'}
          </AlertDialogBody>
          <AlertDialogFooter gap="10px">
            <Button variant="outline" colorScheme="red" borderRadius="16px" onClick={answered ? onEnd : onExit}>
              {answered ? 'Kết thúc lượt' : 'Thoát'}
            </Button>
            <Button ref={ref} bg="#23AC38" color="white" borderRadius="16px" _hover={{ bg: '#22A035' }} onClick={onStay}>Ở lại</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}

/**
 * Khung màn chơi toàn màn hình (ẩn header/sidebar): thanh trên + nội dung.
 * props: coins, current, total, label, extra (nút phụ), timer {left,total}, answered, onRestart, onExit, onEnd
 */
export default function GameShell({ coins, current, total, label, extra, timer, answered, onRestart, onExit, onEnd, children, maxW = '564px' }) {
  const [confirm, setConfirm] = useState(false);
  const pct = total ? Math.min(100, (current / total) * 100) : 0;
  const tPct = timer?.total ? (timer.left / timer.total) * 100 : 0;
  return (
    <Box position="fixed" inset={0} zIndex={30} bg="app.bg" overflowY="auto" px="12px" pb="200px" data-testid="game">
      <Box maxW={maxW} mx="auto" mt="10px" mb="16px" bg="app.card" borderRadius="32px" border="2px solid" borderColor="#1A202C"
        _dark={{ borderColor: 'whiteAlpha.400' }} boxShadow="0 1px 2px rgba(0,0,0,0.05)" px="20px" py="14px">
        <Flex align="center" gap="10px" wrap="wrap">
          <Flex align="center" gap="6px" bg="#FEF3C7" color="#92400E" borderRadius="12px" px="8px" h="29px" fontSize="14px" fontWeight={700}>
            <CoinIcon size={15} /> ~{coins} GAME
          </Flex>
          <Text fontWeight={600}>{label || `${Math.min(current + 1, total)} / ${total}`}</Text>
          <Flex ml="auto" align="center" gap="4px">
            {extra}
            <Button size="sm" variant="ghost" color="#1CB0F6" fontWeight={700} leftIcon={<Icon as={FiRotateCw} />} onClick={onRestart}>
              Chơi lại
            </Button>
            <Button size="sm" variant="ghost" color="#1CB0F6" fontWeight={700} onClick={() => setConfirm(true)}>Thoát</Button>
          </Flex>
        </Flex>
        <Box mt="10px" h="8px" borderRadius="9999px" bg="#E2E8F0" _dark={{ bg: 'whiteAlpha.200' }}>
          <Box h="100%" w={`${pct}%`} borderRadius="9999px" bgGradient="linear(to right, #23AC38, #4FC766)" transition="width .3s" />
        </Box>
        {timer && (
          <Flex align="center" gap="10px" mt="8px">
            <Text fontSize="12px" fontWeight={700} color={timer.left <= 5 ? '#E53E3E' : '#23AC38'} w="30px" data-testid="timer">{timer.left}s</Text>
            <Box flex="1" h="6px" borderRadius="9999px" bg="#E2E8F0" _dark={{ bg: 'whiteAlpha.200' }}>
              <Box h="100%" w={`${tPct}%`} borderRadius="9999px" bg={timer.left <= 5 ? '#E53E3E' : '#23AC38'} transition="width 1s linear" />
            </Box>
          </Flex>
        )}
      </Box>
      {children}
      <ConfirmExit
        isOpen={confirm}
        answered={answered}
        onStay={() => setConfirm(false)}
        onExit={() => { setConfirm(false); onExit(); }}
        onEnd={() => { setConfirm(false); onEnd(); }}
      />
    </Box>
  );
}
