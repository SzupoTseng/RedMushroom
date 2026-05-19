import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuiz } from '../context/QuizContext';
import { useSenLayout } from '../context/ConfigContext';
import type { TheoryType } from '../types';

interface Peer {
  user_id: number;
  display_name: string;
  current_level: number;
}

interface Challenge {
  session_id: number;
  pvp_target_score: number;
  pvp_target_secs: number;
}

const THEORY_OPTIONS: Array<{ key: TheoryType; label: string }> = [
  { key: 'cognitive',     label: '🧠 語詞認知' },
  { key: 'input',         label: '👁 語言輸入' },
  { key: 'usage',         label: '✍️ 語言運用' },
  { key: 'sociocultural', label: '🌏 社文語境' },
];

export default function Pvp() {
  const { token } = useAuth();
  const { startQuiz } = useQuiz();
  const sen = useSenLayout();
  const navigate = useNavigate();
  const [peers, setPeers] = useState<Peer[]>([]);
  const [theory, setTheory] = useState<TheoryType>('cognitive');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/quiz/pvp/classmates', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d: { peers: Peer[] }) => setPeers(d.peers))
      .catch(console.error);
  }, [token]);

  async function challenge() {
    if (!token || busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/quiz/pvp/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theory_type: theory, subject: 'chinese' }),
      });
      const data = (await r.json()) as Challenge;
      sessionStorage.setItem('pvp_target', JSON.stringify(data));
      await startQuiz(theory, 'chinese');
      navigate('/quiz');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className={`font-black text-mushroom-600 ${sen ? 'text-3xl' : 'text-2xl'}`}>
          ⚔️ 班級競技場
        </h1>
        <button className="btn-secondary text-sm" onClick={() => navigate('/')}>
          返回
        </button>
      </div>

      <p className={`mb-4 ${sen ? 'text-lg text-gray-600' : 'text-sm text-gray-500'}`}>
        挑戰你過去 5 場的中位數，看看現在的你能否打敗從前的自己。
      </p>

      <div className="card mb-4">
        <h2 className="font-bold mb-2">選擇主題</h2>
        <div className="flex flex-wrap gap-2">
          {THEORY_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setTheory(o.key)}
              className={
                `px-4 py-2 rounded-full font-bold transition ` +
                (theory === o.key
                  ? 'bg-mushroom-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-mushroom-100')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {peers.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-bold mb-2">同班同學（{peers.length}）</h2>
          <ul className="text-sm space-y-1">
            {peers.map((p) => (
              <li key={p.user_id} className="flex justify-between">
                <span>{p.display_name}</span>
                <span className="text-gray-500">Lv.{p.current_level}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="btn-primary w-full text-lg"
        onClick={challenge}
        disabled={busy}
      >
        {busy ? '準備中…' : '⚔️ 開始挑戰'}
      </button>
    </div>
  );
}
