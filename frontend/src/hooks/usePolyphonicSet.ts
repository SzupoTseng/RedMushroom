/**
 * Loads the set of polyphonic (破音字) characters from /api/dict/polyphonic
 * once per session and caches it module-wide. Used by <ZhuyinText> to decide
 * which characters need a ruby override (their correct contextual reading)
 * even when a bopomofo font is selected — because the font can only draw a
 * single fixed reading per glyph.
 */
import { useEffect, useState } from 'react';

let cache: Set<string> | null = null;
let inflight: Promise<Set<string>> | null = null;

function fetchSet(): Promise<Set<string>> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/dict/polyphonic')
      .then((r) => (r.ok ? r.json() : { chars: [] }))
      .then((d: { chars?: string[] }) => {
        cache = new Set(d.chars ?? []);
        return cache;
      })
      .catch(() => {
        cache = new Set();
        return cache;
      });
  }
  return inflight;
}

export function usePolyphonicSet(): Set<string> {
  const [set, setSet] = useState<Set<string>>(() => cache ?? new Set());
  useEffect(() => {
    let alive = true;
    fetchSet().then((s) => {
      if (alive) setSet(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return set;
}
