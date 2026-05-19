import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSenLayout } from '../context/ConfigContext';
import StreakFire from '../components/common/StreakFire';

interface Row {
  user_id: number;
  display_name: string;
  current_level: number;
  total_exp: number;
  streak_days: number;
}

export default function Leaderboard() {
  const { token, user } = useAuth();
  const sen = useSenLayout();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [classId, setClassId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/quiz/leaderboard', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d: { class_id: string | null; rows: Row[] }) => {
        setRows(d.rows);
        setClassId(d.class_id);
      })
      .catch(console.error);
  }, [token]);

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className={`font-black text-mushroom-600 ${sen ? 'text-3xl' : 'text-2xl'}`}>
          🏆 班級英雄榜
        </h1>
        <button className="btn-secondary text-sm" onClick={() => navigate('/')}>
          返回
        </button>
      </div>

      {!classId && (
        <div className="card text-center text-gray-500 py-8">
          <div className="text-5xl mb-2">🤔</div>
          <p>你還沒加入班級，請老師建立班級後再回來看！</p>
        </div>
      )}

      {classId && rows.length === 0 && (
        <div className="card text-center text-gray-500 py-8">
          班級裡還沒有人，快來成為第一名！
        </div>
      )}

      {classId && rows.length > 0 && (
        <div className="card divide-y">
          {rows.map((r, i) => {
            const isMe = r.user_id === user?.user_id;
            return (
              <div
                key={r.user_id}
                className={`py-3 flex items-center gap-3 ${isMe ? 'bg-yellow-50 -mx-6 px-6 rounded-xl' : ''}`}
              >
                <span className={`w-8 text-center font-black ${sen ? 'text-xl' : 'text-base'}`}>
                  {i + 1}
                </span>
                <span className={`flex-1 font-semibold ${sen ? 'text-lg' : 'text-base'}`}>
                  {r.display_name}
                  {isMe && <span className="text-mushroom-500 ml-1">（你）</span>}
                </span>
                <span className="text-xs bg-mushroom-100 text-mushroom-700 px-2 py-0.5 rounded-full font-bold">
                  Lv.{r.current_level}
                </span>
                <span className="text-sm text-gray-500 hidden sm:inline">{r.total_exp} XP</span>
                <StreakFire days={r.streak_days} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
