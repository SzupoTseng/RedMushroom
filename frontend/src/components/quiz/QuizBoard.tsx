import React, { useState } from 'react';
import { useQuiz } from '../../context/QuizContext';
import SortingDisplay from './SortingDisplay';
import { useConfig } from '../../context/ConfigContext';
import type { ZhuyinChar } from '../../types';

export default function QuizBoard() {
  const { state, submitAnswer, nextQuestion, finishQuiz } = useQuiz();
  const { showZhuyin } = useConfig();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { questions, currentIndex } = state;
  const question = questions[currentIndex];

  if (!question) return null;

  const isLast = currentIndex === questions.length - 1;

  const handleSelect = async (answer: string) => {
    if (submitted || state.phase === 'SUBMITTING') return;
    setSelected(answer);
    setSubmitted(true);

    await submitAnswer(question.question_id, answer);

    // 短暫延遲讓使用者看到正確/錯誤反饋，再推進題目
    setTimeout(async () => {
      setSelected(null);
      setSubmitted(false);
      if (isLast) {
        await finishQuiz();
      } else {
        nextQuestion();
      }
    }, 1200);
  };

  const progress = (currentIndex / questions.length) * 100;

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto flex flex-col">
      {/* 進度條 */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>第 {currentIndex + 1} 題 / 共 {questions.length} 題</span>
          <span>{question.theory_type}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-mushroom-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 題目內容 */}
      <div className="card flex-1 mb-6">
        <p className="text-sm text-gray-400 mb-3">
          {question.question_type === 'sorting' ? '請排出正確語序：' : '請選出正確答案：'}
        </p>

        {/* 注音顯示 */}
        <div className="text-2xl font-bold mb-6 flex flex-wrap gap-1">
          {question.content.map((c: ZhuyinChar, i: number) =>
            showZhuyin ? (
              <ruby key={i} className="text-2xl">
                {c.char}
                <rt className="text-xs text-gray-400">{c.pinyin}</rt>
              </ruby>
            ) : (
              <span key={i}>{c.char}</span>
            )
          )}
        </div>

        {question.question_type === 'sorting' ? (
          <SortingDisplay question={question} onConfirm={handleSelect} disabled={submitted} />
        ) : (
          <div className="space-y-3">
            {Object.entries(question.options).map(([key, label]) => {
              // After submission, highlight the selected key green if correct, red if wrong
              const wasSelected = submitted && selected === key;
              const isAnsweredCorrect = wasSelected && state.results[question.question_id] === true;
              const isAnsweredWrong = wasSelected && state.results[question.question_id] === false;

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={submitted}
                  className={`answer-btn ${isAnsweredCorrect ? 'answer-btn-correct' : ''} ${isAnsweredWrong ? 'answer-btn-wrong' : ''}`}
                >
                  <span className="inline-block w-8 h-8 rounded-full bg-gray-100 text-center
                                   leading-8 text-sm font-bold mr-3">
                    {key}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
