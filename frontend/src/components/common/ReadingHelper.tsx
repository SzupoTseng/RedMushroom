/**
 * ReadingHelper — 選字時在右側浮出的「讀音／釋義」面板。
 *
 * 觸發方式：使用者用滑鼠／觸控選取題目或答案中的字（任何頁面均可），
 * 200ms debounce 後查詢 /api/dict/lookup?q=<選取文字>。
 *
 * 對應原工具：D:\GameDevZ\dyin\2讀音選擇工具_Bpmf_VSIME（ToneOZ + Bpmf VSIME）
 *   只移植「查讀音 + 釋義」這個動作；省略原工具的 IVS 字形變體 / 整段標注。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import BopomofoColumn from './BopomofoColumn';

interface DictEntry {
  zhuyin: string;
  definition: string;
}

interface LookupResponse {
  query: string;
  found: boolean;
  word?: string;
  matchType?: 'exact' | 'prefix' | 'char' | null;
  entries?: DictEntry[];
  perChar?: Array<{ char: string; entries: DictEntry[] }>;
}

// CJK Unified Ideographs (U+4E00–U+9FFF). Selection must contain at least one.
const RE_HAS_CHINESE = /[一-鿿]/;

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA']);

function isNodeInsideEditable(node: Node | null): boolean {
  let n: Node | null = node;
  while (n) {
    if (n instanceof HTMLElement) {
      if (EDITABLE_TAGS.has(n.tagName)) return true;
      if (n.isContentEditable) return true;
    }
    n = n.parentNode;
  }
  return false;
}

function isInsideHelper(node: Node | null): boolean {
  let n: Node | null = node;
  while (n) {
    if (n instanceof HTMLElement && n.dataset.readingHelper === '1') return true;
    n = n.parentNode;
  }
  return false;
}

export default function ReadingHelper() {
  const [query, setQuery] = useState<string>('');
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const lastQueryRef = useRef<string>('');

  const fetchDict = useCallback(async (q: string) => {
    if (q === lastQueryRef.current) return;
    lastQueryRef.current = q;
    setLoading(true);
    try {
      const url = `/api/dict/lookup?q=${encodeURIComponent(q)}`;
      // eslint-disable-next-line no-console
      console.debug('[ReadingHelper] fetch', url);
      const r = await fetch(url);
      if (!r.ok) {
        // eslint-disable-next-line no-console
        console.warn('[ReadingHelper] HTTP', r.status);
        setData(null);
        return;
      }
      const json = (await r.json()) as LookupResponse;
      setData(json);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ReadingHelper] fetch failed', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[ReadingHelper] mounted; select any Chinese text to see readings.');

    const tryCapture = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      // Ignore selections that originate inside form inputs or our own panel
      if (isNodeInsideEditable(sel.anchorNode)) return;
      if (isInsideHelper(sel.anchorNode) || isInsideHelper(sel.focusNode)) return;

      const text = sel.toString().trim();
      if (!text || text.length > 40) return;
      if (!RE_HAS_CHINESE.test(text)) return;
      if (text === lastQueryRef.current) {
        setHidden(false);
        return;
      }

      setQuery(text);
      setHidden(false);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => fetchDict(text), 150);
    };

    // mouseup/touchend = "user finished selecting" — most reliable trigger
    document.addEventListener('mouseup', tryCapture);
    document.addEventListener('touchend', tryCapture);
    // selectionchange as fallback (e.g., keyboard selection)
    document.addEventListener('selectionchange', tryCapture);

    return () => {
      document.removeEventListener('mouseup', tryCapture);
      document.removeEventListener('touchend', tryCapture);
      document.removeEventListener('selectionchange', tryCapture);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [fetchDict]);

  if (!query || hidden) return null;

  return (
    <aside
      data-reading-helper="1"
      className="fixed top-4 right-4 z-[9999] w-80 max-h-[80vh] overflow-y-auto
                 bg-white rounded-2xl shadow-2xl border-2 border-mushroom-300
                 text-base"
      role="complementary"
      aria-label="讀音與釋義"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <header className="sticky top-0 bg-mushroom-50 border-b border-mushroom-200
                         px-4 py-3 flex items-center justify-between rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl" aria-hidden="true">📖</span>
          <span
            className="font-bold text-mushroom-900 truncate bpmf-font"
            title={query}
          >
            {data?.word ?? query}
          </span>
        </div>
        <button
          onClick={() => setHidden(true)}
          className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2"
          aria-label="關閉"
          type="button"
        >
          ×
        </button>
      </header>

      <div className="px-4 py-3 space-y-3">
        {loading && <p className="text-gray-400 text-sm">查詢中…</p>}

        {!loading && data && !data.found && (
          <p className="text-gray-500 text-sm">
            字典中沒有「<span className="bpmf-font">{query}</span>」的紀錄。
          </p>
        )}

        {!loading && data?.found && data.entries && data.entries.length > 0 && (
          <section>
            {data.matchType === 'prefix' && (
              <p className="text-xs text-gray-400 mb-2">
                顯示前綴詞「<span className="bpmf-font">{data.word}</span>」的釋義：
              </p>
            )}
            {data.matchType === 'char' && (
              <p className="text-xs text-gray-400 mb-2">沒有整詞，顯示首字釋義：</p>
            )}
            {data.entries.map((e, i) => (
              <article
                key={i}
                className="mb-3 pb-3 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0"
              >
                <div className="inline-flex items-center gap-1 bg-mushroom-100 text-mushroom-900
                                px-3 py-1.5 rounded-lg text-sm font-bold mb-2">
                  {e.zhuyin.split(/\s+/).filter(Boolean).map((syl, j) => (
                    <BopomofoColumn key={j} reading={syl} />
                  ))}
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {e.definition}
                </p>
              </article>
            ))}
          </section>
        )}

        {!loading && data?.perChar && data.perChar.length > 0 && data.matchType !== 'exact' && (
          <section className="border-t border-gray-200 pt-3">
            <p className="text-xs text-gray-400 mb-2">每個字的讀音：</p>
            {data.perChar.map((pc) => (
              <div key={pc.char} className="mb-2 flex items-center flex-wrap gap-2">
                <span className="bpmf-font font-bold text-lg">{pc.char}</span>
                {pc.entries.map((e, j) => (
                  <span key={j} className="inline-flex items-center text-sm">
                    {e.zhuyin.split(/\s+/).filter(Boolean).map((syl, k) => (
                      <BopomofoColumn key={k} reading={syl} />
                    ))}
                  </span>
                ))}
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">
        資料：ToneOZ 澳聲通字典（MIT 授權）
      </footer>
    </aside>
  );
}
