import { useEffect, useState } from 'react';

interface Props {
  reward: { name: string; type: 'title' | 'pet_skin' };
  onClose: () => void;
}

export default function TreasureChestModal({ reward, onClose }: Props) {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpened(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl p-8 max-w-sm text-center mx-4 shadow-2xl">
        <div className="text-7xl mb-3 transition-transform duration-500"
             style={{ transform: opened ? 'scale(1.15)' : 'scale(1)' }}>
          {opened ? '🎁' : '📦'}
        </div>
        <h2 className="text-2xl font-black text-mushroom-600 mb-2">獲得獎勵！</h2>
        <div className="text-lg font-bold mb-1">{reward.name}</div>
        <div className="text-sm text-gray-500 mb-6">
          {reward.type === 'title' ? '稱號已加入你的倉庫' : '寵物造型已解鎖'}
        </div>
        <button className="btn-primary w-full" onClick={onClose}>
          太棒了！
        </button>
      </div>
    </div>
  );
}
