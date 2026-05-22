import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig, useSenLayout } from '../context/ConfigContext';
import type { ZhuyinChar } from '../types';

interface Monster {
  question_id: number;
  streak_correct: number;
  next_review_time: string;
  is_due: boolean;
  content: ZhuyinChar[];
  options: Record<string, string>;
  theory_type: string;
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const target = new Date(iso.replace(' ', 'T') + 'Z').getTime();
  const diffMin = Math.round((target - now) / 60000);
  if (diffMin <= 0) return '現在可複習';
  if (diffMin < 60) return `等待 ${diffMin} 分鐘`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `等待 ${h} 小時`;
  return `等待 ${Math.round(h / 24)} 天`;
}

export default function ErrorMonsterReview() {
  const { token } = useAuth();
  const { showZhuyin } = useConfig();
  const sen = useSenLayout();
  const navigate = useNavigate();
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<null | { correct: boolean; expl: string }>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/quiz/monsters', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d: { monsters: Monster[] }) => setMonsters(d.monsters))
      .catch(console.error);
  }, [token]);

  const current = monsters[idx];

  if (monsters.length === 0) {
    return (
      <div className={`min-h-screen px-4 py-6 ${sen ? 'max-w-xl' : 'max-w-2xl'} mx-auto`}>
        <div className="card text-center py-12">
          <div className="text-6xl mb-3">✨</div>
          <p className={`mb-6 ${sen ? 'text-xl' : 'text-base'} text-gray-500`}>
            目前沒有需要複習的怪獸，繼續加油！
          </p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            回到首頁
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className={`min-h-screen px-4 py-6 ${sen ? 'max-w-xl' : 'max-w-2xl'} mx-auto`}>
        <div className="card text-center py-12">
          <div className="text-6xl mb-3">🎉</div>
          <p className={`mb-6 ${sen ? 'text-xl' : 'text-base'} text-gray-700`}>
            這場複習完成！怪獸都被你淨化了！
          </p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            回到首頁
          </button>
        </div>
      </div>
    );
  }

  const answer = async (key: string) => {
    if (feedback) return;
    const r = await fetch('/api/quiz/monsters/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question_id: current.question_id, user_answer: key }),
    });
    const d = await r.json() as { is_correct: boolean; explanation: string };
    setFeedback({ correct: d.is_correct, expl: d.explanation });
    setTimeout(() => {
      setFeedback(null);
      setIdx((i) => i + 1);
    }, sen ? 2200 : 1600);
  };

  return (
    <div className={`min-h-screen px-4 py-6 ${sen ? 'max-w-xl' : 'max-w-2xl'} mx-auto`}>
      <div className="flex items-center justify-between mb-4">
        <button className="btn-secondary text-sm py-2 px-4" onClick={() => navigate('/')}>← 返回</button>
        <h1 className={`font-bold ${sen ? 'text-2xl' : 'text-xl'}`}>
          🐲 錯題怪獸複習
        </h1>
        <span className="text-sm text-gray-500">
          {idx + 1} / {monsters.length}
        </span>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className={`${sen ? 'text-base' : 'text-sm'} text-gray-500`}>
            {current.theory_type} · 連續答對 {current.streak_correct} 次（淨化需 3 次）
          </span>
          {current.is_due ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
              🟢 現在可複習
            </span>
          ) : (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              ⏳ {formatRelative(current.next_review_time)}
            </span>
          )}
        </div>

        <div className={`font-bold mb-6 flex flex-wrap ${sen ? 'text-3xl gap-2' : 'text-2xl gap-1'}`}>
          {current.content.map((c, i) =>
            showZhuyin && c.pinyin ? (
              <ruby key={i}>{c.char}<rt className="text-xs text-gray-400">{c.pinyin}</rt></ruby>
            ) : (
              <span key={i}>{c.char}</span>
            )
          )}
        </div>

        <div className={sen ? 'space-y-5' : 'space-y-3'}>
          {Object.entries(current.options).map(([k, v]) => (
            <button
              key={k}
              onClick={() => answer(k)}
              disabled={!!feedback}
              className={`answer-btn ${sen ? 'answer-btn-sen' : ''}`}
            >
              <span
                className={
                  `inline-block rounded-full bg-gray-100 text-center font-bold mr-3 ` +
                  (sen ? 'w-10 h-10 leading-10 text-base' : 'w-8 h-8 leading-8 text-sm')
                }
              >
                {k}
              </span>
              {v}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={
              `mt-4 p-3 rounded-xl ` +
              (feedback.correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')
            }
          >
            {feedback.correct ? '✅ 答對了！' : '❌ 再想想'} — {feedback.expl}
          </div>
        )}
      </div>
    </div>
  );
}
