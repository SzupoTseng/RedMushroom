/**
 * BopomofoColumn — 將一個音節的注音字串（例如 "ㄍㄨㄟˋ"）拆成：
 *   - body：聲符+介符+韻符（左側直排）
 *   - tone：聲調符號 ˊ ˇ ˋ ˙（右側）
 *
 * 排版仿照台灣標準注音直排（教科書／字典常見）：
 *
 *   ┌──┬──┐
 *   │ㄍ│  │
 *   │ㄨ│ˋ│
 *   │ㄟ│  │
 *   └──┴──┘
 *
 * 輕聲 ˙ 出現在開頭（如「˙ㄉㄜ」），會被視為「neutral」放在右上角。
 */

const TONE_MARKS = new Set(['ˊ', 'ˇ', 'ˋ']);
const NEUTRAL_MARK = '˙';

interface Split {
  body: string[];
  tone: string | null;
  isNeutral: boolean;
}

export function splitBopomofo(s: string): Split {
  if (!s) return { body: [], tone: null, isNeutral: false };
  const arr = Array.from(s);
  // 輕聲：˙ 在開頭
  if (arr[0] === NEUTRAL_MARK) {
    return { body: arr.slice(1), tone: NEUTRAL_MARK, isNeutral: true };
  }
  // 二三四聲：聲調在結尾
  const last = arr[arr.length - 1];
  if (TONE_MARKS.has(last)) {
    return { body: arr.slice(0, -1), tone: last, isNeutral: false };
  }
  // 一聲：沒有聲調符號
  return { body: arr, tone: null, isNeutral: false };
}

interface Props {
  reading: string;
  className?: string;
}

export default function BopomofoColumn({ reading, className = '' }: Props) {
  const { body, tone, isNeutral } = splitBopomofo(reading);
  return (
    <span className={`bpmf-right ${className}`} aria-hidden="true">
      <span className="bpmf-syllables">
        {body.map((b, i) => (
          <span key={i}>{b}</span>
        ))}
      </span>
      {tone && (
        <span className={`bpmf-tone ${isNeutral ? 'neutral' : ''}`}>{tone}</span>
      )}
    </span>
  );
}
