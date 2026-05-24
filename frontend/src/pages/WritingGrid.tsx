/**
 * 田字格習字紙（擴充模組）
 *
 * 從零實作的「列印用田字格紙」：
 *   - 使用者貼入要練習的字
 *   - 每個字佔一個田字格，後面跟著空白方格供臨摹
 *   - 田字格背景由 CSS 即時繪製（無需外部資料、無筆畫資料庫依賴）
 *   - 漢字使用我們自帶的注音字型（自帶注音標註）
 *
 * 不引入任何外部筆畫資料；筆順練習由學生對照書本進行。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';

type GridType = 'tianzi' | 'mizi'; // 田字格 / 米字格
type FillMode = 'first' | 'all' | 'none'; // 只示範第一格、全部示範、空白

interface Settings {
  rawText: string;
  cellsPerChar: number;   // 每個字後面跟幾個空格
  rowsPerPage: number;
  gridType: GridType;
  fillMode: FillMode;
  showGuide: boolean;     // 灰色描紅
}

const DEFAULT: Settings = {
  rawText: '',
  cellsPerChar: 5,
  rowsPerPage: 10,
  gridType: 'tianzi',
  fillMode: 'first',
  showGuide: true,
};

const RE_CJK = /[一-鿿]/;

export default function WritingGrid() {
  const navigate = useNavigate();
  const { bpmfFont } = useConfig();
  const [settings, setSettings] = useState<Settings>(DEFAULT);

  const chars = useMemo<string[]>(
    () => Array.from(settings.rawText).filter((c) => RE_CJK.test(c)),
    [settings.rawText],
  );

  const useBpmfFont = bpmfFont !== 'none';

  /**
   * 每個字構造一條「練習列」：
   *   [示範字格] [空格] [空格] ... 共 cellsPerChar 格
   */
  const renderRow = (char: string, rowIdx: number) => {
    return (
      <div key={rowIdx} className="flex border-t border-gray-300 last:border-b">
        {Array.from({ length: settings.cellsPerChar }, (_, i) => {
          const showChar =
            settings.fillMode === 'all' ||
            (settings.fillMode === 'first' && i === 0);
          const guide =
            settings.showGuide &&
            settings.fillMode !== 'all' &&
            i > 0 &&
            i < 3; // 前 2 個臨摹格放淡色描紅
          return (
            <div
              key={i}
              className={
                `grid-cell ${settings.gridType === 'tianzi' ? 'tianzi' : 'mizi'} ` +
                'flex items-center justify-center'
              }
            >
              {showChar && (
                <span className={`grid-char ${useBpmfFont ? 'bpmf-font' : ''}`}>
                  {char}
                </span>
              )}
              {!showChar && guide && (
                <span
                  className={`grid-char grid-guide ${useBpmfFont ? 'bpmf-font' : ''}`}
                >
                  {char}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between no-print">
        <button
          onClick={() => navigate('/')}
          className="btn-secondary text-sm py-2 px-4"
          type="button"
        >
          ← 返回
        </button>
        <h1 className="text-xl font-bold text-amber-700">✍️ 田字格習字紙</h1>
        <button
          onClick={() => window.print()}
          disabled={chars.length === 0}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          type="button"
        >
          🖨 列印
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <section className="card no-print mb-4">
          <h2 className="font-bold text-gray-700 mb-3">設定</h2>

          <label className="block text-sm text-gray-500 mb-1">要練習的字（請貼入或輸入）</label>
          <textarea
            value={settings.rawText}
            onChange={(e) => setSettings((s) => ({ ...s, rawText: e.target.value }))}
            placeholder="例如：學習進步成長"
            className="w-full h-24 p-3 border-2 border-gray-300 rounded-xl text-lg
                       focus:border-amber-400 outline-none resize-y"
          />
          <p className="text-xs text-gray-400 mt-1">
            只會練習中文字，標點符號、數字、英文會自動略過。
            目前共 <span className="font-bold text-amber-700">{chars.length}</span> 個字。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">每字格數</p>
              <input
                type="number"
                min={2}
                max={15}
                value={settings.cellsPerChar}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, cellsPerChar: Math.max(2, Math.min(15, +e.target.value)) }))
                }
                className="w-20 px-2 py-1 border rounded"
              />
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">格類型</p>
              <div className="flex gap-2">
                {(['tianzi', 'mizi'] as GridType[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setSettings((s) => ({ ...s, gridType: g }))}
                    type="button"
                    className={
                      `px-3 py-1 rounded-lg border-2 text-sm ` +
                      (settings.gridType === g
                        ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold'
                        : 'bg-white border-gray-300')
                    }
                  >
                    {g === 'tianzi' ? '田字格' : '米字格'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">示範模式</p>
              <select
                value={settings.fillMode}
                onChange={(e) => setSettings((s) => ({ ...s, fillMode: e.target.value as FillMode }))}
                className="px-3 py-1 border-2 border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="first">第一格示範</option>
                <option value="all">全部示範（描紅）</option>
                <option value="none">全部空白</option>
              </select>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">前 2 格淡色描紅</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.showGuide}
                  onChange={(e) => setSettings((s) => ({ ...s, showGuide: e.target.checked }))}
                />
                啟用
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            漢字使用您在主畫面選擇的注音字型（目前：
            <span className="font-bold">{bpmfFont === 'none' ? '不用字型' : bpmfFont}</span>）。
            列印時請在瀏覽器列印對話框勾選「列印背景圖形」以保留方格線。
          </p>
        </section>

        {/* 練習紙 */}
        <section className="card bg-white">
          <h2 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3">
            習字紙
            <span className="ml-3 text-xs font-normal text-gray-500">
              姓名：__________　日期：__________
            </span>
          </h2>
          {chars.length === 0 ? (
            <p className="text-gray-400 py-12 text-center">
              請在上方輸入想要練習的字。
            </p>
          ) : (
            <div className="writing-grid-page">
              {chars.map((c, i) => renderRow(c, i))}
            </div>
          )}
        </section>

        <p className="text-xs text-gray-400 mt-4 text-center no-print">
          田字格、米字格皆以 CSS 即時繪製，本工具不依賴任何外部筆畫資料庫。
        </p>
      </main>
    </div>
  );
}
