/**
 * 注音符號習字紙（擴充模組）
 *
 * 從零實作的「列印用注音符號練習紙」：
 *   - 從 37 個注音符號（21 聲母 + 3 介音 + 13 韻母）勾選全部或部分
 *   - 每個符號一列：第一格示範，後面數格淡色描寫 + 空白格供練習
 *   - 方格背景由 CSS 即時繪製，無外部依賴
 *
 * 概念參考通用注音教學，無複製任何第三方版面／插圖。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type FillMode = 'first' | 'all' | 'none';

// 37 個注音符號，依教學分組
const GROUPS: Array<{ name: string; symbols: string[] }> = [
  { name: '聲母（21）', symbols: ['ㄅ','ㄆ','ㄇ','ㄈ','ㄉ','ㄊ','ㄋ','ㄌ','ㄍ','ㄎ','ㄏ','ㄐ','ㄑ','ㄒ','ㄓ','ㄔ','ㄕ','ㄖ','ㄗ','ㄘ','ㄙ'] },
  { name: '介音（3）',  symbols: ['ㄧ','ㄨ','ㄩ'] },
  { name: '韻母（13）', symbols: ['ㄚ','ㄛ','ㄜ','ㄝ','ㄞ','ㄟ','ㄠ','ㄡ','ㄢ','ㄣ','ㄤ','ㄥ','ㄦ'] },
];
const ALL_SYMBOLS = GROUPS.flatMap((g) => g.symbols);

export default function BopomofoSymbolSheet() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_SYMBOLS));
  const [cellsPerRow, setCellsPerRow] = useState(8);
  const [fillMode, setFillMode] = useState<FillMode>('first');
  const [showGuide, setShowGuide] = useState(true);

  const toggle = (s: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  const selectAll = () => setSelected(new Set(ALL_SYMBOLS));
  const clearAll = () => setSelected(new Set());
  const toggleGroup = (syms: string[]) =>
    setSelected((prev) => {
      const allOn = syms.every((s) => prev.has(s));
      const next = new Set(prev);
      syms.forEach((s) => (allOn ? next.delete(s) : next.add(s)));
      return next;
    });

  const rows = ALL_SYMBOLS.filter((s) => selected.has(s));

  const renderRow = (sym: string) => (
    <div key={sym} className="flex border-t border-gray-300 last:border-b">
      {Array.from({ length: cellsPerRow }, (_, i) => {
        const showSolid = fillMode === 'all' || (fillMode === 'first' && i === 0);
        const guide = showGuide && fillMode !== 'all' && i > 0 && i < 3;
        return (
          <div key={i} className="grid-cell tianzi flex items-center justify-center">
            {showSolid && <span className="grid-char">{sym}</span>}
            {!showSolid && guide && <span className="grid-char grid-guide">{sym}</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between no-print">
        <button onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-4" type="button">
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-amber-700">ㄅ 注音符號習字紙</h1>
        <button
          onClick={() => window.print()}
          disabled={rows.length === 0}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          type="button"
        >
          🖨 列印
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <section className="card no-print mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-700">選擇符號</h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="btn-secondary text-xs py-1 px-3" type="button">全選</button>
              <button onClick={clearAll} className="btn-secondary text-xs py-1 px-3" type="button">清除</button>
            </div>
          </div>

          {GROUPS.map((g) => (
            <div key={g.name} className="mb-3">
              <button
                onClick={() => toggleGroup(g.symbols)}
                type="button"
                className="text-xs text-amber-700 font-bold mb-1 hover:underline"
              >
                {g.name}（點此切換整組）
              </button>
              <div className="flex flex-wrap gap-1.5">
                {g.symbols.map((s) => {
                  const on = selected.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggle(s)}
                      type="button"
                      className={
                        `w-10 h-10 rounded-lg border-2 text-xl transition-all ` +
                        (on
                          ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                          : 'bg-white border-gray-200 text-gray-400')
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-gray-100 pt-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">每列格數</p>
              <input
                type="number"
                min={3}
                max={15}
                value={cellsPerRow}
                onChange={(e) => setCellsPerRow(Math.max(3, Math.min(15, +e.target.value)))}
                className="w-20 px-2 py-1 border rounded"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">示範模式</p>
              <select
                value={fillMode}
                onChange={(e) => setFillMode(e.target.value as FillMode)}
                className="px-3 py-1 border-2 border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="first">第一格示範</option>
                <option value="all">全部示範（描紅）</option>
                <option value="none">全部空白</option>
              </select>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">前 2 格淡色描寫</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} />
                啟用
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            已選 <span className="font-bold text-amber-700">{rows.length}</span> / 37 個符號。
            列印時請在瀏覽器列印對話框勾選「列印背景圖形」以保留方格線。
          </p>
        </section>

        <section className="card bg-white">
          <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3">
            注音符號習字紙
            <span className="ml-3 text-xs font-normal text-gray-500">姓名：__________　日期：__________</span>
          </h2>
          {rows.length === 0 ? (
            <p className="text-gray-400 py-12 text-center">請在上方勾選要練習的注音符號。</p>
          ) : (
            <div className="writing-grid-page">{rows.map(renderRow)}</div>
          )}
        </section>

        <p className="text-xs text-gray-400 mt-4 text-center no-print">
          方格以 CSS 即時繪製，本工具不依賴任何外部資料。
        </p>
      </main>
    </div>
  );
}
