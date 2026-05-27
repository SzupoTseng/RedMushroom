/**
 * 英文快打（看單字打字練習）
 *
 * 玩法（參考通用單字打字練習版面，無複製任何第三方程式碼／插圖）：
 *   - 正中央以「表格卡片」呈現一個英文單字 + 詞性 + 中文說明（含注音，聲調正確）
 *   - 玩家在輸入框打出該英文單字 → 正確即換下一個單字
 *   - 用讀秒倒數計時（60／120／180 秒），時間到結算
 *   - 無關卡、無血量、無蘑菇恐龍；單純速打練習
 *
 * 詞庫：frontend/public/data/english-vocab.json
 *   [{ en, pos, zh, zhuyin: ZhuyinChar[] }]
 *   來源：使用者提供之官方「國中 2000 單字」PDF 萃取（word→詞性／中文），
 *        中文說明經本機字典最長字首匹配標注正確聲調注音。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ZhuyinText from '../components/common/ZhuyinText';
import type { ZhuyinChar } from '../types';

interface VocabEntry {
  en: string;
  pos: string;
  zh: string;
  zhuyin: ZhuyinChar[];
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

export default function EnglishTypingGame() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [vocabError, setVocabError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [duration, setDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);          // index into order
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [wrongFlash, setWrongFlash] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const endAtRef = useRef<number>(0);

  // ── Load vocab once ───────────────────────────────────────────
  useEffect(() => {
    fetch('/data/english-vocab.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((arr: VocabEntry[]) => {
        if (!Array.isArray(arr) || arr.length === 0) throw new Error('empty vocab');
        setVocab(arr);
      })
      .catch((e) => setVocabError(e instanceof Error ? e.message : '載入失敗'));
  }, []);

  const current = useMemo<VocabEntry | null>(() => {
    if (phase !== 'playing' || order.length === 0) return null;
    return vocab[order[pos % order.length]] ?? null;
  }, [phase, order, pos, vocab]);

  // ── Score persist on finish ───────────────────────────────────
  const saveScore = useCallback(async (gained: number) => {
    if (!token || gained <= 0) return;
    try {
      await fetch('/api/quiz/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          exp: gained,
          reward: Math.max(1, Math.floor(gained / 2)),
          source: 'english-typing',
        }),
      });
    } catch { /* silent — game UX shouldn't block on network */ }
  }, [token]);

  const start = useCallback(() => {
    if (vocab.length === 0) return;
    setOrder(shuffle(vocab.map((_, i) => i)));
    setPos(0);
    setInput('');
    setCorrect(0);
    setSkipped(0);
    setTimeLeft(duration);
    setPhase('playing');
    endAtRef.current = performance.now() + duration * 1000;
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [vocab, duration]);

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

  // persist EXP once when a run ends
  useEffect(() => {
    if (phase === 'done' && correct > 0) void saveScore(correct);
  }, [phase, correct, saveScore]);

  const advance = useCallback(() => {
    setPos((p) => p + 1);
    setInput('');
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    if (!current) return;
    if (v.trim().toLowerCase() === current.en.toLowerCase()) {
      setCorrect((c) => c + 1);
      advance();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter on a non-matching answer = wrong feedback (no advance);
    // Tab / Shift+Enter could skip — keep simple, no skip via key.
    if (e.key === 'Enter' && current) {
      if (input.trim().toLowerCase() !== current.en.toLowerCase()) {
        setWrongFlash(true);
        window.setTimeout(() => setWrongFlash(false), 250);
      }
    }
  };

  const skip = () => {
    setSkipped((s) => s + 1);
    advance();
    inputRef.current?.focus();
  };

  const wpm = useMemo(() => {
    const mins = duration / 60;
    return mins > 0 ? Math.round(correct / mins) : 0;
  }, [correct, duration]);

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-4" type="button">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-sky-700">⌨️ 英文快打</h1>
        {phase === 'playing' ? (
          <div className={`text-2xl font-black tabular-nums ${timeLeft <= 10 ? 'text-red-500' : 'text-sky-700'}`}>
            {timeLeft}s
          </div>
        ) : (
          <div className="w-16" />
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {vocabError && (
          <p className="text-red-500">單字載入失敗：{vocabError}</p>
        )}

        {/* ── 開始畫面 ── */}
        {phase === 'idle' && !vocabError && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">⌨️</div>
            <h2 className="text-2xl font-black text-gray-800 mb-1">英文快打</h2>
            <p className="text-gray-500 mb-5">
              看正中央的英文單字與中文說明，打出該單字即可換下一題。<br />
              共 <span className="font-bold text-sky-700">{vocab.length}</span> 個常用單字。
            </p>
            <p className="text-sm text-gray-500 mb-2">選擇時間</p>
            <div className="flex justify-center gap-2 mb-6">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`px-5 py-2 rounded-xl font-bold border-2 transition-all ${
                    duration === d
                      ? 'border-sky-400 bg-sky-100 text-sky-700'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {d} 秒
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={start}
              disabled={vocab.length === 0}
              className="btn-primary text-lg px-8 py-3 disabled:opacity-50"
            >
              {vocab.length === 0 ? '單字載入中…' : '開始'}
            </button>
          </div>
        )}

        {/* ── 遊玩畫面：正中央表格卡片 ── */}
        {phase === 'playing' && current && (
          <div className="w-full max-w-lg flex flex-col items-center">
            <div className="flex gap-8 mb-6 text-center">
              <div>
                <div className="text-3xl font-black text-emerald-600 tabular-nums">{correct}</div>
                <div className="text-xs text-gray-400">答對</div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-400 tabular-nums">{skipped}</div>
                <div className="text-xs text-gray-400">跳過</div>
              </div>
            </div>

            {/* 表格式卡片（參考單字書版面） */}
            <div
              className={`w-full rounded-2xl border-4 bg-white overflow-hidden shadow-lg transition-colors ${
                wrongFlash ? 'border-red-400' : 'border-sky-300'
              }`}
            >
              <div className="flex items-baseline justify-center gap-3 px-6 py-7 border-b-2 border-sky-100">
                <span className="text-5xl font-black text-gray-800 tracking-wide">{current.en}</span>
                {current.pos && (
                  <span className="text-lg italic text-sky-500 font-semibold">{current.pos}</span>
                )}
              </div>
              <div className="px-6 py-6 text-center">
                <ZhuyinText content={current.zhuyin} className="text-3xl text-gray-700" />
              </div>
            </div>

            <input
              ref={inputRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              placeholder="在這裡打出上面的英文單字…"
              className="mt-6 w-full text-center text-2xl px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-sky-400 outline-none"
            />
            <button type="button" onClick={skip} className="btn-secondary mt-3 text-sm py-2 px-5">
              跳過這題 →
            </button>
          </div>
        )}

        {/* ── 結算畫面 ── */}
        {phase === 'done' && (
          <div className="card max-w-md w-full text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-black text-gray-800 mb-4">時間到！</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-emerald-50 rounded-xl py-4">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">{correct}</div>
                <div className="text-xs text-gray-500 mt-1">答對</div>
              </div>
              <div className="bg-sky-50 rounded-xl py-4">
                <div className="text-3xl font-black text-sky-600 tabular-nums">{wpm}</div>
                <div className="text-xs text-gray-500 mt-1">每分鐘字數</div>
              </div>
              <div className="bg-gray-50 rounded-xl py-4">
                <div className="text-3xl font-black text-gray-400 tabular-nums">{skipped}</div>
                <div className="text-xs text-gray-500 mt-1">跳過</div>
              </div>
            </div>
            {correct > 0 && (
              <p className="text-sm text-amber-600 mb-4">獲得 {correct} EXP！</p>
            )}
            <div className="flex justify-center gap-3">
              <button type="button" onClick={start} className="btn-primary px-6 py-3">
                再玩一次
              </button>
              <button type="button" onClick={() => setPhase('idle')} className="btn-secondary px-6 py-3">
                改時間
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
