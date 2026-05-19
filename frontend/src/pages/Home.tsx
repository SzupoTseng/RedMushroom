import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { useTranslation } from '../i18n';

type Tab = 'login' | 'register';

export default function Home() {
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('login');
  const [form, setForm] = useState({
    username: '', password: '', display_name: '', grade: '3',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.username, form.password);
      } else {
        await register({ ...form });
        await login(form.username, form.password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Language switcher — top-right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm">
        {/* 標題 */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">🍄</div>
          <h1 className="text-3xl font-black text-mushroom-600">RedMushroom</h1>
          <p className="text-gray-500 mt-1">國語文學習樂園</p>
        </div>

        {/* 分頁切換 */}
        <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
          {(['login', 'register'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                tab === tabKey ? 'bg-white text-mushroom-600 shadow' : 'text-gray-400'
              }`}
              onClick={() => { setTab(tabKey); setError(''); }}
            >
              {tabKey === 'login' ? t('auth.login') : '註冊'}
            </button>
          ))}
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">帳號</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-mushroom-400 outline-none transition"
              placeholder="輸入帳號"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">密碼</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-mushroom-400 outline-none transition"
              placeholder="輸入密碼"
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">顯示名稱</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => update('display_name', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-mushroom-400 outline-none transition"
                  placeholder="你的名字"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">年級</label>
                <select
                  value={form.grade}
                  onChange={(e) => update('grade', e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-mushroom-400 outline-none"
                >
                  <option value="3">三年級</option>
                  <option value="4">四年級</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <p className="text-red-500 text-sm font-semibold text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-xl"
          >
            {loading ? '處理中...' : tab === 'login' ? '進入學習' : '開始冒險 🍄'}
          </button>
        </form>
      </div>
    </div>
  );
}
