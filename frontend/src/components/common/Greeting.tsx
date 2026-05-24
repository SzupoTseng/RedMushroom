/**
 * Greeting — 顯示「歡迎，{name}！」，點擊可內嵌編輯。
 * 用 PATCH /api/auth/me 持久化更新；本地立刻 reflect。
 */
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Greeting() {
  const { user, updateDisplayName } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user?.display_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      setDraft(user?.display_name ?? '');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [editing, user?.display_name]);

  const save = async () => {
    const v = draft.trim();
    if (!v) {
      setError('請輸入名字');
      return;
    }
    setSaving(true);
    try {
      await updateDisplayName(v);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const name = user?.display_name?.trim() || '';

  if (editing) {
    return (
      <div className="card mb-4 flex items-center gap-2 bg-amber-50 border-2 border-amber-200">
        <span className="text-2xl">✏️</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          maxLength={12}
          placeholder="輸入中文姓名（1–12 字）"
          className="flex-1 px-3 py-2 border-2 border-amber-300 rounded-xl text-lg outline-none focus:border-amber-500"
        />
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
          type="button"
        >
          {saving ? '儲存中…' : '✓ 完成'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="btn-secondary text-sm py-2 px-3"
          type="button"
        >
          取消
        </button>
        {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      type="button"
      className="card mb-4 w-full text-left flex items-center gap-3 bg-amber-50
                 border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-300
                 transition-all active:scale-[0.99]"
      title="點擊修改姓名"
    >
      <span className="text-3xl">👋</span>
      <div className="flex-1">
        <p className="text-xs text-gray-500">歡迎</p>
        <p className="text-2xl font-black text-amber-800">
          {name || (
            <span className="text-amber-500 italic">點這裡輸入名字 →</span>
          )}
          {name && <span className="text-amber-600 text-sm font-normal ml-2">同學</span>}
        </p>
      </div>
      <span className="text-sm text-gray-400 self-center">✏️ 修改</span>
    </button>
  );
}
