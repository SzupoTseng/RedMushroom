import React, { useEffect } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface Props {
  target: string;
  onResult: (score: number, transcript: string) => void;
  disabled?: boolean;
}

export default function SpeechRecorder({ target, onResult, disabled }: Props) {
  const { transcript, score, listening, supported, listen } = useSpeechRecognition(target);

  useEffect(() => {
    if (score !== null) onResult(score, transcript);
  }, [score, transcript, onResult]);

  if (!supported) return null;

  return (
    <div className="my-3">
      <button
        onClick={() => listen()}
        disabled={listening || disabled}
        className={
          `text-sm rounded-full px-4 py-2 transition ` +
          (listening
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'bg-mushroom-100 text-mushroom-700 hover:bg-mushroom-200')
        }
        aria-label="唸出題目（選用）"
      >
        {listening ? '🎙️ 聆聽中…' : '🎤 唸出題目（選用）'}
      </button>
      {score !== null && (
        <div className="text-xs text-gray-500 mt-2">
          你說：「{transcript}」 — 相似度 <strong>{score}%</strong>
          {score >= 70 && (
            <span className="text-green-600 ml-2 font-bold">+5 XP</span>
          )}
        </div>
      )}
    </div>
  );
}
