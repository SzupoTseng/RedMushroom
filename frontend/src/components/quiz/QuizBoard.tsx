import React, { useState } from 'react';
import { useQuiz } from '../../context/QuizContext';
import SortingDisplay from './SortingDisplay';
import SpeechRecorder from './SpeechRecorder';
import { useConfig, useSenLayout } from '../../context/ConfigContext';
import type { ZhuyinChar } from '../../types';

export default function QuizBoard() {
  const { state, submitAnswer, nextQuestion, finishQuiz } = useQuiz();
  const { showZhuyin } = useConfig();
  const sen = useSenLayout();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [speechResult, setSpeechResult] = useState<{ score: number; text: string } | null>(null);

  const { questions, currentIndex } = state;
  const question = questions[currentIndex];

  if (!question) return null;

  const isLast = currentIndex === questions.length - 1;

  const handleSelect = async (answer: string) => {
    if (submitted || coolingDown || state.phase === 'SUBMITTING') return;
    setSelected(answer);
    setSubmitted(true);
    setCoolingDown(true);

    await submitAnswer(question.question_id, answer, speechResult ?? undefined);

    // 短暫延遲讓使用者看到正確/錯誤反饋，再推進題目。
    // SEN 模式使用 1800ms（含防誤觸 cool-down），一般模式使用 1200ms。
    setTimeout(async () => {
      setSelected(null);
      setSubmitted(false);
      setCoolingDown(false);
      setSpeechResult(null);
      if (isLast) {
        await finishQuiz();
      } else {
        nextQuestion();
      }
    }, sen ? 1800 : 1200);
  };

  const progress = (currentIndex / questions.length) * 100;

  return (
    <div
      className={`min-h-screen px-4 py-6 ${sen ? 'quiz-board-sen' : 'max-w-2xl'} mx-auto flex flex-col`}
      data-sen={sen ? '1' : '0'}
    >
      {/* 進度條 */}
      <div className="mb-4">
        <div className={`flex justify-between mb-1 ${sen ? 'text-base' : 'text-sm'} text-gray-500`}>
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
        <p className={`mb-3 ${sen ? 'text-base text-gray-500' : 'text-sm text-gray-400'}`}>
          {question.question_type === 'sorting' ? '請排出正確語序：' : '請選出正確答案：'}
        </p>

        {/* 注音顯示 */}
        <div className={`font-bold mb-6 flex flex-wrap ${sen ? 'text-3xl gap-2' : 'text-2xl gap-1'}`}>
          {question.content.map((c: ZhuyinChar, i: number) =>
            showZhuyin && c.pinyin ? (
              <ruby key={i}>
                {c.char}
                <rt className="text-xs text-gray-400">{c.pinyin}</rt>
              </ruby>
            ) : (
              <span key={i}>{c.char}</span>
            )
          )}
        </div>

        {question.question_type === 'single_choice' && (
          <SpeechRecorder
            target={question.content.map((c: ZhuyinChar) => c.char).join('')}
            onResult={(score, text) => setSpeechResult({ score, text })}
            disabled={submitted}
          />
        )}

        {question.question_type === 'sorting' ? (
          <SortingDisplay question={question} onConfirm={handleSelect} disabled={submitted} />
        ) : (
          <div className={sen ? 'space-y-5' : 'space-y-3'}>
            {Object.entries(question.options).map(([key, label]) => {
              const wasSelected = submitted && selected === key;
              const isAnsweredCorrect = wasSelected && state.results[question.question_id] === true;
              const isAnsweredWrong = wasSelected && state.results[question.question_id] === false;

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={submitted}
                  className={
                    `answer-btn ${sen ? 'answer-btn-sen' : ''} ` +
                    `${isAnsweredCorrect ? 'answer-btn-correct' : ''} ` +
                    `${isAnsweredWrong ? 'answer-btn-wrong' : ''}`
                  }
                >
                  <span
                    className={
                      `inline-block rounded-full bg-gray-100 text-center font-bold mr-3 ` +
                      (sen ? 'w-10 h-10 leading-10 text-base' : 'w-8 h-8 leading-8 text-sm')
                    }
                  >
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
