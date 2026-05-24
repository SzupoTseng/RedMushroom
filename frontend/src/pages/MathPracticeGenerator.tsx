/**
 * 數學練習產生器（擴充模組）
 *
 * 純程序化生成國小數學練習題：
 *   - 運算：加、減、乘、除（可多選）
 *   - 難度：1–10 / 1–20 / 1–50 / 1–100，或自訂範圍
 *   - 題數：5–100
 *   - 運算元個數：2–4（連加、連減等）
 *   - 整數除法保證整除、減法保證非負
 *   - 一鍵列印（CSS @media print 隱藏設定區）
 *
 * 由 RedMushroom 從零實作；數學知識為公領域，不引入外部資料。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Op = '+' | '-' | '×' | '÷';

interface Question {
  expr: string;       // "12 + 3"
  answer: number;     // 15
}

interface Settings {
  ops: Record<Op, boolean>;
  rangeMin: number;
  rangeMax: number;
  count: number;
  operands: number;   // 2 = 兩運算元；3 = 連算
  showAnswers: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  ops: { '+': true, '-': true, '×': false, '÷': false },
  rangeMin: 1,
  rangeMax: 20,
  count: 20,
  operands: 2,
  showAnswers: false,
};

const PRESETS: Array<{ label: string; min: number; max: number }> = [
  { label: '1 – 10（簡單）', min: 1, max: 10 },
  { label: '1 – 20（中等）', min: 1, max: 20 },
  { label: '1 – 50（較難）', min: 1, max: 50 },
  { label: '1 – 100（困難）', min: 1, max: 100 },
];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const evalBinary = (a: number, b: number, op: Op): number => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return a / b;
  }
};

/**
 * 產生單一題目。policy：
 *   - 減法：確保結果 ≥ 0
 *   - 除法：先選結果與除數，再算被除數，保證整除
 *   - 乘法：max 自動 cap 至 12，避免結果過大難算
 *   - 多運算元：每個中間結果都符合上述條件
 */
function makeQuestion(ops: Op[], min: number, max: number, operands: number): Question {
  if (operands < 2) operands = 2;
  let acc = randInt(min, max);
  const parts: string[] = [acc.toString()];

  for (let i = 1; i < operands; i++) {
    let op = ops[randInt(0, ops.length - 1)];
    let next: number;

    if (op === '+') {
      next = randInt(min, max);
    } else if (op === '-') {
      // 確保 acc - next >= 0
      next = randInt(min, Math.max(min, acc));
    } else if (op === '×') {
      const cap = Math.min(max, 12);
      next = randInt(Math.max(1, min), cap);
    } else {
      // 除法：next 不為 0，且 acc 必須能整除 next
      // 從 acc 的因數中選一個
      const factors: number[] = [];
      for (let f = 2; f <= Math.min(acc, max); f++) {
        if (acc % f === 0) factors.push(f);
      }
      if (factors.length === 0) {
        // 無法整除：退化為加法
        op = '+';
        next = randInt(min, max);
      } else {
        next = factors[randInt(0, factors.length - 1)];
      }
    }

    acc = evalBinary(acc, next, op);
    parts.push(op, next.toString());
  }

  return { expr: parts.join(' '), answer: acc };
}

function generateAll(s: Settings): Question[] {
  const ops = (Object.keys(s.ops) as Op[]).filter((o) => s.ops[o]);
  if (ops.length === 0) return [];
  return Array.from({ length: s.count }, () =>
    makeQuestion(ops, s.rangeMin, s.rangeMax, s.operands),
  );
}

export default function MathPracticeGenerator() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<Question[]>([]);

  // 初次進入自動產生
  useEffect(() => { setQuestions(generateAll(DEFAULT_SETTINGS)); }, []);

  const opCount = useMemo(
    () => Object.values(settings.ops).filter(Boolean).length,
    [settings.ops],
  );

  const regenerate = () => setQuestions(generateAll(settings));

  const toggleOp = (op: Op) => {
    setSettings((s) => ({ ...s, ops: { ...s.ops, [op]: !s.ops[op] } }));
  };
  const setPreset = (min: number, max: number) =>
    setSettings((s) => ({ ...s, rangeMin: min, rangeMax: max }));

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
        <h1 className="text-xl font-bold text-amber-700">📝 數學練習產生器</h1>
        <button
          onClick={() => window.print()}
          className="btn-primary text-sm py-2 px-4"
          type="button"
        >
          🖨 列印
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {/* 設定區 */}
        <section className="card no-print mb-4">
          <h2 className="font-bold text-gray-700 mb-3">出題設定</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">運算類型（可多選）</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(settings.ops) as Op[]).map((op) => (
                  <button
                    key={op}
                    onClick={() => toggleOp(op)}
                    type="button"
                    className={
                      `px-4 py-2 rounded-xl border-2 font-bold text-lg ` +
                      (settings.ops[op]
                        ? 'bg-amber-100 border-amber-400 text-amber-800'
                        : 'bg-white border-gray-300 text-gray-500 hover:border-amber-300')
                    }
                  >
                    {op === '+' ? '加 +' : op === '-' ? '減 −' : op === '×' ? '乘 ×' : '除 ÷'}
                  </button>
                ))}
              </div>
              {opCount === 0 && (
                <p className="text-xs text-red-500 mt-1">請至少選一種運算</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">難度（數字範圍）</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const active = settings.rangeMin === p.min && settings.rangeMax === p.max;
                  return (
                    <button
                      key={p.label}
                      onClick={() => setPreset(p.min, p.max)}
                      type="button"
                      className={
                        `px-3 py-2 rounded-xl border-2 text-sm ` +
                        (active
                          ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold'
                          : 'bg-white border-gray-300 hover:border-amber-300')
                      }
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <span>自訂：</span>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={settings.rangeMin}
                  onChange={(e) => setSettings((s) => ({ ...s, rangeMin: Math.max(1, +e.target.value || 1) }))}
                  className="w-16 px-2 py-1 border rounded"
                />
                <span>–</span>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={settings.rangeMax}
                  onChange={(e) => setSettings((s) => ({ ...s, rangeMax: Math.max(s.rangeMin, +e.target.value || s.rangeMin) }))}
                  className="w-16 px-2 py-1 border rounded"
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">題數</p>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={settings.count}
                onChange={(e) => setSettings((s) => ({ ...s, count: +e.target.value }))}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{settings.count} 題</span>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">運算元個數（連算）</p>
              <select
                value={settings.operands}
                onChange={(e) => setSettings((s) => ({ ...s, operands: +e.target.value }))}
                className="px-3 py-2 border-2 border-gray-300 rounded-xl bg-white"
              >
                <option value={2}>2 個（a ○ b）</option>
                <option value={3}>3 個（a ○ b ○ c）</option>
                <option value={4}>4 個（a ○ b ○ c ○ d）</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={regenerate}
              disabled={opCount === 0}
              type="button"
              className="btn-primary disabled:opacity-50"
            >
              重新出題
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.showAnswers}
                onChange={(e) => setSettings((s) => ({ ...s, showAnswers: e.target.checked }))}
              />
              顯示答案（給家長／老師對答案）
            </label>
          </div>
        </section>

        {/* 練習單 */}
        <section className="card bg-white">
          <div className="border-b border-gray-200 pb-2 mb-3">
            <h2 className="text-lg font-bold">數學練習題</h2>
            <p className="text-xs text-gray-500 mt-1">
              姓名：__________　班級：__________　日期：__________　得分：__________
            </p>
          </div>

          {questions.length === 0 ? (
            <p className="text-gray-400 py-6 text-center">尚未產生題目</p>
          ) : (
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 list-none p-0">
              {questions.map((q, i) => (
                <li key={i} className="flex items-baseline gap-2 text-lg">
                  <span className="text-gray-400 w-8 text-right">{i + 1}.</span>
                  <span>{q.expr} =</span>
                  <span className="flex-1 border-b-2 border-dotted border-gray-300 ml-1 min-w-[3rem]">
                    {settings.showAnswers && (
                      <span className="text-amber-700 font-bold ml-1">{q.answer}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="text-xs text-gray-400 mt-4 text-center no-print">
          純程序化生成；題目皆由本機演算法即時產出，不依賴外部題庫。
        </p>
      </main>
    </div>
  );
}
