/**
 * 語詞快打（PvZ 風格的詞語打字遊戲）
 *
 * 玩法：
 *   - 左側 🍄（玩家），右側 🦖（敵人，慢慢往左推進）
 *   - 詞語從右側飄出來往左飛
 *   - 玩家在輸入框打出該詞 → 🍄 發射種子 → 種子打到詞 → 詞消失 + 🦖 後退
 *   - 詞飛到 🍄 → 玩家失血一格
 *   - 100 關，每關時限 2 分鐘
 *   - Lv N 在 2 分鐘內要清除 N×2 個詞，且不能被 🦖 追到
 *   - 🦖 速度隨關卡微微遞增（不會太快）
 *
 * IME 相容：使用 compositionupdate + compositionend，注音輸入法 ON 也能玩。
 *
 * 詞庫：1000 個常用 2 字詞，從本機 dictionary.json 經本機腳本 (build_word_vocab.py)
 * 過濾產出 (`/data/common-words.json`)。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BopomofoColumn from '../components/common/BopomofoColumn';

interface VocabEntry { word: string; zhuyin: string; }

interface FloatingWord {
  id: number;
  word: string;
  zhuyin: string;
  x: number;         // 0–100 % from left
  y: number;         // 0–100 % from top in play area
  speed: number;     // % per second leftward
}

interface Seed {
  id: number;
  fromX: number;
  toX: number;
  startedAt: number; // performance.now()
  duration: number;  // ms
  word: string;      // for display debug
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  startedAt: number;
}

const LEVEL_DURATION_MS = 2 * 60 * 1000;
// 「畫面同時保持 N 個詞」的目標 — Lv N = 2N，但上限 8（再多畫面塞不下）
const ACTIVE_WORDS_TARGET = (lv: number) => Math.min(8, lv * 2);
// 過關需要清除的總詞數 — Lv N = 2N，封頂 40
const WORDS_TO_CLEAR = (lv: number) => Math.min(40, lv * 2);
// 🦖 速度：明顯逼近；Lv1=0.8%/s（100秒走完），Lv100≈4.7%/s（17秒）
const DINO_SPEED = (lv: number) => 0.8 + (lv - 1) * 0.04;
// 詞語水平速度（往左）：略高於 🦖，讓詞會比恐龍先到玩家
const WORD_SPEED = (lv: number) => 1.0 + (lv - 1) * 0.04;
// 最短 spawn 間隔（避免一次冒太多）
const MIN_SPAWN_INTERVAL_MS = 500;

export default function WordTypingGame() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [level, setLevel] = useState(1);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [vocabError, setVocabError] = useState<string | null>(null);

  // Per-level state
  const [hp, setHp] = useState(3);
  const [score, setScore] = useState(0);          // EXP earned this run
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [needed, setNeeded] = useState(WORDS_TO_CLEAR(1));
  const [timeLeftMs, setTimeLeftMs] = useState(LEVEL_DURATION_MS);
  const [dinoX, setDinoX] = useState(88);          // % from left
  const [words, setWords] = useState<FloatingWord[]>([]);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [comboFlash, setComboFlash] = useState<string>('');
  const [phase, setPhase] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [imeBuffer, setImeBuffer] = useState('');
  const [inputText, setInputText] = useState('');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const idGenRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  // Track current words in a ref so tryMatch reads the latest state without
  // suffering from setState's async-update race condition.
  const wordsRef = useRef<FloatingWord[]>([]);
  useEffect(() => { wordsRef.current = words; }, [words]);

  // ── Load vocab once ───────────────────────────────────────────
  useEffect(() => {
    fetch('/data/common-words.json')
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

  // ── Score persist (per word and on level pass) ────────────────
  // 後端 /api/quiz/game-score 期待 { exp, reward, source }，不是 { score, game_type }
  // 這裡：每打中一個詞給 exp = gained（分數）+ reward = gained / 2（兌換分數）
  const saveScore = useCallback(async (gained: number, source: string) => {
    if (!token || gained <= 0) return;
    try {
      await fetch('/api/quiz/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          exp: gained,
          reward: Math.max(1, Math.floor(gained / 2)),
          source,
        }),
      });
    } catch { /* silent — game UX shouldn't block on network */ }
  }, [token]);

  // ── Level setup ────────────────────────────────────────────────
  const startLevel = useCallback((lv: number) => {
    const newNeeded = WORDS_TO_CLEAR(lv);
    const newActiveTarget = ACTIVE_WORDS_TARGET(lv);
    setLevel(lv);
    setHp(3);
    setCleared(0);
    setNeeded(newNeeded);
    setTimeLeftMs(LEVEL_DURATION_MS);
    setDinoX(88);
    setSeeds([]);
    setFloatingScores([]);
    setCombo(0);
    setMaxCombo(0);
    setImeBuffer('');
    setComboFlash('');
    setInputText('');
    setPhase('playing');
    startedAtRef.current = performance.now();
    // Pre-spawn 滿屏 (newActiveTarget) — Lv 1 = 2, Lv 3 = 6, Lv 5+ = 8
    const burst: FloatingWord[] = [];
    for (let i = 0; i < newActiveTarget; i++) {
      if (vocab.length === 0) break;
      idGenRef.current += 1;
      const pick = vocab[Math.floor(Math.random() * vocab.length)];
      // 詞分散在右側區域，y 軸間隔避免重疊
      burst.push({
        id: idGenRef.current,
        word: pick.word,
        zhuyin: pick.zhuyin,
        x: 70 + Math.random() * 18,
        y: 8 + (i / Math.max(1, newActiveTarget - 1)) * 60 + Math.random() * 4,
        speed: WORD_SPEED(lv),
      });
    }
    setWords(burst);
    lastSpawnRef.current = performance.now();
    lastTickRef.current = performance.now();
    // 等 React 渲染完 (input disabled → enabled)，再 focus
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [vocab]);

  // ── Main game loop ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (now: number) => {
      const dt = Math.min(100, now - lastTickRef.current); // ms
      lastTickRef.current = now;
      const dtSec = dt / 1000;

      // 1. Time
      const elapsed = now - startedAtRef.current;
      const remain = Math.max(0, LEVEL_DURATION_MS - elapsed);
      setTimeLeftMs(remain);

      // 2. Spawn — 維持畫面上有 ACTIVE_WORDS_TARGET(level) 個詞。
      //    一被消滅就立刻補一個（受最小間隔限制以免一次冒太多）。
      const activeTarget = ACTIVE_WORDS_TARGET(level);
      const currentActive = wordsRef.current.length;
      const sinceLastSpawn = now - lastSpawnRef.current;
      if (
        currentActive < activeTarget &&
        sinceLastSpawn >= MIN_SPAWN_INTERVAL_MS &&
        vocab.length > 0
      ) {
        lastSpawnRef.current = now;
        idGenRef.current += 1;
        const pick = vocab[Math.floor(Math.random() * vocab.length)];
        // 避免新詞和現有詞 y 軸太近（找空的水平帶）
        const usedYs = wordsRef.current.map((w) => w.y);
        let y = 10 + Math.random() * 60;
        for (let tries = 0; tries < 6; tries++) {
          if (usedYs.every((uy) => Math.abs(uy - y) > 10)) break;
          y = 10 + Math.random() * 60;
        }
        const newWord: FloatingWord = {
          id: idGenRef.current,
          word: pick.word,
          zhuyin: pick.zhuyin,
          x: 75 + Math.random() * 12,
          y,
          speed: WORD_SPEED(level),
        };
        setWords((w) => [...w, newWord]);
      }

      // 3. Move words leftward; if they reach 🍄 → lose HP
      setWords((arr) => {
        const survivors: FloatingWord[] = [];
        let hpHits = 0;
        for (const w of arr) {
          const nx = w.x - w.speed * dtSec;
          if (nx <= 8) { hpHits += 1; continue; } // hit mushroom
          survivors.push({ ...w, x: nx });
        }
        if (hpHits > 0) {
          setHp((h) => Math.max(0, h - hpHits));
          setCombo(0);
        }
        return survivors;
      });

      // 4. Dino creeps left
      setDinoX((x) => Math.max(8, x - DINO_SPEED(level) * dtSec));

      // 5. Clean up expired seeds & floating scores
      setSeeds((arr) => arr.filter((s) => now - s.startedAt < s.duration));
      setFloatingScores((arr) => arr.filter((f) => now - f.startedAt < 900));

      // 6. Lose conditions
      if (remain <= 0) {
        setPhase('lost');
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, needed, vocab, level]);

  // ── Auto-focus input whenever a level starts ──────────────────
  useEffect(() => {
    if (phase === 'playing') {
      // Double rAF ensures the input has been re-rendered as enabled before focus
      requestAnimationFrame(() => {
        requestAnimationFrame(() => inputRef.current?.focus());
      });
    }
  }, [phase]);

  // ── Keyboard shortcuts for between-level overlays ─────────────
  // Enter = primary action (start / next level / retry); Escape = home.
  // 在 'playing' 狀態時不攔截 (那邊 input 自己處理 Enter)。
  useEffect(() => {
    if (phase === 'playing') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'idle') startLevel(level);
        else if (phase === 'won') startLevel(level + 1);
        else if (phase === 'lost') startLevel(level);
      } else if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, level, startLevel, navigate]);

  // ── Watch lose conditions ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    if (hp <= 0 || dinoX <= 10) {
      setPhase('lost');
    }
  }, [phase, hp, dinoX]);

  // ── Watch win condition ───────────────────────────────────────
  useEffect(() => {
    if (phase === 'playing' && cleared >= needed) {
      setPhase('won');
      // Bonus EXP for clearing the level
      const bonus = 10 + level * 2;
      setScore((s) => s + bonus);
      saveScore(bonus, `word-typing-lv${level}`);
    }
  }, [phase, cleared, needed, level, saveScore]);

  // ── Try matching the typed word ────────────────────────────────
  // Reads wordsRef.current synchronously to avoid setState's async race.
  // Returns true if matched (caller should clear the input).
  const tryMatch = useCallback((typed: string): boolean => {
    if (phase !== 'playing') return false;
    const candidate = typed.trim();
    if (!candidate) return false;

    const idx = wordsRef.current.findIndex((w) => w.word === candidate);
    if (idx < 0) return false;
    const hit = wordsRef.current[idx];

    // Remove the hit word
    setWords((arr) => arr.filter((w) => w.id !== hit.id));

    // Fire seed
    idGenRef.current += 1;
    const seed: Seed = {
      id: idGenRef.current,
      fromX: 8,
      toX: hit.x,
      startedAt: performance.now(),
      duration: 350,
      word: candidate,
    };
    setSeeds((s) => [...s, seed]);

    // Knock dino back
    const pushback = 3 + candidate.length;
    setDinoX((x) => Math.min(95, x + pushback));

    // Score
    const gained = 5 + candidate.length * 2;
    setScore((s) => s + gained);
    saveScore(gained, `word-typing-lv${level}`);
    setCombo((c) => {
      const nc = c + 1;
      setMaxCombo((m) => Math.max(m, nc));
      // 連擊 ≥ 3 才展示連擊 flash
      if (nc >= 3) {
        setComboFlash(`COMBO ×${nc} 🔥`);
        setTimeout(() => setComboFlash(''), 800);
      }
      return nc;
    });
    setCleared((c) => c + 1);

    // 浮動 +EXP 分數氣泡
    idGenRef.current += 1;
    const popup: FloatingScore = {
      id: idGenRef.current,
      x: hit.x,
      y: hit.y,
      text: `+${gained}`,
      startedAt: performance.now(),
    };
    setFloatingScores((arr) => [...arr, popup]);

    return true;
  }, [phase, level, saveScore]);

  // Clear input fully (state + DOM value + IME hint)
  const clearInput = useCallback(() => {
    setInputText('');
    setImeBuffer('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  // 錯誤反饋（短暫紅色 shake）
  const [wrongFlash, setWrongFlash] = useState(false);

  // 推導：目前輸入是否是某個畫面上詞的前綴（部分比對）
  const partialMatchWord = useMemo(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return null;
    return words.find((w) => w.word.startsWith(trimmed)) ?? null;
  }, [inputText, words]);

  // 危險區：恐龍很靠近時，背景紅色脈動
  const inDanger = phase === 'playing' && dinoX < 28;

  // ── Input handlers (IME-aware, controlled) ────────────────────
  // 規則：只有 Enter 才判定。答對 → 發射 + 清除；答錯 → 紅色閃，輸入保留。
  const onCompositionUpdate = (e: React.CompositionEvent<HTMLInputElement>) => {
    setImeBuffer(e.data ?? '');
  };
  const onCompositionEnd = () => {
    setImeBuffer('');
    // 不在組字結束時自動判定——等使用者按 Enter
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    // 不在輸入變化時自動判定
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (inputRef.current?.value ?? '').trim();
      if (!val) return;
      if (tryMatch(val)) {
        clearInput();
      } else {
        // 答錯：紅色閃 + 不清除（讓玩家修改）
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 300);
      }
    } else if (e.key === 'Escape') {
      navigate('/');
    }
  };

  const timeLeftSec = Math.ceil(timeLeftMs / 1000);
  const mm = Math.floor(timeLeftSec / 60);
  const ss = timeLeftSec % 60;

  // ── Render ────────────────────────────────────────────────────
  if (vocabError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">詞庫載入失敗：{vocabError}</p>
        <button onClick={() => navigate('/')} className="btn-secondary mt-4">← 返回</button>
      </div>
    );
  }

  if (vocab.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-pulse">🍄</div>
          <p className="text-gray-600">載入詞庫中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-amber-50 flex flex-col">
      {/* HUD */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary text-sm py-2 px-4"
          type="button"
        >
          ← 離開
        </button>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-bold text-emerald-700">Lv {level}</span>
          <span>⏱ {mm}:{ss.toString().padStart(2, '0')}</span>
          <span>{'❤️'.repeat(hp)}{'🖤'.repeat(3 - hp)}</span>
          <span>進度 {cleared}/{needed}</span>
          <span className="text-amber-700">COMBO ×{combo}</span>
          <span className="text-emerald-700">EXP {score}</span>
        </div>
        <div className="w-20" />
      </header>

      {/* Play area — 危險區紅色脈動 */}
      <div
        className={
          `relative flex-1 overflow-hidden border-y transition-colors duration-300 ` +
          (inDanger
            ? 'border-red-400 bg-red-100/60 danger-pulse'
            : 'border-emerald-200 bg-emerald-100/50')
        }
      >
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-emerald-200" />

        {/* Mushroom (left) */}
        <div
          className="absolute text-5xl"
          style={{ left: '2%', bottom: '0.5rem', transform: 'translateY(0)' }}
          aria-hidden
        >
          🍄
        </div>

        {/* Dino (right) — runs in place with bobbing; actual leftward
            movement comes from dinoX state (updated 60fps in the loop).
            越靠近玩家，視覺上越大（透視縮放），製造「逼近感」。
            Scale 從 dinoX=88（遠）的 1.0 → dinoX=8（近）的 1.45。 */}
        <div
          className="absolute text-5xl dino-run"
          style={{
            left: `${dinoX}%`,
            bottom: '0.5rem',
            fontSize: `${3 + (88 - dinoX) * 0.025}rem`,
            zIndex: Math.round(100 - dinoX),
          }}
          aria-hidden
        >
          🦖
        </div>

        {/* Floating words — 用 BopomofoColumn 取代純文字注音；
            正在輸入時，符合前綴的詞會高亮、其他變淡。 */}
        {words.map((w) => {
          const isMatched = partialMatchWord?.id === w.id;
          const isDim = !!partialMatchWord && !isMatched;
          return (
            <div
              key={w.id}
              className={
                `absolute rounded-xl px-3 py-1 shadow-md text-center transition-all duration-200 ` +
                (isMatched
                  ? 'bg-amber-100 border-2 border-amber-500 scale-110 ring-2 ring-amber-300'
                  : isDim
                    ? 'bg-white/60 border-2 border-gray-300 opacity-60'
                    : 'bg-white border-2 border-amber-400')
              }
              style={{
                left: `${w.x}%`,
                top: `${w.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex items-center gap-1 leading-none">
                <span className="font-bold text-2xl bpmf-font">{w.word}</span>
                <span className="text-base">
                  {w.zhuyin.split(/\s+/).filter(Boolean).map((syl, j) => (
                    <BopomofoColumn key={j} reading={syl} />
                  ))}
                </span>
              </div>
            </div>
          );
        })}

        {/* Floating "+EXP" popups — 從 hit 位置往上飄 */}
        {floatingScores.map((f) => {
          const t = Math.min(1, (performance.now() - f.startedAt) / 900);
          return (
            <div
              key={f.id}
              className="absolute font-bold text-amber-700 text-xl pointer-events-none"
              style={{
                left: `${f.x}%`,
                top: `${f.y - t * 20}%`,
                opacity: 1 - t,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {f.text}
            </div>
          );
        })}

        {/* COMBO flash — 中央彈出 */}
        {comboFlash && (
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 text-3xl font-black
                       text-amber-600 drop-shadow-md pointer-events-none combo-flash"
          >
            {comboFlash}
          </div>
        )}

        {/* Seeds (animated CSS — left position interpolated via inline style) */}
        {seeds.map((s) => {
          const elapsed = performance.now() - s.startedAt;
          const t = Math.min(1, elapsed / s.duration);
          const x = s.fromX + (s.toX - s.fromX) * t;
          return (
            <div
              key={s.id}
              className="absolute text-2xl"
              style={{ left: `${x}%`, bottom: '3rem' }}
              aria-hidden
            >
              ●
            </div>
          );
        })}

        {/* Game-over overlays */}
        {phase === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-md">
              <div className="text-5xl mb-2">🍄 vs 🦖</div>
              <h2 className="text-2xl font-bold text-emerald-800 mb-2">語詞快打</h2>
              <p className="text-gray-600 mb-1">輸入詞語 → 🍄 發射種子 → 擊退恐龍</p>
              <p className="text-gray-500 text-sm mb-4">
                Lv {level}：清除 {needed} 個詞，限時 2 分鐘
              </p>
              <button onClick={() => startLevel(level)} className="btn-primary" type="button">
                開始 ▶
              </button>
              <p className="text-xs text-gray-400 mt-3">⏎ Enter 開始　Esc 回首頁</p>
            </div>
          </div>
        )}

        {phase === 'won' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-md">
              <div className="text-5xl mb-2">🎉</div>
              <h2 className="text-2xl font-bold text-emerald-700 mb-2">Lv {level} 通關！</h2>
              <p className="text-gray-600 mb-1">EXP +{score}　最佳連擊 ×{maxCombo}</p>
              <div className="flex gap-3 mt-4 justify-center">
                <button onClick={() => startLevel(level + 1)} className="btn-primary" type="button">
                  下一關 →
                </button>
                <button onClick={() => navigate('/')} className="btn-secondary" type="button">
                  回首頁
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">⏎ Enter 下一關　Esc 回首頁</p>
            </div>
          </div>
        )}

        {phase === 'lost' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-md">
              <div className="text-5xl mb-2">{hp <= 0 ? '💀' : dinoX <= 10 ? '🦖' : '⌛'}</div>
              <h2 className="text-2xl font-bold text-red-700 mb-2">
                {hp <= 0 ? '蘑菇被詞語撞到了…' : dinoX <= 10 ? '恐龍追上來了！' : '時間到！'}
              </h2>
              <p className="text-gray-600">
                Lv {level}　清除 {cleared}/{needed}　EXP +{score}
              </p>
              <div className="flex gap-3 mt-4 justify-center">
                <button onClick={() => startLevel(level)} className="btn-primary" type="button">
                  再試一次
                </button>
                <button onClick={() => navigate('/')} className="btn-secondary" type="button">
                  回首頁
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">⏎ Enter 再試一次　Esc 回首頁</p>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <footer className="bg-white border-t border-gray-200 p-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-sm text-gray-500 shrink-0">輸入詞語：</span>
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            disabled={phase !== 'playing'}
            placeholder={phase === 'playing' ? '打詞語後按 Enter →' : '按「開始」開玩'}
            onCompositionUpdate={onCompositionUpdate}
            onCompositionEnd={onCompositionEnd}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            autoFocus
            className={
              `flex-1 px-4 py-2 border-2 rounded-xl text-lg outline-none bpmf-font ` +
              `disabled:bg-gray-100 ` +
              (wrongFlash
                ? 'border-red-500 bg-red-50 input-shake'
                : 'border-amber-300 focus:border-amber-500')
            }
          />
          <span className="text-sm text-amber-700 shrink-0">⏎ Enter 送出</span>
          {imeBuffer && (
            <span className="text-sm text-amber-700">正在打：{imeBuffer}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          詞庫：1000 個常用 2 字詞，從本機字典過濾產生（無外部依賴）
        </p>
      </footer>
    </div>
  );
}
