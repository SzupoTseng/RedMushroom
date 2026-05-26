import { useState } from 'react';
import type { Question, ZhuyinChar } from '../../types';
import SortingDisplay from './SortingDisplay';
import ZhuyinText, { BpmfLabel } from '../common/ZhuyinText';

export interface QuestionDetail {
  question_id: number;
  correct_answer: string;
  explanation: string;
  question_type: string;
  content: ZhuyinChar[];
  options: Record<string, string>;
  options_zhuyin?: Record<string, ZhuyinChar[]>;
}

interface Props {
  totalScore: number;
  isPassed: boolean;
  expGained: number;
  praise: string;
  levelUp: boolean;
  newLevel: number;
  questions: Question[];
  results: Record<number, boolean>;
  answers: Record<number, string>;
  details?: QuestionDetail[];   // 每題詳細資訊（含 correct_answer）
  onRetry: () => void;
}

export default function ScoreModal({
  totalScore, isPassed, expGained, praise,
  levelUp, newLevel, questions, results, details = [], onRetry,
}: Props) {
  const correct = Object.values(results).filter(Boolean).length;
  const [retryId, setRetryId] = useState<number | null>(null);
  const [retrySelected, setRetrySelected] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<null | boolean>(null);

  const detailMap = new Map(details.map((d) => [d.question_id, d]));
  const retryDetail = retryId != null ? detailMap.get(retryId) : null;

  const handleRetrySelect = (key: string) => {
    if (retryResult !== null) return;   // already answered
    setRetrySelected(key);
    setRetryResult(key === retryDetail?.correct_answer);
  };

  // 排序題：拖曳後按確認順序就呼叫這裡（key 是 '1,2,3,4' 之類的序列）
  const handleSortingConfirm = (key: string) => {
    if (retryResult !== null) return;
    setRetrySelected(key);
    setRetryResult(key === retryDetail?.correct_answer);
  };

  const openRetry = (id: number) => {
    setRetryId(id);
    setRetrySelected(null);
    setRetryResult(null);
  };

  return (
    // animate-pop 在進場時會套 transform。為了避免 @hello-pangea/dnd 的拖曳
    // 跟祖先 transform 衝突，pop 動畫只套在「左欄」（分數區）上，
    // 右欄 retry 面板（含 SortingDisplay）永遠沒 transform 祖先。
    <div className="w-full max-w-4xl mx-auto flex gap-6">
      {/* ── 左欄：分數 + 題目清單 ── */}
      <div className="flex-1 min-w-0 animate-pop">
        {/* 結果卡 */}
        <div className="card mb-4 text-center">
          <div className="text-5xl mb-2">{isPassed ? '🎉' : '💪'}</div>
          <div className={`text-5xl font-black mb-1 ${isPassed ? 'text-green-500' : 'text-mushroom-500'}`}>
            {totalScore} 分
          </div>
          <div className="text-gray-500 mb-3">答對 {correct} / {questions.length} 題</div>

          {levelUp && (
            <div className="bg-yellow-100 text-yellow-700 rounded-2xl px-4 py-2 mb-3 font-bold">
              🌟 升級了！Lv.{newLevel}！
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl px-4 py-3 text-gray-700 italic mb-3">
            「{praise}」
          </div>
          <div className="text-sm text-gray-400">+{expGained} EXP</div>
        </div>

        {/* 題目清單 */}
        <div className="space-y-2 mb-4">
          {questions.map((q) => {
            const isCorrect = results[q.question_id];
            const isSelected = retryId === q.question_id;
            const hasDetail = detailMap.has(q.question_id);
            return (
              <div
                key={q.question_id}
                className={`card border-2 flex items-center gap-2 py-3
                  ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
                  ${isSelected ? 'ring-2 ring-mushroom-400' : ''}`}
              >
                <span className="text-lg shrink-0">{isCorrect ? '✅' : '❌'}</span>
                <span className="text-sm text-gray-600 flex-1 truncate">
                  {q.content.map((c) => c.char).join('')}
                </span>
                {/* 錯題才顯示「試試」 */}
                {!isCorrect && hasDetail && (
                  <button
                    onClick={() => openRetry(q.question_id)}
                    className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition
                      ${isSelected
                        ? 'bg-mushroom-500 text-white'
                        : 'bg-mushroom-100 text-mushroom-700 hover:bg-mushroom-200'}`}
                  >
                    試試
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onRetry} className="btn-primary w-full text-lg">
          再來一次 🍄
        </button>
      </div>

      {/* ── 右欄：在線重做題目（不計分）── */}
      {retryDetail && (
        <div className="w-80 shrink-0">
          <div className="card h-full border-2 border-mushroom-300">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-mushroom-600">練習（不計分）</span>
              <button
                onClick={() => { setRetryId(null); setRetrySelected(null); setRetryResult(null); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* 題目 */}
            <ZhuyinText content={retryDetail.content} className="mb-4 text-lg font-bold block" />

            {/* 選項：排序題用拖曳、單選題用按鈕 */}
            {retryDetail.question_type === 'sorting' ? (
              <div className="mb-3">
                <SortingDisplay
                  key={retryDetail.question_id}
                  question={{
                    question_id: retryDetail.question_id,
                    content: retryDetail.content,
                    options: retryDetail.options,
                    options_zhuyin: retryDetail.options_zhuyin,
                    question_type: 'sorting',
                    theory_type: 'usage',
                    category_type: 'social',
                    score: 10,
                    subject: 'chinese',
                  } as Question}
                  onConfirm={handleSortingConfirm}
                  disabled={retryResult !== null}
                />
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                {Object.entries(retryDetail.options).map(([key, label]) => {
                  const isAns = key === retryDetail.correct_answer;
                  const isSel = retrySelected === key;
                  let cls = 'answer-btn text-sm py-2';
                  if (retryResult !== null && isAns) cls += ' answer-btn-correct';
                  else if (isSel && retryResult === false) cls += ' answer-btn-wrong';

                  return (
                    <button
                      key={key}
                      onClick={() => handleRetrySelect(key)}
                      disabled={retryResult !== null}
                      className={cls}
                    >
                      <span className="inline-block w-6 h-6 rounded-full bg-gray-100 text-center leading-6 text-xs font-bold mr-2">
                        {key}
                      </span>
                      <BpmfLabel text={label} zhuyin={retryDetail.options_zhuyin?.[key]} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* 回饋 */}
            {retryResult !== null && (
              <div className={`rounded-xl p-3 text-sm ${retryResult ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {retryResult ? '✅ 答對了！' : '❌ 答錯了。'}
                <div className="mt-1 text-xs text-gray-600">{retryDetail.explanation}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
