import { useEffect, useState } from 'react';
import { Box, Flex, Text, Button, IconButton, Icon } from '@chakra-ui/react';
import { FiPause, FiPlay, FiCheck, FiX, FiVolume2 } from 'react-icons/fi';
import { speak } from '../speech';
import { useAuth } from '../auth/AuthContext';

/**
 * Bottom sheet sau mỗi câu: xanh (đúng) / đỏ (sai), thông tin từ, tự chuyển câu sau N giây.
 * onOverride: đảo kết quả đúng/sai (khi người dùng gõ sai chính tả nhỏ, hoặc lỡ tay)
 */
export default function FeedbackSheet({ item, correct, settings, onNext, onOverride }) {
  const { user } = useAuth();
  const s = user?.settings || {};
  const [paused, setPaused] = useState(!settings.autoNext);
  const [left, setLeft] = useState(settings.autoDelay);

  useEffect(() => {
    setLeft(settings.autoDelay);
    setPaused(!settings.autoNext);
  }, [item, settings.autoDelay, settings.autoNext]);

  useEffect(() => {
    if (paused) return undefined;
    if (left <= 0) {
      onNext();
      return undefined;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, onNext]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      }
    };
    // trì hoãn để phím Enter vừa dùng để nộp không kích hoạt luôn "Tiếp tục"
    const t = setTimeout(() => window.addEventListener('keydown', onKey), 250);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onNext]);

  const bg = correct ? '#23AC38' : '#EF5350';
  const say = (t) => speak(t, { voiceURI: s.voiceURI, rate: s.speechRate || 1 });

  return (
    <Box position="fixed" left={0} right={0} bottom={0} zIndex={40} bg={bg} color="white" px={{ base: '16px', md: '40px' }} py="18px"
      boxShadow="0 -6px 24px rgba(0,0,0,0.15)" data-testid={correct ? 'sheet-correct' : 'sheet-wrong'}
      sx={{ animation: 'sheetUp .22s ease-out', '@keyframes sheetUp': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } } }}>
      <Flex maxW="900px" mx="auto" align={{ base: 'stretch', md: 'center' }} gap="16px" direction={{ base: 'column', md: 'row' }}>
        <Flex gap="12px" flex="1" minW={0}>
          <IconButton aria-label="Phát âm" icon={<FiVolume2 />} borderRadius="full" bg="whiteAlpha.900" color={bg} size="md" onClick={() => say(item.word)} />
          <Box minW={0}>
            <Text fontSize="15px">{correct ? '🎉 Chính xác! ' : '😕 Chưa đúng. '}Từ: <b style={{ fontSize: 18 }}>{item.word}</b> {item.pos && `(${item.pos})`}</Text>
            {item.ipa && <Text fontSize="13px" opacity={0.9}>{item.ipa}</Text>}
            <Text fontSize="15px"><b>Nghĩa:</b> {item.meaning}</Text>
            {item.example && (
              <Flex align="center" gap="6px" fontSize="13px" opacity={0.95}>
                <Icon as={FiVolume2} cursor="pointer" onClick={() => say(item.example)} flexShrink={0} />
                <Text noOfLines={2}><b>Ví dụ:</b> <i>{item.example}</i></Text>
              </Flex>
            )}
          </Box>
        </Flex>
        <Flex gap="10px" align="center" justify="flex-end">
          <IconButton aria-label={paused ? 'Tiếp tục đếm' : 'Tạm dừng'} icon={paused ? <FiPlay /> : <FiPause />} borderRadius="full"
            variant="outline" color="white" borderColor="whiteAlpha.700" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => setPaused((p) => !p)} />
          <IconButton aria-label={correct ? 'Tính là sai' : 'Tính là đúng'} title={correct ? 'Tính câu này là sai' : 'Tôi trả lời đúng (tính là đúng)'}
            icon={correct ? <FiX /> : <FiCheck />} borderRadius="full" bg="white" color={bg} _hover={{ bg: 'whiteAlpha.900' }} onClick={onOverride} />
          <Button bg="white" color={bg} borderRadius="9999px" px="22px" fontWeight={800} boxShadow="0 4px 0 0 rgba(0,0,0,0.15)"
            _hover={{ bg: 'whiteAlpha.900' }} onClick={onNext}>
            Tiếp tục{!paused ? ` (${left}s)` : ''}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
