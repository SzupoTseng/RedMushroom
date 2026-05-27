/**
 * 統一顯示帶注音的文字。
 *
 * 模式：
 * - showZhuyin = false：純文字。
 * - bpmfFont = 'none'：全部用 <ruby>/<rt> 標註（資料層的正確讀音）。
 * - bpmfFont = 字型：套用注音字型（字型自帶注音），但**破音字**改用 <ruby>
 *   覆蓋顯示資料層的「上下文正確讀音」——因為合字字型每個字只能顯示一個固定
 *   讀音，無法因應上下文（長大ㄓㄤˇ vs 長度ㄔㄤˊ）。
 *
 * 三種模式都吃同一份資料：ZhuyinChar[]（{char, pinyin}，pinyin 已由後端
 * 字典最長字首匹配校正過）。
 */
import type { ZhuyinChar } from '../../types';
import { useConfig } from '../../context/ConfigContext';
import { useIvsDict, applyIvs } from '../../hooks/useIvsDict';

interface Props {
  content: ZhuyinChar[];
  className?: string;
}

function RubyChar({ c }: { c: ZhuyinChar }) {
  return (
    <ruby>
      {c.char}
      <rt className="text-xs text-gray-400">{c.pinyin}</rt>
    </ruby>
  );
}

/**
 * 渲染答案選項標籤：有逐字注音資料 (options_zhuyin) → 走 ZhuyinText（破音字
 * 會以 ruby 顯示正確讀音）；沒有資料 → 退回字型渲染（向後相容）。
 */
export function BpmfLabel({
  text,
  zhuyin,
  className = '',
}: {
  text: string;
  zhuyin?: ZhuyinChar[];
  className?: string;
}) {
  if (zhuyin && zhuyin.length > 0) {
    return <ZhuyinText content={zhuyin} className={className} />;
  }
  return <span className={`bpmf-font ${className}`}>{text}</span>;
}

export default function ZhuyinText({ content, className = '' }: Props) {
  const { showZhuyin, bpmfFont } = useConfig();
  const ivs = useIvsDict();

  // 注音關閉：純文字
  if (!showZhuyin) {
    return (
      <span className={className}>
        {content.map((c, i) => <span key={i}>{c.char}</span>)}
      </span>
    );
  }

  // 字型模式：全部交給注音字型畫，外觀一致（無 ruby 外掛）。破音字透過 IVS
  // 變體選擇符（U+E01E0+idx）讓字型畫出上下文正確的讀音，而非固定預設讀音。
  if (bpmfFont !== 'none') {
    return (
      <span className={`bpmf-font ${className}`}>
        {content.map((c, i) => <span key={i}>{applyIvs(c.char, c.pinyin, ivs)}</span>)}
      </span>
    );
  }

  // 預設（不用字型）：全部 <ruby>/<rt> 標註，讀音來自校正過的資料
  return (
    <span className={className}>
      {content.map((c, i) =>
        c.pinyin
          ? <RubyChar key={i} c={c} />
          : <span key={i}>{c.char}</span>
      )}
    </span>
  );
}
