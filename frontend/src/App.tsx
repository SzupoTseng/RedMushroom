import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QuizProvider } from './context/QuizContext';
import { ConfigProvider } from './context/ConfigContext';
import BiBoFloatingSprite from './components/common/BiBoFloatingSprite';
import ReadingHelper from './components/common/ReadingHelper';

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
const WordTypingGame     = lazy(() => import('./pages/WordTypingGame'));
const EnglishTypingGame  = lazy(() => import('./pages/EnglishTypingGame'));
const ReadingTool        = lazy(() => import('./pages/ReadingTool'));
const MathPracticeGen    = lazy(() => import('./pages/MathPracticeGenerator'));
const WritingGrid        = lazy(() => import('./pages/WritingGrid'));
const PrintWorksheet     = lazy(() => import('./pages/PrintWorksheet'));
const StrokePractice     = lazy(() => import('./pages/StrokePractice'));
const BopomofoSymbolSheet = lazy(() => import('./pages/BopomofoSymbolSheet'));
const VerticalBopomofoSheet = lazy(() => import('./pages/VerticalBopomofoSheet'));

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
      <ReadingHelper />
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
        <Route path="/word-typing" element={<WordTypingGame />} />
        <Route path="/english-typing" element={<EnglishTypingGame />} />
        <Route path="/reading-tool" element={<ReadingTool />} />
        <Route path="/ext/math" element={<MathPracticeGen />} />
        <Route path="/ext/writing-grid" element={<WritingGrid />} />
        <Route path="/ext/worksheet" element={<PrintWorksheet />} />
        <Route path="/ext/stroke" element={<StrokePractice />} />
        <Route path="/ext/bopomofo-symbols" element={<BopomofoSymbolSheet />} />
        <Route path="/ext/vertical-bopomofo" element={<VerticalBopomofoSheet />} />
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
