import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Bopomofo mapping: e.code → zhuyin symbol ────────────────────────────────
// Using e.code (physical key) rather than e.key so the mapping is
// independent of the OS's current input method (IME on/off).
const CODE_MAP: Record<string, string> = {
  // Initials
  'Digit1': 'ㄅ', 'Digit2': 'ㄆ', 'Digit3': 'ㄇ', 'Digit4': 'ㄈ',
  'KeyQ': 'ㄉ', 'KeyW': 'ㄊ', 'KeyE': 'ㄋ', 'KeyR': 'ㄌ',
  'KeyT': 'ㄍ', 'KeyY': 'ㄎ', 'KeyU': 'ㄏ',
  'KeyI': 'ㄐ', 'KeyO': 'ㄑ', 'KeyP': 'ㄒ',
  'KeyA': 'ㄓ', 'KeyS': 'ㄔ', 'KeyD': 'ㄕ', 'KeyF': 'ㄖ',
  'KeyG': 'ㄗ', 'KeyH': 'ㄘ', 'KeyJ': 'ㄙ',
  // Medials / finals
  'KeyK': 'ㄧ', 'KeyL': 'ㄨ', 'Semicolon': 'ㄩ',
  'KeyZ': 'ㄚ', 'KeyX': 'ㄛ', 'KeyC': 'ㄜ', 'KeyV': 'ㄝ',
  'KeyB': 'ㄞ', 'KeyN': 'ㄟ', 'KeyM': 'ㄠ', 'Comma': 'ㄡ',
  'Period': 'ㄢ', 'Slash': 'ㄣ', 'Minus': 'ㄤ', 'Equal': 'ㄥ', 'Digit5': 'ㄦ',
  // Tones (2nd–5th; 1st tone = no mark needed)
  'Digit6': 'ˊ', 'Digit7': 'ˇ', 'Digit8': 'ˋ', 'Digit9': '˙',
};

// ── Fallback word bank (used before API words load) ───────────────────────────
const FALLBACK_WORDS = [
  { char: '好', py: 'ㄏㄠˇ' }, { char: '大', py: 'ㄉㄚˋ' },
  { char: '小', py: 'ㄒㄧㄠˇ' }, { char: '人', py: 'ㄖㄣˊ' },
  { char: '山', py: 'ㄕㄢ' }, { char: '水', py: 'ㄕㄨㄟˇ' },
  { char: '天', py: 'ㄊㄧㄢ' }, { char: '地', py: 'ㄉㄧˋ' },
  { char: '火', py: 'ㄏㄨㄛˇ' }, { char: '木', py: 'ㄇㄨˋ' },
  { char: '書', py: 'ㄕㄨ' }, { char: '車', py: 'ㄔㄜ' },
  { char: '花', py: 'ㄏㄨㄚ' }, { char: '草', py: 'ㄘㄠˇ' },
  { char: '紅', py: 'ㄏㄨㄥˊ' }, { char: '白', py: 'ㄅㄞˊ' },
  { char: '上', py: 'ㄕㄤˋ' }, { char: '下', py: 'ㄒㄧㄚˋ' },
  { char: '多', py: 'ㄉㄨㄛ' }, { char: '少', py: 'ㄕㄠˇ' },
  { char: '快', py: 'ㄎㄨㄞˋ' }, { char: '慢', py: 'ㄇㄢˋ' },
  { char: '學', py: 'ㄒㄩㄝˊ' }, { char: '說', py: 'ㄕㄨㄛ' },
  { char: '走', py: 'ㄗㄡˇ' }, { char: '跑', py: 'ㄆㄠˇ' },
  { char: '愛', py: 'ㄞˋ' }, { char: '家', py: 'ㄐㄧㄚ' },
];

interface FallingChar {
  id: number; char: string; py: string;
  x: number; y: number; speed: number;
  rotation: number; rotSp: number;
  exploding: boolean; explodeAt: number;
}

const MAX_LIVES = 3;
const SPAWN_MS = 2000;

export default function TypingGame() {
  const navigate = useNavigate();
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<{
    chars: FallingChar[]; idSeq: number; lastSpawn: number;
    running: boolean; frame: number;
  }>({ chars: [], idSeq: 0, lastSpawn: 0, running: false, frame: 0 });

  const [words, setWords] = useState<Array<{ char: string; py: string }>>(FALLBACK_WORDS);
  const wordsRef = useRef(FALLBACK_WORDS);

  const [renderKey, setRenderKey] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [shotY, setShotY] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [comboFlash, setComboFlash] = useState('');

  const livesRef = useRef(MAX_LIVES);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const inputRef = useRef('');  // mirror for use inside closures

  // Fetch vocabulary from backend (DB-driven curriculum words)
  useEffect(() => {
    const token = localStorage.getItem('rm_token');
    if (!token) return;
    fetch('/api/quiz/vocab', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { vocab: Array<{ char: string; py: string }> } | null) => {
        if (d?.vocab && d.vocab.length > 10) {
          setWords(d.vocab);
          wordsRef.current = d.vocab;
        }
      })
      .catch(() => { /* use fallback */ });
  }, []);

  // ── shoot ──────────────────────────────────────────────────────────────────
  const shoot = useCallback((c: FallingChar) => {
    if (c.exploding) return;
    c.exploding = true;
    c.explodeAt = Date.now();
    comboRef.current += 1;
    const pts = 10 + Math.max(0, (comboRef.current - 1) * 5);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setShotY(c.y);
    setTimeout(() => setShotY(null), 350);
    if (comboRef.current >= 3) {
      setComboFlash(`${comboRef.current}連擊！ +${pts}`);
      setTimeout(() => setComboFlash(''), 800);
    }
    setRenderKey(k => k + 1);
  }, []);

  // ── check match after input changes ───────────────────────────────────────
  const checkMatch = useCallback((typed: string) => {
    if (!typed) return;
    const s = stateRef.current;
    const exact = s.chars.find(c => !c.exploding && c.py === typed);
    if (exact) {
      shoot(exact);
      inputRef.current = '';
      setInput('');
      return;
    }
    // No prefix match at all → clear + reset combo
    const anyPrefix = s.chars.some(c => !c.exploding && c.py.startsWith(typed));
    if (!anyPrefix) {
      inputRef.current = '';
      setInput('');
      comboRef.current = 0;
    }
  }, [shoot]);

  // ── keyboard capture via hidden input ────────────────────────────────────
  useEffect(() => {
    if (!started || gameOver) return;

    // Keep hidden input focused so OS doesn't steal keystrokes
    const refocus = () => { hiddenInputRef.current?.focus(); };
    document.addEventListener('click', refocus);
    refocus();

    const onKeyDown = (e: KeyboardEvent) => {
      // Let browser shortcuts through
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Ignore IME composition events
      if (e.isComposing || e.key === 'Process') return;

      e.preventDefault();

      if (e.key === 'Escape') { navigate('/'); return; }
      if (e.key === 'Backspace') {
        const next = inputRef.current.slice(0, -1);
        inputRef.current = next;
        setInput(next);
        return;
      }

      const zhu = CODE_MAP[e.code];
      if (!zhu) return;

      const next = inputRef.current + zhu;
      inputRef.current = next;
      setInput(next);
      checkMatch(next);
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      document.removeEventListener('click', refocus);
    };
  }, [started, gameOver, checkMatch, navigate]);

  // ── game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || gameOver) return;
    const s = stateRef.current;
    s.running = true;

    const loop = (ts: number) => {
      if (!s.running) return;

      if (ts - s.lastSpawn > SPAWN_MS) {
        s.lastSpawn = ts;
        const pool = wordsRef.current;
        const w = pool[Math.floor(Math.random() * pool.length)];
        s.chars.push({
          id: ++s.idSeq, char: w.char, py: w.py,
          x: 8 + Math.random() * 84, y: -8,
          speed: 0.07 + Math.random() * 0.06,
          rotation: Math.random() * 360, rotSp: (Math.random() - 0.5) * 2.5,
          exploding: false, explodeAt: 0,
        });
      }

      const now = Date.now();
      let lostLife = false;
      s.chars = s.chars.filter(c => {
        if (c.exploding) return now - c.explodeAt < 500;
        c.y += c.speed;
        c.rotation += c.rotSp;
        if (c.y > 100) { lostLife = true; return false; }
        return true;
      });

      if (lostLife) {
        livesRef.current = Math.max(0, livesRef.current - 1);
        comboRef.current = 0;
        setLives(livesRef.current);
        setComboFlash('');
        if (livesRef.current <= 0) { s.running = false; setGameOver(true); return; }
      }

      setRenderKey(k => k + 1);
      s.frame = requestAnimationFrame(loop);
    };

    s.frame = requestAnimationFrame(loop);
    return () => { s.running = false; cancelAnimationFrame(s.frame); };
  }, [started, gameOver]);

  const restart = () => {
    const s = stateRef.current;
    s.chars = []; s.idSeq = 0; s.lastSpawn = 0;
    livesRef.current = MAX_LIVES; scoreRef.current = 0; comboRef.current = 0;
    inputRef.current = '';
    setLives(MAX_LIVES); setScore(0); setInput(''); setComboFlash('');
    setShotY(null); setGameOver(false); setStarted(true);
  };

  const chars = stateRef.current.chars;
  const hasPrefix = input ? chars.some(c => !c.exploding && c.py.startsWith(input)) : true;

  // ── start screen ───────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-900 text-white px-4">
        <div className="text-7xl mb-4">🍄</div>
        <h1 className="text-4xl font-black mb-2">注音打字遊戲</h1>
        <p className="text-indigo-200 mb-4 text-center max-w-sm">
          單字從天而降，用鍵盤打出注音消滅它！<br />
          掉到地面扣一條命，三條命用完就結束。
        </p>

        {/* IME warning */}
        <div className="bg-yellow-900/60 border border-yellow-500 rounded-xl px-4 py-3 mb-4 max-w-sm text-sm text-yellow-100">
          ⚠️ <strong>請先關閉中文輸入法</strong>（切換到英文模式）<br />
          Windows：按 <kbd className="bg-yellow-800 px-1 rounded">Ctrl+Space</kbd> 或語言列切換<br />
          macOS：按 <kbd className="bg-yellow-800 px-1 rounded">⌘Space</kbd> 切換輸入法
        </div>

        <div className="bg-indigo-800/60 rounded-2xl p-4 mb-6 text-xs text-indigo-100 max-w-xs grid grid-cols-2 gap-x-6 gap-y-0.5">
          <span>1 → ㄅ</span><span>2 → ㄆ</span>
          <span>q → ㄉ</span><span>w → ㄊ</span>
          <span>a → ㄓ</span><span>s → ㄔ</span>
          <span>k → ㄧ</span><span>l → ㄨ</span>
          <span>z → ㄚ</span><span>b → ㄞ</span>
          <span>6 → ˊ（二聲）</span><span>7 → ˇ（三聲）</span>
          <span>8 → ˋ（四聲）</span><span>9 → ˙（輕聲）</span>
          <span className="col-span-2 mt-1">一聲不用輸入，直接打下一個字</span>
        </div>

        <button className="btn-primary text-xl px-10 py-4" onClick={() => setStarted(true)}>
          開始遊戲！
        </button>
        <button className="mt-3 text-indigo-300 underline text-sm" onClick={() => navigate('/')}>
          返回主頁
        </button>
      </div>
    );
  }

  // ── game over ──────────────────────────────────────────────────────────────
  if (gameOver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-900 text-white px-4">
        <div className="text-6xl mb-4">💥</div>
        <h1 className="text-4xl font-black mb-2">遊戲結束</h1>
        <div className="text-6xl font-black text-yellow-300 mb-1">{score}</div>
        <p className="text-indigo-200 mb-8 text-sm">分</p>
        <button className="btn-primary text-xl px-10 py-4 mb-3" onClick={restart}>再玩一次</button>
        <button className="text-indigo-300 underline text-sm" onClick={() => navigate('/')}>返回主頁</button>
      </div>
    );
  }

  // ── game screen ────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full overflow-hidden select-none bg-gradient-to-b from-indigo-950 to-indigo-900"
      style={{ height: '100dvh' }}
      onClick={() => hiddenInputRef.current?.focus()}
    >
      {/* Hidden input — always focused to capture keystrokes cleanly */}
      <input
        ref={hiddenInputRef}
        readOnly
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        autoFocus
      />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-black/40">
        <div className="flex gap-1 items-center">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`text-2xl ${i < lives ? '' : 'opacity-20'}`}>🍄</span>
          ))}
        </div>
        <div className="text-white font-black text-2xl tracking-wide">{score}</div>
        <button
          onClick={() => navigate('/')}
          className="text-white/40 hover:text-white text-xs px-2 py-1 rounded"
        >
          ✕ 離開
        </button>
      </div>

      {/* Ground line */}
      <div className="absolute bottom-24 left-0 right-0 h-px bg-mushroom-400/30 z-10" />

      {/* Cannon */}
      <div
        className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-10 text-4xl"
        style={{ transform: 'translateX(-50%) scaleX(-1)' }}
      >
        🔫
      </div>

      {/* Shot line */}
      {shotY !== null && (
        <div
          className="absolute left-1/2 bottom-[5.5rem] w-1 bg-yellow-300 z-15 rounded"
          style={{
            height: `calc(${100 - shotY}% - 5.5rem)`,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 8px #fcd34d',
            animation: 'shotFade 0.35s ease-out forwards',
          }}
        />
      )}

      {/* Falling characters */}
      {chars.map(c => (
        <div
          key={c.id}
          className="absolute z-10 flex flex-col items-center pointer-events-none"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`,
            opacity: c.exploding ? 0 : 1,
            transition: c.exploding ? 'opacity 0.3s, transform 0.3s' : 'none',
          }}
        >
          <div
            className="text-4xl font-black leading-none"
            style={{ textShadow: '0 0 14px rgba(253,210,0,0.8)', color: '#fef3c7' }}
          >
            {c.char}
          </div>
          <div className="text-xs text-indigo-200 mt-0.5 bg-indigo-900/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {c.py}
          </div>
        </div>
      ))}

      {/* Combo flash */}
      {comboFlash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-3xl font-black text-yellow-300" style={{ textShadow: '0 0 20px #fcd34d' }}>
            {comboFlash}
          </div>
        </div>
      )}

      {/* Input display */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/60 py-3 px-4 flex items-center gap-3">
        <span className="text-white/40 text-sm shrink-0">注音</span>
        <div
          className={`flex-1 text-center text-3xl font-black tracking-widest min-h-[2.5rem] leading-tight
            ${input ? (hasPrefix ? 'text-yellow-300' : 'text-red-400') : ''}`}
        >
          {input || <span className="text-white/20 text-base font-normal">按鍵盤輸入注音（需關閉中文輸入法）</span>}
        </div>
        {input && <button onClick={() => { inputRef.current = ''; setInput(''); }} className="text-white/30 hover:text-white text-sm shrink-0">⌫</button>}
      </div>

      <style>{`
        @keyframes shotFade { from { opacity:1; } to { opacity:0; } }
      `}</style>
    </div>
  );
}
