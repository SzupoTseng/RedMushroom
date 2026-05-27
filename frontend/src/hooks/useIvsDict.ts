/**
 * IVS (Ideographic Variation Sequence) bopomofo dictionary.
 *
 * The bundled ButTaiwan bopomofo fonts (字嗨楷體 etc.) embed MULTIPLE bopomofo
 * readings per polyphonic Han character, selectable via Unicode variation
 * selectors (cmap Format 14 / UVS). Appending `U+(E01E0 + idx)` after a char
 * makes the font draw THAT reading — so polyphonic characters can show the
 * correct contextual reading while keeping the integrated font look (no ruby).
 *
 * Data: frontend/public/data/ivs-bopomofo.json  { reading: { char: idx } }
 * (derived from the MIT-licensed Bpmf_VSIME / ToneOZ tool).
 */
import { useEffect, useState } from 'react';

export type IvsDict = Record<string, Record<string, number>>;

const VS_BASE = 0xe01e0; // matches Bpmf_VSIME getIVS(): chr(0xE01E0 + idx)

let cache: IvsDict | null = null;
let inflight: Promise<IvsDict> | null = null;

function fetchDict(): Promise<IvsDict> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/data/ivs-bopomofo.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: IvsDict) => {
        cache = d;
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
  }
  return inflight;
}

export function useIvsDict(): IvsDict {
  const [dict, setDict] = useState<IvsDict>(() => cache ?? {});
  useEffect(() => {
    let alive = true;
    fetchDict().then((d) => { if (alive) setDict(d); });
    return () => { alive = false; };
  }, []);
  return dict;
}

/**
 * Return the character, with a variation selector appended when the font needs
 * one to render `pinyin` for `char`. When the desired reading is the font's
 * default glyph (or unknown), returns the bare character.
 */
export function applyIvs(char: string, pinyin: string, dict: IvsDict): string {
  if (!pinyin) return char;
  const idx = dict[pinyin]?.[char];
  if (typeof idx === 'number' && idx > 0) {
    return char + String.fromCodePoint(VS_BASE + idx);
  }
  return char;
}
