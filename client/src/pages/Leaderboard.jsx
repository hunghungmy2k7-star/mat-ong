import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Flex, Grid, Text, Button, Avatar, Table, Thead, Tbody, Tr, Th, Td, Badge, Input, IconButton, Icon, Spinner, useToast,
} from '@chakra-ui/react';
import { FiZap, FiTrendingUp, FiLink, FiInbox, FiSend, FiAward, FiRefreshCw, FiCornerUpLeft, FiX, FiTrash2 } from 'react-icons/fi';
import { api } from '../api';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { EmptyState } from '../components/ui';

const panel = { bg: 'app.card', borderRadius: '24px', border: '1px solid', borderColor: 'app.line' };
const MEDAL = ['🥇', '🥈', '🥉'];

function ago(iso) {
  const s = (Date.now() - new Date(`${iso.replace(' ', 'T')}Z`)) / 1000;
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

function Ranking() {
  const [type, setType] = useState('games');
  const [rows, setRows] = useState(null);
  useEffect(() => { setRows(null); api(`/activity/leaderboard?type=${type}`).then(setRows).catch(() => setRows([])); }, [type]);
  const seg = (k, label, icon, side) => (
    <Button flex="1" h="40px" leftIcon={<Icon as={icon} />} borderRadius={side === 'l' ? '24px 0 0 24px' : '0 24px 24px 0'}
      bg={type === k ? '#CE82FF' : '#EDF2F7'} color={type === k ? 'white' : '#4A5568'} fontWeight={type === k ? 700 : 500}
      boxShadow="0 4px 0 0 #1F8F31" _hover={{ bg: type === k ? '#C470FF' : '#E2E8F0' }} onClick={() => setType(k)}>{label}</Button>
  );
  return (
    <Box>
      <Flex mb="12px">{seg('games', 'Lượt chơi game', FiZap, 'l')}{seg('streak', 'Streak 🔥', FiTrendingUp, 'r')}</Flex>
      <Box bg="app.card" borderRadius="32px" border="2px solid" borderColor="#1A202C" _dark={{ borderColor: 'whiteAlpha.400' }}
        boxShadow="0 8px 0 0 #E5E5E5" overflow="hidden">
        <Box maxH="560px" overflowY="auto">
          {!rows ? <Flex justify="center" py="40px"><Spinner /></Flex> : !rows.length ? (
            <EmptyState emoji="🏁" title="Chưa có ai trên bảng xếp hạng">Hoàn thành một lượt học để ghi tên mình nhé!</EmptyState>
          ) : (
            <Table size="sm">
              <Thead position="sticky" top={0} bg="#F7FAFC" _dark={{ bg: 'gray.700' }} zIndex={1}>
                <Tr><Th w="70px">Hạng</Th><Th>Người dùng</Th><Th isNumeric>{type === 'games' ? 'Lượt (30 ngày)' : 'Streak'}</Th></Tr>
              </Thead>
              <Tbody>
                {rows.map((r) => (
                  <Tr key={r.id} bg={r.isMe ? '#F0FFF4' : undefined} _dark={{ bg: r.isMe ? 'green.900' : undefined }}>
                    <Td>{r.rank <= 3 ? <Text fontSize="18px">{MEDAL[r.rank - 1]}</Text> : <Badge borderRadius="9999px" px="8px">{r.rank}</Badge>}</Td>
                    <Td><Flex align="center" gap="10px"><Avatar size="sm" name={r.name} src={r.avatarUrl || undefined} /><Text fontWeight={500}>{r.name}{r.isMe && ' (bạn)'}</Text></Flex></Td>
                    <Td isNumeric><Text as="span" fontWeight={700} color={type === 'games' ? '#1CB0F6' : '#FF9600'}>{r.value}</Text> {type === 'games' ? '⚡' : '🔥'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SharedStreak() {
  const toast = useToast();
  const [tab, setTab] = useState('list');
  const [data, setData] = useState(null);
  const [board, setBoard] = useState(null);
  const [email, setEmail] = useState('');
  const load = useCallback(() => api('/shared-streak').then(setData).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'board') api('/shared-streak/leaderboard').then(setBoard).catch(() => setBoard([])); }, [tab]);

  const act = async (fn, msg) => {
    try { await fn(); if (msg) toast({ status: 'success', title: msg }); load(); } catch (e) { toast({ status: 'error', title: e.message }); }
  };
  const tabs = [['list', 'Chuỗi chung', FiLink], ['inbox', `Lời mời${data?.received.length ? ` (${data.received.length})` : ''}`, FiInbox], ['sent', 'Đã gửi', FiSend], ['board', 'Xếp hạng', FiAward]];
  return (
    <Box {...panel} overflow="hidden">
      <Flex borderBottom="3px solid #23AC38">
        {tabs.map(([k, l, ic]) => (
          <Button key={k} flex="1" size="sm" h="40px" borderRadius={0} leftIcon={<Icon as={ic} />} fontSize="12px"
            bg={tab === k ? '#CE82FF' : 'transparent'} color={tab === k ? 'white' : 'app.text'} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </Flex>
      <Box p="14px" minH="150px">
        {tab === 'list' && (data?.list.length ? data.list.map((s) => (
          <Flex key={s.id} align="center" gap="10px" py="8px" borderBottom="1px solid" borderColor="app.line" _last={{ borderBottom: 'none' }}>
            <Avatar size="sm" name={s.partner.name} src={s.partner.avatarUrl || undefined} />
            <Text flex="1" fontWeight={600}>{s.partner.name}</Text>
            <Badge colorScheme="orange" fontSize="14px" borderRadius="9999px" px="10px">🔥 {s.streak}</Badge>
            <IconButton size="xs" variant="ghost" aria-label="Rời chuỗi chung" icon={<FiTrash2 />} onClick={() => act(() => api(`/shared-streak/${s.id}`, { method: 'DELETE' }), 'Đã rời chuỗi chung')} />
          </Flex>
        )) : (
          <Flex direction="column" align="center" textAlign="center" py="16px" gap="6px">
            <Icon as={FiLink} color="#CE82FF" boxSize="28px" />
            <Text fontWeight={700}>Chưa có chuỗi chung</Text>
            <Text fontSize="13px" color="app.muted">Kết bạn và cùng học mỗi ngày để giữ chuỗi chung.</Text>
          </Flex>
        ))}
        {tab === 'inbox' && (data?.received.length ? data.received.map((i) => (
          <Flex key={i.id} align="center" gap="10px" py="8px">
            <Avatar size="sm" name={i.from.name} src={i.from.avatarUrl || undefined} />
            <Text flex="1" fontSize="14px"><b>{i.from.name}</b> mời bạn giữ chuỗi chung</Text>
            <Button size="xs" colorScheme="green" onClick={() => act(() => api(`/shared-streak/invitations/${i.id}/accept`, { method: 'POST' }), 'Đã bắt đầu chuỗi chung 🔥')}>Đồng ý</Button>
            <Button size="xs" variant="ghost" onClick={() => act(() => api(`/shared-streak/invitations/${i.id}/decline`, { method: 'POST' }))}>Từ chối</Button>
          </Flex>
        )) : <Text textAlign="center" color="app.muted" fontSize="14px" py="20px">Chưa có lời mời. Lời mời chuỗi chung từ bạn bè sẽ xuất hiện tại đây.</Text>)}
        {tab === 'sent' && (
          <Box>
            <Flex as="form" gap="8px" onSubmit={(e) => { e.preventDefault(); act(async () => { await api('/shared-streak/invite', { method: 'POST', body: { email } }); setEmail(''); }, 'Đã gửi lời mời'); }}>
              <Input size="sm" borderRadius="9999px" type="email" placeholder="Email bạn bè" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button size="sm" type="submit" colorScheme="purple" borderRadius="9999px" isDisabled={!email}>Gửi</Button>
            </Flex>
            <Text fontSize="12px" color="app.muted" mt="6px">Nhập email bạn bè (đã có tài khoản Mật Ong) để bắt đầu chuỗi học chung.</Text>
            {data?.sent.map((s) => (
              <Flex key={s.id} justify="space-between" fontSize="13px" py="6px" borderBottom="1px solid" borderColor="app.line">
                <Text>{s.email}</Text>
                <Badge colorScheme={s.status === 'accepted' ? 'green' : s.status === 'declined' ? 'red' : 'gray'}>
                  {s.status === 'accepted' ? 'Đã đồng ý' : s.status === 'declined' ? 'Đã từ chối' : 'Đang chờ'}
                </Badge>
              </Flex>
            ))}
          </Box>
        )}
        {tab === 'board' && (!board ? <Spinner /> : board.length ? board.map((r) => (
          <Flex key={r.id} align="center" gap="8px" py="6px" fontSize="14px">
            <Text w="26px">{r.rank <= 3 ? MEDAL[r.rank - 1] : `#${r.rank}`}</Text>
            <Text flex="1" noOfLines={1}>{r.a.name} & {r.b.name}</Text>
            <Badge colorScheme="orange">🔥 {r.streak}</Badge>
          </Flex>
        )) : <Text textAlign="center" color="app.muted" py="20px" fontSize="14px">Chưa có cặp chuỗi chung nào.</Text>)}
      </Box>
    </Box>
  );
}

function Chat() {
  const toast = useToast();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [reply, setReply] = useState(null);
  const boxRef = useRef(null);
  const lastId = useRef(0);
  const poll = useCallback(async () => {
    try {
      const rows = await api(`/chat/messages?after=${lastId.current}`);
      if (rows.length) {
        lastId.current = Math.max(lastId.current, rows[rows.length - 1].id);
        // gộp theo id để không lặp khi hai lượt tải chạy chồng nhau
        setMsgs((m) => {
          const seen = new Set(m.map((x) => x.id));
          return [...m, ...rows.filter((r) => !seen.has(r.id))].slice(-150);
        });
        setTimeout(() => boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' }), 50);
      }
    } catch { /* bỏ qua lỗi mạng tạm thời */ }
  }, []);
  useEffect(() => {
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api('/chat/messages', { method: 'POST', body: { body: text, replyTo: reply?.id } });
      setText(''); setReply(null); poll();
    } catch (err) { toast({ status: 'error', title: err.message }); }
  };
  return (
    <Box {...panel} display="flex" flexDirection="column" h="420px">
      <Flex align="center" justify="space-between" px="14px" py="10px" borderBottom="1px solid" borderColor="app.line">
        <Text fontWeight={700}>💬 Trò chuyện cộng đồng</Text>
        <IconButton size="xs" variant="ghost" aria-label="Tải lại" icon={<FiRefreshCw />} color="#1CB0F6" onClick={poll} />
      </Flex>
      <Box ref={boxRef} flex="1" overflowY="auto" px="12px" py="8px" data-testid="chat">
        {msgs.length ? msgs.map((m) => (
          <Box key={m.id} bg={m.isMe ? '#F0FFF4' : '#F7FAFC'} _dark={{ bg: 'whiteAlpha.100' }} borderRadius="14px" px="10px" py="8px" mb="8px" role="group">
            <Flex align="center" gap="8px">
              <Avatar size="xs" name={m.user.name} src={m.user.avatarUrl || undefined} />
              <Text fontSize="13px" fontWeight={700} color="#23AC38">{m.user.name}</Text>
              <Text fontSize="11px" color="app.muted">{ago(m.createdAt)}</Text>
              <IconButton ml="auto" size="xs" variant="ghost" aria-label="Trả lời" icon={<FiCornerUpLeft />} opacity={0.6} _groupHover={{ opacity: 1 }} onClick={() => setReply(m)} />
            </Flex>
            {m.reply && <Text fontSize="12px" color="app.muted" borderLeft="3px solid #CE82FF" pl="8px" my="4px" noOfLines={1}>↩ {m.reply.name}: {m.reply.body}</Text>}
            <Text fontSize="14px" whiteSpace="pre-wrap" wordBreak="break-word">{m.body}</Text>
          </Box>
        )) : <Text textAlign="center" color="app.muted" fontSize="14px" mt="40px">Chưa có tin nhắn nào. Hãy chào mọi người! 👋</Text>}
      </Box>
      {reply && (
        <Flex px="12px" py="4px" bg="#FAF5FF" _dark={{ bg: 'whiteAlpha.100' }} fontSize="12px" align="center" gap="6px">
          <Text flex="1" noOfLines={1}>↩ Trả lời <b>{reply.user.name}</b>: {reply.body}</Text>
          <IconButton size="xs" variant="ghost" aria-label="Hủy trả lời" icon={<FiX />} onClick={() => setReply(null)} />
        </Flex>
      )}
      <Flex as="form" onSubmit={send} gap="8px" p="10px" borderTop="1px solid" borderColor="app.line">
        <Input size="sm" borderRadius="9999px" placeholder="Nhập tin nhắn..." value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
        <IconButton type="submit" size="sm" borderRadius="full" bg="#23AC38" color="white" aria-label="Gửi" icon={<FiSend />} _hover={{ bg: '#22A035' }} />
      </Flex>
    </Box>
  );
}

export default function Leaderboard() {
  return (
    <Grid templateColumns={{ base: '1fr', lg: '1.5fr 1fr' }} gap="24px" alignItems="start">
      <Ranking />
      <Flex direction="column" gap="16px">
        <Box {...panel} p="16px">
          <Text fontWeight={700} mb="10px">Hoạt động của bạn</Text>
          <ActivityHeatmap />
        </Box>
        <SharedStreak />
        <Chat />
      </Flex>
    </Grid>
  );
}
