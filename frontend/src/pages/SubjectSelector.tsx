import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import StreakFire from '../components/common/StreakFire';
import { useTranslation } from '../i18n';
import type { TheoryType } from '../types';

const THEORY_TYPES: { key: TheoryType; label: string; icon: string; desc: string }[] = [
  { key: 'cognitive', label: '語詞認知', icon: '🧠', desc: '認識生字、詞彙意義' },
  { key: 'input', label: '語言輸入', icon: '👁', desc: '閱讀理解、語段接收' },
  { key: 'usage', label: '語言運用', icon: '✍️', desc: '造句、填空、語言表達' },
  { key: 'sociocultural', label: '社文語境', icon: '🌏', desc: '節日、習俗、文化背景' },
];

export default function SubjectSelector() {
  const { user, logout } = useAuth();
  const { startQuiz, state } = useQuiz();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<TheoryType | null>(null);

  useEffect(() => {
    if (state.phase === 'QUIZ' || state.phase === 'LOADING') {
      navigate('/quiz');
    }
  }, [state.phase, navigate]);

  const handleSelect = async (theoryType: TheoryType) => {
    setLoading(theoryType);
    await startQuiz(theoryType, 'chinese');
    setLoading(null);
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* 頂部列 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-mushroom-600">🍄 RedMushroom</h1>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            {user?.is_sen_mode
              ? <>🌟 輕鬆學習模式</>
              : <>Lv.{user?.current_level} · {user?.display_name}</>}
            <StreakFire days={user?.streak_days ?? 0} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            className="btn-secondary text-sm py-2 px-4"
            onClick={() => navigate('/dashboard')}
          >
            📊 {t('nav.dashboard')}
          </button>
          {user?.role === 'teacher' && (
            <button
              className="btn-secondary text-sm py-2 px-4"
              onClick={() => navigate('/admin')}
            >
              👩‍🏫 {t('nav.admin')}
            </button>
          )}
          <button className="btn-secondary text-sm py-2 px-4" onClick={logout}>
            {t('common.logout')}
          </button>
        </div>
      </div>

      <h2 className="text-xl font-bold text-center text-gray-700 mb-6">
        今天要練習哪個主題？
      </h2>

      {state.error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-2xl p-4 mb-6 text-center">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEORY_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSelect(t.key)}
            disabled={loading !== null}
            className={`card text-left transition-all hover:shadow-lg active:scale-[0.98]
              border-2 ${loading === t.key ? 'border-mushroom-400 bg-mushroom-50' : 'border-transparent'}`}
          >
            <div className="text-4xl mb-2">{t.icon}</div>
            <div className="text-lg font-black text-gray-800">{t.label}</div>
            <div className="text-sm text-gray-500 mt-1">{t.desc}</div>
            {loading === t.key && (
              <div className="mt-2 text-mushroom-500 text-sm font-semibold animate-pulse">
                載入題目中...
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 額外功能 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <button
          onClick={() => navigate('/monsters')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-transparent"
        >
          <div className="text-3xl mb-1">🐲</div>
          <div className="font-black text-gray-800">錯題怪獸</div>
          <div className="text-xs text-gray-500 mt-1">複習做錯過的題目</div>
        </button>
        <button
          onClick={() => navigate('/leaderboard')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-transparent"
        >
          <div className="text-3xl mb-1">🏆</div>
          <div className="font-black text-gray-800">班級英雄榜</div>
          <div className="text-xs text-gray-500 mt-1">看看同學的努力</div>
        </button>
        <button
          onClick={() => navigate('/pvp')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-transparent"
        >
          <div className="text-3xl mb-1">⚔️</div>
          <div className="font-black text-gray-800">挑戰過去的自己</div>
          <div className="text-xs text-gray-500 mt-1">PvP 競技場</div>
        </button>
      </div>
    </div>
  );
}
