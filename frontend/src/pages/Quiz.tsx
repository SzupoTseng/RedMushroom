import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import QuizLobby from '../components/quiz/QuizLobby';
import QuizBoard from '../components/quiz/QuizBoard';

export default function Quiz() {
  const { state } = useQuiz();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.phase === 'RESULT') {
      navigate('/result');
    }
  }, [state.phase, navigate]);

  if (state.phase === 'LOBBY') {
    return <QuizLobby />;
  }

  if (state.phase === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🍄</div>
          <p className="text-xl font-bold text-mushroom-500">正在準備題目...</p>
        </div>
      </div>
    );
  }

  if (state.phase === 'QUIZ' || state.phase === 'SUBMITTING') {
    return <QuizBoard />;
  }

  return null;
}
