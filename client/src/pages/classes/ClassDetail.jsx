import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Flex, Grid, Text, Heading, Button, Badge, Icon, Select, Input, Spinner, Table, Thead, Tbody, Tr, Th, Td, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter, FormControl, FormLabel, useToast, Tooltip,
} from '@chakra-ui/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft, FiBookOpen, FiClipboard, FiUsers, FiPlus, FiTrash2, FiEdit2, FiShare2, FiFolder, FiPlay, FiCopy, FiClock, FiLogOut,
} from 'react-icons/fi';
import { api } from '../../api';
import { Btn3D, ConfirmDialog, EmptyState } from '../../components/ui';
import ActivityHeatmap from '../../components/ActivityHeatmap';
import { SharedFolderView, PublicDeckCard, useCopyActions } from '../../components/community/CommunityLibrary';
import PublicDeckModal from '../../components/community/PublicDeckModal';
import GameRunner from '../../practice/GameRunner';
import { useGameSettings } from '../../practice/settings';

const MODES = [['quiz', 'Trắc nghiệm'], ['typing', 'Gõ từ'], ['listening', 'Nghe viết'], ['match', 'Nối từ'], ['flashcard', 'Flashcard']];
const card = { bg: 'app.card', borderRadius: '24px', border: '2px solid', borderColor: 'app.line', boxShadow: '0 4px 0 0 #E5E5E5', _dark: { boxShadow: '0 4px 0 0 #2D3748' } };
const fmtDate = (iso) => new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
const toLocalInput = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function Remaining({ deadline }) {
  const now = useNow();
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return <Text as="span" color="#E53E3E" fontWeight={700}>Đã hết hạn</Text>;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
  return <Text as="span" color="#EA7E00" fontWeight={700}>Còn lại {d > 0 ? `${d} ngày ` : ''}{hms}</Text>;
}

// ================= Tài liệu =================
function ResourcesTab({ cls, isTeacher }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [kind, setKind] = useState('folder');
  const [mine, setMine] = useState({ folders: [], cats: [] });
  const [refId, setRefId] = useState('');
  const [openFolder, setOpenFolder] = useState(null);
  const [view, setView] = useState(null);
  const { copying, copyDeck } = useCopyActions();
  const closeFolder = useCallback(() => setOpenFolder(null), []);

  const load = useCallback(() => api(`/classes/${cls.id}/resources`).then(setList).catch((e) => toast({ status: 'error', title: e.message })), [cls.id, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!isTeacher) return;
    Promise.all([api('/folders'), api('/categories?all=1')]).then(([folders, cats]) => setMine({ folders, cats: cats.filter((c) => !c.isPath) }));
  }, [isTeacher]);

  const options = kind === 'folder' ? mine.folders : mine.cats;
  const share = async () => {
    try {
      await api(`/classes/${cls.id}/resources`, { method: 'POST', body: { kind, refId: Number(refId) } });
      toast({ status: 'success', title: 'Đã chia sẻ cho lớp' });
      setRefId('');
      load();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };
  const remove = async (r) => {
    await api(`/classes/${cls.id}/resources/${r.id}`, { method: 'DELETE' });
    load();
  };

  if (openFolder) return <FolderLoader id={openFolder} onBack={closeFolder} />;

  return (
    <Box>
      {isTeacher && (
        <Flex {...card} p="16px" gap="10px" mb="18px" wrap="wrap" align="end">
          <FormControl w={{ base: '100%', sm: '160px' }}>
            <FormLabel fontSize="13px" fontWeight={700}>Loại</FormLabel>
            <Select borderRadius="12px" value={kind} onChange={(e) => { setKind(e.target.value); setRefId(''); }} aria-label="Loại tài liệu">
              <option value="folder">Folder</option>
              <option value="category">Bộ từ</option>
            </Select>
          </FormControl>
          <FormControl flex="1" minW="200px">
            <FormLabel fontSize="13px" fontWeight={700}>{kind === 'folder' ? 'Folder' : 'Bộ từ'}</FormLabel>
            <Select borderRadius="12px" placeholder={options.length ? `Chọn ${kind === 'folder' ? 'folder' : 'bộ từ'}` : 'Bạn chưa có mục nào'}
              value={refId} onChange={(e) => setRefId(e.target.value)} aria-label="Tài liệu cần chia sẻ">
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </FormControl>
          <Btn3D leftIcon={<FiPlus />} isDisabled={!refId} onClick={share}>Chia sẻ</Btn3D>
        </Flex>
      )}
      {!list ? <Flex justify="center" py="40px"><Spinner color="#23AC38" /></Flex>
        : list.length === 0 ? (
          <EmptyState emoji="📖" title="Chưa có tài liệu">
            {isTeacher ? 'Chọn folder hoặc bộ từ của bạn ở trên rồi bấm "Chia sẻ" để cả lớp cùng học.' : 'Giáo viên chưa chia sẻ tài liệu nào cho lớp.'}
          </EmptyState>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(220px, 1fr))" gap="16px">
            {list.map((r) => (
              <Box key={r.id} position="relative">
                {r.kind === 'folder' ? (
                  <Flex role="button" tabIndex={0} onClick={() => setOpenFolder(r.refId)} onKeyDown={(e) => e.key === 'Enter' && setOpenFolder(r.refId)}
                    direction="column" minH="160px" p="16px" borderRadius="24px" bg="#FFD54F" color="#1A202C" cursor="pointer"
                    _hover={{ transform: 'translateY(-3px)' }} transition="transform .15s" data-testid={`resource-folder-${r.refId}`}>
                    <Flex w="40px" h="40px" borderRadius="16px" bg="#FED7AA" align="center" justify="center"><Icon as={FiFolder} color="#EA580C" /></Flex>
                    <Text mt="auto" fontWeight={700} fontSize="16px" noOfLines={2}>{r.name}</Text>
                    <Text fontSize="12px" color="#4A5568">{r.count} bộ từ</Text>
                  </Flex>
                ) : (
                  <PublicDeckCard cat={{ id: r.refId, name: r.name, icon: r.icon, wordCount: r.count }} onView={() => setView(r)}
                    onCopy={() => copyDeck({ id: r.refId, name: r.name })} copying={copying === `c${r.refId}`} />
                )}
                {isTeacher && (
                  <IconButton aria-label={`Gỡ ${r.name} khỏi lớp`} icon={<FiTrash2 />} size="xs" position="absolute" top="8px" right="8px"
                    colorScheme="red" variant="solid" borderRadius="full" onClick={() => remove(r)} />
                )}
              </Box>
            ))}
          </Grid>
        )}
      <PublicDeckModal isOpen={Boolean(view)} categoryId={view?.refId} onClose={() => setView(null)}
        onCopy={() => copyDeck({ id: view.refId, name: view.name })} copying={copying === `c${view?.refId}`} />
    </Box>
  );
}

function FolderLoader({ id, onBack }) {
  const [d, setD] = useState(null);
  useEffect(() => { api(`/community/folders/${id}`).then(setD).catch(onBack); }, [id, onBack]);
  return d ? <SharedFolderView folder={d.folder} categories={d.categories} onBack={onBack} /> : <Flex justify="center" py="40px"><Spinner color="#23AC38" /></Flex>;
}

// ================= Bài tập =================
function AssignmentForm({ isOpen, onClose, cats, initial, onSubmit }) {
  const [f, setF] = useState({});
  useEffect(() => {
    if (!isOpen) return;
    const week = new Date(Date.now() + 7 * 86400000);
    week.setHours(23, 59, 0, 0);
    setF(initial
      ? { categoryId: String(initial.categoryId), mode: initial.mode, required: String(initial.required), deadline: toLocalInput(initial.deadline) }
      : { categoryId: '', mode: 'quiz', required: '10', deadline: toLocalInput(week.toISOString()) });
  }, [isOpen, initial]);
  const cat = cats.find((c) => String(c.id) === f.categoryId);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit({ categoryId: Number(f.categoryId), mode: f.mode, required: Number(f.required), deadline: new Date(f.deadline).toISOString() });
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="24px" mx="12px">
        <ModalHeader fontWeight={800}>{initial ? 'Sửa bài tập' : 'Giao bài tập'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody display="grid" gap="12px">
          <FormControl>
            <FormLabel fontSize="13px" fontWeight={700}>Bộ từ</FormLabel>
            <Select borderRadius="12px" placeholder="Chọn bộ từ" value={f.categoryId || ''} onChange={(e) => setF({ ...f, categoryId: e.target.value })} aria-label="Bộ từ">
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.wordCount} từ)</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="13px" fontWeight={700}>Game</FormLabel>
            <Select borderRadius="12px" value={f.mode || 'quiz'} onChange={(e) => setF({ ...f, mode: e.target.value })} aria-label="Game">
              {MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="13px" fontWeight={700}>Số câu đúng cần đạt{cat ? ` (tối đa ${cat.wordCount})` : ''}</FormLabel>
            <Input type="number" min={1} max={cat?.wordCount} borderRadius="12px" value={f.required || ''} onChange={(e) => setF({ ...f, required: e.target.value })} aria-label="Số câu đúng" />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="13px" fontWeight={700}>Hạn nộp</FormLabel>
            <Input type="datetime-local" borderRadius="12px" value={f.deadline || ''} onChange={(e) => setF({ ...f, deadline: e.target.value })} aria-label="Hạn nộp" />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr="8px" borderRadius="16px" onClick={onClose}>Hủy</Button>
          <Btn3D isLoading={busy} isDisabled={!f.categoryId || !f.required || !f.deadline} onClick={submit} data-testid="assignment-submit">
            {initial ? 'Lưu' : 'Giao bài'}
          </Btn3D>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ResultsModal({ assignmentId, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => { if (assignmentId) { setD(null); api(`/assignments/${assignmentId}/results`).then(setD); } }, [assignmentId]);
  const a = d?.assignment;
  return (
    <Modal isOpen={Boolean(assignmentId)} onClose={onClose} size="4xl" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent borderRadius="24px" mx="12px">
        <ModalHeader fontWeight={800}>
          {a ? a.categoryName : 'Kết quả'}
          {a && (
            <Flex gap="6px" mt="6px" wrap="wrap">
              <Badge colorScheme="green" borderRadius="6px">YÊU CẦU {a.required}/{a.totalWords}</Badge>
              <Badge colorScheme="purple" borderRadius="6px">{a.modeLabel.toUpperCase()}</Badge>
              <Badge colorScheme="orange" borderRadius="6px">HẠN {fmtDate(a.deadline)}</Badge>
            </Flex>
          )}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="20px">
          {!d ? <Flex justify="center" py="30px"><Spinner color="#23AC38" /></Flex>
            : d.rows.length === 0 ? <EmptyState emoji="👥" title="Lớp chưa có học sinh" />
              : (
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead><Tr><Th>Hạng</Th><Th>Xu cao nhất</Th><Th>Học sinh</Th><Th isNumeric>Số lần</Th><Th isNumeric>Tốt nhất</Th><Th isNumeric>Tỷ lệ</Th><Th>Trạng thái</Th></Tr></Thead>
                    <Tbody>
                      {d.rows.map((r) => (
                        <Tr key={r.id} data-testid={`result-row-${r.id}`}>
                          <Td fontWeight={800}>{r.rank}</Td>
                          <Td>{r.coins.toLocaleString('vi-VN')}</Td>
                          <Td><Text fontWeight={700}>{r.name}</Text><Text fontSize="12px" color="app.muted">{r.email}</Text></Td>
                          <Td isNumeric>{r.attempts}</Td>
                          <Td isNumeric>{r.best}/{a.totalWords}</Td>
                          <Td isNumeric>{r.rate}%</Td>
                          <Td><Badge colorScheme={r.passed ? 'green' : 'red'} borderRadius="6px">{r.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</Badge></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function AssignmentsTab({ cls, isTeacher, onPlay }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null); // {initial}
  const [results, setResults] = useState(null);
  const [del, setDel] = useState(null);

  const load = useCallback(() => api(`/classes/${cls.id}/assignments`).then(setList).catch((e) => toast({ status: 'error', title: e.message })), [cls.id, toast]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (isTeacher) api('/categories?all=1').then((cs) => setCats(cs.filter((c) => !c.isPath && c.wordCount > 0))); }, [isTeacher]);

  const submit = async (body) => {
    try {
      if (form.initial) await api(`/assignments/${form.initial.id}`, { method: 'PATCH', body });
      else await api(`/classes/${cls.id}/assignments`, { method: 'POST', body });
      toast({ status: 'success', title: form.initial ? 'Đã lưu bài tập' : 'Đã giao bài cho lớp' });
      load();
    } catch (e) {
      toast({ status: 'error', title: e.message });
      throw e;
    }
  };

  return (
    <Box>
      {isTeacher && (
        <Btn3D mb="18px" leftIcon={<FiPlus />} onClick={() => setForm({ initial: null })} isDisabled={!cats.length}>Giao bài</Btn3D>
      )}
      {isTeacher && !cats.length && <Text fontSize="13px" color="app.muted" mt="-10px" mb="16px">Bạn cần có ít nhất một bộ từ có từ vựng để giao bài.</Text>}
      {!list ? <Flex justify="center" py="40px"><Spinner color="#23AC38" /></Flex>
        : list.length === 0 ? <EmptyState emoji="📋" title="Chưa có bài tập">{isTeacher ? 'Bấm "Giao bài" để tạo bài tập đầu tiên.' : 'Giáo viên chưa giao bài nào.'}</EmptyState>
          : (
            <Grid gap="14px">
              {list.map((a) => (
                <Flex key={a.id} {...card} p="16px" gap="14px" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }}
                  cursor={isTeacher ? 'pointer' : 'default'} onClick={() => isTeacher && setResults(a.id)} data-testid={`assignment-${a.id}`}
                  _hover={isTeacher ? { borderColor: '#23AC38' } : {}}>
                  <Flex w="48px" h="48px" borderRadius="16px" bg="#E0F2FE" color="#1899D6" align="center" justify="center" flexShrink={0}><Icon as={FiClipboard} boxSize="22px" /></Flex>
                  <Box flex="1" minW={0}>
                    <Text fontWeight={800} fontSize="16px" noOfLines={1}>{a.categoryName}</Text>
                    <Text fontSize="13px" color="app.muted">{a.modeLabel} · yêu cầu {a.required}/{a.totalWords}</Text>
                    <Flex fontSize="13px" gap="8px" align="center" wrap="wrap"><Icon as={FiClock} color="app.muted" /> {fmtDate(a.deadline)} · <Remaining deadline={a.deadline} /></Flex>
                  </Box>
                  <Flex gap="6px" wrap="wrap" align="center">
                    {isTeacher ? (
                      <>
                        <Badge colorScheme="yellow" borderRadius="6px">BEST {a.best}%</Badge>
                        <Badge borderRadius="6px">{a.attempts} LẦN</Badge>
                        <Badge colorScheme="blue" borderRadius="6px">{a.students} HỌC SINH</Badge>
                        <Badge colorScheme="green" borderRadius="6px">{a.passed} ĐẠT</Badge>
                        <Tooltip label="Sửa"><IconButton aria-label="Sửa bài tập" icon={<FiEdit2 />} size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setForm({ initial: a }); }} /></Tooltip>
                        <Tooltip label="Xóa"><IconButton aria-label="Xóa bài tập" icon={<FiTrash2 />} size="sm" variant="ghost" color="red.500" onClick={(e) => { e.stopPropagation(); setDel(a); }} /></Tooltip>
                      </>
                    ) : (
                      <>
                        <Badge colorScheme={a.passed ? 'green' : 'red'} borderRadius="6px" data-testid={`status-${a.id}`}>{a.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}</Badge>
                        <Badge borderRadius="6px">TỐT NHẤT {a.bestCorrect}/{a.totalWords}</Badge>
                        <Badge borderRadius="6px">{a.attempts} LẦN</Badge>
                        <Btn3D size="sm" leftIcon={<FiPlay />} isDisabled={a.expired} onClick={() => onPlay(a, load)} data-testid={`play-${a.id}`}>Làm bài</Btn3D>
                      </>
                    )}
                  </Flex>
                </Flex>
              ))}
            </Grid>
          )}
      <AssignmentForm isOpen={Boolean(form)} initial={form?.initial} cats={cats} onClose={() => setForm(null)} onSubmit={submit} />
      <ResultsModal assignmentId={results} onClose={() => setResults(null)} />
      <ConfirmDialog isOpen={Boolean(del)} onClose={() => setDel(null)} title="Xóa bài tập?"
        message={`Bài tập "${del?.categoryName}" và toàn bộ kết quả của học sinh sẽ bị xóa.`}
        onConfirm={async () => { await api(`/assignments/${del.id}`, { method: 'DELETE' }); setDel(null); load(); }} />
    </Box>
  );
}

// ================= Thành viên =================
function ProgressModal({ cls, member, onClose }) {
  const [d, setD] = useState(null);
  useEffect(() => { if (member) { setD(null); api(`/classes/${cls.id}/members/${member.id}/progress`).then(setD); } }, [cls.id, member]);
  return (
    <Modal isOpen={Boolean(member)} onClose={onClose} size="3xl" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="24px" mx="12px">
        <ModalHeader fontWeight={800}>Tiến độ · {member?.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="22px">
          {!d ? <Flex justify="center" py="30px"><Spinner color="#23AC38" /></Flex> : (
            <>
              <Grid templateColumns="repeat(3, 1fr)" gap="12px" mb="18px">
                {[['Đã thuộc', d.learned, '#23AC38'], ['Chưa thuộc', d.notLearned, '#FF9600'], ['Tổng từ', d.total, '#1CB0F6']].map(([l, v, c]) => (
                  <Flex key={l} direction="column" align="center" bg="app.cell" borderRadius="16px" py="14px">
                    <Text fontSize="26px" fontWeight={800} color={c}>{v}</Text>
                    <Text fontSize="13px" fontWeight={600} color="app.soft">{l}</Text>
                  </Flex>
                ))}
              </Grid>
              <Text fontWeight={800} mb="8px">Hoạt động học tập</Text>
              <ActivityHeatmap data={d.calendar} />
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function MembersTab({ cls, isTeacher, onRenamed, onLeft }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [progress, setProgress] = useState(null);
  const [del, setDel] = useState(null);
  const [rename, setRename] = useState(null);
  const [leave, setLeave] = useState(false);
  const load = useCallback(() => api(`/classes/${cls.id}/members`).then(setList), [cls.id]);
  useEffect(() => { load(); }, [load]);

  const inviteLink = `${window.location.origin}/classes?join=${cls.code}`;
  const share = async () => {
    try { await navigator.clipboard.writeText(`Vào lớp "${cls.name}" trên Mật Ong: ${inviteLink} (mã lớp ${cls.code})`); } catch { /* bỏ qua */ }
    toast({ status: 'success', title: 'Đã sao chép link mời vào lớp', duration: 2000 });
  };
  const saveName = async () => {
    try {
      const c = await api(`/classes/${cls.id}`, { method: 'PATCH', body: { name: rename } });
      onRenamed(c);
      setRename(null);
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };

  return (
    <Box>
      <Box {...card} p="18px" mb="18px">
        <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} gap="12px" direction={{ base: 'column', md: 'row' }}>
          <Box>
            <Text fontSize="13px" fontWeight={700} color="app.muted">THÔNG TIN LỚP</Text>
            <Text fontSize="20px" fontWeight={800}>{cls.name}</Text>
            <Flex gap="6px" mt="6px" wrap="wrap">
              <Badge colorScheme="purple" borderRadius="6px">GV: {cls.teacher}</Badge>
              <Badge colorScheme="blue" borderRadius="6px">{cls.students} HỌC SINH</Badge>
              <Badge colorScheme="green" borderRadius="6px" data-testid="class-code">MÃ: {cls.code}</Badge>
            </Flex>
          </Box>
          <Flex gap="8px" wrap="wrap">
            {isTeacher && <Button borderRadius="16px" leftIcon={<FiEdit2 />} variant="outline" onClick={() => setRename(cls.name)}>Sửa tên</Button>}
            <Btn3D color="#1CB0F6" shadow="#1899D6" leftIcon={<FiShare2 />} onClick={share}>Chia sẻ</Btn3D>
            {!isTeacher && <Button borderRadius="16px" leftIcon={<FiLogOut />} colorScheme="red" variant="outline" onClick={() => setLeave(true)}>Rời lớp</Button>}
          </Flex>
        </Flex>
      </Box>
      {!list ? <Flex justify="center" py="30px"><Spinner color="#23AC38" /></Flex>
        : list.length === 0 ? <EmptyState emoji="👥" title="Lớp chưa có học sinh">Gửi mã lớp <b>{cls.code}</b> hoặc bấm "Chia sẻ" để mời học sinh.</EmptyState>
          : (
            <Box {...card} overflowX="auto" p="8px">
              <Table size="sm">
                <Thead><Tr><Th>Học sinh</Th>{isTeacher && <Th>Email</Th>}{isTeacher && <Th>Tiến độ</Th>}</Tr></Thead>
                <Tbody>
                  {list.map((m) => (
                    <Tr key={m.id}>
                      <Td fontWeight={700}>{m.name}{m.isMe && ' (bạn)'}</Td>
                      {isTeacher && <Td color="app.muted">{m.email}</Td>}
                      {isTeacher && (
                        <Td>
                          <Flex gap="6px">
                            <Button size="xs" borderRadius="999px" bg="#23AC38" color="white" _hover={{ bg: '#1F8F31' }} onClick={() => setProgress(m)} data-testid={`progress-${m.id}`}>Xem tiến độ</Button>
                            <Button size="xs" borderRadius="999px" leftIcon={<FiTrash2 />} colorScheme="red" variant="ghost" onClick={() => setDel(m)}>Xóa</Button>
                          </Flex>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
      <ProgressModal cls={cls} member={progress} onClose={() => setProgress(null)} />
      <ConfirmDialog isOpen={Boolean(del)} onClose={() => setDel(null)} title="Xóa học sinh khỏi lớp?" message={`${del?.name} sẽ không còn thấy tài liệu và bài tập của lớp.`}
        onConfirm={async () => { await api(`/classes/${cls.id}/members/${del.id}`, { method: 'DELETE' }); setDel(null); load(); }} />
      <ConfirmDialog isOpen={leave} onClose={() => setLeave(false)} title="Rời lớp?" confirmText="Rời lớp" message="Bạn có thể vào lại bằng mã lớp."
        onConfirm={async () => { await api(`/classes/${cls.id}/leave`, { method: 'POST' }); onLeft(); }} />
      <Modal isOpen={rename !== null} onClose={() => setRename(null)} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="24px" mx="12px">
          <ModalHeader fontWeight={800}>Sửa tên lớp</ModalHeader>
          <ModalBody><Input borderRadius="12px" value={rename || ''} maxLength={80} onChange={(e) => setRename(e.target.value)} aria-label="Tên lớp" /></ModalBody>
          <ModalFooter><Button variant="ghost" mr="8px" onClick={() => setRename(null)}>Hủy</Button><Btn3D isDisabled={!rename?.trim()} onClick={saveName}>Lưu</Btn3D></ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

const TABS = [['resources', '📖 Tài liệu', FiBookOpen], ['assignments', '📋 Bài tập', FiClipboard], ['members', '👥 Thành viên', FiUsers]];

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'resources';
  const [cls, setCls] = useState(null);
  const [game, setGame] = useState(null);
  const [settings] = useGameSettings();

  useEffect(() => {
    api(`/classes/${id}`).then(setCls).catch((e) => { toast({ status: 'error', title: e.message }); navigate('/classes', { replace: true }); });
  }, [id, navigate, toast]);
  const isTeacher = cls?.role === 'teacher';

  const play = useMemo(() => async (a, reload) => {
    try {
      const d = await api(`/assignments/${a.id}/play`);
      const kind = a.mode === 'flashcard' ? 'flashcard' : a.mode === 'match' ? 'match' : 'question';
      setGame({
        mode: a.mode, kind, quizType: 'w2m', items: d.items, pool: d.pool, noMarkLearned: true,
        onSave: (body) => api(`/assignments/${a.id}/attempts`, { method: 'POST', body }).then((r) => {
          toast({ status: r.passed ? 'success' : 'warning', title: r.passed ? `Đạt yêu cầu (${r.correct}/${r.required} câu đúng) 🎉` : `Chưa đạt: ${r.correct}/${r.required} câu đúng. Làm lại nhé!` });
          return r;
        }),
        refetch: () => api(`/assignments/${a.id}/play`),
        reload,
      });
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  }, [toast]);

  if (!cls) return <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>;
  if (game) return <GameRunner game={game} settings={settings} onClose={() => { game.reload?.(); setGame(null); }} />;

  return (
    <Box maxW="1100px" mx="auto">
      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} gap="12px" mb="18px" direction={{ base: 'column', md: 'row' }}>
        <Box>
          <Heading fontSize={{ base: '24px', md: '30px' }} fontWeight={800}>{cls.name}</Heading>
          <Flex gap="6px" mt="6px" wrap="wrap">
            <Badge colorScheme={isTeacher ? 'purple' : 'blue'} borderRadius="6px">{isTeacher ? 'GIÁO VIÊN' : 'HỌC SINH'}</Badge>
            <Badge colorScheme="green" borderRadius="6px">MÃ: {cls.code}</Badge>
            <Badge borderRadius="6px">SLOT: {cls.students}/{cls.slots}</Badge>
          </Flex>
        </Box>
        <Button borderRadius="999px" leftIcon={<FiArrowLeft />} variant="outline" borderWidth="2px" onClick={() => navigate('/classes')}>Lớp của tôi</Button>
      </Flex>
      <Grid templateColumns="repeat(3, 1fr)" gap="10px" mb="20px">
        {TABS.map(([k, label]) => (
          <Button key={k} h="52px" borderRadius="16px" border="2px solid" fontWeight={800} fontSize={{ base: '13px', md: '16px' }}
            borderColor={tab === k ? '#23AC38' : 'app.line'} bg={tab === k ? '#DCFCE7' : 'app.card'} color={tab === k ? '#15803D' : 'app.text'}
            boxShadow={tab === k ? '0 4px 0 0 #23AC38' : '0 4px 0 0 #E5E5E5'} _dark={tab === k ? { bg: 'green.900', color: 'green.200' } : { boxShadow: '0 4px 0 0 #2D3748' }}
            onClick={() => setParams(k === 'resources' ? {} : { tab: k }, { replace: true })}>
            {label}
          </Button>
        ))}
      </Grid>
      {tab === 'resources' && <ResourcesTab cls={cls} isTeacher={isTeacher} />}
      {tab === 'assignments' && <AssignmentsTab cls={cls} isTeacher={isTeacher} onPlay={play} />}
      {tab === 'members' && <MembersTab cls={cls} isTeacher={isTeacher} onRenamed={setCls} onLeft={() => navigate('/classes')} />}
    </Box>
  );
}
