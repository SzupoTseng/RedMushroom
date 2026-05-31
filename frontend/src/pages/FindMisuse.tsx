/**
 * 一起找錯字（成語錯別字遊戲）
 *
 * 玩法：
 *   - 田字格呈現一個 4 字成語，其中一個字被換成「同音字錯字」
 *   - 玩家點擊覺得是錯字的那一格
 *   - 答對：該格變綠 + 顯示正解字
 *   - 答錯：被點的格變紅，正解格綠光提示
 *   - 答完後顯示解釋 / 例句（與一字千金一致）
 *   - 倒數計時 60 / 120 / 180 秒
 *   - saveScore via /api/quiz/game-score (source: 'find-misuse')
 *
 * 題庫：frontend/public/data/misuse.json
 *   來源：把 idioms.json 的成語其中一個字換成同音字（dictionary.json 同音字索引）
 *        + 翰林教學頁面公開的「常見錯字」curated 列表
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface MisuseEntry {
  idiom: string;
  idiomZhuyin: string[];
  wrongPos: number;
  wrongChar: string;
  wrongCharZhuyin: string;
  correctChar: string;
  correctCharZhuyin: string;
  displayed: string;
  explanation?: string;
  example?: string;
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

export default function FindMisuse() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [pool, setPool] = useState<MisuseEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<{
    kind: 'correct' | 'wrong';
    selectedIdx: number;
  } | null>(null);

  const endAtRef = useRef<number>(0);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    fetch('/data/misuse.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((arr: MisuseEntry[]) => {
        if (!Array.isArray(arr) || arr.length === 0) throw new Error('empty pool');
        setPool(arr);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : '載入失敗'));
  }, []);

  const current = useMemo<MisuseEntry | null>(() => {
    if (phase !== 'playing' || order.length === 0) return null;
    return pool[order[pos % order.length]] ?? null;
  }, [phase, order, pos, pool]);

  const saveScore = useCallback(async (gained: number) => {
    if (!token || gained <= 0) return;
    try {
      await fetch('/api/quiz/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exp: gained, reward: gained, source: 'find-misuse' }),
      });
    } catch { /* silent */ }
  }, [token]);

  const start = useCallback(() => {
    if (pool.length === 0) return;
    setOrder(shuffle(pool.map((_, i) => i)));
    setPos(0);
    setCorrect(0);
    setWrong(0);
    setFeedback(null);
    setTimeLeft(duration);
    setPhase('playing');
    endAtRef.current = performance.now() + duration * 1000;
  }, [pool, duration]);

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

  const onCellClick = (idx: number) => {
    if (!current || feedback) return;
    const isCorrect = idx === current.wrongPos;
    setFeedback({ kind: isCorrect ? 'correct' : 'wrong', selectedIdx: idx });
    if (isCorrect) setCorrect((c) => c + 1);
    else setWrong((w) => w + 1);
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

  // 為了顯示「答對後正解字」，feedback 時某格的字會切換成 correctChar
  const cellChar = (i: number): string => {
    if (!current) return '';
    if (feedback && i === current.wrongPos) return current.correctChar;
    return current.displayed[i] ?? '';
  };
  const cellZhuyin = (i: number): string => {
    if (!current) return '';
    if (feedback && i === current.wrongPos) return current.correctCharZhuyin || '';
    if (i === current.wrongPos) return current.wrongCharZhuyin || '';
    return current.idiomZhuyin[i] || '';
  };

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-4" type="button">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-rose-700">🔍 一起找錯字</h1>
        {phase === 'playing' ? (
          <div className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? 'text-red-500' : 'text-rose-700'}`}>
            {timeLeft}s
          </div>
        ) : (
          <div className="w-16" />
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 pt-6 overflow-y-auto">
        {loadError && (
          <p className="text-red-500">題庫載入失敗：{loadError}</p>
        )}

        {/* ── 開始畫面 ── */}
        {phase === 'idle' && !loadError && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">🔍</div>
            <h2 className="text-2xl font-black text-rose-700 mb-2">一起找錯字</h2>
            <p className="text-gray-600 mb-2">四字成語裡藏一個錯字（同音字陷阱），點擊找出來。</p>
            <p className="text-sm text-gray-500 mb-6">題庫：{pool.length} 個成語</p>

            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">選擇時間</div>
              <div className="flex gap-2 justify-center">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-xl font-bold ${
                      duration === d
                        ? 'bg-rose-500 text-white'
                        : 'bg-white border-2 border-rose-200 text-rose-700'
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
              disabled={pool.length === 0}
              className="btn-primary w-full text-lg font-black"
              type="button"
            >
              {pool.length === 0 ? '載入中…' : '開始 ▶'}
            </button>
          </div>
        )}

        {/* ── 遊戲畫面 ── */}
        {phase === 'playing' && current && (
          <div className="w-full max-w-md flex flex-col items-center">
            {/* 計分 */}
            <div className="flex gap-4 mb-4 text-sm">
              <span className="text-green-600 font-bold">✓ {correct}</span>
              <span className="text-red-500 font-bold">✗ {wrong}</span>
              <span className="text-gray-500">正確率 {accuracy}%</span>
            </div>

            {/* 說明 */}
            <p className="text-sm text-rose-700 mb-3">下方哪一格是錯字？點它！</p>

            {/* 4 個田字格，依序排成 1×4 row */}
            <div className="bg-white rounded-2xl border-4 border-rose-200 p-3 shadow-lg mb-4">
              <div className="flex gap-2 justify-center items-end">
                {[0, 1, 2, 3].map((i) => {
                  const isWrong = i === current.wrongPos;
                  const wasSelected = feedback?.selectedIdx === i;
                  const showCorrectFlash = feedback && isWrong;     // 答對或答錯，正解格都會 highlight
                  const showWrongFlash = feedback?.kind === 'wrong' && wasSelected;
                  return (
                    <button
                      key={i}
                      onClick={() => onCellClick(i)}
                      disabled={!!feedback}
                      type="button"
                      className="flex flex-col items-center group"
                      style={{ width: 80 }}
                    >
                      {/* 注音 */}
                      <span className="text-xs sm:text-sm text-rose-600 font-bold h-5 bpmf-font">
                        {cellZhuyin(i) || '　'}
                      </span>
                      {/* 田字格 cell */}
                      <div
                        className={`grid-cell tianzi flex items-center justify-center transition-colors ${
                          showCorrectFlash
                            ? 'bg-green-100'
                            : showWrongFlash
                              ? 'bg-red-100'
                              : 'bg-white group-hover:bg-rose-50 group-active:scale-95'
                        }`}
                        style={{ width: 72, height: 72 }}
                      >
                        <span
                          className={`text-5xl font-black font-serif ${
                            showCorrectFlash
                              ? 'text-green-600'
                              : showWrongFlash
                                ? 'text-red-500'
                                : 'text-gray-800'
                          }`}
                        >
                          {cellChar(i)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 答完顯示釋義 / 例句 + 提示 */}
            {feedback && (
              <button
                type="button"
                onClick={skipFeedback}
                className="w-full text-left bg-white border-2 border-rose-300 rounded-2xl px-4 py-3 hover:bg-rose-50 transition-colors shadow"
                title="點擊跳過進入下一題"
              >
                <div className="text-sm text-rose-900 font-bold mb-1">
                  {feedback.kind === 'correct' ? '✓ 答對了！' : '✗ 答錯囉'}
                  {' '}正解：第 {current.wrongPos + 1} 字「{current.wrongChar}」應為「
                  <span className="text-green-600">{current.correctChar}</span>」
                </div>
                {current.explanation && (
                  <div className="text-sm text-amber-900 leading-relaxed mt-1">
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
                <div className="text-xs text-rose-500 mt-2 text-right">點此立即進下一題 →</div>
              </button>
            )}
          </div>
        )}

        {/* ── 結算畫面 ── */}
        {phase === 'done' && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-black text-rose-700 mb-4">時間到！</h2>
            <div className="space-y-2 mb-6">
              <div className="text-4xl font-black text-green-600">
                找對 {correct} 個錯字
              </div>
              <div className="text-gray-500">
                錯 {wrong} 題　正確率 {accuracy}%
              </div>
              {correct > 0 && (
                <div className="text-sm text-rose-600 mt-3">
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
