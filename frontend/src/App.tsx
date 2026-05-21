import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QuizProvider } from './context/QuizContext';
import { ConfigProvider } from './context/ConfigContext';
import BiBoFloatingSprite from './components/common/BiBoFloatingSprite';

// Pages are code-split per route. Each becomes its own chunk under dist/assets/,
// so the initial bundle stays lean (login page only) and authenticated routes
// load on demand.
const Home               = lazy(() => import('./pages/Home'));
const Quiz               = lazy(() => import('./pages/Quiz'));
const Result             = lazy(() => import('./pages/Result'));
const Admin              = lazy(() => import('./pages/Admin'));
const StudentDashboard   = lazy(() => import('./pages/StudentDashboard'));
const SubjectSelector    = lazy(() => import('./pages/SubjectSelector'));
const ErrorMonsterReview = lazy(() => import('./pages/ErrorMonsterReview'));
const Leaderboard        = lazy(() => import('./pages/Leaderboard'));
const Pvp                = lazy(() => import('./pages/Pvp'));
const TypingGame         = lazy(() => import('./pages/TypingGame'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl text-mushroom-500 animate-pulse">🍄 載入中...</div>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Loading />;

  if (!user) {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <QuizProvider>
      <BiBoFloatingSprite />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<SubjectSelector />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/result" element={<Result />} />
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/monsters" element={<ErrorMonsterReview />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/pvp" element={<Pvp />} />
        <Route path="/typing-game" element={<TypingGame />} />
          {(user.role === 'teacher') && (
            <Route path="/admin" element={<Admin />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </QuizProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfigProvider>
          <AppRoutes />
        </ConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
