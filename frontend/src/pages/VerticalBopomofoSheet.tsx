/**
 * 豎排注音摹寫學習單（擴充模組）
 *
 * 貼一篇短文章 → 產生直排（由右至左）的注音學習單：
 *   - 每個字一格：上方漢字（可選），下方該字的注音（直排），旁邊淡色注音供摹寫
 *   - 直排、右到左，符合台灣課本閱讀方向
 *   - 每字讀音取自本機字典 /api/dict/charmap（主讀音）
 *
 * 概念參考通用注音教學，無複製任何第三方版面／插圖。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BopomofoColumn from '../components/common/BopomofoColumn';

type TraceMode = 'faded' | 'blank';

const RE_CJK = /[一-鿿]/;

export default function VerticalBopomofoSheet() {
  const navigate = useNavigate();
  const [rawText, setRawText] = useState('');
  const [charsPerCol, setCharsPerCol] = useState(10);
  const [showHan, setShowHan] = useState(true);
  const [traceMode, setTraceMode] = useState<TraceMode>('faded');
  // context-correct per-char readings from the backend (longest-prefix match)
  const [annotated, setAnnotated] = useState<Array<{ char: string; pinyin: string }>>([]);
  const [loading, setLoading] = useState(false);

  // Debounced annotate of the whole article (so polyphonic chars use word
  // context: 正式→ㄓㄥˋ, 中華→ㄏㄨㄚˊ — not the dict's first single-char reading).
  useEffect(() => {
    const text = rawText.trim();
    if (!text) { setAnnotated([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/dict/annotate?q=${encodeURIComponent(text.slice(0, 1500))}`)
        .then((r) => (r.ok ? r.json() : { chars: [] }))
        .then((d: { chars?: Array<{ char: string; pinyin: string }> }) => setAnnotated(d.chars ?? []))
        .catch(() => setAnnotated([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [rawText]);

  // keep only Han chars (annotate returns punctuation/spaces too)
  const cells = useMemo(
    () => annotated.filter((c) => RE_CJK.test(c.char)).map((c) => ({ char: c.char, reading: c.pinyin })),
    [annotated],
  );

  // chunk into columns (top→bottom); columns later laid right→left
  const columns = useMemo(() => {
    const out: Array<typeof cells> = [];
    for (let i = 0; i < cells.length; i += charsPerCol) {
      out.push(cells.slice(i, i + charsPerCol));
    }
    return out;
  }, [cells, charsPerCol]);

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between no-print">
        <button onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-4" type="button">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-amber-700">📜 豎排注音摹寫學習單</h1>
        <button
          onClick={() => window.print()}
          disabled={cells.length === 0}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          type="button"
        >
          🖨 列印
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <section className="card no-print mb-4">
          <h2 className="font-bold text-gray-700 mb-3">設定</h2>
          <label className="block text-sm text-gray-500 mb-1">貼上短文章</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="例如：小明和爸爸一起去公園玩。"
            className="w-full h-28 p-3 border-2 border-gray-300 rounded-xl text-lg focus:border-amber-400 outline-none resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">
            只取中文字，標點／英數會略過。目前 <span className="font-bold text-amber-700">{cells.length}</span> 個字
            {loading && '（字典載入中…）'}。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">每行字數</p>
              <input
                type="number"
                min={4}
                max={20}
                value={charsPerCol}
                onChange={(e) => setCharsPerCol(Math.max(4, Math.min(20, +e.target.value)))}
                className="w-20 px-2 py-1 border rounded"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">摹寫欄</p>
              <select
                value={traceMode}
                onChange={(e) => setTraceMode(e.target.value as TraceMode)}
                className="px-3 py-1 border-2 border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="faded">淡色注音（描寫）</option>
                <option value="blank">空白（自己寫）</option>
              </select>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">顯示漢字</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showHan} onChange={(e) => setShowHan(e.target.checked)} />
                每格上方顯示漢字
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            直排、由右至左。讀音取主讀音；破音字若需特定讀音請自行核對。
          </p>
        </section>

        <section className="card bg-white">
          <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3">
            豎排注音摹寫
            <span className="ml-3 text-xs font-normal text-gray-500">姓名：__________　日期：__________</span>
          </h2>
          {cells.length === 0 ? (
            <p className="text-gray-400 py-12 text-center">請在上方貼入短文章。</p>
          ) : (
            <div className="vbpmf-page">
              {columns.map((col, ci) => (
                <div key={ci} className="vbpmf-col">
                  {col.map((cell, ri) => (
                    <div key={ri} className="vbpmf-cell">
                      {showHan && <span className="vbpmf-han">{cell.char}</span>}
                      <div className="vbpmf-readings">
                        <BopomofoColumn reading={cell.reading} className="vbpmf-model" />
                        <BopomofoColumn
                          reading={traceMode === 'faded' ? cell.reading : ''}
                          className="vbpmf-trace"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-gray-400 mt-4 text-center no-print">
          注音以 CSS 直排呈現；讀音來自本機字典，無外部依賴。
        </p>
      </main>
    </div>
  );
}
