/**
 * 注音字型選擇器（下拉選單）。
 * 放在頂部設定列。值會存到 localStorage。
 */
import { useConfig, BPMF_FONT_LABELS, type BpmfFont } from '../../context/ConfigContext';

export default function BpmfFontSelector() {
  const { bpmfFont, setBpmfFont } = useConfig();
  return (
    <select
      value={bpmfFont}
      onChange={(e) => setBpmfFont(e.target.value as BpmfFont)}
      className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 bg-white hover:border-mushroom-300 focus:border-mushroom-400 outline-none transition cursor-pointer"
      title="注音字型"
    >
      {(Object.keys(BPMF_FONT_LABELS) as BpmfFont[]).map((k) => (
        <option key={k} value={k}>{BPMF_FONT_LABELS[k]}</option>
      ))}
    </select>
  );
}
