import { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalBody, ModalFooter, ModalCloseButton, Flex, Box, Text, Avatar, Badge,
  Input, Switch, Select, Button, Icon, IconButton, SimpleGrid, useToast, Tooltip,
} from '@chakra-ui/react';
import { FiEdit2, FiCalendar, FiBell, FiVolume2, FiLogOut, FiCheck, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { getEnglishVoices, speak } from '../speech';
import { enablePush, disablePush, pushSupported } from '../lib/push';

const REMIND_TIMES = ['08:00', '12:00', '18:00', '21:00'];
const RATES = [0.75, 1, 1.25, 1.5, 2];

function Section({ title, right, children }) {
  return (
    <Box>
      <Flex justify="space-between" align="center" mb="10px">
        <Text fontSize="14px" fontWeight={700}>{title}</Text>
        {right}
      </Flex>
      {children}
    </Box>
  );
}

const Panel = (props) => <Box bg="#F7FAFC" _dark={{ bg: 'whiteAlpha.50' }} borderRadius="16px" p="14px" {...props} />;

export default function ProfileModal({ isOpen, onClose }) {
  const { user, setUser, logout } = useAuth();
  const [deleting, setDeleting] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [voices, setVoices] = useState([]);
  const s = user?.settings || {};

  useEffect(() => {
    if (!isOpen) return;
    setName(user?.name || '');
    const load = () => setVoices(getEnglishVoices());
    load();
    window.speechSynthesis?.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', load);
  }, [isOpen, user?.name]);

  if (!user) return null;

  const save = async (patch) => {
    try {
      const { user: u } = await api('/auth/profile', { method: 'PATCH', body: patch });
      setUser(u);
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };
  const saveSettings = (patch) => save({ settings: patch });
  const toggleRemind = async (on) => {
    setPushBusy(true);
    try {
      if (on) await enablePush(); else await disablePush();
      await saveSettings({ remindOn: on });
      if (on) toast({ status: 'success', title: `Đã bật nhắc học lúc ${s.remindAt || '08:00'} mỗi ngày` });
    } catch (e) {
      toast({ status: 'error', title: 'Chưa bật được nhắc học', description: e.message });
    } finally {
      setPushBusy(false);
    }
  };
  const testPush = async () => {
    setPushBusy(true);
    try {
      await enablePush();
      await api('/push/test', { method: 'POST' });
      toast({ status: 'success', title: 'Đã gửi thông báo thử' });
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setPushBusy(false);
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="32px" maxW="896px" mx="12px">
        <ModalCloseButton top="20px" right="20px" />
        <Flex align="center" gap="14px" px="24px" pt="24px" pb="16px" borderBottom="1px solid" borderColor="app.line">
          <Avatar w="56px" h="56px" name={user.name} src={user.avatarUrl || undefined} bg="#FFC800" color="white" />
          <Box minW={0}>
            {editingName ? (
              <Flex gap="8px" align="center">
                <Input size="sm" value={name} onChange={(e) => setName(e.target.value)} borderRadius="10px" maxLength={60} autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && (save({ name }), setEditingName(false))} />
                <IconButton size="sm" aria-label="Lưu tên" icon={<FiCheck />} colorScheme="green"
                  onClick={() => { save({ name }); setEditingName(false); }} />
              </Flex>
            ) : (
              <Flex align="center" gap="8px">
                <Text fontSize="18px" fontWeight={800} noOfLines={1}>{user.name}</Text>
                <IconButton size="xs" variant="ghost" aria-label="Đổi tên" icon={<FiEdit2 />} onClick={() => setEditingName(true)} />
              </Flex>
            )}
            <Flex align="center" gap="8px" mt="2px" wrap="wrap">
              <Text fontSize="13px" color="app.muted">{user.email}</Text>
            </Flex>
          </Box>
        </Flex>

        <ModalBody px="24px" py="20px">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing="24px">
            <Section title="Học tập">
              <Flex direction="column" gap="12px">
                <Panel>
                  <Flex align="center" gap="8px" mb="4px">
                    <Icon as={FiCalendar} color="#A855F7" />
                    <Text fontWeight={700} fontSize="15px">Ngày thi mục tiêu</Text>
                  </Flex>
                  <Text fontSize="13px" color="app.muted" mb="10px">
                    Đặt ngày thi để thấy còn bao nhiêu ngày và có đồng hồ đếm ngược trên Header.
                  </Text>
                  <Input type="date" size="sm" maxW="200px" borderRadius="10px" bg="app.card"
                    value={s.examDate || ''} onChange={(e) => saveSettings({ examDate: e.target.value })} />
                </Panel>

                <Panel>
                  <Flex align="center" justify="space-between">
                    <Flex align="center" gap="10px">
                      <Flex w="32px" h="32px" borderRadius="10px" bg="#FEF3C7" align="center" justify="center">
                        <Icon as={FiBell} color="#F59E0B" />
                      </Flex>
                      <Box>
                        <Text fontWeight={700} fontSize="15px">Nhắc nhở học từ</Text>
                        <Text fontSize="12px" color="app.muted">
                          Mỗi ngày lúc <Text as="span" color="#EA7E00" fontWeight={700}>{s.remindAt || '08:00'}</Text>
                        </Text>
                      </Box>
                    </Flex>
                    <Switch colorScheme="orange" isChecked={Boolean(s.remindOn)} isDisabled={pushBusy} onChange={(e) => toggleRemind(e.target.checked)} data-testid="remind-switch" />
                  </Flex>
                  <Text fontSize="13px" mt="14px" mb="8px">Chọn giờ nhắc</Text>
                  <SimpleGrid columns={4} spacing="8px">
                    {REMIND_TIMES.map((t) => {
                      const on = (s.remindAt || '08:00') === t;
                      return (
                        <Button key={t} size="sm" h="38px" borderRadius="12px" variant="outline"
                          borderWidth="2px" borderColor={on ? '#F59E0B' : 'app.line'} bg={on ? '#FFF7ED' : 'app.card'}
                          color={on ? '#EA7E00' : 'app.text'} onClick={() => saveSettings({ remindAt: t })}>
                          {t}
                        </Button>
                      );
                    })}
                  </SimpleGrid>
                  <Flex align="center" gap="10px" mt="10px">
                    <Text fontSize="13px">Giờ khác</Text>
                    <Input type="time" size="sm" maxW="130px" borderRadius="10px" bg="app.card"
                      value={s.remindAt || '08:00'} onChange={(e) => e.target.value && saveSettings({ remindAt: e.target.value })} />
                  </Flex>
                  <Text fontSize="12px" color="app.muted" mt="10px">
                    Theo giờ Việt Nam, mỗi ngày một lần: từ đến hạn ôn kèm tối đa 5 từ chưa thuộc. Thông báo gửi tới trình duyệt đã bật nhắc.
                  </Text>
                  {!pushSupported() && <Text fontSize="12px" color="#E53E3E" mt="6px">Trình duyệt này không hỗ trợ thông báo đẩy.</Text>}
                  {s.remindOn && pushSupported() && (
                    <Button size="xs" mt="8px" borderRadius="999px" variant="outline" leftIcon={<FiBell />} isLoading={pushBusy} onClick={testPush} data-testid="remind-test">
                      Gửi thử thông báo
                    </Button>
                  )}
                </Panel>
              </Flex>
            </Section>

            <Flex direction="column" gap="20px">
              <Section
                title="Phát âm"
                right={
                  <Button size="xs" variant="ghost" color="#1CB0F6" leftIcon={<FiVolume2 />}
                    onClick={() => speak('Hello, welcome to Mat Ong!', { voiceURI: s.voiceURI, rate: s.speechRate || 1 })}>
                    Nghe thử
                  </Button>
                }
              >
                <Panel>
                  <Flex direction="column" gap="12px">
                    <Flex align="center" justify="space-between" gap="12px">
                      <Text fontSize="14px">Ngôn ngữ</Text>
                      <Badge borderRadius="999px" px="10px" py="4px" bg="app.card" textTransform="none" fontSize="13px">🇬🇧 Tiếng Anh</Badge>
                    </Flex>
                    <Flex align="center" justify="space-between" gap="12px">
                      <Text fontSize="14px" flexShrink={0}>Giọng đọc</Text>
                      <Select size="sm" maxW="240px" borderRadius="10px" bg="app.card" value={s.voiceURI || ''}
                        onChange={(e) => saveSettings({ voiceURI: e.target.value })}>
                        <option value="">Tự động chọn giọng tốt nhất</option>
                        {voices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                        ))}
                      </Select>
                    </Flex>
                    <Flex align="center" justify="space-between" gap="12px">
                      <Text fontSize="14px">Tốc độ đọc</Text>
                      <Select size="sm" maxW="110px" borderRadius="10px" bg="app.card" value={s.speechRate || 1}
                        onChange={(e) => saveSettings({ speechRate: Number(e.target.value) })}>
                        {RATES.map((r) => (
                          <option key={r} value={r}>{r}x</option>
                        ))}
                      </Select>
                    </Flex>
                  </Flex>
                </Panel>
              </Section>
            </Flex>
          </SimpleGrid>
        </ModalBody>

        <ModalFooter justifyContent="space-between" borderTop="1px solid" borderColor="app.line">
          <Text fontSize="13px" color="app.muted">
            Thành viên từ {new Date(`${user.createdAt.replace(' ', 'T')}Z`).toLocaleDateString('vi-VN')}
          </Text>
          <Flex gap="4px">
            <Button variant="ghost" size="sm" color="app.muted" leftIcon={<FiTrash2 />} onClick={() => setDeleting('')}>Xóa tài khoản</Button>
            <Button variant="ghost" color="#E53E3E" leftIcon={<FiLogOut />}
              onClick={async () => { await logout(); onClose(); navigate('/login'); }}>
              Đăng xuất
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
      <Modal isOpen={deleting !== null} onClose={() => setDeleting(null)} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="24px" mx="12px">
          <ModalBody pt="24px">
            <Text fontSize="18px" fontWeight={800}>Xóa tài khoản vĩnh viễn?</Text>
            <Text fontSize="14px" color="app.soft" mt="8px">
              Toàn bộ bộ từ, tiến độ, xu, vật phẩm, lớp học do bạn tạo và tin nhắn sẽ bị xóa và không thể khôi phục.
              Gõ email <b>{user.email}</b> để xác nhận.
            </Text>
            <Input mt="12px" borderRadius="12px" value={deleting || ''} onChange={(e) => setDeleting(e.target.value)} placeholder={user.email} aria-label="Email xác nhận" />
          </ModalBody>
          <ModalFooter gap="8px">
            <Button variant="ghost" borderRadius="16px" onClick={() => setDeleting(null)}>Hủy</Button>
            <Button colorScheme="red" borderRadius="16px" isDisabled={(deleting || '').trim().toLowerCase() !== user.email.toLowerCase()}
              onClick={async () => {
                try {
                  await api('/auth/account', { method: 'DELETE', body: { confirm: deleting } });
                  setUser(null);
                  onClose();
                  navigate('/');
                } catch (e) { toast({ status: 'error', title: e.message }); }
              }}>Xóa vĩnh viễn</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Modal>
  );
}
