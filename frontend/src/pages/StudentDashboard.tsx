import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import type { UserStats } from '../types';

interface SessionRow {
  session_id: number;
  theory_type: string;
  total_score: number;
  is_passed: number;
  start_time: string;
}

interface ReportData {
  user: Record<string, unknown>;
  sessions: SessionRow[];
}

const THEORY_LABELS: Record<string, string> = {
  cognitive: '語詞認知',
  input: '語言輸入',
  usage: '語言運用',
  sociocultural: '社文語境',
};

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    fetch(`/api/quiz/me/report`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: ReportData) => {
        setReport(data);
        const s = data.user as unknown as UserStats & Record<string, unknown>;
        setStats({
          accuracy: Number(s.accuracy ?? 0),
          stability: Number(s.stability ?? 0),
          versatility: Number(s.versatility ?? 0),
          cognition: Number(s.cognition ?? 0),
          endurance: Number(s.endurance ?? 0),
          fluency: Number(s.fluency ?? 0),
        });
      })
      .catch(console.error);
  }, [user, token]);

  const radarData = stats
    ? [
        { subject: '正確率', value: stats.accuracy },
        { subject: '穩定性', value: stats.stability },
        { subject: '廣泛性', value: stats.versatility },
        { subject: '認知', value: stats.cognition },
        { subject: '耐力', value: stats.endurance },
        { subject: '流暢', value: stats.fluency },
      ]
    : [];

  const barData = (report?.sessions ?? []).slice(0, 10).reverse().map((s) => ({
    name: THEORY_LABELS[s.theory_type] ?? s.theory_type,
    分數: s.total_score,
  }));

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600 text-2xl">
          ←
        </button>
        <h1 className="text-2xl font-black text-mushroom-600">📊 我的成長記錄</h1>
      </div>

      {!report ? (
        <div className="text-center text-gray-400 py-20">載入中...</div>
      ) : (
        <>
          {/* 基本資訊 */}
          <div className="card mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-black text-mushroom-500">
                Lv.{report.user.current_level as number}
              </div>
              <div className="text-xs text-gray-400 mt-1">等級</div>
            </div>
            <div>
              <div className="text-3xl font-black text-yellow-500">
                {report.user.total_exp as number}
              </div>
              <div className="text-xs text-gray-400 mt-1">總經驗</div>
            </div>
            <div>
              <div className="text-3xl font-black text-green-500">
                🔥{report.user.streak_days as number}
              </div>
              <div className="text-xs text-gray-400 mt-1">連勝天數</div>
            </div>
            <div>
              <div className="text-3xl font-black text-blue-500">
                {report.sessions.filter((s) => s.is_passed).length}
              </div>
              <div className="text-xs text-gray-400 mt-1">通過場數</div>
            </div>
          </div>

          {/* 五維度雷達 */}
          {radarData.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">六維度能力分析</h2>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <Radar
                    name="能力" dataKey="value"
                    stroke="#ef4444" fill="#ef4444" fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 近期得分長條圖 */}
          {barData.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-gray-700 mb-4">近期測驗成績</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="分數" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
