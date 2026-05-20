import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../../context/QuizContext';
import type { TheoryType } from '../../types';

const THEORY_TYPES: { key: TheoryType; label: string; icon: string }[] = [
  { key: 'cognitive', label: '語詞認知', icon: '🧠' },
  { key: 'input', label: '語言輸入', icon: '👁' },
  { key: 'usage', label: '語言運用', icon: '✍️' },
  { key: 'sociocultural', label: '社文語境', icon: '🌏' },
];

export default function QuizLobby() {
  const { startQuiz, state } = useQuiz();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-4 py-8 max-w-xl mx-auto">
      <button onClick={() => navigate('/')} className="text-gray-400 text-2xl mb-6 block">←</button>

      <h1 className="text-2xl font-black text-center text-mushroom-600 mb-8">
        選擇練習主題
      </h1>

      {state.error && (
        <div className="bg-red-100 text-red-700 rounded-2xl p-4 mb-6 text-center">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {THEORY_TYPES.map((t) => (
          <button
            key={t.key}
            className="card text-center hover:shadow-lg transition-all active:scale-[0.97]
                       border-2 border-transparent hover:border-mushroom-300 py-8"
            onClick={() => startQuiz(t.key)}
          >
            <div className="text-4xl mb-2">{t.icon}</div>
            <div className="font-bold text-gray-700">{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
