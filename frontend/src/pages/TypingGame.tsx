/**
 * 注音打字遊戲 — 關卡版
 *
 * - 1-10 關，無旋轉
 * - 每關目標：第 N 關消滅 (N + 4) 隻，最多 10 隻
 * - 速度：第 1 關最慢，第 10 關才接近原速度的一半
 * - 同時最多 N/2 + 1 個字在畫面（低關卡字少、不混亂）
 * - IME ON 直接玩，compositionend 取得漢字配對
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Speed zones ───────────────────────────────────────────────────────────────
// 1-10: BASE_SPEED  11-50: BASE_SPEED × 1.2  51-100: BASE_SPEED × 1.3
const BASE_SPEED = 0.03;
function zoneSpeed(lv: number) {
  if (lv <= 10) return BASE_SPEED;
  if (lv <= 50) return BASE_SPEED * 1.2;
  return BASE_SPEED * 1.3;
}

// ── Config per level ──────────────────────────────────────────────────────────
function levelConfig(lv: number) {
  const speed = zoneSpeed(lv);

  if (lv <= 10) {
    // 1-10關：無旋轉，固定慢速，目標 lv+4
    const target      = lv + 4;
    const spawnMs     = Math.max(1800, 3600 - lv * 180);
    const maxOnScreen = Math.ceil(lv / 2) + 1;
    return { target, speed, spawnMs, maxOnScreen, rotSp: 0 };
  } else if (lv <= 50) {
    // 11-50關：無旋轉，目標 = 關數
    const target      = lv;
    const spawnMs     = Math.max(1200, 1800 - (lv - 10) * 15);
    const maxOnScreen = Math.min(8, Math.ceil(lv / 10) + 3);
    return { target, speed, spawnMs, maxOnScreen, rotSp: 0 };
  } else {
    // 51-100關：緩慢旋轉，目標 = 關數
    const target      = lv;
    const spawnMs     = Math.max(800, 1200 - (lv - 50) * 8);
    const maxOnScreen = Math.min(12, Math.ceil(lv / 10) + 4);
    const rotSp       = 0.3 + (lv - 50) * 0.03;  // 0.3 → 1.8 deg/frame
    return { target, speed, spawnMs, maxOnScreen, rotSp };
  }
}

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
  { char: '心', py: 'ㄒㄧㄣ' }, { char: '手', py: 'ㄕㄡˇ' },
  { char: '口', py: 'ㄎㄡˇ' }, { char: '耳', py: 'ㄦˇ' },
  { char: '眼', py: 'ㄧㄢˇ' }, { char: '頭', py: 'ㄊㄡˊ' },
  { char: '新', py: 'ㄒㄧㄣ' }, { char: '舊', py: 'ㄐㄧㄡˋ' },
  { char: '笑', py: 'ㄒㄧㄠˋ' }, { char: '哭', py: 'ㄎㄨ' },
  { char: '魚', py: 'ㄩˊ' }, { char: '鳥', py: 'ㄋㄧㄠˇ' },
];

interface FallingChar {
  id: number; char: string; py: string;
  x: number; y: number; speed: number;
  rotation: number; rotSp: number;     // rotSp=0 → no rotation (levels 1-10)
  exploding: boolean; explodeAt: number;
}

const MAX_LIVES = 3;
const MAX_LEVEL = 100;

export default function TypingGame() {
  const navigate = useNavigate();
  const inputElRef = useRef<HTMLInputElement>(null);

  // Game loop mutable state (not React state to avoid re-render overhead)
  const loopRef = useRef<{
    chars: FallingChar[];
    idSeq: number;
    lastSpawn: number;
    running: boolean;
    raf: number;
    cleared: number;   // chars destroyed this level
    lives: number;
    score: number;
    combo: number;
    level: number;
  }>({
    chars: [], idSeq: 0, lastSpawn: 0,
    running: false, raf: 0,
    cleared: 0, lives: MAX_LIVES, score: 0, combo: 0, level: 1,
  });

  const wordsRef = useRef(FALLBACK_WORDS);

  // React state for rendering
  const [renderKey, setRenderKey] = useState(0);
  const [uiLives, setUiLives] = useState(MAX_LIVES);
  const [uiScore, setUiScore] = useState(0);
  const [uiLevel, setUiLevel] = useState(1);
  const [uiCleared, setUiCleared] = useState(0);
  const [uiTarget, setUiTarget] = useState(levelConfig(1).target);
  const [display, setDisplay] = useState('');
  const [shotTarget, setShotTarget] = useState<{ x: number; y: number } | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [comboFlash, setComboFlash] = useState('');
  const [levelUpFlash, setLevelUpFlash] = useState('');
  const [phase, setPhase] = useState<'start' | 'play' | 'gameover' | 'win'>('start');

  // Fetch vocab
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

  // ── Shoot ──────────────────────────────────────────────────────────────────
  const shoot = useCallback((c: FallingChar) => {
    if (c.exploding) return;
    const L = loopRef.current;
    c.exploding = true;
    c.explodeAt = Date.now();
    L.combo += 1;
    L.cleared += 1;
    const pts = 10 + Math.max(0, (L.combo - 1) * 5);
    L.score += pts;
    setUiScore(L.score);
    setUiCleared(L.cleared);
    setShotTarget({ x: c.x, y: c.y });
    setTimeout(() => setShotTarget(null), 400);
    if (L.combo >= 3) {
      setComboFlash(`${L.combo}連擊！ +${pts}`);
      setTimeout(() => setComboFlash(''), 900);
    }

    // Level up check
    const cfg = levelConfig(L.level);
    if (L.cleared >= cfg.target) {
      if (L.level >= MAX_LEVEL) {
        L.running = false;
        setPhase('win');
        return;
      }
      L.level += 1;
      L.cleared = 0;
      L.chars = []; // clear remaining chars
      L.lastSpawn = 0;
      const newCfg = levelConfig(L.level);
      setUiLevel(L.level);
      setUiCleared(0);
      setUiTarget(newCfg.target);
      setLevelUpFlash(`第 ${L.level} 關！`);
      setTimeout(() => setLevelUpFlash(''), 1500);
    }

    setRenderKey(k => k + 1);
  }, []);

  // ── Match by Chinese char ─────────────────────────────────────────────────
  const matchChar = useCallback((ch: string) => {
    if (!ch) return;
    const L = loopRef.current;
    const target = L.chars.find(c => !c.exploding && c.char === ch.trim());
    if (target) {
      shoot(target);
    } else {
      L.combo = 0;
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 300);
    }
  }, [shoot]);

  // ── IME events ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'play') return;
    const el = inputElRef.current;
    if (!el) return;
    el.focus();

    const onCompUpdate = (e: CompositionEvent) => setDisplay(e.data || '');
    const onCompEnd = (e: CompositionEvent) => {
      setDisplay(''); el.value = ''; matchChar(e.data);
    };
    const onInput = (e: Event) => {
      const ev = e as InputEvent;
      if (ev.isComposing) return;
      const val = el.value.trim();
      if (val) { matchChar(val); el.value = ''; setDisplay(''); }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/');
    };
    const refocus = () => setTimeout(() => el.focus(), 0);

    el.addEventListener('compositionupdate', onCompUpdate);
    el.addEventListener('compositionend', onCompEnd);
    el.addEventListener('input', onInput);
    el.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', refocus);

    return () => {
      el.removeEventListener('compositionupdate', onCompUpdate);
      el.removeEventListener('compositionend', onCompEnd);
      el.removeEventListener('input', onInput);
      el.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', refocus);
    };
  }, [phase, matchChar, navigate]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'play') return;
    const L = loopRef.current;
    L.running = true;

    const loop = (ts: number) => {
      if (!L.running) return;
      const cfg = levelConfig(L.level);

      // Spawn — only if under max on-screen limit
      const active = L.chars.filter(c => !c.exploding).length;
      if (active < cfg.maxOnScreen && ts - L.lastSpawn > cfg.spawnMs) {
        L.lastSpawn = ts;
        const pool = wordsRef.current;
        const w = pool[Math.floor(Math.random() * pool.length)];
        const baseRotSp = cfg.rotSp;
        L.chars.push({
          id: ++L.idSeq, char: w.char, py: w.py,
          x: 8 + Math.random() * 84, y: -8,
          speed: cfg.speed * (0.85 + Math.random() * 0.3),
          rotation: Math.random() * 360,
          rotSp: baseRotSp > 0 ? baseRotSp * (Math.random() < 0.5 ? 1 : -1) : 0,
          exploding: false, explodeAt: 0,
        });
      }

      // Update
      const now = Date.now();
      let lostLife = false;
      L.chars = L.chars.filter(c => {
        if (c.exploding) return now - c.explodeAt < 500;
        c.y += c.speed;
        c.rotation += c.rotSp;
        if (c.y > 100) { lostLife = true; return false; }
        return true;
      });

      if (lostLife) {
        L.lives = Math.max(0, L.lives - 1);
        L.combo = 0;
        setUiLives(L.lives);
        setComboFlash('');
        if (L.lives <= 0) { L.running = false; setPhase('gameover'); return; }
      }

      setRenderKey(k => k + 1);
      L.raf = requestAnimationFrame(loop);
    };

    L.raf = requestAnimationFrame(loop);
    return () => { L.running = false; cancelAnimationFrame(L.raf); };
  }, [phase]);

  // ── Start / restart ────────────────────────────────────────────────────────
  const startGame = () => {
    const L = loopRef.current;
    L.chars = []; L.idSeq = 0; L.lastSpawn = 0;
    L.cleared = 0; L.lives = MAX_LIVES; L.score = 0; L.combo = 0; L.level = 1;
    const cfg = levelConfig(1);
    setUiLives(MAX_LIVES); setUiScore(0); setUiLevel(1);
    setUiCleared(0); setUiTarget(cfg.target);
    setDisplay(''); setComboFlash(''); setLevelUpFlash('');
    setShotTarget(null); setWrongFlash(false);
    setPhase('play');
    setTimeout(() => inputElRef.current?.focus(), 50);
  };

  const chars = loopRef.current.chars;
  const cfg = levelConfig(uiLevel);

  // ── Start screen ───────────────────────────────────────────────────────────
  if (phase === 'start') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-900 text-white px-4">
        <div className="text-7xl mb-4">🍄</div>
        <h1 className="text-4xl font-black mb-2">注音打字遊戲</h1>
        <p className="text-indigo-200 mb-5 text-center max-w-sm">
          單字從天而降！用注音輸入法打出來，消滅它！<br />
          闖過 10 關，每關越來越快！
        </p>
        <div className="bg-indigo-800/60 rounded-xl px-5 py-4 mb-6 text-sm text-indigo-100 max-w-sm space-y-1.5">
          <div className="flex items-start gap-2"><span>✅</span><span><strong>開著中文輸入法</strong>照樣可以玩</span></div>
          <div className="flex items-start gap-2"><span>🎯</span><span>看到文字，打出它的注音，大砲就會發射</span></div>
          <div className="flex items-start gap-2"><span>🍄</span><span>三條命，字掉到地面扣一條命</span></div>
          <div className="flex items-start gap-2"><span>🏆</span><span>1–10 關，消滅足夠數量的字就過關</span></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-6 text-xs text-indigo-100 w-full max-w-sm">
          <div className="bg-indigo-800/60 rounded-xl p-2.5 text-center">
            <div className="font-bold text-white mb-1">第 1–10 關</div>
            <div>⬇️ 正方向</div>
            <div className="text-yellow-200">慢速</div>
          </div>
          <div className="bg-purple-800/60 rounded-xl p-2.5 text-center">
            <div className="font-bold text-white mb-1">第 11–50 關</div>
            <div>⬇️ 正方向</div>
            <div className="text-yellow-200">慢 ×1.2</div>
          </div>
          <div className="bg-pink-900/60 rounded-xl p-2.5 text-center">
            <div className="font-bold text-white mb-1">第 51–100 關</div>
            <div>🌀 旋轉</div>
            <div className="text-yellow-200">慢 ×1.3</div>
          </div>
        </div>
        <button className="btn-primary text-xl px-10 py-4" onClick={startGame}>開始遊戲！</button>
        <button className="mt-3 text-indigo-300 underline text-sm" onClick={() => navigate('/')}>返回主頁</button>
      </div>
    );
  }

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (phase === 'gameover') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-900 to-purple-900 text-white px-4">
        <div className="text-6xl mb-4">💥</div>
        <h1 className="text-4xl font-black mb-1">遊戲結束</h1>
        <p className="text-indigo-300 mb-2">第 {uiLevel} 關 · 消滅 {uiCleared} 個</p>
        <div className="text-6xl font-black text-yellow-300 mb-1">{uiScore}</div>
        <p className="text-indigo-200 mb-8 text-sm">分</p>
        <button className="btn-primary text-xl px-10 py-4 mb-3" onClick={startGame}>再玩一次</button>
        <button className="text-indigo-300 underline text-sm" onClick={() => navigate('/')}>返回主頁</button>
      </div>
    );
  }

  // ── Win! ───────────────────────────────────────────────────────────────────
  if (phase === 'win') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-yellow-800 to-indigo-900 text-white px-4">
        <div className="text-7xl mb-4">🏆</div>
        <h1 className="text-4xl font-black mb-1">恭喜過關！</h1>
        <p className="text-yellow-200 mb-2">全 10 關完成！</p>
        <div className="text-6xl font-black text-yellow-300 mb-1">{uiScore}</div>
        <p className="text-indigo-200 mb-8 text-sm">分</p>
        <button className="btn-primary text-xl px-10 py-4 mb-3" onClick={startGame}>再挑戰一次</button>
        <button className="text-indigo-300 underline text-sm" onClick={() => navigate('/')}>返回主頁</button>
      </div>
    );
  }

  // ── Game screen ────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full overflow-hidden select-none bg-gradient-to-b from-indigo-950 to-indigo-900"
      style={{ height: '100dvh' }}
      onClick={() => inputElRef.current?.focus()}
    >
      <input
        ref={inputElRef}
        className="absolute bottom-4 left-1/2 w-1 h-1 opacity-0 pointer-events-none"
        autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
      />

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-2 bg-black/40">
        {/* Lives */}
        <div className="flex gap-0.5">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} className={`text-xl ${i < uiLives ? '' : 'opacity-20'}`}>🍄</span>
          ))}
        </div>
        {/* Level progress */}
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-white/60 mb-0.5">
            <span className="font-bold text-white">第 {uiLevel} 關</span>
            <span>{uiCleared}/{cfg.target}</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-mushroom-400 rounded-full transition-all duration-300"
              style={{ width: `${(uiCleared / cfg.target) * 100}%` }}
            />
          </div>
        </div>
        {/* Score */}
        <div className="text-white font-black text-xl min-w-[3rem] text-right">{uiScore}</div>
        <button onClick={() => navigate('/')} className="text-white/30 hover:text-white text-xs">✕</button>
      </div>

      {/* Ground */}
      <div className="absolute bottom-24 left-0 right-0 h-px bg-mushroom-400/30 z-10" />

      {/* Cannon */}
      <div className="absolute bottom-[5.5rem] left-1/2 z-10 text-4xl"
           style={{ transform: 'translateX(-50%) scaleX(-1)' }}>🔫</div>

      {/* Shot */}
      {shotTarget && (
        <div className="absolute left-1/2 bottom-[5.5rem] w-1 bg-yellow-300 rounded z-15"
             style={{
               height: `calc(${100 - shotTarget.y}% - 5.5rem)`,
               transform: 'translateX(-50%)',
               boxShadow: '0 0 10px #fcd34d',
               animation: 'fade350 0.35s ease-out forwards',
             }} />
      )}

      {/* Falling characters */}
      {chars.map(c => (
        <div key={c.id}
             className="absolute z-10 flex flex-col items-center pointer-events-none"
             style={{
               left: `${c.x}%`, top: `${c.y}%`,
               transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`,
               opacity: c.exploding ? 0 : 1,
               transition: c.exploding ? 'opacity 0.3s' : 'none',
             }}>
          <div className="text-4xl font-black leading-none"
               style={{ textShadow: '0 0 14px rgba(253,210,0,0.8)', color: '#fef3c7' }}>
            {c.char}
          </div>
          <div className="text-xs text-indigo-200 mt-0.5 bg-indigo-900/80 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            {c.py}
          </div>
        </div>
      ))}

      {/* Overlays */}
      {levelUpFlash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-5xl font-black text-yellow-300 bg-black/50 px-8 py-4 rounded-3xl"
               style={{ textShadow: '0 0 20px #fcd34d', animation: 'popIn 0.3s ease-out' }}>
            {levelUpFlash}
          </div>
        </div>
      )}
      {comboFlash && !levelUpFlash && (
        <div className="absolute top-20 left-0 right-0 flex justify-center pointer-events-none z-25">
          <div className="text-2xl font-black text-yellow-300">{comboFlash}</div>
        </div>
      )}

      {/* Input display */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 py-3 px-4 flex items-center gap-3 transition-colors
        ${wrongFlash ? 'bg-red-900/80' : 'bg-black/60'}`}>
        <span className="text-white/40 text-sm shrink-0">注音</span>
        <div className="flex-1 text-center text-3xl font-black tracking-widest min-h-[2.5rem] leading-tight text-yellow-200">
          {display || <span className="text-white/20 text-base font-normal">輸入注音消滅文字</span>}
        </div>
      </div>

      <style>{`
        @keyframes fade350 { from { opacity:1 } to { opacity:0 } }
        @keyframes popIn { from { transform:scale(0.5); opacity:0 } to { transform:scale(1); opacity:1 } }
      `}</style>
    </div>
  );
}
