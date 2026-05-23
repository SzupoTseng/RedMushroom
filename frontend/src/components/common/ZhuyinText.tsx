/**
 * 統一顯示帶注音的文字。
 *
 * 兩種模式：
 * - bpmfFont = 'none'：用 <ruby>/<rt> 標註注音（傳統做法）
 * - bpmfFont = 'BpmfHuninn' 等：套用注音字型，注音由字型自動繪製在字旁
 *
 * 兩種模式都接受同樣的資料：ZhuyinChar[]（{char, pinyin}）
 */
import type { ZhuyinChar } from '../../types';
import { useConfig } from '../../context/ConfigContext';

interface Props {
  content: ZhuyinChar[];
  className?: string;
}

export default function ZhuyinText({ content, className = '' }: Props) {
  const { showZhuyin, bpmfFont } = useConfig();

  // 字型模式：直接套用字型，字型自帶注音
  if (bpmfFont !== 'none' && showZhuyin) {
    const text = content.map((c) => c.char).join('');
    return <span className={`bpmf-font ${className}`}>{text}</span>;
  }

  // 注音關閉：純文字
  if (!showZhuyin) {
    return (
      <span className={className}>
        {content.map((c, i) => <span key={i}>{c.char}</span>)}
      </span>
    );
  }

  // 預設：<ruby>/<rt> 標註
  return (
    <span className={className}>
      {content.map((c, i) =>
        c.pinyin ? (
          <ruby key={i}>{c.char}<rt className="text-xs text-gray-400">{c.pinyin}</rt></ruby>
        ) : (
          <span key={i}>{c.char}</span>
        )
      )}
    </span>
  );
}
