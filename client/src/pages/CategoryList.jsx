import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Flex, Grid, Text, Icon, IconButton, Menu, MenuButton, MenuList, MenuItem, Checkbox, Tooltip, Spinner, useToast, Button, Portal,
} from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiPlus, FiFolderPlus, FiMap, FiFolder, FiMoreVertical, FiPlay, FiEdit2, FiMinus, FiTrash2, FiArrowLeft, FiChevronRight,
  FiUsers, FiGlobe, FiList, FiEdit3, FiShare2,
} from 'react-icons/fi';
import { api } from '../api';
import { Btn3D, ConfirmDialog, EmptyState } from '../components/ui';
import { CategoryFormModal, FolderFormModal, MoveToFolderModal } from '../components/category/FormModals';
import CategoryViewModal from '../components/category/CategoryViewModal';
import CommunityLibrary from '../components/community/CommunityLibrary';
import ShareModal from '../components/community/ShareModal';

// Nền pastel cho ô biểu tượng của bộ từ
const ICON_BG = { '📚': '#DCFCE7', '📖': '#E0F2FE', '📝': '#F3E8FF', '✏️': '#FFEDD5', '📕': '#FEE2E2', '⭐': '#FEF9C3', '🎯': '#FEE2E2', '💡': '#FEF9C3', '🔥': '#FFEDD5', '💎': '#E0F2FE', '🎓': '#E2E8F0', '🌟': '#FEF9C3' };

// Tối đa 5 cột như site mẫu, tối thiểu 140px mỗi card
const GRID = 'repeat(auto-fill, minmax(max(140px, calc((100% - 64px) / 5)), 1fr))';

const bigBtn = { h: '52px', px: '22px', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em' };

function Tab({ active, icon, children, ...rest }) {
  return (
    <Button
      h="40px"
      px="16px"
      borderRadius="9999px"
      leftIcon={<Icon as={icon} />}
      fontSize="16px"
      fontWeight={600}
      bg={active ? '#F3E8FF' : 'transparent'}
      color={active ? '#9333EA' : 'app.soft'}
      _dark={{ bg: active ? 'purple.900' : 'transparent', color: active ? 'purple.200' : 'app.soft' }}
      _hover={{ bg: active ? '#F3E8FF' : 'blackAlpha.50' }}
      {...rest}
    >
      {children}
    </Button>
  );
}

function FolderCard({ folder, onOpen, onRename, onShare, onDelete }) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      position="relative"
      h="140px"
      alignSelf="start"
      p="17px"
      borderRadius="24px"
      bg="#FFD54F"
      border="1px solid rgba(0,0,0,0.06)"
      boxShadow="0 1px 4px rgba(0,0,0,0.07)"
      cursor="pointer"
      transition="transform .15s ease, box-shadow .15s ease"
      _hover={{ transform: 'translateY(-3px)', boxShadow: '0 8px 18px rgba(0,0,0,0.12)' }}
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      {/* tai thư mục */}
      <Box position="absolute" top="-10px" left="18px" w="56px" h="20px" bg="#FFCA28" borderRadius="8px" />
      <Flex justify="space-between" align="start" position="relative">
        <Flex align="center" gap="6px">
          <Flex w="40px" h="40px" borderRadius="16px" bg="#FED7AA" align="center" justify="center">
            <Icon as={FiFolder} color="#EA580C" boxSize="20px" />
          </Flex>
          {folder.isPublic && <Tooltip label="Đang công khai trong Thư viện cộng đồng"><Text fontSize="16px">🌐</Text></Tooltip>}
        </Flex>
        <Menu placement="bottom-end" isLazy>
          <MenuButton as={IconButton} icon={<FiMoreVertical />} aria-label="Tùy chọn thư mục" size="xs" variant="ghost" color="#5F4B00"
            onClick={(e) => e.stopPropagation()} />
          <Portal>
            <MenuList onClick={(e) => e.stopPropagation()} minW="160px" zIndex={1500}>
              <MenuItem icon={<FiEdit3 />} onClick={onRename}>Đổi tên</MenuItem>
              <MenuItem icon={<FiShare2 />} onClick={onShare}>Chia sẻ</MenuItem>
              <MenuItem icon={<FiTrash2 />} color="red.500" onClick={onDelete}>Xóa</MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      </Flex>
      <Text mt="auto" fontSize="16px" fontWeight={600} color="#1A202C" noOfLines={2} lineHeight="20px">{folder.name}</Text>
      <Flex align="center" gap="4px" mt="6px" color="#4A5568">
        <Icon as={FiList} boxSize="12px" />
        <Text fontSize="12px" fontWeight={500}>{folder.categoryCount} bộ từ</Text>
      </Flex>
    </Box>
  );
}

function ActionIcon({ label, icon, onClick, color = 'app.soft' }) {
  return (
    <Tooltip label={label} hasArrow openDelay={300}>
      <IconButton aria-label={label} icon={<Icon as={icon} />} size="xs" minW="24px" h="24px" variant="ghost" color={color}
        onClick={(e) => { e.stopPropagation(); onClick(); }} />
    </Tooltip>
  );
}

function DeckCard({ cat, selected, onSelect, inFolder, onView, onStudy, onEdit, onRemoveFromFolder, onDelete }) {
  const pct = cat.wordCount ? Math.round((cat.learnedCount / cat.wordCount) * 100) : 0;
  return (
    <Flex
      direction="column"
      minH="205px"
      borderRadius="16px"
      bg="app.card"
      border="1px solid"
      borderColor={selected ? '#1CB0F6' : 'app.line'}
      boxShadow={selected ? '0 4px 0 0 #1899D6' : '0 4px 0 0 #E5E5E5'}
      _dark={{ boxShadow: selected ? '0 4px 0 0 #1899D6' : '0 4px 0 0 #2D3748' }}
      transition="transform .15s ease"
      _hover={{ transform: 'translateY(-2px)' }}
      cursor="pointer"
      onClick={onView}
    >
      <Box p="11px" flex="1">
        <Flex gap="8px" align="start">
          <Flex w="28px" h="28px" flexShrink={0} borderRadius="6px" bg={ICON_BG[cat.icon] || '#EDF2F7'} align="center" justify="center" fontSize="16px">
            {cat.icon}
          </Flex>
          <Text flex="1" fontSize="16px" fontWeight={800} lineHeight="22px" noOfLines={2} wordBreak="break-word">{cat.name}</Text>
          <Box onClick={(e) => e.stopPropagation()} lineHeight={0}>
            <Checkbox
              isChecked={selected}
              onChange={onSelect}
              aria-label={`Chọn ${cat.name}`}
              size="lg"
              sx={{ '.chakra-checkbox__control': { borderRadius: '8px', borderWidth: '2px', borderColor: '#A0AEC0' } }}
            />
          </Box>
        </Flex>
        <Text mt="8px" fontSize="12px" color="app.muted" noOfLines={2}>{cat.description || 'Không có mô tả'}</Text>
        <Flex align="center" gap="6px" mt="8px" color="#A0AEC0">
          <Icon as={FiList} boxSize="14px" />
          <Text fontSize="14px" fontWeight={600}>{cat.wordCount} từ</Text>
        </Flex>
        {cat.wordCount > 0 && (
          <>
            <Box mt="8px" h="8px" borderRadius="9999px" bg="#E2E8F0" _dark={{ bg: 'whiteAlpha.200' }}>
              <Box h="100%" w={`${pct}%`} borderRadius="9999px" bgGradient="linear(to right, #23AC38, #4FC766)" />
            </Box>
            <Text mt="4px" fontSize="12px" color="#A0AEC0">{cat.learnedCount} / {cat.wordCount} đã thuộc</Text>
          </>
        )}
      </Box>
      <Flex align="center" gap="2px" px="10px" py="8px" borderTop="1px solid" borderColor="#F0F0F0" _dark={{ borderColor: 'whiteAlpha.200' }}>
        <Button size="xs" h="32px" minW="32px" px="6px" borderRadius="24px" bg="#6366F1" color="white" fontSize="12px"
          boxShadow="0 3px 0 0 #4F46E5" _hover={{ bg: '#5B5EF0' }} onClick={(e) => { e.stopPropagation(); onView(); }}>
          Xem
        </Button>
        <Flex ml="auto" gap="0">
          <ActionIcon label="Học bộ từ này" icon={FiPlay} color="#23AC38" onClick={onStudy} />
          <ActionIcon label="Sửa" icon={FiEdit2} onClick={onEdit} />
          {inFolder && <ActionIcon label="Bỏ khỏi thư mục" icon={FiMinus} onClick={onRemoveFromFolder} />}
          <ActionIcon label="Xóa" icon={FiTrash2} color="#E53E3E" onClick={onDelete} />
        </Flex>
      </Flex>
    </Flex>
  );
}

export default function CategoryList() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const folderId = params.get('folder') ? Number(params.get('folder')) : null;
  const tab = params.get('tab') === 'community' ? 'community' : 'mine';

  const [folders, setFolders] = useState([]);
  const [cats, setCats] = useState(null);
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null); // {type, payload}
  const [busy, setBusy] = useState(false);

  const currentFolder = useMemo(() => folders.find((f) => f.id === folderId), [folders, folderId]);
  const otherFolders = useMemo(() => folders.filter((f) => f.id !== folderId), [folders, folderId]);

  const load = useCallback(async () => {
    try {
      const [fs, cs] = await Promise.all([api('/folders'), api(folderId ? `/categories?folderId=${folderId}` : '/categories')]);
      setFolders(fs);
      setCats(cs);
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  }, [folderId, toast]);

  useEffect(() => {
    setCats(null);
    setSelected([]);
    load();
  }, [load]);

  const close = () => setModal(null);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const openFolder = (id) => setParams(id ? { folder: String(id) } : {});

  const doDelete = async () => {
    const { type, payload } = modal;
    setBusy(true);
    try {
      if (type === 'deleteFolder') await api(`/folders/${payload.id}`, { method: 'DELETE' });
      else await api(`/categories/${payload.id}`, { method: 'DELETE' });
      toast({ status: 'success', title: type === 'deleteFolder' ? 'Đã xóa thư mục' : 'Đã xóa bộ từ' });
      close();
      if (type === 'deleteFolder' && folderId === payload.id) openFolder(null);
      else load();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setBusy(false);
    }
  };

  const removeFromFolder = async (cat) => {
    try {
      await api('/categories/move', { method: 'POST', body: { ids: [cat.id], folderId: null } });
      toast({ status: 'success', title: `Đã bỏ "${cat.name}" khỏi thư mục` });
      load();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };

  return (
    <Box>
      {/* Hàng nút + tabs */}
      <Flex gap="12px" wrap="wrap" align="center" justify="space-between" mb="16px">
        <Flex gap="12px" wrap="wrap">
          <Btn3D {...bigBtn} leftIcon={<FiPlus />} onClick={() => setModal({ type: 'createCat' })}>Tạo bộ từ</Btn3D>
          <Btn3D {...bigBtn} color="#1CB0F6" shadow="#1899D6" leftIcon={<FiFolderPlus />} onClick={() => setModal({ type: 'createFolder' })}>
            Tạo folder
          </Btn3D>
          <Btn3D {...bigBtn} color="#FFC800" shadow="#E6B400" textColor="#3C3C3C" leftIcon={<FiMap />} onClick={() => navigate('/roadmap')}>
            Lộ trình
          </Btn3D>
          {selected.length > 0 && (
            <Btn3D {...bigBtn} color="#1CB0F6" shadow="#1899D6" leftIcon={<FiFolderPlus />} onClick={() => setModal({ type: 'move' })}>
              Thêm vào thư mục ({selected.length})
            </Btn3D>
          )}
        </Flex>
        <Flex gap="8px" wrap="wrap">
          <Tab active={tab === 'mine'} icon={FiFolder} onClick={() => setParams({})}>Bộ từ của tôi</Tab>
          <Tab active={tab === 'community'} icon={FiGlobe} onClick={() => setParams({ tab: 'community' })}>Cộng đồng</Tab>
          <Tab icon={FiUsers} border="1px solid" borderColor="app.line" fontWeight={700} onClick={() => navigate('/classes')}>Lớp học</Tab>
        </Flex>
      </Flex>

      {tab === 'community' ? (
        <CommunityLibrary />
      ) : (
        <>
          {folderId && (
            <Flex align="center" gap="10px" mb="16px">
              <Button size="sm" h="36px" variant="outline" borderRadius="9999px" borderWidth="2px" borderColor="#1CB0F6" color="#1CB0F6"
                leftIcon={<FiArrowLeft />} fontWeight={800} textTransform="uppercase" fontSize="13px" onClick={() => openFolder(null)}>
                Quay lại
              </Button>
              <Icon as={FiChevronRight} color="app.muted" />
              <Icon as={FiFolder} color="#F59E0B" />
              <Text fontSize="16px" fontWeight={800} textTransform="uppercase">{currentFolder?.name || '...'}</Text>
            </Flex>
          )}

          {!cats ? (
            <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>
          ) : (
            <>
              {!folderId && folders.length === 0 && cats.length === 0 ? (
                <EmptyState emoji="📚" title="Bạn chưa có bộ từ nào">
                  Bấm "Tạo bộ từ" để bắt đầu, sau đó thêm từ ở trang Từ vựng hoặc nhập từ file CSV/Excel.
                </EmptyState>
              ) : folderId && cats.length === 0 ? (
                <EmptyState emoji="📂" title="Thư mục trống">
                  Tạo bộ từ mới ngay trong thư mục này, hoặc chọn các bộ từ ở ngoài rồi bấm "Thêm vào thư mục".
                </EmptyState>
              ) : null}

              <Grid templateColumns={GRID} gap="16px" pt="10px">
                {!folderId &&
                  folders.map((f) => (
                    <FolderCard
                      key={`f${f.id}`}
                      folder={f}
                      onOpen={() => openFolder(f.id)}
                      onRename={() => setModal({ type: 'renameFolder', payload: f })}
                      onShare={() => setModal({ type: 'shareFolder', payload: f })}
                      onDelete={() => setModal({ type: 'deleteFolder', payload: f })}
                    />
                  ))}
                {cats.map((c) => (
                  <DeckCard
                    key={c.id}
                    cat={c}
                    inFolder={Boolean(folderId)}
                    selected={selected.includes(c.id)}
                    onSelect={() => toggle(c.id)}
                    onView={() => setModal({ type: 'view', payload: c })}
                    onStudy={() => navigate(`/practice?category=${c.id}`)}
                    onEdit={() => setModal({ type: 'editCat', payload: c })}
                    onRemoveFromFolder={() => removeFromFolder(c)}
                    onDelete={() => setModal({ type: 'deleteCat', payload: c })}
                  />
                ))}
              </Grid>
            </>
          )}
        </>
      )}

      <CategoryFormModal
        isOpen={modal?.type === 'createCat' || modal?.type === 'editCat'}
        category={modal?.type === 'editCat' ? modal.payload : null}
        folderId={folderId}
        onClose={close}
        onSaved={load}
      />
      <FolderFormModal
        isOpen={modal?.type === 'createFolder' || modal?.type === 'renameFolder'}
        folder={modal?.type === 'renameFolder' ? modal.payload : null}
        onClose={close}
        onSaved={load}
      />
      <MoveToFolderModal
        isOpen={modal?.type === 'move'}
        folders={otherFolders}
        ids={selected}
        onClose={close}
        onSaved={() => { setSelected([]); load(); }}
        onCreateFolder={() => setModal({ type: 'createFolder' })}
      />
      <ShareModal isOpen={modal?.type === 'shareFolder'} kind="folder" item={modal?.type === 'shareFolder' ? modal.payload : null} onClose={close} onChanged={load} />
      <CategoryViewModal isOpen={modal?.type === 'view'} categoryId={modal?.payload?.id} onClose={close} onChanged={load} />
      <ConfirmDialog
        isOpen={modal?.type === 'deleteFolder' || modal?.type === 'deleteCat'}
        onClose={close}
        onConfirm={doDelete}
        isLoading={busy}
        title={modal?.type === 'deleteFolder' ? 'Xóa thư mục?' : 'Xóa bộ từ?'}
        message={
          modal?.type === 'deleteFolder'
            ? `Thư mục "${modal?.payload?.name}" sẽ bị xóa. Các bộ từ bên trong vẫn được giữ lại và chuyển ra ngoài.`
            : `Bộ từ "${modal?.payload?.name}" và toàn bộ ${modal?.payload?.wordCount ?? 0} từ bên trong sẽ bị xóa vĩnh viễn.`
        }
      />
    </Box>
  );
}
