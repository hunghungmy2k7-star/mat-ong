import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Box, Flex, Text, Switch, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, SliderMark, Button, Icon, Badge,
} from '@chakra-ui/react';
import { FiSettings, FiVolume2 } from 'react-icons/fi';
import { playSound } from './sound';
import { Btn3D } from '../components/ui';

const Panel = (p) => <Box bg="#F7FAFC" _dark={{ bg: 'whiteAlpha.50' }} borderRadius="16px" p="14px" {...p} />;
const Section = ({ children }) => <Text fontSize="12px" fontWeight={800} color="app.muted" letterSpacing="0.05em" mb="8px" mt="4px">{children}</Text>;

export default function SettingsModal({ isOpen, onClose, settings, onChange }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="32px" maxW="448px" mx="12px">
        <ModalHeader display="flex" alignItems="center" gap="8px" fontSize="20px" fontWeight={600}>
          <Icon as={FiSettings} color="#A855F7" /> Cài đặt Game
        </ModalHeader>
        <ModalCloseButton top="16px" right="16px" />
        <ModalBody>
          <Section>🔊 ÂM THANH</Section>
          <Panel>
            <Flex justify="space-between" align="center">
              <Text fontWeight={600}>Âm thanh hiệu ứng</Text>
              <Switch colorScheme="green" isChecked={settings.soundOn} onChange={(e) => onChange({ soundOn: e.target.checked })} />
            </Flex>
            <Flex justify="space-between" mt="12px">
              <Text fontSize="14px">Âm lượng</Text>
              <Badge colorScheme="blue" borderRadius="9999px">{settings.volume}%</Badge>
            </Flex>
            <Slider mt="6px" min={0} max={100} value={settings.volume} onChange={(v) => onChange({ volume: v })} isDisabled={!settings.soundOn} aria-label="Âm lượng">
              <SliderTrack><SliderFilledTrack bg="#1CB0F6" /></SliderTrack>
              <SliderThumb bg="#1CB0F6" />
            </Slider>
            <Flex justify="space-between" fontSize="11px" color="app.muted"><span>Nhỏ</span><span>To</span></Flex>
            <Button mt="10px" w="100%" size="sm" variant="outline" borderRadius="9999px" leftIcon={<FiVolume2 />}
              onClick={() => playSound('correct', { ...settings, soundOn: true })}>
              Thử âm thanh
            </Button>
            <Flex justify="space-between" align="center" mt="14px" gap="12px">
              <Box>
                <Text fontWeight={600}>Âm thanh nhận xu</Text>
                <Text fontSize="12px" color="app.muted">Tiếng khi cộng xu lúc hoàn thành game (không ảnh hưởng hiệu ứng đúng/sai)</Text>
              </Box>
              <Switch colorScheme="orange" isChecked={settings.coinSound} onChange={(e) => onChange({ coinSound: e.target.checked })} />
            </Flex>
          </Panel>

          <Section>⏱️ THỜI GIAN</Section>
          <Panel>
            <Flex justify="space-between">
              <Text fontWeight={600}>Thời gian mỗi câu hỏi</Text>
              <Badge colorScheme="orange" borderRadius="8px" px="8px">{settings.questionTime}S</Badge>
            </Flex>
            <Box px="8px" pb="20px">
              <Slider mt="10px" min={15} max={60} step={15} value={settings.questionTime} onChange={(v) => onChange({ questionTime: v })} aria-label="Thời gian mỗi câu">
                {[15, 30, 45, 60].map((m) => <SliderMark key={m} value={m} mt="12px" ml="-10px" fontSize="11px" color="app.muted">{m}s</SliderMark>)}
                <SliderTrack><SliderFilledTrack bg="#FF9600" /></SliderTrack>
                <SliderThumb bg="#FF9600" />
              </Slider>
            </Box>
            <Text fontSize="12px" color="app.muted">Áp dụng cho: Gõ từ, Nghe viết, Trắc nghiệm, Nối từ</Text>
            <Flex justify="space-between" align="center" mt="14px">
              <Box>
                <Text fontWeight={600}>Tự động chuyển câu</Text>
                <Text fontSize="12px" color="app.muted">Dừng lại xem đáp án rồi mới sang từ khác (áp dụng cho mọi dạng bài)</Text>
              </Box>
              <Switch colorScheme="purple" isChecked={settings.autoNext} onChange={(e) => onChange({ autoNext: e.target.checked })} />
            </Flex>
            {settings.autoNext && (
              <>
                <Flex justify="space-between" mt="12px">
                  <Text fontSize="14px">Thời gian chờ</Text>
                  <Badge colorScheme="purple" borderRadius="8px">{settings.autoDelay}S</Badge>
                </Flex>
                <Slider mt="6px" min={3} max={10} value={settings.autoDelay} onChange={(v) => onChange({ autoDelay: v })} aria-label="Thời gian chờ">
                  <SliderTrack><SliderFilledTrack bg="#A855F7" /></SliderTrack>
                  <SliderThumb bg="#A855F7" />
                </Slider>
                <Flex justify="space-between" fontSize="11px" color="app.muted"><span>3s</span><span>10s</span></Flex>
              </>
            )}
          </Panel>
        </ModalBody>
        <ModalFooter gap="10px">
          <Button variant="ghost" color="#1CB0F6" onClick={() => onChange(null)}>Đặt lại mặc định</Button>
          <Btn3D borderRadius="24px" onClick={onClose}>Xong</Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
