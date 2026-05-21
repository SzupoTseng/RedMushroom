/**
 * 注音打字遊戲
 *
 * IME の動作:
 * - compositionupdate: ユーザーが注音を入力中 → e.data に現在の注音が入る
 *   例: ㄏ → ㄏㄠ → ㄏㄠˇ → "好"
 * - compositionend: 漢字確定 → e.data に漢字が入る
 *
 * ゲームのマッチ: 確定した**漢字**で照合。
 * ディスプレイ: compositionupdate.data（注音）をリアルタイム表示。
 * → 中文輸入法 ON のまま遊べる。
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Fallback word bank ────────────────────────────────────────────────────────
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
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<{
    chars: FallingChar[]; idSeq: number; lastSpawn: number;
    running: boolean; frame: number;
  }>({ chars: [], idSeq: 0, lastSpawn: 0, running: false, frame: 0 });

  const wordsRef = useRef(FALLBACK_WORDS);
  const [renderKey, setRenderKey] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [display, setDisplay] = useState('');   // 入力中の注音
  const [shotTarget, setShotTarget] = useState<{ x: number; y: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [comboFlash, setComboFlash] = useState('');
  const [wrongFlash, setWrongFlash] = useState(false);

  const livesRef = useRef(MAX_LIVES);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  // ── Fetch vocab from DB ────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('rm_token');
    if (!token) return;
    fetch('/api/quiz/vocab', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { vocab: Array<{ char: string; py: string }> } | null) => {
        if (d?.vocab && d.vocab.length > 10) wordsRef.current = d.vocab;
      })
      .catch(() => {});
  }, []);

  // ── Shoot a falling character ─────────────────────────────────────────────
  const shoot = useCallback((c: FallingChar) => {
    if (c.exploding) return;
    c.exploding = true;
    c.explodeAt = Date.now();
    comboRef.current += 1;
    const pts = 10 + Math.max(0, (comboRef.current - 1) * 5);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setShotTarget({ x: c.x, y: c.y });
    setTimeout(() => setShotTarget(null), 400);
    if (comboRef.current >= 3) {
      setComboFlash(`${comboRef.current}連擊！ +${pts}`);
      setTimeout(() => setComboFlash(''), 900);
    }
    setRenderKey(k => k + 1);
  }, []);

  // ── Match by Chinese character (after IME confirms) ───────────────────────
  const matchChar = useCallback((ch: string) => {
    if (!ch) return;
    const s = stateRef.current;
    const target = s.chars.find(c => !c.exploding && c.char === ch.trim());
    if (target) {
      shoot(target);
    } else {
      // Wrong character — flash red
      comboRef.current = 0;
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 300);
    }
  }, [shoot]);

  // ── IME-aware input event handling ───────────────────────────────────────
  useEffect(() => {
    if (!started || gameOver) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();

    // Show bopomofo in real-time as user types (before character confirmation)
    const onCompositionUpdate = (e: CompositionEvent) => {
      setDisplay(e.data || '');
    };

    // Character confirmed by IME
    const onCompositionEnd = (e: CompositionEvent) => {
      setDisplay('');
      el.value = '';
      matchChar(e.data);
    };

    // Handle direct input without IME (e.g., paste or non-composition input)
    const onInput = (e: Event) => {
      const ev = e as InputEvent;
      if (ev.isComposing) return;
      const val = el.value.trim();
      if (val) { matchChar(val); el.value = ''; setDisplay(''); }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };

    el.addEventListener('compositionupdate', onCompositionUpdate);
    el.addEventListener('compositionend', onCompositionEnd);
    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeyDown);

    // Refocus if user clicks elsewhere
    const refocus = () => setTimeout(() => el.focus(), 0);
    document.addEventListener('click', refocus);

    return () => {
      el.removeEventListener('compositionupdate', onCompositionUpdate);
      el.removeEventListener('compositionend', onCompositionEnd);
      el.removeEventListener('input', onInput);
      el.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', refocus);
    };
  }, [started, gameOver, matchChar, navigate]);

  // ── Game loop ─────────────────────────────────────────────────────────────
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
          speed: 0.06 + Math.random() * 0.05,
          rotation: Math.random() * 360,
          rotSp: (Math.random() - 0.5) * 2,
          exploding: false, explodeAt: 0,
        });
      }
      const now = Date.now();
      let lostLife = false;
      s.chars = s.chars.filter(c => {
        if (c.exploding) return now - c.explodeAt < 500;
        c.y += c.speed; c.rotation += c.rotSp;
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
    setLives(MAX_LIVES); setScore(0); setDisplay(''); setComboFlash('');
    setShotTarget(null); setGameOver(false); setStarted(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const chars = stateRef.current.chars;

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-900 text-white px-4">
        <div className="text-7xl mb-4">🍄</div>
        <h1 className="text-4xl font-black mb-2">注音打字遊戲</h1>
        <p className="text-indigo-200 mb-6 text-center max-w-sm">
          單字從天而降！用中文輸入法打出注音，消滅文字！<br />
          掉到地面扣一條命，三條命用完就結束。
        </p>
        <div className="bg-indigo-800/60 rounded-xl px-5 py-4 mb-8 text-sm text-indigo-100 max-w-sm space-y-2">
          <p>✅ <strong>開著中文輸入法</strong>照樣可以玩</p>
          <p>🎹 看到文字下方的注音，用鍵盤打出來</p>
          <p>✓ 打對就發射大砲！✗ 打錯沒有扣分</p>
          <p>⌨️ 按 Esc 可離開遊戲</p>
        </div>
        <button className="btn-primary text-xl px-10 py-4" onClick={() => {
          setStarted(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}>
          開始遊戲！
        </button>
        <button className="mt-3 text-indigo-300 underline text-sm" onClick={() => navigate('/')}>
          返回主頁
        </button>
      </div>
    );
  }

  // ── Game Over ─────────────────────────────────────────────────────────────
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

  // ── Game screen ───────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full overflow-hidden select-none bg-gradient-to-b from-indigo-950 to-indigo-900"
      style={{ height: '100dvh' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Actual input — focused, transparent, positioned at bottom to keep mobile IME happy */}
      <input
        ref={inputRef}
        className="absolute bottom-4 left-1/2 w-1 h-1 opacity-0 pointer-events-none"
        autoFocus
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-black/40">
        <div className="flex gap-1">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`text-2xl ${i < lives ? '' : 'opacity-20'}`}>🍄</span>
          ))}
        </div>
        <div className="text-white font-black text-2xl">{score}</div>
        <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-xs px-2 py-1 rounded">
          ✕ 離開
        </button>
      </div>

      {/* Ground line */}
      <div className="absolute bottom-24 left-0 right-0 h-px bg-mushroom-400/30 z-10" />

      {/* Cannon */}
      <div className="absolute bottom-[5.5rem] left-1/2 z-10 text-4xl" style={{ transform: 'translateX(-50%) scaleX(-1)' }}>
        🔫
      </div>

      {/* Shot line */}
      {shotTarget && (
        <div
          className="absolute left-1/2 bottom-[5.5rem] w-1 bg-yellow-300 rounded z-15"
          style={{
            height: `calc(${100 - shotTarget.y}% - 5.5rem)`,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 10px #fcd34d',
            animation: 'fade350 0.35s ease-out forwards',
          }}
        />
      )}

      {/* Falling characters */}
      {chars.map(c => (
        <div
          key={c.id}
          className="absolute z-10 flex flex-col items-center pointer-events-none"
          style={{
            left: `${c.x}%`, top: `${c.y}%`,
            transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`,
            opacity: c.exploding ? 0 : 1,
            transition: c.exploding ? 'opacity 0.3s' : 'none',
          }}
        >
          <div className="text-4xl font-black leading-none"
               style={{ textShadow: '0 0 14px rgba(253,210,0,0.8)', color: '#fef3c7' }}>
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

      {/* Input display — shows bopomofo in real time during IME composition */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 py-3 px-4 flex items-center gap-3 transition-colors duration-150
        ${wrongFlash ? 'bg-red-900/80' : 'bg-black/60'}`}>
        <span className="text-white/40 text-sm shrink-0">注音</span>
        <div className="flex-1 text-center text-3xl font-black tracking-widest min-h-[2.5rem] leading-tight text-yellow-200">
          {display || <span className="text-white/20 text-base font-normal">輸入注音消滅文字</span>}
        </div>
      </div>

      <style>{`
        @keyframes fade350 { from { opacity: 1 } to { opacity: 0 } }
      `}</style>
    </div>
  );
}
