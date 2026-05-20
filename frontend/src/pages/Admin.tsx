import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface StudentRow {
  user_id: number;
  username: string;
  display_name: string;
  grade: string;
  current_level: number;
  total_exp: number;
  streak_days: number;
  accuracy: number;
}

interface DashboardData {
  students: StudentRow[];
  weekly_quiz_count: number;
}

export default function Admin() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d: DashboardData) => setData(d))
      .catch(console.error);
  }, [token]);

  const downloadCsv = () => {
    fetch('/api/admin/class/export/csv', {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'class_report.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-mushroom-600">👩‍🏫 老師管理台</h1>
        <button className="btn-secondary text-sm" onClick={downloadCsv}>
          📥 下載班級報告 CSV
        </button>
      </div>

      {!data ? (
        <div className="text-center text-gray-400 py-20">載入中...</div>
      ) : (
        <>
          <div className="card mb-6 text-center">
            <div className="text-4xl font-black text-mushroom-500">{data.weekly_quiz_count}</div>
            <div className="text-gray-500 mt-1">本週全班測驗次數</div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 pr-4">學生</th>
                  <th className="pb-3 pr-4">年級</th>
                  <th className="pb-3 pr-4">等級</th>
                  <th className="pb-3 pr-4">總經驗</th>
                  <th className="pb-3 pr-4">連勝</th>
                  <th className="pb-3">正確率</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.user_id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-semibold">{s.display_name}</td>
                    <td className="py-3 pr-4">{s.grade} 年級</td>
                    <td className="py-3 pr-4">
                      <span className="bg-mushroom-100 text-mushroom-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        Lv.{s.current_level}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{s.total_exp}</td>
                    <td className="py-3 pr-4">🔥{s.streak_days}</td>
                    <td className="py-3">
                      {s.accuracy != null ? `${Math.round(s.accuracy)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
