import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import BpmfFontSelector from '../components/common/BpmfFontSelector';
import Greeting from '../components/common/Greeting';
import { useTranslation } from '../i18n';
import type { TheoryType } from '../types';

// Level thresholds: 5000 × 2^(level-1) per level
function levelThreshold(lv: number): number { return 5000 * Math.pow(2, lv - 1); }
function expToLevel(exp: number): number {
  let lv = 1;
  let cumulative = 0;
  while (cumulative + levelThreshold(lv) <= exp) { cumulative += levelThreshold(lv); lv++; }
  return lv;
}
function expInLevel(exp: number, lv: number): number {
  let cumulative = 0;
  for (let i = 1; i < lv; i++) cumulative += levelThreshold(i);
  return exp - cumulative;
}

const ScoreCard = memo(function ScoreCard({
  exp, rewardPoints, streak,
}: { exp: number; rewardPoints: number; streak: number }) {
  const computedLv = expToLevel(exp);
  const inLevel = expInLevel(exp, computedLv);
  const needed = levelThreshold(computedLv);
  const pct = Math.min(100, (inLevel / needed) * 100);
  return (
    <div className="card mb-6 py-4 space-y-3">
      {/* Row 1: level + EXP progress */}
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[56px]">
          <div className="text-xs text-gray-400 font-semibold">等級</div>
          <div className="text-3xl font-black text-mushroom-600">{computedLv}</div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs text-gray-400">經驗值</span>
            <span className="text-lg font-black text-mushroom-500">{exp.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-mushroom-400 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{inLevel.toLocaleString()} / {needed.toLocaleString()}</span>
            <span>→ Lv.{computedLv + 1}</span>
          </div>
        </div>
        {streak > 0 && (
          <div className="text-center min-w-[44px]">
            <div className="text-xs text-gray-400">連勝</div>
            <div className="text-lg font-black text-orange-500">🔥{streak}</div>
          </div>
        )}
      </div>
      {/* Row 2: reward points */}
      <div className="flex items-center justify-between border-t pt-3">
        <div>
          <div className="text-xs text-gray-400">🎁 兌換獎品分數</div>
          <div className="text-2xl font-black text-yellow-500">{rewardPoints.toLocaleString()}</div>
        </div>
        <div className="text-xs text-gray-400 text-right max-w-[160px]">
          與經驗值獨立<br/>用於兌換獎品
        </div>
      </div>
    </div>
  );
});

const THEORY_TYPES: { key: TheoryType; label: string; icon: string; desc: string; highlight?: boolean }[] = [
  { key: 'mixed',         label: '綜合練習', icon: '🎯', desc: '四大主題各取 2-3 題，最多元的練習', highlight: true },
  { key: 'sorting',       label: '排句子',   icon: '✂️', desc: '把詞語拖曳成正確的句子順序' },
  { key: 'cognitive',     label: '語詞認知', icon: '🧠', desc: '認識生字、詞彙意義' },
  { key: 'input',         label: '語言輸入', icon: '👁', desc: '閱讀理解、語段接收' },
  { key: 'usage',         label: '語言運用', icon: '✍️', desc: '造句、填空、語言表達' },
  { key: 'sociocultural', label: '社文語境', icon: '🌏', desc: '節日、習俗、文化背景' },
];

export default function SubjectSelector() {
  const { user, logout, refreshUser, updateQuestionLevel } = useAuth();
  const { startQuiz, state } = useQuiz();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState<TheoryType | null>(null);
  const [savingLevel, setSavingLevel] = useState(false);

  const currentLevel: 0 | 1 = (user?.question_level === 1 ? 1 : 0);
  const handleLevelChange = async (lv: 0 | 1) => {
    if (lv === currentLevel || savingLevel) return;
    setSavingLevel(true);
    try { await updateQuestionLevel(lv); }
    catch (e) { console.error('updateQuestionLevel failed', e); }
    finally { setSavingLevel(false); }
  };

  // 每次回到主頁都重新取得最新分數（避免測驗後分數沒更新）
  useEffect(() => {
    refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-mushroom-600">🍄 RedMushroom</h1>
          {user?.is_sen_mode
            ? <p className="text-sm text-mushroom-500">🌟 輕鬆學習模式</p>
            : <p className="text-sm text-gray-500">{user?.display_name}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BpmfFontSelector />
          {/* 出題模式：重複練習(Lv0) vs 多樣化(Lv1)。Default Lv0 對 SEN / 低年級友善 */}
          {user && (
            <div
              className="inline-flex rounded-xl border border-gray-200 text-xs overflow-hidden shadow-sm"
              title={currentLevel === 0
                ? '目前：重複練習（同題會反覆出現，適合熟練單一概念）'
                : '目前：多樣化（每場題目最大化覆蓋整個題庫）'}
            >
              <button
                type="button"
                onClick={() => handleLevelChange(0)}
                disabled={savingLevel}
                className={`px-3 py-2 font-bold transition-colors ${
                  currentLevel === 0 ? 'bg-mushroom-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                重複練習
              </button>
              <button
                type="button"
                onClick={() => handleLevelChange(1)}
                disabled={savingLevel}
                className={`px-3 py-2 font-bold transition-colors border-l border-gray-200 ${
                  currentLevel === 1 ? 'bg-mushroom-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                多樣化
              </button>
            </div>
          )}
          <LanguageSwitcher />
          <button className="btn-secondary text-sm py-2 px-4" onClick={() => navigate('/dashboard')}>
            📊 {t('nav.dashboard')}
          </button>
          {user?.role === 'teacher' && (
            <button className="btn-secondary text-sm py-2 px-4" onClick={() => navigate('/admin')}>
              👩‍🏫 {t('nav.admin')}
            </button>
          )}
          <button className="btn-secondary text-sm py-2 px-4" onClick={logout}>
            {t('common.logout')}
          </button>
        </div>
      </div>

      {/* 學生中文姓名（可內嵌編輯） */}
      <Greeting />

      {/* 分數卡片 */}
      {user && !user.is_sen_mode && (
        <ScoreCard
          exp={user.total_exp}
          rewardPoints={user.reward_points ?? 0}
          streak={user.streak_days}
        />
      )}

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
              border-2 ${loading === t.key
                ? 'border-mushroom-400 bg-mushroom-50'
                : t.highlight
                  ? 'border-mushroom-300 bg-mushroom-50'
                  : 'border-transparent'}
              ${(t.key === 'mixed' || t.key === 'sorting') ? 'sm:col-span-2' : ''}`}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-4">
        <button
          onClick={() => navigate('/reading-tool')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-200 bg-amber-50"
        >
          <div className="text-3xl mb-1">📖</div>
          <div className="font-black text-gray-800">讀音工具</div>
          <div className="text-xs text-gray-500 mt-1">貼上文章自動標注音、查破音字</div>
        </button>
        <button
          onClick={() => navigate('/ext/stroke')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-200 bg-amber-50"
        >
          <div className="text-3xl mb-1">🖋</div>
          <div className="font-black text-gray-800">筆順練習</div>
          <div className="text-xs text-gray-500 mt-1">筆順動畫＋臨摹練習</div>
        </button>
        <button
          onClick={() => navigate('/typing-game')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-mushroom-200 bg-indigo-50"
        >
          <div className="text-3xl mb-1">🎮</div>
          <div className="font-black text-gray-800">打字遊戲</div>
          <div className="text-xs text-gray-500 mt-1">注音打字消滅單字</div>
        </button>
        <button
          onClick={() => navigate('/word-typing')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-emerald-200 bg-emerald-50"
        >
          <div className="text-3xl mb-1">🍄</div>
          <div className="font-black text-gray-800">語詞快打</div>
          <div className="text-xs text-gray-500 mt-1">蘑菇射種子打恐龍、100 關</div>
        </button>
        <button
          onClick={() => navigate('/idiom')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-300 bg-amber-50"
        >
          <div className="text-3xl mb-1">💰</div>
          <div className="font-black text-gray-800">一字千金</div>
          <div className="text-xs text-gray-500 mt-1">成語猜缺字、倒數計時、繁體 580 題</div>
        </button>
        <button
          onClick={() => navigate('/find-misuse')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-rose-300 bg-rose-50"
        >
          <div className="text-3xl mb-1">🔍</div>
          <div className="font-black text-gray-800">一起找錯字</div>
          <div className="text-xs text-gray-500 mt-1">成語同音字陷阱、田字格顯示、531 題</div>
        </button>
        <button
          onClick={() => navigate('/poem-author')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-emerald-300 bg-emerald-50"
        >
          <div className="text-3xl mb-1">📜</div>
          <div className="font-black text-gray-800">是誰寫的詩</div>
          <div className="text-xs text-gray-500 mt-1">唐詩三百首、注音、猜作者、197 首</div>
        </button>
        <button
          onClick={() => navigate('/sanzijing')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-indigo-300 bg-indigo-50"
        >
          <div className="text-3xl mb-1">📚</div>
          <div className="font-black text-gray-800">三字經</div>
          <div className="text-xs text-gray-500 mt-1">三字經接句、注音、4 選 1、379 題</div>
        </button>
        <button
          onClick={() => navigate('/dizigui')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-teal-300 bg-teal-50"
        >
          <div className="text-3xl mb-1">📖</div>
          <div className="font-black text-gray-800">弟子規</div>
          <div className="text-xs text-gray-500 mt-1">弟子規接句、含章節、注音、359 題</div>
        </button>
        <button
          onClick={() => navigate('/lunyu')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-violet-300 bg-violet-50"
        >
          <div className="text-3xl mb-1">🎓</div>
          <div className="font-black text-gray-800">論語</div>
          <div className="text-xs text-gray-500 mt-1">論語接句、白話解釋、注音、2059 題</div>
        </button>
        <button
          onClick={() => navigate('/english-typing')}
          className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-sky-200 bg-sky-50"
        >
          <div className="text-3xl mb-1">⌨️</div>
          <div className="font-black text-gray-800">英文快打</div>
          <div className="text-xs text-gray-500 mt-1">看單字打字、倒數計時、國中 2000 字</div>
        </button>
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

      {/* 擴充模組區 — clean-room 重寫的輔助工具 */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-bold text-gray-700">🧩 擴充模組</h2>
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-xs text-gray-400">輔助工具・可列印</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/ext/math')}
            className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-200 bg-amber-50"
          >
            <div className="text-3xl mb-1">📝</div>
            <div className="font-black text-gray-800">數學練習產生器</div>
            <div className="text-xs text-gray-500 mt-1">加減乘除自動出題、可列印</div>
          </button>
          <button
            onClick={() => navigate('/ext/writing-grid')}
            className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-200 bg-amber-50"
          >
            <div className="text-3xl mb-1">✍️</div>
            <div className="font-black text-gray-800">田字格習字紙</div>
            <div className="text-xs text-gray-500 mt-1">空白格＋描紅、可列印</div>
          </button>
          <button
            onClick={() => navigate('/ext/worksheet')}
            className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-200 bg-amber-50"
          >
            <div className="text-3xl mb-1">📋</div>
            <div className="font-black text-gray-800">練習單列印</div>
            <div className="text-xs text-gray-500 mt-1">從本機題庫抽題、可列印</div>
          </button>
          <button
            onClick={() => navigate('/ext/bopomofo-symbols')}
            className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-200 bg-amber-50"
          >
            <div className="text-3xl mb-1">ㄅ</div>
            <div className="font-black text-gray-800">注音符號習字紙</div>
            <div className="text-xs text-gray-500 mt-1">37 符號可選、描寫、可列印</div>
          </button>
          <button
            onClick={() => navigate('/ext/vertical-bopomofo')}
            className="card text-left transition-all hover:shadow-lg active:scale-[0.98] border-2 border-amber-200 bg-amber-50"
          >
            <div className="text-3xl mb-1">📜</div>
            <div className="font-black text-gray-800">豎排注音摹寫</div>
            <div className="text-xs text-gray-500 mt-1">貼文章生直排注音、可列印</div>
          </button>
        </div>
      </div>
    </div>
  );
}
