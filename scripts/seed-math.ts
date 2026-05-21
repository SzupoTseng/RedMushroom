/**
 * 數學模組 seed — 國小 3-4 年級題目，包在 8 個生活情境（food_shopping/social/…）。
 * 共 32 題（4 theory_type × 8 category_type 各一題），手寫、避免重複句型。
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { zhuyinize } from './questions/zhuyin';
import { shuffleSingleChoice } from './questions/shuffle';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../database/redmushroom.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

interface MQ {
  theory_type: 'cognitive' | 'input' | 'usage' | 'sociocultural';
  category_type:
    | 'food_shopping' | 'social' | 'travel' | 'business'
    | 'health' | 'leisure' | 'housing' | 'digital';
  question_type: 'single_choice' | 'sorting';
  prompt: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
}

const math: MQ[] = [
  // ── cognitive × 8（數量與運算符號的認知）────────────
  { theory_type: 'cognitive', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '一打雞蛋是幾顆？', options: { '1':'12','2':'10','3':'6','4':'8' }, answer: '1',
    explanation: '一打 = 12，超商常用單位。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「半小時」是幾分鐘？', options: { '1':'30','2':'15','3':'45','4':'60' }, answer: '1',
    explanation: '半小時 = 30 分鐘。' },
  { theory_type: 'cognitive', category_type: 'travel', question_type: 'single_choice',
    prompt: '1 公里等於幾公尺？', options: { '1':'1000','2':'100','3':'10','4':'10000' }, answer: '1',
    explanation: '1 公里 = 1000 公尺。' },
  { theory_type: 'cognitive', category_type: 'business', question_type: 'single_choice',
    prompt: '新臺幣 1000 元裡有幾張 100 元？', options: { '1':'10','2':'5','3':'100','4':'1' }, answer: '1',
    explanation: '1000 ÷ 100 = 10。' },
  { theory_type: 'cognitive', category_type: 'health', question_type: 'single_choice',
    prompt: '體溫 36.5 度是幾度幾分？', options: { '1':'36 度 5 分','2':'36 度','3':'37 度','4':'36 度 50 分' }, answer: '1',
    explanation: '小數點後 5 唸作「5 分」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '一打撲克牌是幾張？（含鬼牌）', options: { '1':'54','2':'52','3':'48','4':'56' }, answer: '1',
    explanation: '一副 52 張 + 2 張鬼牌 = 54。' },
  { theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '一坪約多少平方公尺？', options: { '1':'3.3','2':'1','3':'10','4':'100' }, answer: '1',
    explanation: '臺灣常用單位：1 坪 ≈ 3.3 平方公尺。' },
  { theory_type: 'cognitive', category_type: 'digital', question_type: 'single_choice',
    prompt: '1 KB 約是幾個位元組（byte）？', options: { '1':'1024','2':'100','3':'1000','4':'10' }, answer: '1',
    explanation: '電腦的 1 KB = 1024 bytes（嚴格定義）。' },

  // ── input × 8（讀懂情境提取數字）────────────
  { theory_type: 'input', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '小華在夜市買 3 杯珍奶，每杯 60 元，要付多少錢？',
    options: { '1':'180 元','2':'120 元','3':'150 元','4':'200 元' }, answer: '1',
    explanation: '3 × 60 = 180。' },
  { theory_type: 'input', category_type: 'social', question_type: 'single_choice',
    prompt: '一班 28 人去戶外教學，老師加 2 位，總共幾人？',
    options: { '1':'30','2':'28','3':'32','4':'26' }, answer: '1',
    explanation: '28 + 2 = 30。' },
  { theory_type: 'input', category_type: 'travel', question_type: 'single_choice',
    prompt: '捷運從淡水到象山要 45 分鐘，現在 8:30 出發，幾點到？',
    options: { '1':'9:15','2':'9:00','3':'9:30','4':'8:45' }, answer: '1',
    explanation: '8:30 + 45 分 = 9:15。' },
  { theory_type: 'input', category_type: 'business', question_type: 'single_choice',
    prompt: '一個便當 80 元，付 100 元，店員找回多少？',
    options: { '1':'20 元','2':'30 元','3':'10 元','4':'80 元' }, answer: '1',
    explanation: '100 - 80 = 20。' },
  { theory_type: 'input', category_type: 'health', question_type: 'single_choice',
    prompt: '小明每天運動 30 分鐘，一週運動幾分鐘？',
    options: { '1':'210','2':'150','3':'180','4':'300' }, answer: '1',
    explanation: '30 × 7 = 210。' },
  { theory_type: 'input', category_type: 'leisure', question_type: 'single_choice',
    prompt: '電影 1 小時 50 分鐘長，從 14:00 開始，幾點結束？',
    options: { '1':'15:50','2':'15:00','3':'16:00','4':'15:30' }, answer: '1',
    explanation: '14:00 + 1:50 = 15:50。' },
  { theory_type: 'input', category_type: 'housing', question_type: 'single_choice',
    prompt: '房間長 4 公尺寬 3 公尺，地板面積是？',
    options: { '1':'12 平方公尺','2':'7 平方公尺','3':'14 平方公尺','4':'9 平方公尺' }, answer: '1',
    explanation: '長方形面積 = 長 × 寬 = 4 × 3 = 12。' },
  { theory_type: 'input', category_type: 'digital', question_type: 'single_choice',
    prompt: '手機電量剩 80%，每小時掉 20%，幾小時用光？',
    options: { '1':'4 小時','2':'2 小時','3':'8 小時','4':'20 小時' }, answer: '1',
    explanation: '80 ÷ 20 = 4。' },

  // ── usage × 8（運算順序與公式運用）────────────
  { theory_type: 'usage', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '計算 2 + 3 × 4 等於？',
    options: { '1':'14','2':'20','3':'24','4':'9' }, answer: '1',
    explanation: '先乘除後加減：3×4=12，再 +2=14。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '計算 (6 + 4) × 2 等於？',
    options: { '1':'20','2':'14','3':'16','4':'12' }, answer: '1',
    explanation: '括號先做：6+4=10，再 ×2=20。' },
  { theory_type: 'usage', category_type: 'travel', question_type: 'single_choice',
    prompt: '正方形周長公式是？',
    options: { '1':'邊長 × 4','2':'邊長 × 邊長','3':'邊長 × 2','4':'邊長 + 4' }, answer: '1',
    explanation: '正方形四邊相等，周長 = 邊長 × 4。' },
  { theory_type: 'usage', category_type: 'business', question_type: 'single_choice',
    prompt: '某商品 9 折優惠，9 折是？',
    options: { '1':'原價的 90%','2':'原價的 9%','3':'原價的 10%','4':'省下 90%' }, answer: '1',
    explanation: '臺灣的「9 折」= 90%。' },
  { theory_type: 'usage', category_type: 'health', question_type: 'single_choice',
    prompt: '計算 100 - 25 × 2 等於？',
    options: { '1':'50','2':'150','3':'75','4':'25' }, answer: '1',
    explanation: '先乘後減：25×2=50，再 100-50=50。' },
  { theory_type: 'usage', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪一個是「分數一半」？',
    options: { '1':'1/2','2':'2/2','3':'1/4','4':'1/3' }, answer: '1',
    explanation: '1/2 = 0.5 = 一半。' },
  { theory_type: 'usage', category_type: 'housing', question_type: 'single_choice',
    prompt: '長方形長 5、寬 3，周長是？',
    options: { '1':'16','2':'15','3':'8','4':'30' }, answer: '1',
    explanation: '周長 = (長+寬) × 2 = 8 × 2 = 16。' },
  { theory_type: 'usage', category_type: 'digital', question_type: 'single_choice',
    prompt: '檔案 60 MB，網速每秒 12 MB，下載幾秒？',
    options: { '1':'5 秒','2':'72 秒','3':'48 秒','4':'12 秒' }, answer: '1',
    explanation: '60 ÷ 12 = 5。' },

  // ── sociocultural × 8（臺灣生活情境的數學）────────
  { theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '臺灣便利商店「咖啡買 5 送 1」，買 5 杯實際拿幾杯？',
    options: { '1':'6','2':'5','3':'10','4':'4' }, answer: '1',
    explanation: '買 5 送 1：付 5 杯的錢拿 6 杯。' },
  { theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '農曆新年發紅包，1 萬元裝在幾個 1000 元裡？',
    options: { '1':'10','2':'100','3':'1','4':'5' }, answer: '1',
    explanation: '10000 ÷ 1000 = 10。' },
  { theory_type: 'sociocultural', category_type: 'travel', question_type: 'single_choice',
    prompt: '臺鐵自強號從台北到高雄約 350 公里，時速 100，需要幾小時？',
    options: { '1':'3.5 小時','2':'3 小時','3':'5 小時','4':'2 小時' }, answer: '1',
    explanation: '350 ÷ 100 = 3.5 小時。' },
  { theory_type: 'sociocultural', category_type: 'business', question_type: 'single_choice',
    prompt: '統一發票對中 200 元，可以買幾個 50 元的便當？',
    options: { '1':'4','2':'2','3':'5','4':'200' }, answer: '1',
    explanation: '200 ÷ 50 = 4。' },
  { theory_type: 'sociocultural', category_type: 'health', question_type: 'single_choice',
    prompt: '健保看門診掛號費 150 元，付 200 找回？',
    options: { '1':'50 元','2':'100 元','3':'150 元','4':'350 元' }, answer: '1',
    explanation: '200 - 150 = 50。' },
  { theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '中秋節烤肉串 15 元一支，買 4 支再加 1 瓶飲料 20 元，共多少？',
    options: { '1':'80 元','2':'60 元','3':'75 元','4':'100 元' }, answer: '1',
    explanation: '15×4=60，60+20=80。' },
  { theory_type: 'sociocultural', category_type: 'housing', question_type: 'single_choice',
    prompt: '臺灣房子常用「坪」，30 坪約多少平方公尺？（1 坪 ≈ 3.3 m²）',
    options: { '1':'99','2':'30','3':'10','4':'300' }, answer: '1',
    explanation: '30 × 3.3 = 99 m²。' },
  { theory_type: 'sociocultural', category_type: 'digital', question_type: 'single_choice',
    prompt: 'YouBike 每 30 分鐘 10 元，騎 90 分鐘要付？',
    options: { '1':'30 元','2':'20 元','3':'10 元','4':'60 元' }, answer: '1',
    explanation: '90 ÷ 30 = 3 段，3 × 10 = 30 元。' },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO questions
    (subject, theory_type, category_type, question_type, content, options, correct_answer, explanation, score)
  VALUES ('math', @theory_type, @category_type, @question_type, @content, @options, @correct_answer, @explanation, 10)
`);

const insertMany = db.transaction((rows: MQ[]) => {
  for (const q of rows) {
    const { options, answer } = shuffleSingleChoice(q.options, q.answer);
    insert.run({
      ...q,
      content: JSON.stringify(zhuyinize(q.prompt)),
      options: JSON.stringify(options),
      correct_answer: answer,
    });
  }
});
insertMany(math);

console.log(`[seed-math] ✅ 寫入 ${math.length} 道數學題目（subject='math'）`);
db.close();
