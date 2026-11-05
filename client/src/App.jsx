import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Flex, Spinner } from '@chakra-ui/react';
import { useAuth } from './auth/AuthContext';
import AppLayout from './layout/AppLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import CategoryList from './pages/CategoryList';
import Words from './pages/Words';
import Practice from './pages/Practice';
import Roadmap from './pages/roadmap/Roadmap';
import RoadmapDetail from './pages/roadmap/RoadmapDetail';
import WordSet from './pages/roadmap/WordSet';
import Leaderboard from './pages/Leaderboard';
import Store from './pages/Store';
import SharePage from './pages/SharePage';
import Classes from './pages/classes/Classes';
import Landing from './pages/Landing';
import { Terms, Privacy } from './pages/Legal';
import ClassDetail from './pages/classes/ClassDetail';
import NotFound from './pages/NotFound';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner color="#23AC38" size="lg" />
      </Flex>
    );
  }
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />
      <Route path="/policy" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/category-list" element={<CategoryList />} />
        <Route path="/words" element={<Words />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/store" element={<Store />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/classes" element={<Classes />} />
        <Route path="/classes/:id" element={<ClassDetail />} />
        <Route path="/roadmap/:slug" element={<RoadmapDetail />} />
        <Route path="/roadmap/:slug/set/:setId" element={<WordSet />} />
        <Route path="/quiz" element={<Navigate to="/practice" replace />} />
        <Route path="/games" element={<Navigate to="/practice" replace />} />
      </Route>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
