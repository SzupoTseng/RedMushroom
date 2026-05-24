/**
 * 讀音工具（Reading Tool）— 仿 Bpmf_VSIME 原工具的「貼上文章 → 標注注音」流程。
 *
 * 流程：
 *   1. 使用者貼入文章 → 按「開始」
 *   2. 每個漢字旁邊自動顯示主讀音（注音符號）
 *   3. 破音字（≥ 2 個讀音）以「黃色」高亮
 *   4. 點擊破音字 → 底部欄列出全部讀音，可切換選擇（綠色 = 已選擇）
 *   5. 右側「字典」面板顯示當前字／詞的釋義
 *   6. 按「完成」→ 可複製整段文字（含注音）
 *
 * 對應原工具的狀態顏色：
 *   - 黃色 .p     ：多音字（未確定讀音）
 *   - 粉色 .fuzzy ：難猜測字（多種讀音都常用）— 本實作簡化為與多音字一致
 *   - 橘色 .auto  ：已自動猜測讀音（這裡用首讀音當預設）
 *   - 青色 .ok    ：使用者手動選擇過的讀音
 *
 * 資料來源：ToneOZ 澳聲通字典（MIT 授權，移植自 D:\GameDevZ\dyin\2讀音選擇工具_Bpmf_VSIME）
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BopomofoColumn from '../components/common/BopomofoColumn';

interface CharMap { [char: string]: string[] }
interface DictEntry { zhuyin: string; definition: string }
interface LookupResponse {
  query: string;
  found: boolean;
  word?: string;
  matchType?: 'exact' | 'prefix' | 'char' | null;
  entries?: DictEntry[];
  perChar?: Array<{ char: string; entries: DictEntry[] }>;
}

const RE_CJK = /^[一-鿿]$/;

const SAMPLE_TEXT =
  '小明和爸爸一起去學校。學校門口有一棵很長的樹，樹上有兩隻小鳥在唱歌。' +
  '老師說：「今天我們要學習新的課文，請大家把書打開。」';

export default function ReadingTool() {
  const navigate = useNavigate();
  const [rawText, setRawText] = useState<string>('');
  const [started, setStarted] = useState(false);
  const [charMap, setCharMap] = useState<CharMap>({});
  const [loadingMap, setLoadingMap] = useState(true);
  // selectedReadings[i] = which reading index the user picked for position i.
  // Default 0 = primary auto-guess; bumped on click.
  const [selectedReadings, setSelectedReadings] = useState<Record<number, number>>({});
  // Per-position flag: did the user manually choose? (turns char green)
  const [manualChoice, setManualChoice] = useState<Record<number, boolean>>({});
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [dictData, setDictData] = useState<LookupResponse | null>(null);
  const [dictLoading, setDictLoading] = useState(false);

  // Load char map on mount
  useEffect(() => {
    fetch('/api/dict/charmap')
      .then((r) => r.json())
      .then((d: { chars: CharMap }) => setCharMap(d.chars))
      .catch((e) => console.warn('[ReadingTool] charmap load failed', e))
      .finally(() => setLoadingMap(false));
  }, []);

  // Split rawText into an array of "tokens" (chars). Keep all chars (including
  // punctuation/spaces) so the layout reflects original text exactly.
  const tokens = useMemo<string[]>(() => Array.from(rawText), [rawText]);

  const start = () => {
    if (!rawText.trim()) return;
    setSelectedReadings({});
    setManualChoice({});
    setCurrentIdx(null);
    setStarted(true);
  };

  const reset = () => {
    setStarted(false);
    setCurrentIdx(null);
    setDictData(null);
  };

  // Look up the word starting at idx (greedy: try 4, 3, 2, 1 chars)
  const lookupAt = async (idx: number) => {
    const candidates: string[] = [];
    for (let len = 4; len >= 1; len--) {
      const slice = tokens.slice(idx, idx + len).join('');
      if (slice.length === len && Array.from(slice).every((c) => RE_CJK.test(c))) {
        candidates.push(slice);
      }
    }
    setDictLoading(true);
    setDictData(null);
    for (const q of candidates) {
      try {
        const r = await fetch(`/api/dict/lookup?q=${encodeURIComponent(q)}`);
        if (!r.ok) continue;
        const json = (await r.json()) as LookupResponse;
        if (json.found && json.matchType === 'exact') {
          setDictData(json);
          setDictLoading(false);
          return;
        }
      } catch { /* try next */ }
    }
    // Fall back to single-char lookup
    try {
      const c = tokens[idx];
      const r = await fetch(`/api/dict/lookup?q=${encodeURIComponent(c)}`);
      if (r.ok) setDictData((await r.json()) as LookupResponse);
    } catch { /* ignore */ }
    setDictLoading(false);
  };

  const onCharClick = (idx: number) => {
    const c = tokens[idx];
    if (!RE_CJK.test(c)) return;
    setCurrentIdx(idx);
    lookupAt(idx);
  };

  const pickReading = (idx: number, readingIdx: number) => {
    setSelectedReadings((m) => ({ ...m, [idx]: readingIdx }));
    setManualChoice((m) => ({ ...m, [idx]: true }));
  };

  // Find the previous / next polyphonic char (≥2 readings) in the text
  const findNext = (from: number, dir: 1 | -1): number | null => {
    let i = from + dir;
    while (i >= 0 && i < tokens.length) {
      const c = tokens[i];
      if (RE_CJK.test(c) && (charMap[c]?.length ?? 0) >= 2) return i;
      i += dir;
    }
    return null;
  };
  const goPrev = () => {
    if (currentIdx === null) return;
    const next = findNext(currentIdx, -1);
    if (next !== null) onCharClick(next);
  };
  const goNext = () => {
    if (currentIdx === null) return;
    const next = findNext(currentIdx, 1);
    if (next !== null) onCharClick(next);
  };

  // Render the annotated paragraph.
  // Each Chinese char becomes a `.char-block`: the char on the left, the
  // bopomofo column on the right (vertical), matching the original Bpmf_VSIME
  // tool's layout. Punctuation, whitespace, and English passes through.
  const renderTokens = () => tokens.map((c, i) => {
    if (c === '\n') return <br key={i} />;
    if (!RE_CJK.test(c)) {
      return <span key={i}>{c}</span>;
    }
    const readings = charMap[c] ?? [];
    const isPolyphonic = readings.length >= 2;
    const readingIdx = selectedReadings[i] ?? 0;
    const reading = readings[readingIdx] ?? readings[0] ?? '';
    const isCurr = currentIdx === i;
    const isManual = manualChoice[i];

    const bg = isManual
      ? 'bg-emerald-200'                     // 已選擇讀音
      : isPolyphonic
        ? 'bg-yellow-200'                    // 多音字（未選擇）
        : '';
    const border = isCurr ? 'outline outline-2 outline-mushroom-500' : '';
    const hover = 'cursor-pointer hover:bg-mushroom-100';

    return (
      <span
        key={i}
        className={`char-block ${bg} ${border} ${hover}`}
        onClick={() => onCharClick(i)}
      >
        <span className="char">{c}</span>
        <BopomofoColumn reading={reading} />
      </span>
    );
  });

  // Current char's available readings (for bottom picker)
  const currentChar = currentIdx !== null ? tokens[currentIdx] : '';
  const currentReadings = currentChar ? (charMap[currentChar] ?? []) : [];

  return (
    <div className="min-h-screen bg-mushroom-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary text-sm py-2 px-4"
          type="button"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-mushroom-700">📖 讀音工具</h1>
        {started ? (
          <button
            onClick={reset}
            className="btn-secondary text-sm py-2 px-4"
            type="button"
          >
            重新貼上
          </button>
        ) : (
          <span className="w-20" />
        )}
      </header>

      {/* Legend (matches original Bpmf_VSIME color codes) */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-sm flex flex-wrap gap-x-6 gap-y-1">
        <span><span className="inline-block w-5 h-5 bg-yellow-200 align-middle rounded mr-1" /> 多音字（請選擇讀音）</span>
        <span><span className="inline-block w-5 h-5 bg-emerald-200 align-middle rounded mr-1" /> 已選擇讀音</span>
        <span><span className="inline-block w-5 h-5 outline outline-2 outline-mushroom-500 align-middle rounded mr-1" /> 目前焦點</span>
      </div>

      {!started ? (
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-gray-600 mb-3">
            把任意文章貼進下面，按「開始」會自動標上注音。系統會把<strong className="text-amber-700">多音字（破音字）</strong>用黃色高亮，
            點擊就能切換讀音、看完整釋義。
          </p>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="貼上中文文章…"
            className="w-full h-60 p-4 border-2 border-gray-300 rounded-xl
                       text-lg focus:border-mushroom-400 outline-none resize-y"
          />
          <div className="mt-4 flex gap-3 flex-wrap">
            <button
              onClick={start}
              disabled={!rawText.trim() || loadingMap}
              className="btn-primary text-lg disabled:opacity-50"
              type="button"
            >
              {loadingMap ? '載入字典中…' : '開始 ▶'}
            </button>
            <button
              onClick={() => setRawText(SAMPLE_TEXT)}
              className="btn-secondary"
              type="button"
            >
              載入範例文章
            </button>
            <button
              onClick={() => setRawText('')}
              className="btn-secondary"
              type="button"
            >
              清空
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            資料來源：ToneOZ 澳聲通字典（MIT 授權），移植自 ButTaiwan/Bpmf_VSIME。
          </p>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Annotated text area — line-height 2.0 gives each row breathing room
              without spreading the page out vertically (original tool uses ~2x). */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow border border-gray-200 p-6 leading-[2] text-xl">
            {renderTokens()}
          </section>

          {/* Right-side dictionary panel */}
          <aside className="bg-white rounded-2xl shadow border border-gray-200 p-4 sticky top-4 self-start max-h-[80vh] overflow-y-auto">
            <h2 className="text-base font-bold text-mushroom-700 border-b border-gray-100 pb-2 mb-3">
              📚 字典
            </h2>
            {currentIdx === null && (
              <p className="text-sm text-gray-400">點擊任意漢字查看釋義</p>
            )}
            {dictLoading && <p className="text-sm text-gray-400">查詢中…</p>}
            {!dictLoading && dictData?.found && dictData.entries && (
              <div>
                <p className="font-bold text-lg mb-2 bpmf-font">{dictData.word}</p>
                {dictData.entries.map((e, i) => (
                  <article key={i} className="mb-3 pb-3 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                    <div className="inline-flex items-center bg-mushroom-100 text-mushroom-900 px-3 py-1.5 rounded-lg text-sm font-bold mb-1 gap-1">
                      {/* 多音節（如「學校」）以空格分隔，逐個直排 */}
                      {e.zhuyin.split(/\s+/).filter(Boolean).map((syl, j) => (
                        <BopomofoColumn key={j} reading={syl} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                      {e.definition}
                    </p>
                  </article>
                ))}
              </div>
            )}
            {!dictLoading && dictData && !dictData.found && (
              <p className="text-sm text-gray-500">字典中沒有此字／詞的紀錄。</p>
            )}
          </aside>
        </main>
      )}

      {/* Bottom reading picker (only when a polyphonic char is selected) */}
      {started && currentIdx !== null && currentReadings.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-cyan-100 border-t-2 border-cyan-300 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={goPrev}
              type="button"
              className="text-2xl text-mushroom-600 hover:text-mushroom-800 px-2"
              aria-label="上一個多音字"
              title="上一個多音字"
            >
              ◄
            </button>
            <span className="text-base text-gray-600">
              「<span className="bpmf-font font-bold text-mushroom-900">{currentChar}</span>」的讀音：
            </span>
            {currentReadings.map((r, i) => {
              const isSelected = (selectedReadings[currentIdx] ?? 0) === i;
              return (
                <button
                  key={i}
                  onClick={() => pickReading(currentIdx, i)}
                  type="button"
                  className={
                    `px-2 py-1 rounded-lg border-2 transition-all ` +
                    (isSelected
                      ? 'bg-emerald-100 border-emerald-400'
                      : 'bg-white border-gray-300 hover:border-mushroom-400 hover:bg-mushroom-50')
                  }
                  aria-label={`${currentChar} 讀作 ${r}`}
                >
                  <span className="char-block text-4xl">
                    <span className="char">{currentChar}</span>
                    <BopomofoColumn reading={r} />
                  </span>
                </button>
              );
            })}
            {currentReadings.length === 1 && (
              <span className="text-xs text-gray-400 ml-2">（只有 1 種讀音）</span>
            )}
            <button
              onClick={goNext}
              type="button"
              className="text-2xl text-mushroom-600 hover:text-mushroom-800 px-2 ml-auto"
              aria-label="下一個多音字"
              title="下一個多音字"
            >
              ►
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
