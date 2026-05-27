/**
 * Build the English-typing-game vocabulary with correct-tone bopomofo.
 *
 * Two sources (merged, en deduped — external wins):
 *   1. Built-in clean-room list below (common grade 3-4 words; factual pairs).
 *   2. OPTIONAL external file scripts/data/english-vocab-source.tsv
 *      — one "en<TAB>zh" per line (lines starting with # ignored).
 *      Drop the official MOE「國中小常用英文 2000 單字」here (export it to TSV
 *      from the official source) to get the full 2000-word set. We do NOT bundle
 *      that compiled list ourselves — provide your own copy from the authority.
 *
 * Chinese meanings run through zhuyinize() for correct contextual tones.
 * Output: frontend/public/data/english-vocab.json  [{ en, zh, zhuyin }]
 *
 * Run:  npx tsx scripts/build-english-vocab.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { zhuyinize } from './questions/zhuyin';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../frontend/public/data/english-vocab.json');
const EXTERNAL_TSV = path.resolve(HERE, 'data/english-vocab-source.tsv');

// en → zh (common, grade 3-4). Kept concise; meanings are standard dictionary
// equivalents (factual), grouped by theme for reference only.
const PAIRS: Array<[string, string]> = [
  // numbers
  ['one', '一'], ['two', '二'], ['three', '三'], ['four', '四'], ['five', '五'],
  ['six', '六'], ['seven', '七'], ['eight', '八'], ['nine', '九'], ['ten', '十'],
  // colors
  ['red', '紅色'], ['blue', '藍色'], ['green', '綠色'], ['yellow', '黃色'],
  ['black', '黑色'], ['white', '白色'], ['pink', '粉紅色'], ['orange', '橘色'],
  ['purple', '紫色'], ['brown', '咖啡色'],
  // animals
  ['dog', '狗'], ['cat', '貓'], ['bird', '鳥'], ['fish', '魚'], ['pig', '豬'],
  ['cow', '牛'], ['duck', '鴨子'], ['rabbit', '兔子'], ['tiger', '老虎'],
  ['lion', '獅子'], ['bear', '熊'], ['elephant', '大象'], ['monkey', '猴子'],
  ['horse', '馬'], ['sheep', '綿羊'], ['chicken', '雞'], ['mouse', '老鼠'],
  // family
  ['father', '爸爸'], ['mother', '媽媽'], ['brother', '哥哥'], ['sister', '姊姊'],
  ['baby', '寶寶'], ['grandfather', '爺爺'], ['grandmother', '奶奶'], ['family', '家人'],
  // body
  ['head', '頭'], ['hand', '手'], ['foot', '腳'], ['eye', '眼睛'], ['ear', '耳朵'],
  ['nose', '鼻子'], ['mouth', '嘴巴'], ['hair', '頭髮'], ['face', '臉'], ['tooth', '牙齒'],
  // food & drink
  ['apple', '蘋果'], ['banana', '香蕉'], ['rice', '米飯'], ['bread', '麵包'],
  ['milk', '牛奶'], ['egg', '蛋'], ['water', '水'], ['meat', '肉'], ['cake', '蛋糕'],
  ['candy', '糖果'], ['juice', '果汁'], ['noodle', '麵'], ['soup', '湯'], ['tea', '茶'],
  // school
  ['book', '書'], ['pen', '筆'], ['pencil', '鉛筆'], ['bag', '書包'], ['desk', '書桌'],
  ['chair', '椅子'], ['teacher', '老師'], ['student', '學生'], ['school', '學校'],
  ['class', '班級'], ['ruler', '尺'], ['eraser', '橡皮擦'],
  // nature
  ['sun', '太陽'], ['moon', '月亮'], ['star', '星星'], ['sky', '天空'], ['tree', '樹'],
  ['flower', '花'], ['rain', '雨'], ['wind', '風'], ['cloud', '雲'], ['mountain', '山'],
  ['sea', '海'], ['river', '河'], ['fire', '火'], ['snow', '雪'],
  // verbs
  ['run', '跑步'], ['jump', '跳'], ['eat', '吃'], ['drink', '喝'], ['read', '讀'],
  ['write', '寫'], ['sing', '唱歌'], ['play', '玩'], ['sleep', '睡覺'], ['walk', '走路'],
  ['swim', '游泳'], ['look', '看'], ['go', '去'], ['come', '來'], ['sit', '坐'],
  ['stand', '站'], ['open', '打開'], ['close', '關閉'], ['listen', '聽'], ['speak', '說'],
  // adjectives
  ['big', '大'], ['small', '小'], ['hot', '熱'], ['cold', '冷'], ['happy', '快樂'],
  ['sad', '難過'], ['good', '好'], ['tall', '高'], ['short', '矮'], ['fast', '快'],
  ['slow', '慢'], ['new', '新'], ['old', '舊'], ['long', '長'], ['clean', '乾淨'],
  ['cute', '可愛'], ['pretty', '漂亮'], ['strong', '強壯'],
  // time / days
  ['day', '白天'], ['night', '晚上'], ['today', '今天'], ['week', '星期'], ['year', '年'],
  ['Monday', '星期一'], ['Sunday', '星期日'], ['morning', '早上'],
  // everyday objects
  ['house', '房子'], ['car', '汽車'], ['ball', '球'], ['toy', '玩具'], ['clock', '時鐘'],
  ['door', '門'], ['window', '窗戶'], ['phone', '電話'], ['table', '桌子'], ['box', '盒子'],
  ['key', '鑰匙'], ['cup', '杯子'], ['shoe', '鞋子'], ['hat', '帽子'], ['umbrella', '雨傘'],
  // greetings / common
  ['hello', '你好'], ['goodbye', '再見'], ['yes', '是'], ['no', '不是'],
  ['friend', '朋友'], ['love', '愛'], ['name', '名字'], ['happy birthday', '生日快樂'],
];

// [en, zh, pos] — pos optional (built-in list has none; external supplies it)
type Triple = [string, string, string?];

function loadExternal(): Triple[] {
  if (!fs.existsSync(EXTERNAL_TSV)) return [];
  const lines = fs.readFileSync(EXTERNAL_TSV, 'utf-8').split(/\r?\n/);
  const out: Triple[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const cols = t.split('\t');
    // 3-col form: en<TAB>pos<TAB>zh  |  2-col form: en<TAB>zh
    if (cols.length >= 3) {
      const [en, pos, zh] = cols;
      if (en && zh) out.push([en.trim(), zh.trim(), pos.trim()]);
    } else {
      const [en, zh] = cols;
      if (en && zh) out.push([en.trim(), zh.trim()]);
    }
  }
  console.log(`[english-vocab] external list: ${out.length} entries from ${EXTERNAL_TSV}`);
  return out;
}

function main() {
  // built-in first, external appended (external wins on duplicate en)
  const byEn = new Map<string, { en: string; zh: string; pos: string }>();
  const builtins: Triple[] = PAIRS.map(([en, zh]) => [en, zh]);
  for (const [en, zh, pos] of [...builtins, ...loadExternal()]) {
    byEn.set(en.toLowerCase(), { en, zh, pos: pos ?? '' });
  }
  const out = [...byEn.values()].map(({ en, zh, pos }) => ({
    en,
    pos,
    zh,
    zhuyin: zhuyinize(zh),
  }));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0), 'utf-8');
  console.log(`[english-vocab] wrote ${out.length} words → ${OUT}`);
  for (const w of out.slice(0, 6)) {
    console.log(`  ${w.en} ${w.pos} = ${w.zh}  [${w.zhuyin.map((c) => c.char + c.pinyin).join(' ')}]`);
  }
}

main();
