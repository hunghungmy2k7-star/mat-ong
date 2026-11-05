import { Box, Flex, Text, Icon, Badge } from '@chakra-ui/react';
import CoinIcon from '../components/CoinIcon';

/** Thẻ dạng bài gradient (dùng ở trang Học từ vựng và trang bộ từ trong lộ trình) */
export default function ModeCard({ title, desc, icon, grad, reward, hot, onClick, testId, disabled }) {
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      direction="column"
      align="center"
      textAlign="center"
      position="relative"
      overflow="hidden"
      minH="190px"
      p="16px"
      borderRadius="24px"
      bgGradient={grad}
      color="white"
      boxShadow="0 0 0 2px rgba(255,255,255,0.9), 0 6px 14px rgba(0,0,0,0.12)"
      transition="transform .18s ease, box-shadow .18s ease"
      _hover={{ transform: 'translateY(-6px)', boxShadow: '0 0 0 2px rgba(255,255,255,0.9), 0 14px 24px rgba(0,0,0,0.18)' }}
      data-testid={testId}
    >
      <Box position="absolute" top="-20px" right="-20px" w="80px" h="80px" borderRadius="full" bg="whiteAlpha.100" />
      {hot && <Badge position="absolute" top="10px" right="10px" bg="#FF4B4B" color="white" borderRadius="9999px" px="8px">HOT 🔥</Badge>}
      <Flex mt="14px" w="48px" h="52px" borderRadius="24px" bg="whiteAlpha.300" align="center" justify="center">
        <Icon as={icon} boxSize="22px" />
      </Flex>
      <Text mt="12px" fontSize="16px" fontWeight={700} lineHeight="22px">{title}</Text>
      <Text mt="6px" fontSize="12px" opacity={0.95} noOfLines={2}>{desc}</Text>
      <Flex mt="auto" pt="10px" align="center" gap="4px" bg="whiteAlpha.300" borderRadius="9999px" px="10px" py="3px" fontSize="12px" fontWeight={700}>
        +{reward} <CoinIcon size={13} />
      </Flex>
    </Flex>
  );
}
