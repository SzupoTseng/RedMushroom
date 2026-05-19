import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { QuizProvider } from './context/QuizContext';
import { ConfigProvider } from './context/ConfigContext';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Admin from './pages/Admin';
import StudentDashboard from './pages/StudentDashboard';
import SubjectSelector from './pages/SubjectSelector';
import ErrorMonsterReview from './pages/ErrorMonsterReview';
import BiBoFloatingSprite from './components/common/BiBoFloatingSprite';

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-mushroom-500 animate-pulse">🍄 載入中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <QuizProvider>
      <BiBoFloatingSprite />
      <Routes>
        <Route path="/" element={<SubjectSelector />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/monsters" element={<ErrorMonsterReview />} />
        {(user.role === 'teacher') && (
          <Route path="/admin" element={<Admin />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
