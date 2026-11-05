import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Flex, Grid, Text, Heading, Button, Badge, Spinner, useToast } from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff, FiUpload } from 'react-icons/fi';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Btn3D, ConfirmDialog } from '../components/ui';
import CoinIcon from '../components/CoinIcon';

const TABS = [
  { key: 'avatar', label: '👤 Ảnh đại diện' },
  { key: 'wallpaper', label: '🖼 Hình nền' },
  { key: 'special', label: '☆ Đặc biệt' },
];
const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

const cardSx = {
  bg: 'app.card', borderRadius: '24px', border: '2px solid', borderColor: 'app.line', p: '14px',
  boxShadow: '0 4px 0 0 #E5E5E5', _dark: { boxShadow: '0 4px 0 0 #2D3748' }, display: 'flex', flexDirection: 'column',
};

function Price({ value }) {
  return (
    <Flex align="center" justify="center" gap="6px" fontWeight={800} color="#E6A700">
      <CoinIcon size={18} /> {value === 0 ? 'Miễn phí' : fmt(value)}
    </Flex>
  );
}

function Preview({ item }) {
  const ratio = { pt: '56.25%', position: 'relative', borderRadius: '16px', overflow: 'hidden', bg: 'app.cell' };
  const inner = { position: 'absolute', inset: 0 };
  if (item.upload) {
    return (
      <Box {...ratio} border="2px dashed #23AC38">
        {item.uploadUrl ? (
          <Box {...inner} bgImage={`url(${item.uploadUrl})`} bgSize="cover" bgPos="center" />
        ) : (
          <Flex {...inner} align="center" justify="center" direction="column" color="#23AC38" gap="6px">
            <FiUpload size={28} />
            <Text fontSize="13px" fontWeight={700}>Ảnh của riêng bạn</Text>
          </Flex>
        )}
      </Box>
    );
  }
  if (item.asset) {
    return (
      <Box {...ratio} bg={item.type.startsWith('meme') ? 'white' : 'app.cell'}>
        <Box as="img" src={item.asset} alt={item.name} {...inner} w="100%" h="100%" objectFit={item.type.startsWith('meme') ? 'contain' : 'cover'} />
      </Box>
    );
  }
  if (item.css) return <Box {...ratio}><Box {...inner} style={{ background: item.css }} /></Box>;
  return (
    <Box {...ratio} bgGradient={item.type === 'theme' ? `linear(135deg, ${THEME_SWATCH[item.id] || '#FFE7A8, #FFF'})` : 'linear(135deg, #E0F2FE, #FFFFFF)'}>
      <Flex {...inner} align="center" justify="center" fontSize="44px">{item.emoji}</Flex>
    </Box>
  );
}

const THEME_SWATCH = {
  'theme-autumn': '#FDE68A, #F97316',
  'theme-winter': '#E0F2FE, #93C5FD',
  'theme-christmas': '#DC2626, #166534',
  'theme-tet': '#DC2626, #FACC15',
  'theme-summer': '#67E8F9, #FDE047',
};

function ItemCard({ item, coins, busy, onBuy, onEquip, onUnequip, onUpload, onUseFreeze }) {
  const fileRef = useRef(null);
  const short = coins < item.price;
  const pickFile = () => fileRef.current?.click();

  let actions;
  if (item.type === 'consumable') {
    actions = (
      <Btn3D w="100%" color="#1CB0F6" shadow="#1899D6" isLoading={busy} isDisabled={short} onClick={() => onUseFreeze(item)}>
        ❄️ Sử dụng
      </Btn3D>
    );
  } else if (!item.owned) {
    actions = (
      <Btn3D w="100%" isLoading={busy} isDisabled={short} onClick={() => onBuy(item)} data-testid={`buy-${item.id}`}>
        {item.upload ? 'Mua & upload' : 'Mua'}
      </Btn3D>
    );
  } else if (item.upload) {
    actions = (
      <Flex gap="8px">
        <Btn3D flex="1" color="#1CB0F6" shadow="#1899D6" isLoading={busy} onClick={pickFile} data-testid={`upload-${item.id}`}>
          {item.uploadUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
        </Btn3D>
        {item.uploadUrl && (item.equipped
          ? <Button borderRadius="16px" variant="outline" onClick={() => onUnequip(item)}>Gỡ</Button>
          : <Btn3D onClick={() => onEquip(item)}>Áp dụng</Btn3D>)}
      </Flex>
    );
  } else if (item.equipped) {
    actions = <Button w="100%" borderRadius="16px" variant="outline" borderWidth="2px" isLoading={busy} onClick={() => onUnequip(item)} data-testid={`unequip-${item.id}`}>Gỡ</Button>;
  } else {
    actions = <Btn3D w="100%" color="#CE82FF" shadow="#A855F7" isLoading={busy} onClick={() => onEquip(item)} data-testid={`equip-${item.id}`}>Áp dụng</Btn3D>;
  }

  return (
    <Box {...cardSx} borderColor={item.equipped ? '#23AC38' : 'app.line'} position="relative" data-testid={`item-${item.id}`}>
      {(item.label || item.equipped || (item.owned && item.price > 0)) && (
        <Flex position="absolute" top="22px" left="22px" right="22px" zIndex={1} justify="space-between" pointerEvents="none">
          {item.label ? <Badge colorScheme="purple" borderRadius="8px" px="8px">{item.label}</Badge> : <span />}
          {item.equipped ? <Badge color="#23AC38" shadow="#1F8F31" borderRadius="8px" px="8px">ĐANG DÙNG</Badge>
            : item.owned && item.price > 0 && item.type !== 'consumable' ? <Badge colorScheme="blue" borderRadius="8px" px="8px">ĐÃ MUA</Badge> : null}
        </Flex>
      )}
      <Preview item={item} />
      <Text mt="12px" fontSize="16px" fontWeight={700} textAlign="center" noOfLines={1}>{item.name}</Text>
      {item.description && <Text fontSize="13px" color="app.muted" textAlign="center" mt="4px">{item.description}</Text>}
      {item.upload && item.owned && (
        <Text fontSize="12px" color="app.muted" textAlign="center" mt="4px">
          {item.uploadUrl ? `Bạn đã mua ô này. Mỗi lần đổi ảnh mất ${fmt(item.changeCost)} xu.` : 'Bạn đã mua ô này. Lần tải đầu tiên miễn phí.'}
        </Text>
      )}
      <Box mt="auto" pt="10px">
        {!(item.owned && item.type !== 'consumable') && <Box mb="8px"><Price value={item.price} /></Box>}
        {actions}
      </Box>
      {item.upload && (
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
          data-testid={`file-${item.id}`}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(item, f); }} />
      )}
    </Box>
  );
}

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

export default function Store() {
  const { user, setUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'avatar';
  const [data, setData] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [panorama, setPanorama] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const toast = useToast();

  const load = useCallback(() => api('/shop/items').then(setData).catch((e) => toast({ status: 'error', title: e.message })), [toast]);
  useEffect(() => { load(); }, [load]);

  const run = async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      const r = await fn();
      if (r?.user) setUser(r.user);
      if (okMsg) toast({ status: 'success', title: typeof okMsg === 'function' ? okMsg(r) : okMsg, duration: 2500 });
      await load();
    } catch (e) {
      toast({ status: 'error', title: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const buy = (item) => setConfirm({
    title: `Mua "${item.name}"?`,
    body: `Bạn sẽ dùng ${fmt(item.price)} xu để mua vật phẩm này.`,
    confirmText: 'Mua',
    action: () => run(item.id, async () => {
      const r = await api(`/shop/purchase/${item.id}`, { method: 'POST' });
      if (!item.upload) return api(`/shop/equip/${item.id}`, { method: 'POST' }).then((x) => x).catch(() => r);
      return r;
    }, item.upload ? 'Đã mua ô upload. Hãy chọn ảnh của bạn!' : 'Đã mua và áp dụng 🎉'),
  });
  const equip = (item) => run(item.id, () => api(`/shop/equip/${item.id}`, { method: 'POST' }), 'Đã áp dụng');
  const unequip = (item) => run(item.id, () => api(`/shop/unequip/${item.type}`, { method: 'POST' }), 'Đã gỡ');
  const upload = async (item, file) => {
    if (file.size > 3 * 1024 * 1024) { toast({ status: 'error', title: 'Ảnh tối đa 3MB' }); return; }
    const go = async () => run(item.id, async () => api(`/shop/upload/${item.id}`, { method: 'POST', body: { dataUrl: await readAsDataUrl(file) } }), 'Đã cập nhật ảnh');
    if (item.uploadUrl) {
      setConfirm({ title: 'Đổi ảnh?', body: `Mỗi lần đổi ảnh mất ${fmt(item.changeCost)} xu.`, confirmText: 'Đổi ảnh', action: go });
    } else go();
  };
  const useFreeze = (item) => setConfirm({
    title: 'Dùng Đá streak?',
    body: `Tốn ${fmt(item.price)} xu để lấp ngày trống gần nhất trong 14 ngày qua.`,
    confirmText: '❄️ Sử dụng',
    action: () => run(item.id, () => api('/shop/streak-freeze', { method: 'POST' }),
      (r) => `Đã lấp ngày ${r.day.split('-').reverse().join('/')} ❄️`),
  });
  const claimDaily = () => run('daily', () => api('/shop/daily-reward', { method: 'POST' }), (r) => `+${r.coins} xu quà hằng ngày 🎁`);

  const items = (data?.items || []).filter((it) => (tab === 'special' ? !['avatar', 'wallpaper'].includes(it.type) : it.type === tab));
  const coins = user?.coins ?? data?.coins ?? 0;

  if (panorama) {
    return (
      <Flex minH="60vh" align="flex-end" justify="center">
        <Button leftIcon={<FiEyeOff />} borderRadius="full" bg="app.card" boxShadow="lg" onClick={() => setPanorama(false)} data-testid="panorama-off">
          Quay lại cửa hàng
        </Button>
      </Flex>
    );
  }

  const groups = tab === 'special'
    ? [
      ['Meme khi trả lời đúng', items.filter((i) => i.type === 'memeCorrect')],
      ['Meme khi trả lời sai', items.filter((i) => i.type === 'memeWrong')],
      ['Vật phẩm', items.filter((i) => i.type === 'consumable')],
      ['Giao diện theo mùa', items.filter((i) => i.type === 'theme')],
    ]
    : [[null, items]];

  return (
    <Box maxW="1200px" mx="auto">
      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} gap="16px" direction={{ base: 'column', md: 'row' }} mb="20px">
        <Box>
          <Heading fontSize={{ base: '26px', md: '32px' }} fontWeight={800}>Cửa hàng</Heading>
          <Button mt="6px" size="sm" variant="ghost" leftIcon={<FiEye />} px="6px" color="app.muted" onClick={() => setPanorama(true)} data-testid="panorama">
            Xem toàn cảnh
          </Button>
        </Box>
        <Flex align="center" gap="14px" px="22px" py="14px" borderRadius="24px" border="2px solid #1A202C"
          bgGradient="linear(135deg, #FFE066, #FF9F1C)" boxShadow="0 4px 0 0 #1A202C" color="#1A202C" minW="220px">
          <CoinIcon size={40} />
          <Box>
            <Text fontSize="26px" fontWeight={900} lineHeight="1" data-testid="store-coins">{fmt(coins)}</Text>
            <Text fontSize="13px" fontWeight={700} opacity={0.8}>Xu của bạn</Text>
          </Box>
        </Flex>
      </Flex>

      <Flex gap="8px" mb="20px" overflowX="auto" pb="4px">
        {TABS.map((t) => (
          <Button key={t.key} flexShrink={0} borderRadius="16px" border="2px solid" fontWeight={700}
            borderColor={tab === t.key ? '#1CB0F6' : 'app.line'} bg={tab === t.key ? '#DDF4FF' : 'app.card'}
            color={tab === t.key ? '#1899D6' : 'app.text'} _dark={tab === t.key ? { bg: '#0B3A52' } : {}}
            onClick={() => setParams(t.key === 'avatar' ? {} : { tab: t.key }, { replace: true })}>
            {t.label}
          </Button>
        ))}
      </Flex>

      {!data ? (
        <Flex justify="center" py="60px"><Spinner color="#23AC38" /></Flex>
      ) : (
        <>
          {tab === 'special' && (
            <Flex {...cardSx} direction={{ base: 'column', sm: 'row' }} align="center" gap="14px" mb="24px" p="18px"
              bgGradient="linear(135deg, #FFF7E0, #FFFFFF)" _dark={{ bgGradient: 'linear(135deg, #3B2F12, #1A202C)', boxShadow: '0 4px 0 0 #2D3748' }}>
              <Text fontSize="40px">🎁</Text>
              <Box flex="1" textAlign={{ base: 'center', sm: 'left' }}>
                <Text fontWeight={800} fontSize="17px">Quà hằng ngày</Text>
                <Text fontSize="14px" color="app.muted">Ghé cửa hàng mỗi ngày để nhận {data.dailyReward} xu miễn phí.</Text>
              </Box>
              <Btn3D color="#FF9600" shadow="#EA7E00" isDisabled={data.dailyClaimed} isLoading={busyId === 'daily'} onClick={claimDaily} data-testid="daily-reward">
                {data.dailyClaimed ? 'Đã nhận hôm nay' : `Nhận ${data.dailyReward} xu`}
              </Btn3D>
            </Flex>
          )}
          {groups.map(([title, list]) => list.length > 0 && (
            <Box key={title || 'all'} mb="28px">
              {title && <Text fontSize="18px" fontWeight={800} mb="12px">{title}</Text>}
              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap="20px">
                {list.map((it) => (
                  <ItemCard key={it.id} item={it} coins={coins} busy={busyId === it.id}
                    onBuy={buy} onEquip={equip} onUnequip={unequip} onUpload={upload} onUseFreeze={useFreeze} />
                ))}
              </Grid>
            </Box>
          ))}
          <Text fontSize="13px" color="app.muted" textAlign="center">Xu kiếm được khi học: mỗi câu trả lời đúng cộng 50–200 xu tùy chế độ.</Text>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.body}
        confirmText={confirm?.confirmText}
        color="#23AC38" shadow="#1F8F31"
        onConfirm={async () => { const c = confirm; setConfirm(null); await c?.action(); }}
      />
    </Box>
  );
}
