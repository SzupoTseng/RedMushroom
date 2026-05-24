/**
 * GET /api/dict/lookup?q=<text>
 *
 * Returns:
 *   {
 *     query: "...",
 *     word: "...",          // matched word (may be shorter than query)
 *     matchType: 'exact'|'prefix'|'char',
 *     entries: [{zhuyin, definition}, ...],
 *     perChar: [{char, entries}, ...]   // included when matchType !== 'exact'
 *   }
 *
 * No auth — dictionary content is public reference data, and the side panel
 * runs on selection events that may fire before any auth context is loaded.
 */
import { Router, Request, Response } from 'express';
import { lookup, lookupPerChar, getCharMap, getPolyphonicList } from '../services/dictService';

const router = Router();

router.get('/lookup', (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) {
    return res.status(400).json({ error: 'missing q parameter' });
  }
  // Sanity cap — no point looking up huge selections
  if (q.length > 50) {
    return res.status(400).json({ error: 'query too long' });
  }
  try {
    const result = lookup(q);
    const perChar = result?.matchType === 'exact' ? [] : lookupPerChar(q);
    if (!result && perChar.length === 0) {
      return res.json({ query: q, found: false });
    }
    return res.json({
      query: q,
      found: true,
      word: result?.word ?? null,
      matchType: result?.matchType ?? null,
      entries: result?.entries ?? [],
      perChar,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'dict lookup failed';
    return res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/dict/charmap
 * Returns: { chars: { "和": ["ㄏㄜˊ","ㄏㄜˋ", ...], "一": ["ㄧ"], ... } }
 * ~3,600 entries, ~120 KB. Used by ReadingTool to render bopomofo for each
 * char and identify polyphonic characters (those with ≥2 readings).
 */
router.get('/charmap', (_req: Request, res: Response) => {
  try {
    res.json({ chars: getCharMap() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'charmap unavailable';
    res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/dict/polyphonic
 * Returns: { chars: ["和","行","重",...] } — just the set, ~10 KB.
 */
router.get('/polyphonic', (_req: Request, res: Response) => {
  try {
    res.json({ chars: getPolyphonicList() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'polyphonic list unavailable';
    res.status(500).json({ error: msg });
  }
});

export default router;
