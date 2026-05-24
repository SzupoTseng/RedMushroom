/**
 * 字典服務 — 從 backend/data/dictionary.json 載入 ToneOZ tzdic 詞庫
 * （44k 詞 ~8MB），常駐記憶體中以 O(1) 查表。
 *
 * 來源：D:\GameDevZ\dyin\2讀音選擇工具_Bpmf_VSIME\tzdic
 * 重建方式：python3 scripts/import_dict.py
 */
import * as fs from 'fs';
import * as path from 'path';

export interface DictEntry {
  zhuyin: string;
  definition: string;
}

export interface LookupResult {
  word: string;
  entries: DictEntry[];
  matchType: 'exact' | 'prefix' | 'char';
}

const DICT_PATH = path.resolve(__dirname, '../../data/dictionary.json');

let dictCache: Record<string, DictEntry[]> | null = null;
let loadError: Error | null = null;

function loadDict(): Record<string, DictEntry[]> {
  if (dictCache) return dictCache;
  if (loadError) throw loadError;
  try {
    const raw = fs.readFileSync(DICT_PATH, 'utf-8');
    dictCache = JSON.parse(raw);
    const n = Object.keys(dictCache!).length;
    // eslint-disable-next-line no-console
    console.log(`[dict] loaded ${n.toLocaleString()} entries from ${DICT_PATH}`);
    return dictCache!;
  } catch (e) {
    loadError = e instanceof Error ? e : new Error(String(e));
    throw loadError;
  }
}

/**
 * Best-effort lookup:
 * 1. Exact match on the full query
 * 2. Longest prefix match (drop trailing chars)
 * 3. First char fallback (always returns at least char-level info if known)
 */
export function lookup(query: string): LookupResult | null {
  if (!query) return null;
  const dict = loadDict();

  if (dict[query]) {
    return { word: query, entries: dict[query], matchType: 'exact' };
  }

  // Longest prefix — try q[0..n-1], q[0..n-2], ...
  for (let len = query.length - 1; len >= 2; len--) {
    const sub = query.slice(0, len);
    if (dict[sub]) {
      return { word: sub, entries: dict[sub], matchType: 'prefix' };
    }
  }

  // Fall back to first char
  const first = query[0];
  if (first && dict[first]) {
    return { word: first, entries: dict[first], matchType: 'char' };
  }

  return null;
}

/**
 * Returns lookup for EACH character in the query (useful for the side panel
 * to show per-char readings when the whole phrase isn't in the dict).
 */
export function lookupPerChar(query: string): Array<{ char: string; entries: DictEntry[] }> {
  const dict = loadDict();
  const out: Array<{ char: string; entries: DictEntry[] }> = [];
  // Use Array.from to handle surrogate pairs (rare CJK ext chars)
  for (const c of Array.from(query)) {
    if (dict[c]) out.push({ char: c, entries: dict[c] });
  }
  return out;
}

/**
 * Map of single CJK character → its bopomofo readings (excluding empty ones).
 * Cached on first call. Used by ReadingTool to:
 *   - Render the primary reading as ruby for every char
 *   - Highlight characters that have ≥2 readings (破音字)
 */
let charMapCache: Record<string, string[]> | null = null;

export function getCharMap(): Record<string, string[]> {
  if (charMapCache) return charMapCache;
  const dict = loadDict();
  const out: Record<string, string[]> = {};
  for (const [word, entries] of Object.entries(dict)) {
    // Only consider single-character entries (multi-char are phrases)
    if (Array.from(word).length !== 1) continue;
    const readings = entries.map((e) => e.zhuyin).filter((z) => z && z.trim());
    if (readings.length > 0) out[word] = readings;
  }
  charMapCache = out;
  return out;
}

/**
 * Just the SET of polyphonic chars (≥2 readings) — small payload for the
 * frontend to decide highlighting.
 */
let polyphonicListCache: string[] | null = null;

export function getPolyphonicList(): string[] {
  if (polyphonicListCache) return polyphonicListCache;
  const map = getCharMap();
  polyphonicListCache = Object.entries(map)
    .filter(([, readings]) => readings.length >= 2)
    .map(([c]) => c);
  return polyphonicListCache;
}
