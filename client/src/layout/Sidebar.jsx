import { Box, Flex, Text, Icon, Avatar, useColorMode, Tooltip } from '@chakra-ui/react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiChevronsLeft, FiChevronsRight, FiUser, FiMoon, FiSun } from 'react-icons/fi';
import { NAV_ITEMS, hexAlpha } from './nav';
import { useAuth } from '../auth/AuthContext';
import CoinIcon from '../components/CoinIcon';

export const SIDEBAR_W = 230;
export const SIDEBAR_W_COLLAPSED = 72;

function NavItem({ item, active, collapsed, onNavigate }) {
  const content = (
    <Flex
      as={NavLink}
      to={item.to}
      onClick={onNavigate}
      align="center"
      gap="16px"
      h="56px"
      px="12px"
      borderRadius="12px"
      bg={active ? hexAlpha(item.color, 0.12) : 'transparent'}
      transition="background .15s ease, transform .15s ease"
      _hover={{ bg: active ? hexAlpha(item.color, 0.16) : 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
      justify={collapsed ? 'center' : 'flex-start'}
    >
      <Flex
        w="36px"
        h="36px"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="10px"
        bg={active ? item.color : 'transparent'}
        color={active ? 'white' : item.color}
        boxShadow={active ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'}
      >
        <Icon as={item.icon} boxSize="20px" />
      </Flex>
      {!collapsed && (
        <Text fontSize="0.95rem" fontWeight={active ? 700 : 600} color={active ? item.color : 'app.soft'}>
          {item.label}
        </Text>
      )}
    </Flex>
  );
  return collapsed ? (
    <Tooltip label={item.label} placement="right" hasArrow>
      <Box>{content}</Box>
    </Tooltip>
  ) : (
    content
  );
}

export default function Sidebar({ collapsed = false, onToggleCollapse, onNavigate, onOpenProfile, inDrawer = false }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <Flex direction="column" h="100%" bg="app.panel" className="mo-sidebar">
      <Flex direction="column" gap="4px" p="12px" flex="1" overflowY="auto">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
            active={pathname === item.to || pathname.startsWith(`${item.to}/`)}
          />
        ))}
      </Flex>

      {!inDrawer && (
        <Box px="12px" pb="6px">
          <Flex
            as="button"
            type="button"
            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            onClick={onToggleCollapse}
            w="100%"
            h="40px"
            align="center"
            justify="center"
            borderRadius="12px"
            border="2px solid"
            borderColor="app.line"
            color="app.soft"
            _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
          >
            <Icon as={collapsed ? FiChevronsRight : FiChevronsLeft} boxSize="18px" />
          </Flex>
        </Box>
      )}

      <Flex
        as="button"
        type="button"
        onClick={onOpenProfile}
        align="center"
        gap="8px"
        px={collapsed ? '8px' : '18px'}
        py="24px"
        borderTop="2px solid"
        borderColor="app.line"
        textAlign="left"
        justify={collapsed ? 'center' : 'flex-start'}
        _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.50' } }}
      >
        <Box p="2px" borderRadius="full" border="2px solid #23AC38" flexShrink={0}>
          <Avatar size="md" w="48px" h="48px" name={user?.name} src={user?.avatarUrl || undefined} border="2.6px solid #23AC38" bg="#FFC800" color="white" />
        </Box>
        {!collapsed && (
          <>
            <Box flex="1" minW={0}>
              <Text fontSize="15px" fontWeight={700} noOfLines={1}>
                {user?.name}
              </Text>
              <Text fontSize="12px" color="app.soft" lineHeight="18px">
                Nhấn để xem hồ sơ
              </Text>
            </Box>
            <Icon as={FiUser} color="app.soft" boxSize="16px" />
          </>
        )}
      </Flex>

      <Flex
        align="center"
        justify={collapsed ? 'center' : 'space-between'}
        direction={collapsed ? 'column' : 'row'}
        gap="8px"
        px="12px"
        py="10px"
        borderTop="1px solid"
        borderColor="app.line"
      >
        <Flex
          align="center"
          gap="8px"
          h="37px"
          px={collapsed ? '8px' : '12px'}
          minW={collapsed ? 'auto' : '130px'}
          borderRadius="12px"
          bgGradient="linear(135deg, rgba(28,176,246,0.1), rgba(73,192,248,0.1))"
        >
          <CoinIcon size={18} />
          {!collapsed && (
            <Text fontSize="14px" fontWeight={700} color="#1CB0F6">
              {(user?.coins ?? 0).toLocaleString('vi-VN')}
            </Text>
          )}
        </Flex>
        <Flex
          as="button"
          type="button"
          onClick={toggleColorMode}
          align="center"
          gap="6px"
          px="10px"
          h="37px"
          borderRadius="12px"
          color="app.soft"
          _hover={{ bg: 'blackAlpha.50', _dark: { bg: 'whiteAlpha.100' } }}
        >
          <Icon as={isDark ? FiSun : FiMoon} boxSize="16px" />
          {!collapsed && (
            <Text fontSize="13px" fontWeight={600}>
              {isDark ? 'Sáng' : 'Tối'}
            </Text>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
