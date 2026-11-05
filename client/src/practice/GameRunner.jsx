import { useCallback, useState } from 'react';
import { useToast } from '@chakra-ui/react';
import Flashcard from './games/Flashcard';
import QuestionGame from './games/QuestionGame';
import MatchGame from './games/MatchGame';
import ResultScreen from './ResultScreen';
import { lazyGame } from './games/registry';

/**
 * Chạy một lượt học từ đầu đến màn kết quả.
 * game = { mode, quizType?, kind?, items, pool, srsModes?, refetch: () => Promise<{items,pool}> }
 * kind: 'flashcard' | 'match' | 'question' | tên game đặc biệt (translate, sentence, flappy, meteor)
 */
export default function GameRunner({ game: initial, settings, onClose }) {
  const toast = useToast();
  const [game, setGame] = useState({ ...initial, key: Date.now() });
  const [view, setView] = useState('playing');
  const [results, setResults] = useState([]);

  const finish = useCallback((res) => {
    if (!res.length) {
      toast({ status: 'info', title: 'Chưa có từ nào được làm nên lượt này không được lưu' });
      onClose();
      return;
    }
    setResults(res);
    setView('result');
  }, [onClose, toast]);

  const restartWith = (items, pool) => {
    setGame((g) => ({ ...g, items, pool: pool || g.pool, key: Date.now() }));
    setView('playing');
  };

  const playAgain = async () => {
    try {
      const b = await game.refetch();
      if (!b.items.length) {
        toast({ status: 'info', title: 'Đã hết từ phù hợp cho lượt mới 🎉' });
        onClose();
        return;
      }
      restartWith(b.items, b.pool);
    } catch (e) {
      toast({ status: 'error', title: e.message });
    }
  };

  if (view === 'result') {
    return (
      <ResultScreen key={game.key} mode={game.mode} results={results} settings={settings}
        onSave={game.onSave} noMarkLearned={game.noMarkLearned} reward={game.reward}
        onRetryWrong={(items) => restartWith(items)} onPlayAgain={playAgain} onChooseOther={onClose} />
    );
  }

  const common = {
    items: game.items, pool: game.pool, settings, onFinish: finish, onExit: onClose,
    onRestart: () => setGame((g) => ({ ...g, key: Date.now() })),
  };
  const kind = game.kind || (game.mode === 'flashcard' ? 'flashcard' : game.mode === 'match' ? 'match' : 'question');
  if (kind === 'flashcard') return <Flashcard key={game.key} {...common} rewardKey={game.mode} />;
  if (kind === 'match') return <MatchGame key={game.key} {...common} />;
  if (kind === 'question') return <QuestionGame key={game.key} {...common} mode={game.mode} quizType={game.quizType} srsModes={game.srsModes} />;
  const Special = lazyGame(kind);
  return <Special key={game.key} {...common} mode={game.mode} />;
}
