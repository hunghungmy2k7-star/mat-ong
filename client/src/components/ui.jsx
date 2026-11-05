import { forwardRef } from 'react';
import {
  Button, Badge, AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody,
  AlertDialogFooter, IconButton, Icon, Flex, Text,
} from '@chakra-ui/react';
import { useRef } from 'react';
import { FiVolume2 } from 'react-icons/fi';
import { speak } from '../speech';
import { useAuth } from '../auth/AuthContext';

// Nút 3D kiểu site mẫu: nền đặc + shadow đặc phía dưới, nhấn xuống khi click
export const Btn3D = forwardRef(function Btn3D({ color = '#23AC38', shadow = '#1F8F31', textColor = 'white', children, ...rest }, ref) {
  return (
    <Button
      ref={ref}
      bg={color}
      color={textColor}
      borderRadius="16px"
      fontWeight={700}
      boxShadow={`0 4px 0 0 ${shadow}`}
      _hover={{ bg: color, filter: 'brightness(1.05)' }}
      _active={{ transform: 'translateY(3px)', boxShadow: `0 1px 0 0 ${shadow}` }}
      _disabled={{ opacity: 0.5, cursor: 'not-allowed', _hover: { bg: color } }}
      transition="transform .08s ease, box-shadow .08s ease, filter .15s"
      {...rest}
    >
      {children}
    </Button>
  );
});

// Màu pill loại từ (đo từ trang /words của site mẫu)
const POS_COLORS = {
  noun: ['#BAE7FF', '#0A5D8A'],
  verb: ['#FEE2E2', '#991B1B'],
  adjective: ['#C6F6D5', '#3D7200'],
  adj: ['#C6F6D5', '#3D7200'],
  adverb: ['#FEF3C7', '#92400E'],
  adv: ['#FEF3C7', '#92400E'],
  preposition: ['#E9D8FD', '#553C9A'],
  pronoun: ['#FED7E2', '#97266D'],
  conjunction: ['#E2E8F0', '#2D3748'],
};
export function PosBadge({ pos }) {
  if (!pos) return <Text color="app.muted">-</Text>;
  const [bg, color] = POS_COLORS[pos.toLowerCase()] || ['#EDF2F7', '#1A202C'];
  return (
    <Badge bg={bg} color={color} borderRadius="9999px" px="10px" py="5px" fontSize="12px" fontWeight={700} textTransform="lowercase">
      {pos}
    </Badge>
  );
}

export function SpeakButton({ text, size = 'xs', ...rest }) {
  const { user } = useAuth();
  const s = user?.settings || {};
  return (
    <IconButton
      aria-label={`Phát âm ${text}`}
      icon={<Icon as={FiVolume2} />}
      size={size}
      variant="ghost"
      color="#1CB0F6"
      minW="22px"
      h="22px"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, { voiceURI: s.voiceURI, rate: s.speechRate || 1 });
      }}
      {...rest}
    />
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Xóa', isLoading, color = '#FF4B4B', shadow = '#D93636' }) {
  const cancelRef = useRef();
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent borderRadius="24px" mx="12px">
          <AlertDialogHeader fontSize="18px" fontWeight={700}>{title}</AlertDialogHeader>
          <AlertDialogBody fontSize="14px">{message}</AlertDialogBody>
          <AlertDialogFooter gap="10px">
            <Button ref={cancelRef} onClick={onClose} borderRadius="16px" variant="ghost">Hủy</Button>
            <Btn3D color={color} shadow={shadow} onClick={onConfirm} data-testid="confirm-ok" isLoading={isLoading}>{confirmText}</Btn3D>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}

export function EmptyState({ emoji = '🐝', title, children }) {
  return (
    <Flex direction="column" align="center" textAlign="center" gap="8px" py="48px" px="16px">
      <Text fontSize="48px" lineHeight="1">{emoji}</Text>
      <Text fontWeight={700} fontSize="17px">{title}</Text>
      {children && <Text fontSize="14px" color="app.muted" maxW="420px">{children}</Text>}
    </Flex>
  );
}
