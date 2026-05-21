import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Bopomofo keyboard layout (Traditional Chinese phonetic) ──────────────────
const KEY_MAP: Record<string, string> = {
  '1': 'ㄅ', '2': 'ㄆ', '3': 'ㄇ', '4': 'ㄈ',
  'q': 'ㄉ', 'w': 'ㄊ', 'e': 'ㄋ', 'r': 'ㄌ',
  't': 'ㄍ', 'y': 'ㄎ', 'u': 'ㄏ',
  'i': 'ㄐ', 'o': 'ㄑ', 'p': 'ㄒ',
  'a': 'ㄓ', 's': 'ㄔ', 'd': 'ㄕ', 'f': 'ㄖ',
  'g': 'ㄗ', 'h': 'ㄘ', 'j': 'ㄙ',
  'k': 'ㄧ', 'l': 'ㄨ', ';': 'ㄩ',
  'z': 'ㄚ', 'x': 'ㄛ', 'c': 'ㄜ', 'v': 'ㄝ',
  'b': 'ㄞ', 'n': 'ㄟ', 'm': 'ㄠ', ',': 'ㄡ',
  '.': 'ㄢ', '/': 'ㄣ', '-': 'ㄤ', '=': 'ㄥ', '5': 'ㄦ',
  '6': 'ˊ', '3': 'ˇ', '4': 'ˋ', '7': '˙',
};

// ── Word bank: char + bopomofo ────────────────────────────────────────────────
const WORDS = [
  { char: '好', py: 'ㄏㄠˇ' }, { char: '大', py: 'ㄉㄚˋ' },
  { char: '小', py: 'ㄒㄧㄠˇ' }, { char: '人', py: 'ㄖㄣˊ' },
  { char: '山', py: 'ㄕㄢ' }, { char: '水', py: 'ㄕㄨㄟˇ' },
  { char: '天', py: 'ㄊㄧㄢ' }, { char: '地', py: 'ㄉㄧˋ' },
  { char: '日', py: 'ㄖˋ' }, { char: '月', py: 'ㄩㄝˋ' },
  { char: '火', py: 'ㄏㄨㄛˇ' }, { char: '木', py: 'ㄇㄨˋ' },
  { char: '花', py: 'ㄏㄨㄚ' }, { char: '草', py: 'ㄘㄠˇ' },
  { char: '魚', py: 'ㄩˊ' }, { char: '鳥', py: 'ㄋㄧㄠˇ' },
  { char: '貓', py: 'ㄇㄠ' }, { char: '狗', py: 'ㄍㄡˇ' },
  { char: '書', py: 'ㄕㄨ' }, { char: '門', py: 'ㄇㄣˊ' },
  { char: '車', py: 'ㄔㄜ' }, { char: '路', py: 'ㄌㄨˋ' },
  { char: '雨', py: 'ㄩˇ' }, { char: '風', py: 'ㄈㄥ' },
  { char: '雪', py: 'ㄒㄩㄝˇ' }, { char: '春', py: 'ㄔㄨㄣ' },
  { char: '夏', py: 'ㄒㄧㄚˋ' }, { char: '秋', py: 'ㄑㄧㄡ' },
  { char: '冬', py: 'ㄉㄨㄥ' }, { char: '紅', py: 'ㄏㄨㄥˊ' },
  { char: '綠', py: 'ㄌㄩˋ' }, { char: '藍', py: 'ㄌㄢˊ' },
  { char: '白', py: 'ㄅㄞˊ' }, { char: '黑', py: 'ㄏㄟ' },
  { char: '上', py: 'ㄕㄤˋ' }, { char: '下', py: 'ㄒㄧㄚˋ' },
  { char: '左', py: 'ㄗㄨㄛˇ' }, { char: '右', py: 'ㄧㄡˋ' },
  { char: '前', py: 'ㄑㄧㄢˊ' }, { char: '後', py: 'ㄏㄡˋ' },
  { char: '多', py: 'ㄉㄨㄛ' }, { char: '少', py: 'ㄕㄠˇ' },
  { char: '快', py: 'ㄎㄨㄞˋ' }, { char: '慢', py: 'ㄇㄢˋ' },
  { char: '新', py: 'ㄒㄧㄣ' }, { char: '舊', py: 'ㄐㄧㄡˋ' },
  { char: '吃', py: 'ㄔ' }, { char: '喝', py: 'ㄏㄜ' },
  { char: '走', py: 'ㄗㄡˇ' }, { char: '跑', py: 'ㄆㄠˇ' },
  { char: '看', py: 'ㄎㄢˋ' }, { char: '聽', py: 'ㄊㄧㄥ' },
  { char: '說', py: 'ㄕㄨㄛ' }, { char: '玩', py: 'ㄨㄢˊ' },
  { char: '學', py: 'ㄒㄩㄝˊ' }, { char: '讀', py: 'ㄉㄨˊ' },
  { char: '笑', py: 'ㄒㄧㄠˋ' }, { char: '哭', py: 'ㄎㄨ' },
  { char: '愛', py: 'ㄞˋ' }, { char: '家', py: 'ㄐㄧㄚ' },
];

// ── Game types ────────────────────────────────────────────────────────────────
interface FallingChar {
  id: number;
  char: string;
  py: string;         // bopomofo pronunciation
  x: number;          // 5–90% of container width
  y: number;          // 0–100%
  speed: number;
  rotation: number;
  rotSp: number;      // rotation speed deg/frame
  exploding: boolean;
  explodeAt: number;
}

interface Shot {
  id: number;
  fromX: number;
  toX: number;
  toY: number;
}

const MAX_LIVES = 3;
const SPAWN_INTERVAL_MS = 2200;  // new char every 2.2s

export default function TypingGame() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    chars: FallingChar[];
    idSeq: number;
    lastSpawn: number;
    running: boolean;
    frame: number;
  }>({ chars: [], idSeq: 0, lastSpawn: 0, running: false, frame: 0 });

  const [renderKey, setRenderKey] = useState(0);   // triggers visual re-render
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');           // current bopomofo being typed
  const [shots, setShots] = useState<Shot[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState('');

  const livesRef = useRef(MAX_LIVES);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);

  // ── shoot a character ──────────────────────────────────────────────────────
  const shoot = useCallback((charId: number) => {
    const s = stateRef.current;
    const target = s.chars.find(c => c.id === charId);
    if (!target || target.exploding) return;

    target.exploding = true;
    target.explodeAt = Date.now();
    comboRef.current += 1;
    const pts = 10 + (comboRef.current > 1 ? (comboRef.current - 1) * 5 : 0);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    if (comboRef.current >= 3) setComboFlash(`${comboRef.current} Combo! +${pts}`);

    // Add shot particle
    setShots(prev => [...prev, {
      id: Date.now(),
      fromX: 50,
      toX: target.x,
      toY: target.y,
    }]);
    setTimeout(() => setShots(prev => prev.slice(1)), 400);
    setRenderKey(k => k + 1);
  }, []);

  // ── match current input against falling chars ─────────────────────────────
  const tryMatch = useCallback((typed: string) => {
    if (!typed) return false;
    const s = stateRef.current;
    // Exact match
    const exact = s.chars.find(c => !c.exploding && c.py === typed);
    if (exact) { shoot(exact.id); return true; }
    // Prefix match (player still typing — show red if no prefix)
    return s.chars.some(c => !c.exploding && c.py.startsWith(typed));
  }, [shoot]);

  // ── keyboard handler ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || gameOver) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();

      if (e.key === 'Escape') { navigate('/'); return; }
      if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1));
        return;
      }

      const zhu = KEY_MAP[e.key.toLowerCase()];
      if (!zhu) return;

      setInput(prev => {
        const next = prev + zhu;
        // After typing, check match
        setTimeout(() => {
          const hit = tryMatch(next);
          if (hit) {
            setInput('');
            setTimeout(() => setComboFlash(''), 900);
          } else {
            // If no prefix match at all, clear and restart
            const s = stateRef.current;
            const anyPrefix = s.chars.some(c => !c.exploding && c.py.startsWith(next));
            if (!anyPrefix) {
              setInput('');
              setCombo(0); comboRef.current = 0;
            }
          }
        }, 0);
        return next;
      });
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, gameOver, tryMatch, navigate]);

  // ── game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!started || gameOver) return;

    const s = stateRef.current;
    s.running = true;

    const loop = (ts: number) => {
      if (!s.running) return;

      // Spawn new characters
      if (ts - s.lastSpawn > SPAWN_INTERVAL_MS) {
        s.lastSpawn = ts;
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        s.chars.push({
          id: ++s.idSeq,
          char: word.char,
          py: word.py,
          x: 8 + Math.random() * 84,
          y: -8,
          speed: 0.08 + Math.random() * 0.06,
          rotation: Math.random() * 360,
          rotSp: (Math.random() - 0.5) * 3,
          exploding: false,
          explodeAt: 0,
        });
      }

      // Update positions
      let lostLife = false;
      const now = Date.now();
      s.chars = s.chars.filter(c => {
        if (c.exploding) return now - c.explodeAt < 500;
        c.y += c.speed;
        c.rotation += c.rotSp;
        if (c.y > 100) {
          lostLife = true;
          return false;
        }
        return true;
      });

      if (lostLife) {
        livesRef.current = Math.max(0, livesRef.current - 1);
        comboRef.current = 0;
        setLives(livesRef.current);
        setCombo(0);
        setComboFlash('');
        if (livesRef.current <= 0) {
          s.running = false;
          setGameOver(true);
          return;
        }
      }

      setRenderKey(k => k + 1);
      s.frame = requestAnimationFrame(loop);
    };

    s.frame = requestAnimationFrame(loop);
    return () => {
      s.running = false;
      cancelAnimationFrame(s.frame);
    };
  }, [started, gameOver]);

  // ── restart ────────────────────────────────────────────────────────────────
  const restart = () => {
    const s = stateRef.current;
    s.chars = []; s.idSeq = 0; s.lastSpawn = 0;
    livesRef.current = MAX_LIVES; scoreRef.current = 0; comboRef.current = 0;
    setLives(MAX_LIVES); setScore(0); setCombo(0); setInput('');
    setComboFlash(''); setShots([]); setGameOver(false); setStarted(true);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  const chars = stateRef.current.chars;

  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-mushroom-900 text-white px-4">
        <div className="text-7xl mb-4">🍄</div>
        <h1 className="text-4xl font-black mb-2">注音打字遊戲</h1>
        <p className="text-indigo-200 mb-6 text-center max-w-sm">
          單字從天而降，用鍵盤打出注音消滅它們！<br/>
          掉到地面扣一條命，三條命用完就結束。
        </p>
        <div className="bg-indigo-800/60 rounded-2xl p-4 mb-8 text-sm text-indigo-100 max-w-xs text-left space-y-1">
          <p>🎹 鍵盤對應：1=ㄅ 2=ㄆ q=ㄉ w=ㄊ …</p>
          <p>🎹 聲調：6=ˊ 3=ˇ 4=ˋ 7=˙（一聲不需輸入）</p>
          <p>⌫ Backspace 刪除；Esc 離開</p>
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

  if (gameOver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-mushroom-900 text-white px-4">
        <div className="text-6xl mb-4">💥</div>
        <h1 className="text-4xl font-black mb-2">遊戲結束</h1>
        <div className="text-6xl font-black text-yellow-300 mb-2">{score}</div>
        <p className="text-indigo-200 mb-8">分</p>
        <button className="btn-primary text-xl px-10 py-4 mb-3" onClick={restart}>再玩一次</button>
        <button className="text-indigo-300 underline text-sm" onClick={() => navigate('/')}>返回主頁</button>
      </div>
    );
  }

  const hasPrefix = input ? chars.some(c => !c.exploding && c.py.startsWith(input)) : true;

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden bg-gradient-to-b from-indigo-950 to-indigo-900"
      style={{ height: '100dvh' }}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-black/30">
        <div className="flex gap-1">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`text-2xl ${i < lives ? '' : 'opacity-20'}`}>🍄</span>
          ))}
        </div>
        <div className="text-white font-black text-2xl">{score}</div>
        <button onClick={() => navigate('/')} className="text-white/50 text-xs hover:text-white">✕ 離開</button>
      </div>

      {/* Ground line */}
      <div className="absolute bottom-24 left-0 right-0 h-0.5 bg-mushroom-400/40 z-10" />

      {/* Cannon */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-4xl">🔫</div>

      {/* Shot lines */}
      {shots.map(s => (
        <div
          key={s.id}
          className="absolute z-15 w-0.5 bg-yellow-300"
          style={{
            bottom: '5.5rem',
            left: `${s.fromX}%`,
            height: `calc(${100 - s.toY}vh - 5.5rem)`,
            transform: `translateX(-50%) rotate(${Math.atan2(s.toX - s.fromX, 100 - s.toY) * 180 / Math.PI}deg)`,
            transformOrigin: 'bottom center',
            opacity: 0.8,
          }}
        />
      ))}

      {/* Falling characters */}
      {chars.map(c => (
        <div
          key={c.id}
          className="absolute z-10 flex flex-col items-center pointer-events-none"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`,
            transition: 'opacity 0.3s',
            opacity: c.exploding ? 0 : 1,
          }}
        >
          <div
            className="text-4xl font-black leading-none"
            style={{ textShadow: '0 0 12px rgba(255,200,100,0.9)', color: '#fef3c7' }}
          >
            {c.char}
          </div>
          <div className="text-xs text-indigo-200 mt-0.5 bg-indigo-900/70 px-1 rounded">
            {c.py}
          </div>
        </div>
      ))}

      {/* Combo flash */}
      {comboFlash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-4xl font-black text-yellow-300 animate-bounce">{comboFlash}</div>
        </div>
      )}

      {/* Input display */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/50 py-3 px-4 flex items-center gap-3">
        <span className="text-white/50 text-sm">注音：</span>
        <div
          className={`flex-1 text-center text-3xl font-black tracking-widest min-h-[2.5rem]
            ${hasPrefix ? 'text-yellow-300' : 'text-red-400'}`}
        >
          {input || <span className="text-white/20 text-xl">按鍵盤輸入注音</span>}
        </div>
        <span className="text-white/30 text-xs">⌫刪除</span>
      </div>
    </div>
  );
}
