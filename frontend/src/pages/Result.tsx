import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../context/QuizContext';
import { useAuth } from '../context/AuthContext';
import ScoreModal from '../components/quiz/ScoreModal';
import TreasureChestModal from '../components/common/TreasureChestModal';

interface PvpTarget {
  session_id: number;
  pvp_target_score: number;
  pvp_target_secs: number;
}

interface PvpVerdict {
  outcome: 'challenger' | 'target' | 'tie';
  challenger_score: number;
  challenger_secs: number;
  target_score: number;
  target_secs: number;
}

export default function Result() {
  const { state, resetQuiz } = useQuiz();
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [chestOpen, setChestOpen] = useState(true);
  const [pvpVerdict, setPvpVerdict] = useState<PvpVerdict | null>(null);

  useEffect(() => {
    if (state.phase !== 'RESULT') {
      navigate('/');
    }
  }, [state.phase, navigate]);

  // 進入結果頁時就刷新分數，確保回首頁後顯示最新資料
  useEffect(() => {
    if (state.phase === 'RESULT') refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // PvP 比對：若有未消費的 pvp_target，撈本場 session 細節再比對
  useEffect(() => {
    const raw = sessionStorage.getItem('pvp_target');
    if (!raw || !state.sessionId || !token) return;
    const target = JSON.parse(raw) as PvpTarget;
    sessionStorage.removeItem('pvp_target');

    fetch(`/api/quiz/session/${state.sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { session?: { total_score: number; duration_seconds: number } } | null) => {
        if (!data?.session) return;
        const cScore = data.session.total_score;
        const cSecs = data.session.duration_seconds || 1;
        const cWeight = cScore - cSecs / 10;
        const tWeight = target.pvp_target_score - target.pvp_target_secs / 10;
        const outcome: PvpVerdict['outcome'] =
          Math.abs(cWeight - tWeight) < 1 ? 'tie'
          : cWeight > tWeight ? 'challenger' : 'target';
        setPvpVerdict({
          outcome,
          challenger_score: cScore,
          challenger_secs: cSecs,
          target_score: target.pvp_target_score,
          target_secs: target.pvp_target_secs,
        });
      })
      .catch(console.error);
  }, [state.sessionId, token]);

  if (state.phase !== 'RESULT') return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {pvpVerdict && (
        <div className="w-full max-w-lg mx-auto mb-4">
          <div
            className={
              `card text-center font-bold ` +
              (pvpVerdict.outcome === 'challenger'
                ? 'bg-green-50 text-green-700 border-2 border-green-300'
                : pvpVerdict.outcome === 'tie'
                ? 'bg-yellow-50 text-yellow-700 border-2 border-yellow-300'
                : 'bg-red-50 text-red-700 border-2 border-red-300')
            }
          >
            <div className="text-3xl mb-1">
              {pvpVerdict.outcome === 'challenger' ? '🏆 你贏過了過去的自己！'
                : pvpVerdict.outcome === 'tie' ? '🤝 平手！下次再衝刺！'
                : '💪 過去的你比較強，下次贏回來！'}
            </div>
            <div className="text-sm font-normal mt-2 text-gray-600">
              你：{pvpVerdict.challenger_score} 分 / {pvpVerdict.challenger_secs} 秒 ｜
              目標：{pvpVerdict.target_score} 分 / {pvpVerdict.target_secs} 秒
            </div>
          </div>
        </div>
      )}

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
