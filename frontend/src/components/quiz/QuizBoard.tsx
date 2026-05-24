import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../../context/QuizContext';
import { useAuth } from '../../context/AuthContext';
import SortingDisplay from './SortingDisplay';
import SpeechRecorder from './SpeechRecorder';
import { useSenLayout } from '../../context/ConfigContext';
import type { ZhuyinChar } from '../../types';
import ZhuyinText from '../common/ZhuyinText';

export default function QuizBoard() {
  const { state, submitAnswer, nextQuestion, finishQuiz, resetQuiz } = useQuiz();
  const { user } = useAuth();
  const navigate = useNavigate();
  const sen = useSenLayout();
  const studentName = user?.display_name?.trim() || '';
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [coolingDown, setCoolingDown] = useState(false);
  const [speechResult, setSpeechResult] = useState<{ score: number; text: string } | null>(null);
  // 題目切換轉場：顯示「第 N 題」splash，遮蔽舊題、引導視線到新題。
  // splashNum 在進場時 snapshot，避免切題後 currentIndex 變動造成數字跳號。
  const [transitioning, setTransitioning] = useState(false);
  const [splashNum, setSplashNum] = useState<number>(0);
  // 答題反饋（含名字的個人化訊息）
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);

  const { questions, currentIndex } = state;
  const question = questions[currentIndex];

  if (!question) return null;

  const isLast = currentIndex === questions.length - 1;

  const handleSelect = async (answer: string) => {
    if (submitted || coolingDown || state.phase === 'SUBMITTING' || transitioning) return;
    setSelected(answer);
    setSubmitted(true);
    setCoolingDown(true);

    const isCorrect = await submitAnswer(question.question_id, answer, speechResult ?? undefined);

    // 個人化反饋——有名字就喊名字，沒名字就用通用稱呼
    if (isCorrect !== null) {
      const namePrefix = studentName ? `${studentName}，` : '';
      setFeedback({
        correct: isCorrect,
        text: isCorrect
          ? `${namePrefix}答對了！🎉`
          : `${namePrefix}再想想看 💪`,
      });
      // dwell 中清除（在切題前自動消失）
      setTimeout(() => setFeedback(null), (sen ? 1400 : 900) - 100);
    }

    // 流程：
    //   1. 反饋 dwell（看見對／錯）— SEN 1400ms / 一般 900ms
    //   2. 轉場 splash「第 N 題」— 700ms（中途切到下一題；新題從右滑入）
    //   3. 解鎖 — 可作答下一題
    const dwell = sen ? 1400 : 900;
    const splashDuration = 700;
    const advanceAt = 350; // 在 splash 進行到一半時切題（這樣新題在 splash 後段已就位）

    setTimeout(() => {
      // Snapshot 下一題的人類編號（1-based），避免 currentIndex 變動造成跳號
      setSplashNum(Math.min(currentIndex + 2, questions.length));
      setTransitioning(true);

      // 切到下一題（或結算）
      setTimeout(async () => {
        setSelected(null);
        setSubmitted(false);
        setSpeechResult(null);
        if (isLast) {
          await finishQuiz();
        } else {
          nextQuestion();
        }
      }, advanceAt);

      // 解鎖
      setTimeout(() => {
        setTransitioning(false);
        setCoolingDown(false);
      }, splashDuration);
    }, dwell);
  };

  const progress = (currentIndex / questions.length) * 100;

  return (
    <div
      className={`min-h-screen px-4 py-6 ${sen ? 'quiz-board-sen' : 'max-w-2xl'} mx-auto flex flex-col`}
      data-sen={sen ? '1' : '0'}
    >
      {/* 進度條 + 離開按鈕 */}
      <div className="mb-4">
        <div className={`flex justify-between mb-1 ${sen ? 'text-base' : 'text-sm'} text-gray-500`}>
          <button
            className="text-gray-400 hover:text-mushroom-600 text-xs px-2 py-1 rounded border border-gray-200 hover:border-mushroom-300 transition-colors"
            onClick={() => { resetQuiz(); navigate('/'); }}
            title="中途離開不計分"
          >
            ← 離開
          </button>
          <span>
            第 {currentIndex + 1} 題 / 共 {questions.length} 題
            {studentName && (
              <span className="ml-2 text-mushroom-700 font-bold">　{studentName} 加油！</span>
            )}
          </span>
          <span className="text-xs">{question.theory_type}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-mushroom-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 個人化答題反饋（含學生姓名）— 在 dwell 期間顯示 */}
      {feedback && !transitioning && (
        <div
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none combo-flash"
          aria-live="polite"
        >
          <div
            className={
              `px-8 py-4 rounded-2xl shadow-2xl text-2xl font-black ${sen ? 'text-3xl' : ''} ` +
              (feedback.correct
                ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
                : 'bg-amber-100 text-amber-800 border-2 border-amber-400')
            }
          >
            {feedback.text}
          </div>
        </div>
      )}

      {/* 轉場 splash：「第 N 題」遮蔽舊題、引導視線到新題 */}
      {transitioning && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
          aria-live="polite"
        >
          <div className="quiz-splash bg-mushroom-500 text-white rounded-3xl px-12 py-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-2">🍄</div>
              <div className={`font-black ${sen ? 'text-4xl' : 'text-3xl'}`}>
                第 {splashNum} 題
              </div>
              <div className={`opacity-80 mt-1 ${sen ? 'text-base' : 'text-sm'}`}>
                準備好了嗎？
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 題目內容 — key 確保切題時 React 重新掛載，觸發 slide-in 動畫 */}
      <div
        key={`q-${currentIndex}`}
        className="card flex-1 mb-6 quiz-card-anim"
      >
        <p className={`mb-3 ${sen ? 'text-base text-gray-500' : 'text-sm text-gray-400'}`}>
          {question.question_type === 'sorting' ? '請排出正確語序：' : '請選出正確答案：'}
        </p>

        {/* 注音顯示（ruby 標籤或注音字型，依設定切換） */}
        <ZhuyinText
          content={question.content}
          className={`font-bold mb-6 block ${sen ? 'text-3xl' : 'text-2xl'}`}
        />

        {question.question_type === 'single_choice' && (
          <SpeechRecorder
            target={question.content.map((c: ZhuyinChar) => c.char).join('')}
            onResult={(score, text) => setSpeechResult({ score, text })}
            disabled={submitted}
          />
        )}

        {question.question_type === 'sorting' ? (
          <SortingDisplay
            key={question.question_id}
            question={question}
            onConfirm={handleSelect}
            disabled={submitted}
          />
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
                  <span className="bpmf-font">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
