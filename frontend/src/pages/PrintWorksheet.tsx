/**
 * 練習單列印（擴充模組）
 *
 * 從本機題庫（我們自己的 `questions` 表）抽題，產出可列印的紙本練習單。
 *   - 主題、類別、題數可選
 *   - 學生版（題目 + 空白選項）／家長版（含答案標示）
 *   - 列印時自動隱藏設定區
 *
 * 所有題目皆來自 RedMushroom 自有題庫，不引入任何外部資料來源。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Theory = 'cognitive' | 'input' | 'usage' | 'sociocultural' | '';

interface WorksheetQuestion {
  id: number;
  content: string;
  options: Record<string, string>;
  correctAnswer: string;
  theory: string;
  category: string;
}

const THEORY_LABELS: Record<Theory, string> = {
  '':              '全部主題（混合）',
  cognitive:       '語詞認知',
  input:           '語言輸入',
  usage:           '語言運用',
  sociocultural:   '社文語境',
};

export default function PrintWorksheet() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [theory, setTheory] = useState<Theory>('');
  const [count, setCount] = useState<number>(20);
  const [withAnswers, setWithAnswers] = useState<boolean>(false);
  const [questions, setQuestions] = useState<WorksheetQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ subject: 'chinese', count: String(count) });
      if (theory) params.set('theory', theory);
      const r = await fetch(`/api/quiz/worksheet?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`HTTP ${r.status}: ${txt}`);
      }
      const json = (await r.json()) as { count: number; questions: WorksheetQuestion[] };
      setQuestions(json.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : '產生練習單失敗');
    } finally {
      setLoading(false);
    }
  }, [theory, count, token]);

  useEffect(() => { generate(); /* 進入時先產一份 */ }, []); // eslint-disable-line

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
        <h1 className="text-xl font-bold text-amber-700">📋 練習單列印</h1>
        <button
          onClick={() => window.print()}
          disabled={questions.length === 0}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          type="button"
        >
          🖨 列印
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <section className="card no-print mb-4">
          <h2 className="font-bold text-gray-700 mb-3">設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">主題</p>
              <select
                value={theory}
                onChange={(e) => setTheory(e.target.value as Theory)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl bg-white"
              >
                {(Object.keys(THEORY_LABELS) as Theory[]).map((t) => (
                  <option key={t} value={t}>{THEORY_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">題數</p>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={count}
                onChange={(e) => setCount(+e.target.value)}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{count} 題</span>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">版本</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={withAnswers}
                  onChange={(e) => setWithAnswers(e.target.checked)}
                />
                顯示答案（家長版）
              </label>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={generate}
              disabled={loading}
              type="button"
              className="btn-primary disabled:opacity-50"
            >
              {loading ? '產生中…' : '重新抽題'}
            </button>
            {error && <span className="text-red-500 text-sm">{error}</span>}
          </div>
        </section>

        {/* 練習單 */}
        <section className="card bg-white">
          <header className="border-b border-gray-200 pb-2 mb-4">
            <h2 className="text-xl font-bold">
              國語練習單 — {THEORY_LABELS[theory]}
              {withAnswers && <span className="ml-3 text-sm text-amber-700">（家長版・含答案）</span>}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              姓名：__________　班級：__________　日期：__________　得分：__________
            </p>
          </header>

          {questions.length === 0 ? (
            <p className="text-gray-400 py-10 text-center">尚未產生題目</p>
          ) : (
            <ol className="list-none p-0 space-y-4">
              {questions.map((q, i) => (
                <li key={q.id} className="break-inside-avoid">
                  <p className="font-bold text-base leading-relaxed">
                    <span className="text-gray-500 mr-2">{i + 1}.</span>
                    {q.content}
                  </p>
                  <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-1 ml-7 list-none p-0 text-sm">
                    {Object.entries(q.options).map(([k, v]) => (
                      <li key={k} className="flex items-baseline gap-1">
                        <span
                          className={
                            `inline-block w-5 ` +
                            (withAnswers && k === q.correctAnswer
                              ? 'text-amber-700 font-bold'
                              : 'text-gray-500')
                          }
                        >
                          ({k})
                        </span>
                        <span className={withAnswers && k === q.correctAnswer ? 'text-amber-800' : ''}>
                          {v}
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="text-xs text-gray-400 mt-4 text-center no-print">
          題目來自 RedMushroom 自有題庫；不依賴任何外部題庫。
        </p>
      </main>
    </div>
  );
}
