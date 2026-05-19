import { useEffect, useRef, useState } from 'react';

// Web Speech API typings are not in stable lib.dom for all environments,
// so we declare a narrow surface here.
interface SR {
  start(): void;
  stop(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
}

interface SREvent {
  results: Array<Array<{ transcript: string; confidence: number }>>;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  }
}

export function useSpeechRecognition(targetText: string) {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const recRef = useRef<SR | null>(null);

  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!supported) return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const rec = new Ctor();
    rec.lang = 'zh-TW';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: SREvent) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      setTranscript(text);
      setScore(similarity(text, targetText));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, [supported, targetText]);

  function listen() {
    if (!recRef.current) return;
    setTranscript('');
    setScore(null);
    setListening(true);
    try {
      recRef.current.start();
    } catch {
      setListening(false);
    }
  }

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  return { transcript, score, listening, supported, listen, stop };
}

/**
 * 0–100 similarity using Dice's coefficient over character bigrams.
 * Whitespace and standard CJK punctuation are stripped first.
 */
function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s.replace(/[\s，。、？！「」『』：；（）()\.,?!]+/g, '');
  const aa = norm(a);
  const bb = norm(b);
  if (aa.length < 2 || bb.length < 2) return 0;

  const bigrams = (s: string): Map<string, number> => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };

  const A = bigrams(aa);
  const B = bigrams(bb);
  let overlap = 0;
  for (const [k, va] of A) overlap += Math.min(va, B.get(k) ?? 0);
  const denom = aa.length + bb.length - 2;
  return denom > 0 ? Math.round((2 * overlap * 100) / denom) : 0;
}
