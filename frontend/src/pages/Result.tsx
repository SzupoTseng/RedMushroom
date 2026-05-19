import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import ScoreModal from '../components/quiz/ScoreModal';
import TreasureChestModal from '../components/common/TreasureChestModal';

export default function Result() {
  const { state, resetQuiz } = useQuiz();
  const navigate = useNavigate();
  const [chestOpen, setChestOpen] = useState(true);

  useEffect(() => {
    if (state.phase !== 'RESULT') {
      navigate('/');
    }
  }, [state.phase, navigate]);

  if (state.phase !== 'RESULT') return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <ScoreModal
        totalScore={state.totalScore ?? 0}
        isPassed={state.isPassed ?? false}
        expGained={state.expGained ?? 0}
        praise={state.praise ?? ''}
        levelUp={state.levelUp}
        newLevel={state.newLevel ?? 1}
        questions={state.questions}
        results={state.results}
        answers={state.answers}
        onRetry={() => { resetQuiz(); navigate('/'); }}
      />

      {state.reward && chestOpen && (
        <TreasureChestModal
          reward={state.reward}
          onClose={() => setChestOpen(false)}
        />
      )}
    </div>
  );
}
