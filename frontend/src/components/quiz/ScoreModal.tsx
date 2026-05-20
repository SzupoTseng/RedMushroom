import type { Question } from '../../types';

interface Props {
  totalScore: number;
  isPassed: boolean;
  expGained: number;
  praise: string;
  levelUp: boolean;
  newLevel: number;
  questions: Question[];
  results: Record<number, boolean>;
  answers: Record<number, string>;
  onRetry: () => void;
}

export default function ScoreModal({
  totalScore, isPassed, expGained, praise,
  levelUp, newLevel, questions, results, onRetry,
}: Props) {
  const correct = Object.values(results).filter(Boolean).length;

  return (
    <div className="w-full max-w-lg mx-auto animate-pop">
      {/* 結果卡 */}
      <div className="card mb-6 text-center">
        <div className="text-6xl mb-3">{isPassed ? '🎉' : '💪'}</div>
        <div className={`text-5xl font-black mb-2 ${isPassed ? 'text-green-500' : 'text-mushroom-500'}`}>
          {totalScore} 分
        </div>
        <div className="text-gray-500 mb-4">
          答對 {correct} / {questions.length} 題
        </div>

        {levelUp && (
          <div className="bg-yellow-100 text-yellow-700 rounded-2xl px-6 py-3 mb-4 font-bold text-lg">
            🌟 升級了！現在是 Lv.{newLevel}！
          </div>
        )}

        <div className="bg-gray-50 rounded-2xl px-6 py-4 text-gray-700 italic text-lg mb-4">
          「{praise}」
        </div>

        <div className="text-sm text-gray-400">+{expGained} EXP</div>
      </div>

      {/* 題目回顧 */}
      <div className="space-y-3 mb-6">
        {questions.map((q) => {
          const isCorrect = results[q.question_id];
          return (
            <div
              key={q.question_id}
              className={`card border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{isCorrect ? '✅' : '❌'}</span>
                <span className="text-sm text-gray-600">
                  {q.content.map((c) => c.char).join('')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={onRetry} className="btn-primary w-full text-xl">
        再來一次 🍄
      </button>
    </div>
  );
}
