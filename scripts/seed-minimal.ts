/**
 * 最小種子資料：建立示範題目、讚美語庫、預設老師帳號
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../database/redmushroom.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('[seed-minimal] 開始植入示範資料...');

// ── 示範題目 ──────────────────────────────────────────────────────────────────

const questions = [
  {
    subject: 'chinese', theory_type: 'cognitive', category_type: 'social',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"「","pinyin":""},{"char":"朋","pinyin":"ㄆㄥˊ"},{"char":"友","pinyin":"ㄧㄡˇ"},{"char":"」","pinyin":""},{"char":"的","pinyin":"˙ㄉㄜ"},{"char":"「","pinyin":""},{"char":"朋","pinyin":"ㄆㄥˊ"},{"char":"」","pinyin":""},{"char":"字","pinyin":"ㄗˋ"},{"char":"意","pinyin":"ㄧˋ"},{"char":"思","pinyin":"ㄙ"},{"char":"是","pinyin":"ㄕˋ"}]),
    options: JSON.stringify({"1":"同伴、夥伴","2":"敵人、對手","3":"陌生人","4":"長輩"}),
    correct_answer: '1', explanation: '朋友的「朋」字意指同伴、友好之人。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'cognitive', category_type: 'food_shopping',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"「","pinyin":""},{"char":"美","pinyin":"ㄇㄟˇ"},{"char":"食","pinyin":"ㄕˊ"},{"char":"」","pinyin":""},{"char":"中","pinyin":"ㄓㄨㄥ"},{"char":"「","pinyin":""},{"char":"食","pinyin":"ㄕˊ"},{"char":"」","pinyin":""},{"char":"是","pinyin":"ㄕˋ"},{"char":"什","pinyin":"ㄕˊ"},{"char":"麼","pinyin":"˙ㄇㄜ"},{"char":"意","pinyin":"ㄧˋ"},{"char":"思","pinyin":"ㄙ"},{"char":"？","pinyin":""}]),
    options: JSON.stringify({"1":"吃、食物","2":"喝、飲料","3":"玩、娛樂","4":"睡、休息"}),
    correct_answer: '1', explanation: '食物的「食」字代表吃、食物。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'input', category_type: 'social',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"小","pinyin":"ㄒㄧㄠˇ"},{"char":"明","pinyin":"ㄇㄧㄥˊ"},{"char":"幫","pinyin":"ㄅㄤ"},{"char":"助","pinyin":"ㄓㄨˋ"},{"char":"同","pinyin":"ㄊㄨㄥˊ"},{"char":"學","pinyin":"ㄒㄩㄝˊ"},{"char":"後","pinyin":"ㄏㄡˋ"},{"char":"，","pinyin":""},{"char":"老","pinyin":"ㄌㄠˇ"},{"char":"師","pinyin":"ㄕ"},{"char":"說","pinyin":"ㄕㄨㄛ"},{"char":"他","pinyin":"ㄊㄚ"},{"char":"很","pinyin":"ㄏㄣˇ"},{"char":"「","pinyin":""},{"char":"X","pinyin":""},{"char":"」","pinyin":""},{"char":"。","pinyin":""}]),
    options: JSON.stringify({"1":"懶惰","2":"熱心","3":"粗心","4":"害羞"}),
    correct_answer: '2', explanation: '幫助別人是熱心的表現。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'input', category_type: 'social',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"下","pinyin":"ㄒㄧㄚˋ"},{"char":"雨","pinyin":"ㄩˇ"},{"char":"天","pinyin":"ㄊㄧㄢ"},{"char":"，","pinyin":""},{"char":"小","pinyin":"ㄒㄧㄠˇ"},{"char":"華","pinyin":"ㄏㄨㄚˊ"},{"char":"把","pinyin":"ˉㄅㄚ"},{"char":"雨","pinyin":"ㄩˇ"},{"char":"傘","pinyin":"ㄙㄢˇ"},{"char":"借","pinyin":"ㄐㄧㄝˋ"},{"char":"給","pinyin":"ˉㄍㄟ"},{"char":"同","pinyin":"ㄊㄨㄥˊ"},{"char":"學","pinyin":"ㄒㄩㄝˊ"},{"char":"，","pinyin":""},{"char":"她","pinyin":"ㄊㄚ"},{"char":"是","pinyin":"ㄕˋ"},{"char":"個","pinyin":"ˋㄍㄜ"},{"char":"很","pinyin":"ㄏㄣˇ"},{"char":"「","pinyin":""},{"char":"X","pinyin":""},{"char":"」","pinyin":""},{"char":"的","pinyin":"˙ㄉㄜ"},{"char":"人","pinyin":"ㄖㄣˊ"},{"char":"。","pinyin":""}]),
    options: JSON.stringify({"1":"自私","2":"善良","3":"懶惰","4":"粗心"}),
    correct_answer: '2', explanation: '借雨傘給同學是善良、體貼的行為。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'usage', category_type: 'social',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"請","pinyin":"ㄑㄧㄥˇ"},{"char":"選","pinyin":"ㄒㄩㄢˇ"},{"char":"出","pinyin":"ˉㄔㄨ"},{"char":"正","pinyin":"ㄓㄥˋ"},{"char":"確","pinyin":"ㄑㄩㄝˋ"},{"char":"的","pinyin":"˙ㄉㄜ"},{"char":"句","pinyin":"ㄐㄩˋ"},{"char":"子","pinyin":"˙ㄗ"},{"char":"：","pinyin":""}]),
    options: JSON.stringify({"1":"我吃很飯多。","2":"我吃了很多飯。","3":"很多我飯吃了。","4":"飯很多我吃。"}),
    correct_answer: '2', explanation: '正確語序為：主語＋動詞＋副詞＋賓語。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'usage', category_type: 'social',
    question_type: 'sorting',
    content: JSON.stringify([{"char":"請","pinyin":"ㄑㄧㄥˇ"},{"char":"將","pinyin":"ㄐㄧㄤ"},{"char":"詞","pinyin":"ˊㄘ"},{"char":"語","pinyin":"ˇㄩ"},{"char":"排","pinyin":"ˊㄆㄞ"},{"char":"成","pinyin":"ˊㄔㄥ"},{"char":"正","pinyin":"ˋㄓㄥ"},{"char":"確","pinyin":"ˋㄑㄩㄝ"},{"char":"的","pinyin":"˙ㄉㄜ"},{"char":"句","pinyin":"ˋㄐㄩ"},{"char":"子","pinyin":"˙ㄗ"}]),
    options: JSON.stringify({"1":"我","2":"去","3":"學校","4":"上課"}),
    correct_answer: '1,2,3,4', explanation: '正確語序：我去學校上課。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'sociocultural', category_type: 'social',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"農","pinyin":"ㄋㄨㄥˊ"},{"char":"曆","pinyin":"ㄌㄧˋ"},{"char":"正","pinyin":"ㄓㄥ"},{"char":"月","pinyin":"ㄩㄝˋ"},{"char":"十","pinyin":"ㄕˊ"},{"char":"五","pinyin":"ˇㄨ"},{"char":"日","pinyin":"ㄖˋ"},{"char":"是","pinyin":"ˋㄕ"},{"char":"什","pinyin":"ˊㄕ"},{"char":"麼","pinyin":"˙ㄇㄜ"},{"char":"節","pinyin":"ˊㄐㄧㄝ"},{"char":"日","pinyin":"ˋㄖ"},{"char":"？","pinyin":""}]),
    options: JSON.stringify({"1":"端午節","2":"元宵節","3":"中秋節","4":"清明節"}),
    correct_answer: '2', explanation: '農曆正月十五是元宵節，也稱上元節。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'sociocultural', category_type: 'social',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"端","pinyin":"ˉㄉㄨㄢ"},{"char":"午","pinyin":"ˇㄨ"},{"char":"節","pinyin":"ˊㄐㄧㄝ"},{"char":"時","pinyin":"ˊㄕ"},{"char":"，","pinyin":""},{"char":"我","pinyin":"ˇㄨ"},{"char":"們","pinyin":"˙ㄇㄣ"},{"char":"通","pinyin":"ˉㄊㄨㄥ"},{"char":"常","pinyin":"ˊㄔㄤ"},{"char":"會","pinyin":"ˋㄏㄨㄟ"},{"char":"吃","pinyin":"ˉㄔ"},{"char":"什","pinyin":"ˊㄕ"},{"char":"麼","pinyin":"˙ㄇㄜ"},{"char":"？","pinyin":""}]),
    options: JSON.stringify({"1":"湯圓","2":"粽子","3":"月餅","4":"年糕"}),
    correct_answer: '2', explanation: '端午節傳統食物是粽子，以紀念屈原。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'cognitive', category_type: 'health',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"「","pinyin":""},{"char":"健","pinyin":"ˋㄐㄧㄢ"},{"char":"康","pinyin":"ˉㄎㄤ"},{"char":"」","pinyin":""},{"char":"的","pinyin":"˙ㄉㄜ"},{"char":"「","pinyin":""},{"char":"健","pinyin":"ˋㄐㄧㄢ"},{"char":"」","pinyin":""},{"char":"是","pinyin":"ˋㄕ"},{"char":"什","pinyin":"ˊㄕ"},{"char":"麼","pinyin":"˙ㄇㄜ"},{"char":"意","pinyin":"ˋㄧ"},{"char":"思","pinyin":"ˉㄙ"},{"char":"？","pinyin":""}]),
    options: JSON.stringify({"1":"強壯、結實","2":"脆弱、生病","3":"懶惰、無力","4":"矮小、虛弱"}),
    correct_answer: '1', explanation: '「健」字意指強壯、健壯。', score: 10,
  },
  {
    subject: 'chinese', theory_type: 'input', category_type: 'health',
    question_type: 'single_choice',
    content: JSON.stringify([{"char":"每","pinyin":"ˇㄇㄟ"},{"char":"天","pinyin":"ˉㄊㄧㄢ"},{"char":"運","pinyin":"ˋㄩㄣ"},{"char":"動","pinyin":"ˋㄉㄨㄥ"},{"char":"三","pinyin":"ˉㄙㄢ"},{"char":"十","pinyin":"ˊㄕ"},{"char":"分","pinyin":"ˉㄈㄣ"},{"char":"鐘","pinyin":"ˉㄓㄨㄥ"},{"char":"，","pinyin":""},{"char":"對","pinyin":"ˋㄉㄨㄟ"},{"char":"身","pinyin":"ˉㄕㄣ"},{"char":"體","pinyin":"ˇㄊㄧ"},{"char":"有","pinyin":"ˇㄧㄡ"},{"char":"什","pinyin":"ˊㄕ"},{"char":"麼","pinyin":"˙ㄇㄜ"},{"char":"好","pinyin":"ˇㄏㄠ"},{"char":"處","pinyin":"ˋㄔㄨ"},{"char":"？","pinyin":""}]),
    options: JSON.stringify({"1":"讓身體更健康","2":"讓人更容易生病","3":"讓人更懶惰","4":"對身體沒有影響"}),
    correct_answer: '1', explanation: '規律運動有助於增強體能、維持健康。', score: 10,
  },
];

const insertQ = db.prepare(`
  INSERT OR IGNORE INTO questions
  (subject, theory_type, category_type, question_type, content, options, correct_answer, explanation, score)
  VALUES (@subject, @theory_type, @category_type, @question_type, @content, @options, @correct_answer, @explanation, @score)
`);

const insertAllQ = db.transaction((qs: typeof questions) => {
  for (const q of qs) insertQ.run(q);
});
insertAllQ(questions);
console.log(`[seed-minimal] ✅ 植入 ${questions.length} 道示範題目`);

// ── 讚美語庫 ──────────────────────────────────────────────────────────────────

const praises = [
  { scenario_type: 'passed', tone_type: 'enthusiastic', content: '超棒！你答對了！繼續保持這個氣勢！🌟' },
  { scenario_type: 'passed', tone_type: 'growth_mindset', content: '你的努力有了成果！每一次練習都讓你變得更強。' },
  { scenario_type: 'passed', tone_type: 'humorous', content: '哇！你簡直是語言天才！蘑菇為你驕傲！🍄' },
  { scenario_type: 'failed_encouragement', tone_type: 'enthusiastic', content: '沒關係！失敗是成功的媽媽！下次一定可以！💪' },
  { scenario_type: 'failed_encouragement', tone_type: 'growth_mindset', content: '這次的錯誤是學習的機會。看看哪裡可以做得更好！' },
  { scenario_type: 'failed_encouragement', tone_type: 'humorous', content: '哎呀，蘑菇也需要雨水才能長大，再試一次吧！☔' },
  { scenario_type: 'perfect_score', tone_type: 'enthusiastic', content: '滿分！滿分！你是今天最厲害的國語文勇士！🏆🎉' },
  { scenario_type: 'perfect_score', tone_type: 'growth_mindset', content: '完美！這說明你真的掌握了這個主題，繼續探索新知識！' },
  { scenario_type: 'streak_bonus', tone_type: 'enthusiastic', content: '連續練習！你的毅力讓蘑菇精靈感動不已！🔥🔥' },
  { scenario_type: 'level_up', tone_type: 'enthusiastic', content: '升級啦！歡迎來到新的等級！更大的挑戰等著你！⬆️✨' },
  { scenario_type: 'sen_encouragement', tone_type: 'growth_mindset', content: '做得很好！按自己的節奏學習是最棒的方式。' },
  { scenario_type: 'sen_encouragement', tone_type: 'enthusiastic', content: '你很棒！每一小步都是進步！🌈' },
];

const insertP = db.prepare(`
  INSERT OR IGNORE INTO praise_library (scenario_type, tone_type, content)
  VALUES (@scenario_type, @tone_type, @content)
`);
const insertAllP = db.transaction((ps: typeof praises) => {
  for (const p of ps) insertP.run(p);
});
insertAllP(praises);
console.log(`[seed-minimal] ✅ 植入 ${praises.length} 條讚美語`);

// ── 預設老師帳號 ──────────────────────────────────────────────────────────────

const teacherExists = db
  .prepare("SELECT user_id FROM users WHERE username = 'teacher'")
  .get();

if (!teacherExists) {
  const hash = bcrypt.hashSync('teacher123', 12);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, grade, class_id)
    VALUES ('teacher', ?, '示範老師', 'teacher', '0', 'class-A')
  `).run(hash);
  db.prepare('INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)').run(result.lastInsertRowid);
  db.prepare('INSERT OR IGNORE INTO user_sprites (user_id) VALUES (?)').run(result.lastInsertRowid);
  console.log('[seed-minimal] ✅ 建立示範老師帳號 (teacher / teacher123)');
}

// ── 預設學生帳號 ──────────────────────────────────────────────────────────────

const studentExists = db
  .prepare("SELECT user_id FROM users WHERE username = 'student1'")
  .get();

if (!studentExists) {
  const hash = bcrypt.hashSync('student123', 12);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, grade, class_id)
    VALUES ('student1', ?, '小蘑菇', 'student', '3', 'class-A')
  `).run(hash);
  db.prepare('INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)').run(result.lastInsertRowid);
  db.prepare('INSERT OR IGNORE INTO user_sprites (user_id) VALUES (?)').run(result.lastInsertRowid);
  console.log('[seed-minimal] ✅ 建立示範學生帳號 (student1 / student123)');
}

db.close();
console.log('[seed-minimal] 🍄 種子資料植入完成！');
