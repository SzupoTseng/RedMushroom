/**
 * 筆順練習（擴充模組）
 *
 * 從零實作，用 Hanzi Writer（MIT 授權）+ Make-Me-A-Hanzi 開源筆畫資料。
 * 不參考也不衍生自 stroke.gh.miniasp.com（CC BY-NC-ND 3.0 不允許商用／衍生）。
 *
 * 功能：
 *   - 輸入任意中文字串（標點／英數會略過）
 *   - 每字一張卡，可單獨「播放筆順」、「臨摹練習」、「重來」
 *   - 速度滑桿（慢／中／快），筆畫粗細
 *   - 練習模式：使用者用滑鼠／觸控在田字格上描字，系統判斷正確
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HanziWriter from 'hanzi-writer';

const RE_CJK = /^[一-鿿]$/;

// Hanzi Writer 筆畫資料 CDN（jsdelivr 是 Hanzi Writer 官方推薦的免費 CDN）。
// 也可改為自架資料，但 CDN 免費且快取良好。
const STROKE_DATA_CDN =
  'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/{character}.json';

interface CharCardProps {
  char: string;
  speed: number;          // 1 = 1×（正常）； 2 = 2× （快）； 0.5 = 0.5× （慢）
  strokeWidth: number;    // 1–10
  showOutline: boolean;
}

function CharCard({ char, speed, strokeWidth, showOutline }: CharCardProps) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [status, setStatus] = useState<'idle' | 'animating' | 'practicing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!targetRef.current) return;
    setStatus('idle');
    setErrorMsg('');
    targetRef.current.innerHTML = ''; // 重新掛載時先清空

    try {
      writerRef.current = HanziWriter.create(targetRef.current, char, {
        width: 200,
        height: 200,
        padding: 8,
        showOutline,
        strokeAnimationSpeed: speed,
        delayBetweenStrokes: 200,
        strokeColor: '#1f2937',
        outlineColor: '#e5e7eb',
        radicalColor: '#d97706',
        charDataLoader: (c, onComplete, onError) => {
          fetch(STROKE_DATA_CDN.replace('{character}', c))
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.json();
            })
            .then((data) => onComplete(data))
            .catch((e) => onError && onError(e));
        },
        onLoadCharDataError: (e) => {
          // 筆畫資料庫沒有這個字（罕用字、異體字、簡體字等）
          setStatus('error');
          setErrorMsg(`筆畫資料缺：${e instanceof Error ? e.message : '查無此字'}`);
        },
      });
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : 'unknown error');
    }

    return () => {
      writerRef.current = null;
    };
  }, [char, speed, strokeWidth, showOutline]);

  const animate = () => {
    if (!writerRef.current) return;
    setStatus('animating');
    writerRef.current.animateCharacter({
      onComplete: () => setStatus('done'),
    });
  };

  const practice = () => {
    if (!writerRef.current) return;
    setStatus('practicing');
    writerRef.current.quiz({
      showHintAfterMisses: 3,
      onMistake: () => { /* future: 計分／統計 */ },
      onComplete: () => setStatus('done'),
    });
  };

  const reset = () => {
    if (!writerRef.current) return;
    writerRef.current.hideCharacter();
    writerRef.current.showOutline();
    setStatus('idle');
  };

  return (
    <article className="card flex flex-col items-center p-4 bg-white">
      <div className="mb-2 text-xs text-gray-400">{char}（U+{char.charCodeAt(0).toString(16).toUpperCase()}）</div>
      <div
        ref={targetRef}
        className="border-2 border-dashed border-amber-300 rounded-xl"
        style={{ width: 200, height: 200 }}
        aria-label={`筆順練習：${char}`}
      />
      {status === 'error' && (
        <p className="text-xs text-red-500 mt-2 text-center">{errorMsg}</p>
      )}
      <div className="flex gap-2 mt-3 flex-wrap justify-center">
        <button
          onClick={animate}
          disabled={status === 'animating' || status === 'practicing' || status === 'error'}
          className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
          type="button"
        >
          ▶ 播放筆順
        </button>
        <button
          onClick={practice}
          disabled={status === 'animating' || status === 'practicing' || status === 'error'}
          className="btn-primary text-sm py-1 px-3 disabled:opacity-50"
          type="button"
        >
          ✏️ 臨摹練習
        </button>
        <button
          onClick={reset}
          disabled={status === 'error'}
          className="btn-secondary text-sm py-1 px-3 disabled:opacity-50"
          type="button"
        >
          ↻ 重來
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {status === 'idle' && '按「播放」看示範，或按「臨摹」自己寫'}
        {status === 'animating' && '示範中…'}
        {status === 'practicing' && '用滑鼠／手指描字'}
        {status === 'done' && '✓ 完成'}
      </p>
    </article>
  );
}

export default function StrokePractice() {
  const navigate = useNavigate();
  const [rawText, setRawText] = useState<string>('學習進步');
  const [speed, setSpeed] = useState<number>(1);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [showOutline, setShowOutline] = useState<boolean>(true);

  const chars = useMemo(
    () => Array.from(new Set(Array.from(rawText).filter((c) => RE_CJK.test(c)))),
    [rawText],
  );

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary text-sm py-2 px-4"
          type="button"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-amber-700">🖋 筆順練習</h1>
        <span className="w-20" />
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <section className="card mb-4">
          <h2 className="font-bold text-gray-700 mb-3">設定</h2>

          <label className="block text-sm text-gray-500 mb-1">想練習的字（重複字會自動合併）</label>
          <input
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="例如：學習成長"
            className="w-full p-3 border-2 border-gray-300 rounded-xl text-lg
                       focus:border-amber-400 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            自動略過標點、數字、英文。目前 <strong className="text-amber-700">{chars.length}</strong> 個字。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">動畫速度</p>
              <div className="flex gap-2">
                {[
                  { v: 0.5, label: '慢' },
                  { v: 1,   label: '中' },
                  { v: 2,   label: '快' },
                ].map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setSpeed(s.v)}
                    type="button"
                    className={
                      `px-3 py-1 rounded-lg border-2 text-sm ` +
                      (speed === s.v
                        ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold'
                        : 'bg-white border-gray-300 hover:border-amber-300')
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">筆畫粗細</p>
              <input
                type="range"
                min={1}
                max={10}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(+e.target.value)}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{strokeWidth}</span>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">顯示字形外框</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOutline}
                  onChange={(e) => setShowOutline(e.target.checked)}
                />
                顯示（淡灰色）
              </label>
            </div>
          </div>
        </section>

        {chars.length === 0 ? (
          <p className="text-center text-gray-400 py-10">請在上方輸入要練習的字</p>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {chars.map((c) => (
              <CharCard
                key={c}
                char={c}
                speed={speed}
                strokeWidth={strokeWidth}
                showOutline={showOutline}
              />
            ))}
          </section>
        )}

        <p className="text-xs text-gray-400 mt-6 text-center">
          筆順動畫：<a href="https://hanziwriter.org/" target="_blank" rel="noreferrer" className="underline">Hanzi Writer</a>（MIT）
          ／筆畫資料：<a href="https://github.com/skishore/makemeahanzi" target="_blank" rel="noreferrer" className="underline">Make-Me-A-Hanzi</a>（Arphic Public License）
        </p>
      </main>
    </div>
  );
}
