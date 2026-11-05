import { lazy, Suspense } from 'react';
import { Flex, Spinner } from '@chakra-ui/react';

// Các game đặc biệt được tải theo nhu cầu (giảm dung lượng trang)
const GAMES = {
  translate: lazy(() => import('./TranslateGame')),
  sentence: lazy(() => import('./SentenceGame')),
  flappy: lazy(() => import('./FlappyGame')),
  meteor: lazy(() => import('./MeteorGame')),
};

const WRAPPED = {};
export function lazyGame(kind) {
  if (WRAPPED[kind]) return WRAPPED[kind];
  const Comp = GAMES[kind];
  WRAPPED[kind] = function SpecialGame(props) {
    return (
      <Suspense fallback={<Flex position="fixed" inset={0} zIndex={30} bg="app.bg" align="center" justify="center"><Spinner color="#23AC38" /></Flex>}>
        <Comp {...props} />
      </Suspense>
    );
  };
  return WRAPPED[kind];
}
