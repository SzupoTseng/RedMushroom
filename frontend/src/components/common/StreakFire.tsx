import React from 'react';
import { useSenLayout } from '../../context/ConfigContext';

interface Props {
  days: number;
}

export default function StreakFire({ days }: Props) {
  const sen = useSenLayout();
  if (days <= 0) return null;
  const intensity = days >= 30 ? '🔥🔥🔥' : days >= 14 ? '🔥🔥' : '🔥';
  return (
    <span
      className={`inline-flex items-center gap-1 ${sen ? 'text-xl' : 'text-base'}`}
      aria-label={`連續學習 ${days} 天`}
    >
      <span className={sen ? '' : 'animate-pulse'}>{intensity}</span>
      <span className="font-bold">{days}</span>
    </span>
  );
}
