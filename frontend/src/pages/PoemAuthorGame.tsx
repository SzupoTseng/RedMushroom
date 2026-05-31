/**
 * 是誰寫的詩（唐詩作者猜謎遊戲）
 *
 * 玩法：
 *   - 顯示一首唐詩標題 + 內文（每字附注音，ruby 排版）
 *   - 4 個作者選項按鈕 — 1 個正解 + 3 個其他常見作者
 *   - 點選後：答對亮綠、答錯亮紅；同時顯示作者簡介
 *   - 倒數計時 60 / 120 / 180 秒
 *   - saveScore via /api/quiz/game-score (source: 'poem-author')
 *
 * 題庫：frontend/public/data/poems.json   (197 首唐詩三百首 + 注音)
 *       frontend/public/data/poem-authors.json (19 位常見作者 + 簡介)
 * 來源：chinese-poetry/chinese-poetry repo (公共領域：唐詩；MIT 授權：整理者)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ZhuyinChar } from '../types';

interface Poem {
  title: string;
  author: string;
  authorBio: string;
  type: string;
  lines: ZhuyinChar[][];   // 一行詩 = ZhuyinChar[]
}

interface Author {
  name: string;
  bio: string;
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

export default function PoemAuthorGame() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [poems, setPoems] = useState<Poem[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
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
    Promise.all([
      fetch('/data/poems.json').then((r) => r.ok ? r.json() : Promise.reject(`poems HTTP ${r.status}`)),
      fetch('/data/poem-authors.json').then((r) => r.ok ? r.json() : Promise.reject(`authors HTTP ${r.status}`)),
    ])
      .then(([pp, aa]: [Poem[], Author[]]) => {
        if (!Array.isArray(pp) || pp.length === 0) throw new Error('empty poems');
        if (!Array.isArray(aa) || aa.length < 4) throw new Error('need at least 4 authors');
        setPoems(pp);
        setAuthors(aa);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const current = useMemo<Poem | null>(() => {
    if (phase !== 'playing' || order.length === 0) return null;
    return poems[order[pos % order.length]] ?? null;
  }, [phase, order, pos, poems]);

  // 每題 4 個作者選項：正解 + 3 個其他作者，隨機排列
  const choices = useMemo<{ list: Author[]; correctIdx: number } | null>(() => {
    if (!current || authors.length < 4) return null;
    const others = authors.filter((a) => a.name !== current.author);
    const distractors = shuffle(others).slice(0, 3);
    const correctAuthor = authors.find((a) => a.name === current.author)
      ?? { name: current.author, bio: current.authorBio };
    const list = shuffle([correctAuthor, ...distractors]);
    const correctIdx = list.findIndex((a) => a.name === current.author);
    return { list, correctIdx };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, current?.title]);

  const saveScore = useCallback(async (gained: number) => {
    if (!token || gained <= 0) return;
    try {
      await fetch('/api/quiz/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ exp: gained, reward: gained, source: 'poem-author' }),
      });
    } catch { /* silent */ }
  }, [token]);

  const start = useCallback(() => {
    if (poems.length === 0) return;
    setOrder(shuffle(poems.map((_, i) => i)));
    setPos(0);
    setCorrect(0);
    setWrong(0);
    setFeedback(null);
    setTimeLeft(duration);
    setPhase('playing');
    endAtRef.current = performance.now() + duration * 1000;
  }, [poems, duration]);

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
    }, isCorrect ? 2200 : 3500);
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
    <div className="min-h-screen bg-emerald-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-4" type="button">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-emerald-700">📜 是誰寫的詩</h1>
        {phase === 'playing' ? (
          <div className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? 'text-red-500' : 'text-emerald-700'}`}>
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
            <div className="text-5xl mb-3">📜</div>
            <h2 className="text-2xl font-black text-emerald-700 mb-2">是誰寫的詩</h2>
            <p className="text-gray-600 mb-2">看詩猜作者，4 選 1。每題附注音。</p>
            <p className="text-sm text-gray-500 mb-6">
              題庫：{poems.length} 首唐詩、{authors.length} 位常見作者
            </p>
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">選擇時間</div>
              <div className="flex gap-2 justify-center">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-xl font-bold ${
                      duration === d ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-emerald-200 text-emerald-700'
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
              disabled={poems.length === 0}
              className="btn-primary w-full text-lg font-black"
              type="button"
            >
              {poems.length === 0 ? '載入中…' : '開始 ▶'}
            </button>
          </div>
        )}

        {phase === 'playing' && current && choices && (
          <div className="w-full max-w-xl flex flex-col items-center">
            <div className="flex gap-4 mb-3 text-sm">
              <span className="text-green-600 font-bold">✓ {correct}</span>
              <span className="text-red-500 font-bold">✗ {wrong}</span>
              <span className="text-gray-500">正確率 {accuracy}%</span>
            </div>

            {/* 詩本體 — 標題 + 內文（每字 ruby 注音） */}
            <div
              className={`bg-white rounded-2xl border-4 px-5 py-6 mb-4 shadow-lg w-full transition-colors ${
                feedback?.kind === 'correct'
                  ? 'border-green-400'
                  : feedback?.kind === 'wrong'
                    ? 'border-red-400'
                    : 'border-emerald-200'
              }`}
            >
              {/* 詩題 — 答前隱藏作者，標題本身就可能透露線索故照常顯示 */}
              <div className="text-center text-2xl font-black text-emerald-800 mb-2 font-serif">
                〈{current.title}〉
              </div>
              {/* 詩體 */}
              <div className="flex flex-col items-center gap-4">
                {current.lines.map((line, li) => (
                  <div key={li} className="flex flex-wrap justify-center gap-x-1">
                    {line.map((cp, ci) => (
                      <div key={ci} className="flex flex-col items-center min-w-[1.6em]">
                        <span className="text-emerald-600 text-[0.65rem] sm:text-xs font-bold leading-none h-3 sm:h-4 bpmf-font">
                          {cp.pinyin || '　'}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-gray-800 font-serif leading-tight">
                          {cp.char}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {feedback && (
                <div className="text-center mt-4 text-base sm:text-lg">
                  <span className="text-gray-600">作者：</span>
                  <span className="font-black text-emerald-700 text-xl sm:text-2xl">{current.author}</span>
                </div>
              )}
            </div>

            {/* 4 個作者選項按鈕 */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {choices.list.map((a, i) => {
                const isCorrect = feedback && i === choices.correctIdx;
                const isWrongPick = feedback?.kind === 'wrong' && feedback.pickedIdx === i;
                return (
                  <button
                    key={a.name + i}
                    onClick={() => onPick(i)}
                    disabled={!!feedback}
                    type="button"
                    className={`rounded-2xl py-3 border-4 transition-colors ${
                      isCorrect
                        ? 'bg-green-500 text-white border-green-600'
                        : isWrongPick
                          ? 'bg-red-100 text-red-400 border-red-200'
                          : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50 active:scale-95'
                    }`}
                  >
                    <span className="text-2xl font-black font-serif">{a.name}</span>
                  </button>
                );
              })}
            </div>

            {/* 答完顯示作者簡介 */}
            {feedback && choices.list[choices.correctIdx] && (
              <button
                type="button"
                onClick={skipFeedback}
                className="mt-4 w-full text-left bg-emerald-100 border-4 border-emerald-400 rounded-2xl px-5 py-4 hover:bg-emerald-200 transition-colors shadow-lg"
                title="點擊跳過進入下一題"
              >
                <div className="text-base sm:text-lg text-gray-900 leading-relaxed font-medium">
                  <span className="font-black text-emerald-700 text-lg sm:text-xl">
                    {choices.list[choices.correctIdx].name}：
                  </span>
                  {choices.list[choices.correctIdx].bio || '（簡介待補）'}
                </div>
                <div className="text-sm text-emerald-600 mt-3 text-right font-bold">點此立即進下一題 →</div>
              </button>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-2xl font-black text-emerald-700 mb-4">時間到！</h2>
            <div className="space-y-2 mb-6">
              <div className="text-4xl font-black text-green-600">猜對 {correct} 首</div>
              <div className="text-gray-500">錯 {wrong} 題　正確率 {accuracy}%</div>
              {correct > 0 && (
                <div className="text-sm text-emerald-600 mt-3">
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
