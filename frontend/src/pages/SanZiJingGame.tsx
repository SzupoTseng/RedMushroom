/**
 * 三字經（接句猜題遊戲）
 *
 * 玩法：
 *   - 顯示三字經其中三個字（含注音）
 *   - 4 個選項按鈕（每個 3 字 + 注音），玩家選正確的「下一句」
 *   - 答完後顯示完整對句（X，Y）
 *   - 倒數計時 60 / 120 / 180 秒
 *   - saveScore via /api/quiz/game-score (source: 'sanzijing')
 *
 * 題庫：frontend/public/data/sanzijing.json   (379 道三字經接句)
 *       來源：chinese-poetry repo 蒙學/sanzijing-traditional.json (公共領域)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Entry {
  phrase: string;
  zhuyin: string[];
  next: string;
  nextZhuyin: string[];
  pairContext: string;
  explanation?: string;
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

export default function SanZiJingGame() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [pool, setPool] = useState<Entry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; pickedIdx: number; correctIdx: number } | null>(null);

  const endAtRef = useRef<number>(0);
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    fetch('/data/sanzijing.json')
      .then((r) => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((arr: Entry[]) => {
        if (!Array.isArray(arr) || arr.length < 4) throw new Error('empty pool');
        setPool(arr);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const current = useMemo<Entry | null>(() => {
    if (phase !== 'playing' || order.length === 0) return null;
    return pool[order[pos % order.length]] ?? null;
  }, [phase, order, pos, pool]);

  // 4 選項：正解 + 3 個從池子裡隨機抓的其他「next」（不含同 phrase）
  const choices = useMemo<{ list: { phrase: string; zhuyin: string[] }[]; correctIdx: number } | null>(() => {
    if (!current || pool.length < 4) return null;
    const used = new Set<string>([current.next, current.phrase]);
    const distractors: Entry[] = [];
    // 隨機抓 3 個不重複的「next」當干擾
    const indices = shuffle(pool.map((_, i) => i));
    for (const i of indices) {
      if (distractors.length >= 3) break;
      const e = pool[i];
      if (used.has(e.next)) continue;
      used.add(e.next);
      distractors.push(e);
    }
    const list = shuffle([
      { phrase: current.next, zhuyin: current.nextZhuyin },
      ...distractors.map((e) => ({ phrase: e.next, zhuyin: e.nextZhuyin })),
    ]);
    const correctIdx = list.findIndex((c) => c.phrase === current.next);
    return { list, correctIdx };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, current?.phrase]);

  const saveScore = useCallback(async (gained: number) => {
    if (!token || gained <= 0) return;
    try {
      await fetch('/api/quiz/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exp: gained, reward: gained, source: 'sanzijing' }),
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

  const onPick = (idx: number) => {
    if (!choices || feedback) return;
    const isCorrect = idx === choices.correctIdx;
    setFeedback({ kind: isCorrect ? 'correct' : 'wrong', pickedIdx: idx, correctIdx: choices.correctIdx });
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

  // 共用元件：3-字 + 注音 (ruby) 排版
  const renderPhrase = (
    phrase: string,
    zhuyin: string[],
    opts: { large?: boolean; tone?: 'normal' | 'correct' | 'wrong' } = {},
  ) => {
    const large = !!opts.large;
    const charClass = large
      ? 'text-5xl sm:text-6xl font-black font-serif leading-tight'
      : 'text-3xl font-black font-serif leading-tight';
    const zClass = large
      ? 'text-indigo-600 text-sm sm:text-base font-bold leading-tight bpmf-font'
      : 'text-indigo-600 text-xs font-bold leading-tight bpmf-font';
    const charColor =
      opts.tone === 'correct' ? 'text-green-600'
      : opts.tone === 'wrong' ? 'text-red-500'
      : 'text-indigo-900';
    return (
      <div className="flex justify-center items-end gap-2">
        {phrase.split('').map((c, i) => (
          <div key={i} className="flex flex-col items-center min-w-[2.6rem]">
            <span className={zClass}>{zhuyin[i] || '　'}</span>
            <span className={`${charClass} ${charColor}`}>{c}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-4" type="button">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-indigo-700">📚 三字經</h1>
        {phase === 'playing' ? (
          <div className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? 'text-red-500' : 'text-indigo-700'}`}>
            {timeLeft}s
          </div>
        ) : (
          <div className="w-16" />
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 pt-6 overflow-y-auto">
        {loadError && <p className="text-red-500">題庫載入失敗：{loadError}</p>}

        {phase === 'idle' && !loadError && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">📚</div>
            <h2 className="text-2xl font-black text-indigo-700 mb-2">三字經</h2>
            <p className="text-gray-600 mb-2">看上一句猜下一句，4 選 1。每字附注音。</p>
            <p className="text-sm text-gray-500 mb-6">題庫：{pool.length} 道接句</p>

            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">選擇時間</div>
              <div className="flex gap-2 justify-center">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-xl font-bold ${
                      duration === d ? 'bg-indigo-500 text-white' : 'bg-white border-2 border-indigo-200 text-indigo-700'
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

        {phase === 'playing' && current && choices && (
          <div className="w-full max-w-md flex flex-col items-center">
            <div className="flex gap-4 mb-3 text-sm">
              <span className="text-green-600 font-bold">✓ {correct}</span>
              <span className="text-red-500 font-bold">✗ {wrong}</span>
              <span className="text-gray-500">正確率 {accuracy}%</span>
            </div>

            {/* 題目卡片 */}
            <div
              className={`bg-white rounded-2xl border-4 px-6 py-8 mb-4 shadow-lg w-full transition-colors ${
                feedback?.kind === 'correct'
                  ? 'border-green-400'
                  : feedback?.kind === 'wrong'
                    ? 'border-red-400'
                    : 'border-indigo-200'
              }`}
            >
              {renderPhrase(current.phrase, current.zhuyin, { large: true })}
              <div className="text-center text-indigo-600 text-base sm:text-lg font-bold mt-4">
                下一句是？
              </div>
              {feedback && (
                <div className="mt-5 flex justify-center items-end gap-2 sm:gap-3">
                  <span className="text-base text-gray-500">完整對句：</span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-800 font-serif">
                    {current.pairContext}
                  </span>
                </div>
              )}
            </div>

            {/* 4 選項 — 每個 3 字 + 注音 */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {choices.list.map((c, i) => {
                const isCorrect = feedback && i === choices.correctIdx;
                const isWrongPick = feedback?.kind === 'wrong' && feedback.pickedIdx === i;
                return (
                  <button
                    key={c.phrase + i}
                    onClick={() => onPick(i)}
                    disabled={!!feedback}
                    type="button"
                    className={`rounded-2xl py-3 border-4 transition-colors ${
                      isCorrect
                        ? 'bg-green-500 border-green-600'
                        : isWrongPick
                          ? 'bg-red-100 border-red-200'
                          : 'bg-white border-indigo-200 hover:bg-indigo-50 active:scale-95'
                    }`}
                  >
                    <div className="flex justify-center items-end gap-1">
                      {c.phrase.split('').map((ch, ci) => (
                        <div key={ci} className="flex flex-col items-center min-w-[1.8rem]">
                          <span className={`text-[0.65rem] sm:text-xs font-bold leading-none h-3 sm:h-4 bpmf-font ${
                            isCorrect ? 'text-white/80' : 'text-indigo-600'
                          }`}>
                            {c.zhuyin[ci] || '　'}
                          </span>
                          <span className={`text-2xl sm:text-3xl font-black font-serif ${
                            isCorrect ? 'text-white' : isWrongPick ? 'text-red-400' : 'text-indigo-900'
                          }`}>
                            {ch}
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 答完顯示提示 + 連句解釋 */}
            {feedback && (
              <button
                type="button"
                onClick={skipFeedback}
                className="mt-4 w-full text-left bg-indigo-100 border-4 border-indigo-400 rounded-2xl px-5 py-4 hover:bg-indigo-200 transition-colors shadow-lg"
                title="點擊跳過進入下一題"
              >
                <div className="text-base sm:text-lg text-gray-900 leading-relaxed font-medium">
                  <span className="font-black text-indigo-700">
                    {feedback.kind === 'correct' ? '✓ 答對了！' : '✗ 正解：'}
                  </span>
                  {' '}
                  {feedback.kind === 'wrong' && (
                    <span className="font-black text-indigo-900 text-xl">{current.next}</span>
                  )}
                </div>
                {current.explanation && (
                  <div className="mt-3 text-base sm:text-lg text-gray-900 leading-relaxed">
                    <span className="font-black text-indigo-700">意思：</span>
                    {current.explanation}
                  </div>
                )}
                <div className="text-sm text-indigo-600 mt-2 text-right font-bold">點此立即進下一題 →</div>
              </button>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-black text-indigo-700 mb-4">時間到！</h2>
            <div className="space-y-2 mb-6">
              <div className="text-4xl font-black text-green-600">猜對 {correct} 句</div>
              <div className="text-gray-500">錯 {wrong} 題　正確率 {accuracy}%</div>
              {correct > 0 && (
                <div className="text-sm text-indigo-600 mt-3">
                  獲得 {correct} EXP + {correct} 兌換分數
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPhase('idle')} className="btn-secondary flex-1" type="button">重玩</button>
              <button onClick={() => navigate('/')} className="btn-primary flex-1" type="button">回主頁</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
