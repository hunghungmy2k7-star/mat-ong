import { useEffect, useState } from 'react';
import { Box, Drawer, DrawerContent, DrawerOverlay, useBreakpointValue } from '@chakra-ui/react';
import { Outlet, useLocation } from 'react-router-dom';
import Header, { HEADER_H } from './Header';
import Sidebar, { SIDEBAR_W, SIDEBAR_W_COLLAPSED } from './Sidebar';
import ProfileModal from '../components/ProfileModal';
import { useStreak } from '../hooks/useStreak';
import { useAuth } from '../auth/AuthContext';
import Cosmetics from '../components/Cosmetics';

const COLLAPSE_KEY = 'matong.sidebarCollapsed';

export default function AppLayout() {
  const isDesktop = useBreakpointValue({ base: false, md: true }, { ssr: false });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  // tải lại streak khi đổi trang hoặc khi số xu thay đổi (vừa lưu kết quả một lượt học)
  const streak = useStreak(`${pathname}|${user?.coins}`);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* bỏ qua */
      }
      return !c;
    });
  };

  const width = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;

  return (
    <Box minH="100vh">
      <Cosmetics />
      <Header streak={streak?.streak} onOpenMenu={() => setDrawerOpen(true)} />

      {isDesktop && (
        <Box
          as="aside"
          position="fixed"
          top={`${HEADER_H}px`}
          bottom={0}
          left={0}
          w={`${width}px`}
          zIndex={10}
          boxShadow="4px 0 20px rgba(0,0,0,0.1)"
          transition="width .2s ease"
        >
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} onOpenProfile={() => setProfileOpen(true)} />
        </Box>
      )}

      <Drawer isOpen={!isDesktop && drawerOpen} placement="left" onClose={() => setDrawerOpen(false)}>
        <DrawerOverlay backdropFilter="blur(2px)" />
        <DrawerContent maxW={`${SIDEBAR_W}px`} mt={`${HEADER_H}px`}>
          <Sidebar
            inDrawer
            onNavigate={() => setDrawerOpen(false)}
            onOpenProfile={() => {
              setDrawerOpen(false);
              setProfileOpen(true);
            }}
          />
        </DrawerContent>
      </Drawer>

      <Box
        as="main"
        pt={`${HEADER_H + 18}px`}
        pb="48px"
        pl={{ base: '16px', md: `${width + 56}px` }}
        pr={{ base: '16px', md: '56px' }}
        transition="padding-left .2s ease"
      >
        <Outlet context={{ streak }} />
      </Box>

      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </Box>
  );
}
