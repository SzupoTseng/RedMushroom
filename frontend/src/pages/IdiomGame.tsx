/**
 * 一字千金（成語填字遊戲）
 *
 * 玩法：
 *   - 顯示一個四字成語，其中一個位置以「◯」遮住
 *   - 下方 4 個選項按鈕，玩家點選缺字
 *   - 正確 → 下一題，得分 +1
 *   - 錯誤 → 紅光閃爍 + 顯示正解，自動進下一題
 *   - 倒數計時 60 / 120 / 180 秒
 *   - 結算時 saveScore（exp = reward = 答對數）
 *
 * 題庫：frontend/public/data/idioms.json
 *   [{idiom, missingPos, options, correctIdx}]
 *   來源：簡體成語題庫 (公共文化遺產 + opencc s2twp 轉繁體)；題目結構
 *        為初始版本，未來可由 RedMushroom 端團隊自行調整。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface IdiomEntry {
  idiom: string;          // 四字成語
  idiomZhuyin: string[];  // ["ㄅㄛ", "ㄩㄣˊ", "ㄐㄧㄢˋ", "ㄖˋ"] 每字注音
  missingPos: number;     // 缺字位置 0-3
  options: string[];      // 4 個選項
  optionsZhuyin: string[]; // 4 個選項對應注音（冷僻字可能為空字串）
  correctIdx: number;     // options 中的正解 index
  explanation?: string;   // 解釋（不含成語本身）
  example?: string;       // 例句（含成語，只能答後顯示）
}

type Phase = 'idle' | 'playing' | 'done';

const DURATIONS = [60, 120, 180];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function IdiomGame() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [idioms, setIdioms] = useState<IdiomEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; correctIdx: number } | null>(null);

  const endAtRef = useRef<number>(0);
  const advanceTimer = useRef<number | null>(null);

  // ── Load idioms once ──────────────────────────────────────────
  useEffect(() => {
    fetch('/data/idioms.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((arr: IdiomEntry[]) => {
        if (!Array.isArray(arr) || arr.length === 0) throw new Error('empty idioms');
        setIdioms(arr);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : '載入失敗'));
  }, []);

  const current = useMemo<IdiomEntry | null>(() => {
    if (phase !== 'playing' || order.length === 0) return null;
    return idioms[order[pos % order.length]] ?? null;
  }, [phase, order, pos, idioms]);

  // 把題目選項位置 shuffle 一次，避免「正解永遠是某個位置」可被記憶
  const displayed = useMemo(() => {
    if (!current) return null;
    const idxMap = shuffle([0, 1, 2, 3]);
    return {
      options: idxMap.map((i) => current.options[i]),
      optionsZhuyin: idxMap.map((i) => current.optionsZhuyin[i] ?? ''),
      // 找出 correctIdx 在 shuffled 後的新位置
      newCorrectIdx: idxMap.indexOf(current.correctIdx),
    };
  // 每題 (pos 變化) 重新 shuffle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, current?.idiom]);

  // ── Score persist on finish ───────────────────────────────────
  const saveScore = useCallback(async (gained: number) => {
    if (!token || gained <= 0) return;
    try {
      await fetch('/api/quiz/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exp: gained, reward: gained, source: 'idiom-fill' }),
      });
    } catch { /* silent */ }
  }, [token]);

  const start = useCallback(() => {
    if (idioms.length === 0) return;
    setOrder(shuffle(idioms.map((_, i) => i)));
    setPos(0);
    setCorrect(0);
    setWrong(0);
    setFeedback(null);
    setTimeLeft(duration);
    setPhase('playing');
    endAtRef.current = performance.now() + duration * 1000;
  }, [idioms, duration]);

  // ── Countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAtRef.current - performance.now()) / 1000));
      setTimeLeft(remain);
      if (remain <= 0) {
        window.clearInterval(id);
        setPhase('done');
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  // 持久化分數一次（結算時）
  useEffect(() => {
    if (phase === 'done' && correct > 0) void saveScore(correct);
  }, [phase, correct, saveScore]);

  const cleanupTimer = () => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };
  useEffect(() => () => cleanupTimer(), []);

  const onSelect = (selectedIdx: number) => {
    if (!current || !displayed || feedback) return;
    const isCorrect = selectedIdx === displayed.newCorrectIdx;
    setFeedback({ kind: isCorrect ? 'correct' : 'wrong', correctIdx: displayed.newCorrectIdx });
    if (isCorrect) setCorrect((c) => c + 1);
    else setWrong((w) => w + 1);
    // feedback 期間顯示釋義 / 例句；給足夠時間閱讀
    advanceTimer.current = window.setTimeout(() => {
      setFeedback(null);
      setPos((p) => p + 1);
    }, isCorrect ? 1800 : 3000);
  };

  const skipFeedback = () => {
    if (!feedback) return;
    cleanupTimer();
    setFeedback(null);
    setPos((p) => p + 1);
  };

  const accuracy = useMemo(() => {
    const total = correct + wrong;
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }, [correct, wrong]);

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-4" type="button">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-amber-700">💰 一字千金</h1>
        {phase === 'playing' ? (
          <div className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? 'text-red-500' : 'text-amber-700'}`}>
            {timeLeft}s
          </div>
        ) : (
          <div className="w-16" />
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 pt-6 overflow-y-auto">
        {loadError && (
          <p className="text-red-500">成語載入失敗：{loadError}</p>
        )}

        {/* ── 開始畫面 ── */}
        {phase === 'idle' && !loadError && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">💰</div>
            <h2 className="text-2xl font-black text-amber-700 mb-2">一字千金</h2>
            <p className="text-gray-600 mb-4">看成語猜缺字，答對 +1 分。</p>
            <p className="text-sm text-gray-500 mb-6">題庫：{idioms.length} 個成語（簡轉繁）</p>

            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">選擇時間</div>
              <div className="flex gap-2 justify-center">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-xl font-bold ${
                      duration === d
                        ? 'bg-amber-500 text-white'
                        : 'bg-white border-2 border-amber-200 text-amber-700'
                    }`}
                    type="button"
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={start}
              disabled={idioms.length === 0}
              className="btn-primary w-full text-lg font-black"
              type="button"
            >
              {idioms.length === 0 ? '載入中…' : '開始 ▶'}
            </button>
          </div>
        )}

        {/* ── 遊戲畫面 ── */}
        {phase === 'playing' && current && displayed && (
          <div className="w-full max-w-md flex flex-col items-center">
            {/* 計分 */}
            <div className="flex gap-4 mb-4 text-sm">
              <span className="text-green-600 font-bold">✓ {correct}</span>
              <span className="text-red-500 font-bold">✗ {wrong}</span>
              <span className="text-gray-500">正確率 {accuracy}%</span>
            </div>

            {/* 成語 + 注音（每字 ruby 排版）；缺字位置顯示注音當提示 */}
            <div
              className={`bg-white rounded-2xl border-4 px-6 py-10 mb-4 shadow-lg transition-colors ${
                feedback?.kind === 'correct'
                  ? 'border-green-400'
                  : feedback?.kind === 'wrong'
                    ? 'border-red-400'
                    : 'border-amber-200'
              }`}
            >
              <div className="flex justify-center items-end gap-3">
                {current.idiom.split('').map((c, i) => {
                  const isMissing = i === current.missingPos;
                  const showAsCorrect = isMissing && feedback;
                  const zhuyin = current.idiomZhuyin[i] || '';
                  return (
                    <div key={i} className="flex flex-col items-center min-w-[3.5rem]">
                      <span className="text-amber-600 text-sm sm:text-base font-bold whitespace-nowrap leading-tight bpmf-font">
                        {zhuyin || '　'}
                      </span>
                      <span
                        className={`text-5xl sm:text-6xl font-black font-serif leading-tight ${
                          isMissing
                            ? showAsCorrect
                              ? feedback?.kind === 'correct'
                                ? 'text-green-500'
                                : 'text-red-500'
                              : 'text-amber-300'
                            : 'text-amber-800'
                        }`}
                      >
                        {isMissing ? (feedback ? current.options[current.correctIdx] : '◯') : c}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* 提示：缺字的注音特別顯眼，達成「給注音填國字」效果 */}
              {!feedback && current.idiomZhuyin[current.missingPos] && (
                <div className="text-center mt-3 text-sm text-amber-700">
                  缺字注音：<span className="font-black tracking-wider text-amber-900">{current.idiomZhuyin[current.missingPos]}</span>
                </div>
              )}
            </div>

            {/* 答完才顯示釋義 / 例句（避免破題）— 放在 idiom 卡片正下方確保可見 */}
            {feedback && (current.explanation || current.example) && (
              <button
                type="button"
                onClick={skipFeedback}
                className="w-full text-left bg-white border-2 border-amber-300 rounded-2xl px-4 py-3 mb-4 hover:bg-amber-50 transition-colors shadow"
                title="點擊跳過進入下一題"
              >
                {current.explanation && (
                  <div className="text-sm text-amber-900 leading-relaxed">
                    <span className="font-bold text-amber-700">解釋：</span>
                    {current.explanation}
                  </div>
                )}
                {current.example && (
                  <div className="text-sm text-amber-800 mt-1 leading-relaxed">
                    <span className="font-bold text-amber-700">例句：</span>
                    {current.example}
                  </div>
                )}
                <div className="text-xs text-amber-500 mt-2 text-right">點此立即進下一題 →</div>
              </button>
            )}

            {/* 4 選項按鈕（每選項上方顯示注音） */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {displayed.options.map((opt, i) => {
                const optZ = displayed.optionsZhuyin[i] || '';
                const isCorrectChoice = feedback && i === displayed.newCorrectIdx;
                const isWrongChoice = feedback?.kind === 'wrong' && i !== displayed.newCorrectIdx;
                return (
                  <button
                    key={i}
                    onClick={() => onSelect(i)}
                    disabled={!!feedback}
                    className={`rounded-2xl py-4 border-4 transition-colors flex flex-col items-center ${
                      isCorrectChoice
                        ? 'bg-green-500 text-white border-green-600'
                        : isWrongChoice
                          ? 'bg-red-100 text-red-400 border-red-200'
                          : 'bg-white border-amber-200 text-amber-800 hover:bg-amber-50 active:scale-95'
                    }`}
                    type="button"
                  >
                    <span className={`text-xs h-4 ${isCorrectChoice ? 'text-white/90' : 'text-amber-600'}`}>
                      {optZ || '　'}
                    </span>
                    <span className="text-3xl font-black font-serif">{opt}</span>
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* ── 結算畫面 ── */}
        {phase === 'done' && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-black text-amber-700 mb-4">時間到！</h2>
            <div className="space-y-2 mb-6">
              <div className="text-4xl font-black text-green-600">
                答對 {correct} 題
              </div>
              <div className="text-gray-500">
                錯 {wrong} 題　正確率 {accuracy}%
              </div>
              {correct > 0 && (
                <div className="text-sm text-amber-600 mt-3">
                  獲得 {correct} EXP + {correct} 兌換分數
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPhase('idle')} className="btn-secondary flex-1" type="button">
                重玩
              </button>
              <button onClick={() => navigate('/')} className="btn-primary flex-1" type="button">
                回主頁
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
