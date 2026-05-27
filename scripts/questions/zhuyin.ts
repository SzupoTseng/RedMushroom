// Zhuyin (注音) conversion with context-aware 破音字 (polyphonic) handling.
//
// Strategy (highest priority first):
//   1. Longest-prefix WORD match against the ToneOZ dictionary
//      (backend/data/dictionary.json). Multi-character entries carry the
//      CORRECT contextual reading, e.g. 長大→ㄓㄤˇ ㄉㄚˋ, 音樂→ㄧㄣ ㄩㄝˋ,
//      重複→ㄔㄨㄥˊ ㄈㄨˋ. This is what fixes polyphonic characters.
//   2. Curated single-char TABLE below (curriculum-tuned default for the
//      grade 3–4 vocabulary) — used only when no multi-char word covers it.
//   3. Dictionary single-char default reading.
//   4. Empty string (unknown char / punctuation).
//
// The dictionary is loaded lazily & cached. If it can't be read, the module
// degrades gracefully to the single-char TABLE (original behaviour).

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DICT_PATH = path.resolve(HERE, '../../backend/data/dictionary.json');

const TABLE: Record<string, string> = {
  // 人稱
  '我': 'ㄨㄛˇ', '你': 'ㄋㄧˇ', '妳': 'ㄋㄧˇ', '他': 'ㄊㄚ', '她': 'ㄊㄚ',
  '們': '˙ㄇㄣ', '誰': 'ㄕㄟˊ',
  // 親屬／角色
  '爸': 'ㄅㄚˋ', '媽': 'ㄇㄚ', '哥': 'ㄍㄜ', '姊': 'ㄐㄧㄝˇ',
  '弟': 'ㄉㄧˋ', '妹': 'ㄇㄟˋ', '老': 'ㄌㄠˇ', '師': 'ㄕ',
  '同': 'ㄊㄨㄥˊ', '學': 'ㄒㄩㄝˊ', '朋': 'ㄆㄥˊ', '友': 'ㄧㄡˇ',
  '阿': 'ㄚ', '嬤': 'ㄇㄚˋ', '公': 'ㄍㄨㄥ',
  // 動作
  '吃': 'ㄔ', '喝': 'ㄏㄜ', '去': 'ㄑㄩˋ', '到': 'ㄉㄠˋ', '搭': 'ㄉㄚ',
  '坐': 'ㄗㄨㄛˋ', '騎': 'ㄑㄧˊ', '走': 'ㄗㄡˇ', '跑': 'ㄆㄠˇ',
  '說': 'ㄕㄨㄛ', '看': 'ㄎㄢˋ', '想': 'ㄒㄧㄤˇ', '幫': 'ㄅㄤ',
  // 「要」單字預設取「想要/需要」的四聲 ㄧㄠˋ（字典把一聲 ㄧㄠ 排前面，
  //  但 grade 3-4 最常見是 ㄧㄠˋ）。「要求」等一聲詞仍由字典詞匹配正確處理。
  '要': 'ㄧㄠˋ',
  '助': 'ㄓㄨˋ', '借': 'ㄐㄧㄝˋ', '給': 'ㄍㄟˇ', '買': 'ㄇㄞˇ',
  '賣': 'ㄇㄞˋ', '排': 'ㄆㄞˊ', '玩': 'ㄨㄢˊ', '寫': 'ㄒㄧㄝˇ',
  '聽': 'ㄊㄧㄥ', '讀': 'ㄉㄨˊ',
  // 地名／場所
  '夜': 'ㄧㄝˋ', '市': 'ㄕˋ', '捷': 'ㄐㄧㄝˊ', '運': 'ㄩㄣˋ',
  '學': 'ㄒㄩㄝˊ', '校': 'ㄒㄧㄠˋ', '家': 'ㄐㄧㄚ', '醫': 'ㄧ',
  '院': 'ㄩㄢˋ', '公': 'ㄍㄨㄥ', '園': 'ㄩㄢˊ', '商': 'ㄕㄤ',
  '店': 'ㄉㄧㄢˋ', '便': 'ㄅㄧㄢˋ', '利': 'ㄌㄧˋ',
  // 食物
  '飯': 'ㄈㄢˋ', '菜': 'ㄘㄞˋ', '湯': 'ㄊㄤ', '麵': 'ㄇㄧㄢˋ',
  '茶': 'ㄔㄚˊ', '珍': 'ㄓㄣ', '奶': 'ㄋㄞˇ', '蛋': 'ㄉㄢˋ',
  '糕': 'ㄍㄠ', '餅': 'ㄅㄧㄥˇ', '魚': 'ㄩˊ', '肉': 'ㄖㄡˋ',
  '蔬': 'ㄕㄨ', '果': 'ㄍㄨㄛˇ', '水': 'ㄕㄨㄟˇ', '冰': 'ㄅㄧㄥ',
  '甜': 'ㄊㄧㄢˊ', '鹹': 'ㄒㄧㄢˊ', '酸': 'ㄙㄨㄢ', '辣': 'ㄌㄚˋ',
  // 物品
  '車': 'ㄔㄜ', '腳': 'ㄐㄧㄠˇ', '踏': 'ㄊㄚˋ', '書': 'ㄕㄨ',
  '本': 'ㄅㄣˇ', '筆': 'ㄅㄧˇ', '紙': 'ㄓˇ', '電': 'ㄉㄧㄢˋ',
  '腦': 'ㄋㄠˇ', '視': 'ㄕˋ', '機': 'ㄐㄧ', '網': 'ㄨㄤˇ',
  '路': 'ㄌㄨˋ', '燈': 'ㄉㄥ', '錢': 'ㄑㄧㄢˊ', '包': 'ㄅㄠ',
  // 數量／時間
  '一': 'ㄧ', '二': 'ㄦˋ', '三': 'ㄙㄢ', '四': 'ㄙˋ', '五': 'ㄨˇ',
  '六': 'ㄌㄧㄡˋ', '七': 'ㄑㄧ', '八': 'ㄅㄚ', '九': 'ㄐㄧㄡˇ', '十': 'ㄕˊ',
  '天': 'ㄊㄧㄢ', '日': 'ㄖˋ', '月': 'ㄩㄝˋ', '年': 'ㄋㄧㄢˊ',
  '時': 'ㄕˊ', '分': 'ㄈㄣ', '秒': 'ㄇㄧㄠˇ',
  '早': 'ㄗㄠˇ', '中': 'ㄓㄨㄥ', '晚': 'ㄨㄢˇ',
  // 形容
  '好': 'ㄏㄠˇ', '壞': 'ㄏㄨㄞˋ', '大': 'ㄉㄚˋ', '小': 'ㄒㄧㄠˇ',
  '高': 'ㄍㄠ', '低': 'ㄉㄧ', '長': 'ㄔㄤˊ', '短': 'ㄉㄨㄢˇ',
  '熱': 'ㄖㄜˋ', '冷': 'ㄌㄥˇ', '快': 'ㄎㄨㄞˋ', '慢': 'ㄇㄢˋ',
  '新': 'ㄒㄧㄣ', '舊': 'ㄐㄧㄡˋ', '多': 'ㄉㄨㄛ', '少': 'ㄕㄠˇ',
  '美': 'ㄇㄟˇ', '醜': 'ㄔㄡˇ', '香': 'ㄒㄧㄤ', '臭': 'ㄔㄡˋ',
  '對': 'ㄉㄨㄟˋ', '錯': 'ㄘㄨㄛˋ', '真': 'ㄓㄣ', '假': 'ㄐㄧㄚˇ',
  '熱心': 'ㄖㄜˋㄒㄧㄣ',
  // 節日／文化
  '端': 'ㄉㄨㄢ', '午': 'ㄨˇ', '節': 'ㄐㄧㄝˊ',
  '中秋': 'ㄓㄨㄥㄑㄧㄡ', '秋': 'ㄑㄧㄡ', '元': 'ㄩㄢˊ', '宵': 'ㄒㄧㄠ',
  '春': 'ㄔㄨㄣ', '清': 'ㄑㄧㄥ', '明': 'ㄇㄧㄥˊ',
  '粽': 'ㄗㄨㄥˋ', '子': '˙ㄗ', '燈': 'ㄉㄥ', '籠': 'ㄌㄨㄥˊ',
  '湯圓': 'ㄊㄤㄩㄢˊ', '圓': 'ㄩㄢˊ',
  // 健康
  '病': 'ㄅㄧㄥˋ', '健': 'ㄐㄧㄢˋ', '康': 'ㄎㄤ', '生': 'ㄕㄥ',
  '醫': 'ㄧ', '藥': 'ㄧㄠˋ',
  // 連接詞／虛詞
  '的': '˙ㄉㄜ', '是': 'ㄕˋ', '不': 'ㄅㄨˋ', '在': 'ㄗㄞˋ',
  '了': '˙ㄌㄜ', '和': 'ㄏㄢˋ', '與': 'ㄩˇ', '或': 'ㄏㄨㄛˋ',
  '但': 'ㄉㄢˋ', '可': 'ㄎㄜˇ', '以': 'ㄧˇ', '為': 'ㄨㄟˋ',
  '所': 'ㄙㄨㄛˇ', '會': 'ㄏㄨㄟˋ', '請': 'ㄑㄧㄥˇ', '什': 'ㄕˊ',
  '麼': '˙ㄇㄜ', '怎': 'ㄗㄣˇ', '哪': 'ㄋㄚˇ', '為': 'ㄨㄟˋ',
  '上': 'ㄕㄤˋ', '下': 'ㄒㄧㄚˋ', '前': 'ㄑㄧㄢˊ', '後': 'ㄏㄡˋ',
  '裡': 'ㄌㄧˇ', '外': 'ㄨㄞˋ', '內': 'ㄋㄟˋ',
  // 量詞
  '隻': 'ㄓ', '條': 'ㄊㄧㄠˊ', '張': 'ㄓㄤ', '本': 'ㄅㄣˇ',
  '塊': 'ㄎㄨㄞˋ', '件': 'ㄐㄧㄢˋ', '間': 'ㄐㄧㄢ', '輛': 'ㄌㄧㄤˋ',
  '架': 'ㄐㄧㄚˋ', '朵': 'ㄉㄨㄛˇ', '棵': 'ㄎㄜ', '杯': 'ㄅㄟ',
  '位': 'ㄨㄟˋ', '個': '˙ㄍㄜ',
  // 形容詞（含反義／同義詞）
  '大': 'ㄉㄚˋ', '小': 'ㄒㄧㄠˇ', '高': 'ㄍㄠ', '矮': 'ㄞˇ',
  '長': 'ㄔㄤˊ', '短': 'ㄉㄨㄢˇ', '多': 'ㄉㄨㄛ', '少': 'ㄕㄠˇ',
  '重': 'ㄓㄨㄥˋ', '輕': 'ㄑㄧㄥ', '快': 'ㄎㄨㄞˋ', '慢': 'ㄇㄢˋ',
  '亮': 'ㄌㄧㄤˋ', '暗': 'ㄢˋ', '胖': 'ㄆㄤˋ', '瘦': 'ㄕㄡˋ',
  '甜': 'ㄊㄧㄢˊ', '苦': 'ㄎㄨˇ', '對': 'ㄉㄨㄟˋ', '錯': 'ㄘㄨㄛˋ',
  '熱': 'ㄖㄜˋ', '冷': 'ㄌㄥˇ', '乾': 'ㄍㄢ', '濕': 'ㄕ',
  '新': 'ㄒㄧㄣ', '舊': 'ㄐㄧㄡˋ', '早': 'ㄗㄠˇ', '晚': 'ㄨㄢˇ',
  '近': 'ㄐㄧㄣˋ', '遠': 'ㄩㄢˇ', '硬': 'ㄧㄥˋ', '軟': 'ㄖㄨㄢˇ',
  '漂': 'ㄆㄧㄠˋ',
  // 同義詞
  '美': 'ㄇㄟˇ', '麗': 'ㄌㄧˋ', '興': 'ㄒㄧㄥˋ', '樂': 'ㄌㄜˋ',
  '立': 'ㄌㄧˋ', '刻': 'ㄎㄜˋ', '馬': 'ㄇㄚˇ', '困': 'ㄎㄨㄣˋ',
  '難': 'ㄋㄢˊ', '辛': 'ㄒㄧㄣ', '勇': 'ㄩㄥˇ', '敢': 'ㄍㄢˇ',
  '聰': 'ㄘㄨㄥ', '機': 'ㄐㄧ', '靈': 'ㄌㄧㄥˊ', '糊': 'ㄏㄨˊ',
  '塗': 'ㄊㄨˊ', '努': 'ㄋㄨˇ', '力': 'ㄌㄧˋ', '用': 'ㄩㄥˋ',
  '功': 'ㄍㄨㄥ', '懶': 'ㄌㄢˇ', '惰': 'ㄉㄨㄛˋ', '害': 'ㄏㄞˋ',
  '怕': 'ㄆㄚˋ', '恐': 'ㄎㄨㄥˇ', '懼': 'ㄐㄩˋ', '幫': 'ㄅㄤ',
  '反': 'ㄈㄢˇ', '討': 'ㄊㄠˇ', '厭': 'ㄧㄢˋ', '全': 'ㄑㄩㄢˊ',
  '部': 'ㄅㄨˋ', '所': 'ㄙㄨㄛˇ', '一': 'ㄧ', '半': 'ㄅㄢˋ',
  '忽': 'ㄏㄨ', '突': 'ㄊㄨˊ', '然': 'ㄖㄢˊ', '永': 'ㄩㄥˇ',
  '偶': 'ㄡˇ', '爾': 'ㄦˇ', '從': 'ㄘㄨㄥˊ', '認': 'ㄖㄣˋ',
  '保': 'ㄅㄠˇ', '護': 'ㄏㄨˋ', '愛': 'ㄞˋ', '微': 'ㄨㄟˊ',
  '笑': 'ㄒㄧㄠˋ', '哭': 'ㄎㄨ', '泣': 'ㄑㄧˋ', '常': 'ㄔㄤˊ',
  '經': 'ㄐㄧㄥ', '永遠': 'ㄩㄥˇㄩㄢˇ',
  // 季節／天氣／自然
  '春': 'ㄔㄨㄣ', '夏': 'ㄒㄧㄚˋ', '秋': 'ㄑㄧㄡ', '冬': 'ㄉㄨㄥ',
  '季': 'ㄐㄧˋ', '節': 'ㄐㄧㄝˊ', '花': 'ㄏㄨㄚ', '葉': 'ㄧㄝˋ',
  '雨': 'ㄩˇ', '傘': 'ㄙㄢˇ', '颱': 'ㄊㄞˊ', '風': 'ㄈㄥ',
  '雷': 'ㄌㄟˊ', '陣': 'ㄓㄣˋ', '梅': 'ㄇㄟˊ', '櫻': 'ㄧㄥ',
  '雪': 'ㄒㄩㄝˇ', '陽': 'ㄧㄤˊ', '雲': 'ㄩㄣˊ', '微笑': 'ㄨㄟˊㄒㄧㄠˋ',
  // 動物
  '貓': 'ㄇㄠ', '狗': 'ㄍㄡˇ', '雞': 'ㄐㄧ', '牛': 'ㄋㄧㄡˊ',
  '羊': 'ㄧㄤˊ', '蜜': 'ㄇㄧˋ', '蜂': 'ㄈㄥ', '蜘': 'ㄓ',
  '蛛': 'ㄓㄨ', '織': 'ㄓ', '網': 'ㄨㄤˇ', '熊': 'ㄒㄩㄥˊ',
  '貓': 'ㄇㄠ', '竹': 'ㄓㄨˊ', '頸': 'ㄐㄧㄥˇ', '鹿': 'ㄌㄨˋ',
  '黑': 'ㄏㄟ', '胸': 'ㄒㄩㄥ', '紋': 'ㄨㄣˊ', '眠': 'ㄇㄧㄢˊ',
  '蝴': 'ㄏㄨˊ', '蝶': 'ㄉㄧㄝˊ', '兔': 'ㄊㄨˋ', '鳥': 'ㄋㄧㄠˇ',
  '鼠': 'ㄕㄨˇ', '魚': 'ㄩˊ',
  // 時間
  '昨': 'ㄗㄨㄛˊ', '今': 'ㄐㄧㄣ', '天': 'ㄊㄧㄢ', '明': 'ㄇㄧㄥˊ',
  '星': 'ㄒㄧㄥ', '期': 'ㄑㄧˊ', '月': 'ㄩㄝˋ', '年': 'ㄋㄧㄢˊ',
  '中': 'ㄓㄨㄥ', '午': 'ㄨˇ', '傍': 'ㄅㄤˋ', '太': 'ㄊㄞˋ',
  '升': 'ㄕㄥ', '小時': 'ㄒㄧㄠˇㄕˊ', '時': 'ㄕˊ', '分': 'ㄈㄣ',
  '鐘': 'ㄓㄨㄥ', '過': 'ㄍㄨㄛˋ', '去': 'ㄑㄩˋ', '將': 'ㄐㄧㄤ',
  '來': 'ㄌㄞˊ', '現': 'ㄒㄧㄢˋ',
  // 連接詞／句型用字
  '如': 'ㄖㄨˊ', '雖': 'ㄙㄨㄟ', '因': 'ㄧㄣ', '而': 'ㄦˊ',
  '比': 'ㄅㄧˇ', '嗎': '˙ㄇㄚ', '幾': 'ㄐㄧˇ', '只': 'ㄓˇ',
  '就': 'ㄐㄧㄡˋ', '還': 'ㄏㄞˊ',
  // 名詞補充
  '人': 'ㄖㄣˊ', '書': 'ㄕㄨ', '衣': 'ㄧ', '服': 'ㄈㄨˊ',
  '車': 'ㄔㄜ', '飛': 'ㄈㄟ', '錢': 'ㄑㄧㄢˊ', '麵': 'ㄇㄧㄢˋ',
  '包': 'ㄅㄠ', '紙': 'ㄓˇ', '房': 'ㄈㄤˊ', '游': 'ㄧㄡˊ',
  '泳': 'ㄩㄥˇ', '飛翔': 'ㄈㄟㄒㄧㄤˊ',
  // 動詞補充
  '採': 'ㄘㄞˇ', '挖': 'ㄨㄚ', '洞': 'ㄉㄨㄥˋ', '跳': 'ㄊㄧㄠˋ',
  '出': 'ㄔㄨ', '門': 'ㄇㄣˊ', '帶': 'ㄉㄞˋ', '泳衣': 'ㄩㄥˇㄧ',
  '海': 'ㄏㄞˇ', '邊': 'ㄅㄧㄢ', '玩': 'ㄨㄢˊ',
  // 標點不轉
};

export interface ZhuyinChar {
  char: string;
  pinyin: string;
}

// ── ToneOZ dictionary (lazy, cached) ──────────────────────────────────────
interface DictEntry { zhuyin: string; definition: string }
let dictCache: Record<string, DictEntry[]> | null = null;

function loadDict(): Record<string, DictEntry[]> {
  if (dictCache) return dictCache;
  try {
    dictCache = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
    // eslint-disable-next-line no-console
    console.log(`[zhuyin] dictionary loaded: ${Object.keys(dictCache!).length.toLocaleString()} entries`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[zhuyin] dictionary unavailable (${(e as Error).message}); using single-char table only.`);
    dictCache = {};
  }
  return dictCache!;
}

// Strip "（變）..." / "(變)..." tone-sandhi notes and collapse whitespace.
// e.g. "ㄧ ㄏㄤˊ （變）ㄧˋ ㄏㄤˊ" → "ㄧ ㄏㄤˊ"
function cleanReading(z: string): string {
  return z.replace(/[（(]變[）)][\s\S]*$/u, '').replace(/\s+/g, ' ').trim();
}

const RE_CJK = /[㐀-鿿]/; // only segment Han characters
const MAX_WORD_LEN = 6;            // longest dictionary phrase to probe

/**
 * Convert a sentence to ZhuyinChar[] with context-aware polyphonic readings.
 * Walks left→right; at each position takes the longest dictionary word whose
 * space-separated reading splits cleanly (one syllable per character).
 */
export function zhuyinize(text: string): ZhuyinChar[] {
  const dict = loadDict();
  const chars = [...text]; // surrogate-safe
  const out: ZhuyinChar[] = [];
  let i = 0;

  while (i < chars.length) {
    // 1. Longest multi-char word match (context-correct for 破音字)
    let matched = false;
    if (RE_CJK.test(chars[i])) {
      const maxLen = Math.min(MAX_WORD_LEN, chars.length - i);
      for (let len = maxLen; len >= 2; len--) {
        const word = chars.slice(i, i + len).join('');
        const entry = dict[word]?.[0];
        if (!entry) continue;
        const sylls = cleanReading(entry.zhuyin).split(' ').filter(Boolean);
        if (sylls.length !== len) continue; // can't map 1:1 — skip this candidate
        for (let k = 0; k < len; k++) {
          out.push({ char: chars[i + k], pinyin: sylls[k] });
        }
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 2/3/4. Single char: curated TABLE → dict default → empty
    const c = chars[i];
    let pinyin = TABLE[c];
    if (pinyin === undefined) {
      const de = dict[c]?.[0];
      pinyin = de ? cleanReading(de.zhuyin).split(' ')[0] : '';
    }
    out.push({ char: c, pinyin });
    i += 1;
  }

  return out;
}

/**
 * Build the per-option bopomofo map for an options object, ready to JSON-store
 * in questions.options_zhuyin.  { "1": "包子" } → { "1": [{char,pinyin}, …] }
 * Comma-joined sorting options (e.g. "我,想要") are split & annotated per token
 * but kept flat (commas dropped — sorting tiles store each option separately).
 */
export function optionsZhuyin(options: Record<string, string>): Record<string, ZhuyinChar[]> {
  const out: Record<string, ZhuyinChar[]> = {};
  for (const [k, v] of Object.entries(options)) {
    out[k] = zhuyinize(v);
  }
  return out;
}
