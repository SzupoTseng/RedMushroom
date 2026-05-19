// 32 question templates covering theory_type × category_type matrix.
// Templates use `vars` (cartesian) for axes that vary independently, and
// `data` (one row per question) when fields must stay semantically coupled
// (e.g. word + correct meaning).

type TheoryType = 'cognitive' | 'input' | 'usage' | 'sociocultural';
type CategoryType =
  | 'food_shopping' | 'social' | 'travel' | 'business'
  | 'health' | 'leisure' | 'housing' | 'digital';
type QuestionType = 'single_choice' | 'sorting';

export interface Template {
  theory_type: TheoryType;
  category_type: CategoryType;
  question_type: QuestionType;
  prompt: (vars: Record<string, string>) => string;
  options: (vars: Record<string, string>) => Record<string, string>;
  answer: string;
  explanation: (vars: Record<string, string>) => string;
  // Coupled fields per question. Each entry is merged with one cartesian row from `vars`.
  data?: Array<Record<string, string>>;
  // Independent axes. Cartesian product expands per `data` row.
  vars: Record<string, string[]>;
}

// Common wrong-answer pools to share across templates without coupling them to data rows.
const WRONG_THINGS = ['書本', '玩具', '衣服', '汽車', '電視', '電腦', '雲朵', '石頭'];
const WRONG_ACTIONS = ['唱歌', '跳舞', '睡覺', '跑步', '哭', '畫畫', '寫字', '吃飯'];
const WRONG_FEELINGS = ['害怕', '生氣', '無聊', '緊張', '難過', '懷疑', '羞愧'];

export const TEMPLATES: Template[] = [
  // ──────────────────────────────────────────────────────
  // COGNITIVE × 8 — 語詞認知（word + meaning coupled in `data`）
  // ──────────────────────────────────────────────────────
  {
    theory_type: 'cognitive', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」這個詞是什麼意思？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」指的是${v.right}。`,
    data: [
      { word: '美食',  right: '好吃的食物' },
      { word: '夜市',  right: '晚上的市集' },
      { word: '便當',  right: '盒裝的飯菜' },
      { word: '飯糰',  right: '飯捏成的點心' },
      { word: '小吃',  right: '簡單的食物' },
      { word: '甜點',  right: '甜的食物' },
    ],
    vars: {
      w1: ['不能吃的東西', '玩具'],
      w2: ['書本', '電燈'],
      w3: ['天氣很冷', '在唱歌'],
    },
  },
  {
    theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」這個詞是什麼意思？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」表示${v.right}。`,
    data: [
      { word: '朋友',  right: '友好的夥伴' },
      { word: '老師',  right: '教導學生的人' },
      { word: '同學',  right: '一起上學的人' },
      { word: '家人',  right: '住在一起的親人' },
      { word: '鄰居',  right: '住在附近的人' },
      { word: '客人',  right: '來訪的人' },
    ],
    vars: {
      w1: ['敵人', '陌生人'],
      w2: ['動物', '機器人'],
      w3: ['食物', '車輛'],
    },
  },
  {
    theory_type: 'cognitive', category_type: 'travel', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」最可能指的是？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」是${v.right}。`,
    data: [
      { word: '捷運',   right: '軌道大眾運輸' },
      { word: '公車',   right: '路面公共汽車' },
      { word: '腳踏車', right: '人力雙輪車' },
      { word: '計程車', right: '叫車載客的車' },
      { word: '火車',   right: '長距離鐵路車' },
      { word: '飛機',   right: '飛在天上的運輸' },
    ],
    vars: {
      w1: ['一種食物', '一種衣服'],
      w2: ['一座山', '一條河'],
      w3: ['一首歌', '一個遊戲'],
    },
  },
  {
    theory_type: 'cognitive', category_type: 'business', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」是什麼意思？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」指${v.right}。`,
    data: [
      { word: '買',     right: '用錢換東西' },
      { word: '賣',     right: '把東西換成錢' },
      { word: '錢包',   right: '裝錢的物品' },
      { word: '收銀台', right: '結帳的櫃台' },
      { word: '價錢',   right: '商品的金額' },
      { word: '找錢',   right: '多付的錢退回' },
    ],
    vars: {
      w1: ['打掃', '上學'],
      w2: ['玩具', '汽車'],
      w3: ['書架', '床鋪'],
    },
  },
  {
    theory_type: 'cognitive', category_type: 'health', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」最接近哪個意思？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」表示${v.right}。`,
    data: [
      { word: '健康', right: '身體強壯' },
      { word: '運動', right: '活動身體' },
      { word: '休息', right: '停下來放鬆' },
      { word: '睡眠', right: '夜晚的睡覺' },
      { word: '營養', right: '食物中的好東西' },
      { word: '清潔', right: '把身體洗乾淨' },
    ],
    vars: {
      w1: ['脆弱', '一直工作'],
      w2: ['書本', '玩具'],
      w3: ['節日', '故事'],
    },
  },
  {
    theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」這個詞是什麼意思？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」是${v.right}。`,
    data: [
      { word: '遊戲', right: '好玩的活動' },
      { word: '電影', right: '在電影院看的故事' },
      { word: '音樂', right: '好聽的聲音藝術' },
      { word: '畫畫', right: '用筆畫出圖畫' },
      { word: '閱讀', right: '看書學知識' },
      { word: '旅行', right: '到外地玩' },
    ],
    vars: {
      w1: ['一種食物', '一種工具'],
      w2: ['上課的科目', '生病的症狀'],
      w3: ['天上的雲', '路上的石頭'],
    },
  },
  {
    theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」最可能指什麼？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」表示${v.right}。`,
    data: [
      { word: '客廳', right: '家人聚會的房間' },
      { word: '廚房', right: '煮飯的地方' },
      { word: '臥室', right: '睡覺的房間' },
      { word: '浴室', right: '洗澡的地方' },
      { word: '陽台', right: '曬衣服的小空間' },
      { word: '書房', right: '看書寫字的房間' },
    ],
    vars: {
      w1: ['學校的教室', '公園的草地'],
      w2: ['一種食物', '一種工具'],
      w3: ['一種動物', '一種植物'],
    },
  },
  {
    theory_type: 'cognitive', category_type: 'digital', question_type: 'single_choice',
    prompt: (v) => `「${v.word}」這個詞最可能指什麼？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `「${v.word}」是${v.right}。`,
    data: [
      { word: '電腦', right: '可運算的電子機器' },
      { word: '網路', right: '電腦相連的系統' },
      { word: '手機', right: '可帶在身上的通訊機器' },
      { word: '滑鼠', right: '操作電腦的小工具' },
      { word: '螢幕', right: '顯示畫面的螢光板' },
      { word: '鍵盤', right: '輸入文字的工具' },
    ],
    vars: {
      w1: ['一種樂器', '一種球類'],
      w2: ['一道菜', '一杯飲料'],
      w3: ['一座山', '一條河'],
    },
  },

  // ──────────────────────────────────────────────────────
  // INPUT × 8 — 語言輸入（情境推語意；不需要 coupling）
  // ──────────────────────────────────────────────────────
  {
    theory_type: 'input', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: (v) => `${v.actor}在便利商店買${v.thing}付了錢，這個動作叫做？`,
    options: () => ({ '1': '購物', '2': '吵架', '3': '玩耍', '4': '睡覺' }),
    answer: '1',
    explanation: () => '付錢買東西就是「購物」。',
    vars: {
      actor: ['小華', '小明', '阿志', '美玲', '志強', '小婷'],
      thing: ['飯糰', '麵包', '飲料', '糖果', '餅乾', '便當'],
    },
  },
  {
    theory_type: 'input', category_type: 'social', question_type: 'single_choice',
    prompt: (v) => `${v.actor}${v.action}同學，老師說他很「X」。X 最可能是？`,
    options: () => ({ '1': '熱心', '2': '懶惰', '3': '粗心', '4': '害羞' }),
    answer: '1',
    explanation: () => '主動幫忙是「熱心」。',
    vars: {
      actor:  ['小明', '小華', '阿志', '美玲', '志強', '小婷'],
      action: ['幫助', '安慰', '陪伴', '指導', '鼓勵', '保護'],
    },
  },
  {
    theory_type: 'input', category_type: 'travel', question_type: 'single_choice',
    prompt: (v) => `${v.actor}每天搭${v.transport}上學，所以${v.actor}很熟悉「X」。X 最可能是？`,
    options: () => ({ '1': '路線', '2': '食譜', '3': '球賽', '4': '電影' }),
    answer: '1',
    explanation: () => '搭車上學熟悉的是「路線」。',
    vars: {
      actor:     ['小華', '小明', '美玲', '志強', '阿志', '小婷'],
      transport: ['捷運', '公車', '校車', '腳踏車'],
    },
  },
  {
    theory_type: 'input', category_type: 'business', question_type: 'single_choice',
    prompt: (v) => `${v.actor}買了${v.thing}付了 100 元，店員找回 20 元。${v.thing}的價錢是？`,
    options: () => ({ '1': '80 元', '2': '100 元', '3': '120 元', '4': '20 元' }),
    answer: '1',
    explanation: () => '100 - 20 = 80，價錢是 80 元。',
    vars: {
      actor: ['小華', '小明', '美玲', '志強', '阿志', '小婷'],
      thing: ['一本書', '一個玩具', '一個便當', '一張卡片'],
    },
  },
  {
    theory_type: 'input', category_type: 'health', question_type: 'single_choice',
    prompt: (v) => `${v.actor}每天運動${v.duration}，對身體有什麼好處？`,
    options: () => ({ '1': '更健康', '2': '更容易生病', '3': '更懶惰', '4': '沒有影響' }),
    answer: '1',
    explanation: () => '規律運動能增強體能、維持健康。',
    vars: {
      actor:    ['小華', '小明', '美玲', '志強', '阿志', '小婷'],
      duration: ['三十分鐘', '一個小時', '半個小時', '四十分鐘'],
    },
  },
  {
    theory_type: 'input', category_type: 'leisure', question_type: 'single_choice',
    prompt: (v) => `${v.actor}週末和家人去${v.place}玩，回家後${v.actor}很「X」。X 最可能是？`,
    options: () => ({ '1': '開心', '2': '生氣', '3': '害怕', '4': '無聊' }),
    answer: '1',
    explanation: () => '和家人出去玩通常會「開心」。',
    vars: {
      actor: ['小華', '小明', '美玲', '志強', '阿志', '小婷'],
      place: ['動物園', '海邊', '公園', '夜市', '博物館'],
    },
  },
  {
    theory_type: 'input', category_type: 'housing', question_type: 'single_choice',
    prompt: (v) => `${v.actor}的房間裡有${v.thing1}、${v.thing2}和檯燈，這個房間最可能是？`,
    options: () => ({ '1': '書房', '2': '廚房', '3': '浴室', '4': '陽台' }),
    answer: '1',
    explanation: () => '有書桌、書櫃和檯燈的房間是「書房」。',
    vars: {
      actor:  ['小華', '小明', '美玲', '志強', '阿志', '小婷'],
      thing1: ['書桌', '電腦桌'],
      thing2: ['書櫃', '書架'],
    },
  },
  {
    theory_type: 'input', category_type: 'digital', question_type: 'single_choice',
    prompt: (v) => `${v.actor}用${v.device}寫作業，作業寫完後存檔在「X」。X 最可能是？`,
    options: () => ({ '1': '檔案', '2': '果汁', '3': '圖書館', '4': '車站' }),
    answer: '1',
    explanation: () => '電腦寫的作業會存成「檔案」。',
    vars: {
      actor:  ['小華', '小明', '美玲', '志強', '阿志', '小婷'],
      device: ['電腦', '筆電', '平板'],
    },
  },

  // ──────────────────────────────────────────────────────
  // USAGE × 8 — 語法運用（單選）
  // ──────────────────────────────────────────────────────
  {
    theory_type: 'usage', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: () => '請選出正確的句子：',
    options: () => ({
      '1': '我吃了很多飯。',
      '2': '我吃很飯多。',
      '3': '很多我飯吃了。',
      '4': '飯很多我吃。',
    }),
    answer: '1',
    explanation: () => '正確語序：主語＋動詞＋副詞＋賓語。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: () => '下列句子哪一句最有禮貌？',
    options: () => ({
      '1': '請問可以借我橡皮擦嗎？',
      '2': '把橡皮擦給我！',
      '3': '橡皮擦借！',
      '4': '我要橡皮擦快點。',
    }),
    answer: '1',
    explanation: () => '使用「請問」開頭最有禮貌。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'usage', category_type: 'travel', question_type: 'single_choice',
    prompt: () => '「我___捷運去學校」空格選什麼？',
    options: () => ({ '1': '搭', '2': '吃', '3': '寫', '4': '彈' }),
    answer: '1',
    explanation: () => '搭乘大眾運輸用「搭」。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'usage', category_type: 'business', question_type: 'single_choice',
    prompt: () => '下列哪一句語意通順？',
    options: () => ({
      '1': '老闆把找零的錢還給了客人。',
      '2': '客人錢把找零的還給了老闆。',
      '3': '把老闆找零還給的錢客人了。',
      '4': '了找零還給錢的老闆客人。',
    }),
    answer: '1',
    explanation: () => '「把」字句正確語序：主語＋把＋賓語＋動詞＋補語。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'usage', category_type: 'health', question_type: 'single_choice',
    prompt: () => '下列哪一個句子是「未來式」？',
    options: () => ({
      '1': '明天我要去看醫生。',
      '2': '昨天我去看醫生了。',
      '3': '我正在看醫生。',
      '4': '我從來不看醫生。',
    }),
    answer: '1',
    explanation: () => '「明天」加「要」表示未來會發生。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'usage', category_type: 'leisure', question_type: 'single_choice',
    prompt: () => '「越___越___」這個句型可以怎麼填？',
    options: () => ({
      '1': '越唱越開心',
      '2': '開心越唱越',
      '3': '唱越開心越',
      '4': '越越開心唱',
    }),
    answer: '1',
    explanation: () => '「越A越B」表示A的程度增加B也增加。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'usage', category_type: 'housing', question_type: 'single_choice',
    prompt: () => '下列哪一句使用了正確的量詞？',
    options: () => ({
      '1': '我家有一棟房子。',
      '2': '我家有一片房子。',
      '3': '我家有一根房子。',
      '4': '我家有一張房子。',
    }),
    answer: '1',
    explanation: () => '房子的量詞是「棟」。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'usage', category_type: 'digital', question_type: 'single_choice',
    prompt: () => '哪一個句子最通順？',
    options: () => ({
      '1': '我用手機打電話給媽媽。',
      '2': '手機我打用電話媽媽給。',
      '3': '打給媽媽我用手機電話。',
      '4': '我打給用手機媽媽電話。',
    }),
    answer: '1',
    explanation: () => '正確語序：主語＋介詞短語＋動詞＋對象。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },

  // ──────────────────────────────────────────────────────
  // SOCIOCULTURAL × 8 — 社文語境（節日／在地文化）
  // ──────────────────────────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: (v) => `${v.holiday}最常吃的食物是？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `${v.holiday}的傳統食物是${v.right}。`,
    data: [
      { holiday: '端午節',   right: '粽子' },
      { holiday: '中秋節',   right: '月餅' },
      { holiday: '元宵節',   right: '湯圓' },
      { holiday: '農曆新年', right: '年糕' },
      { holiday: '冬至',     right: '湯圓' },
    ],
    vars: {
      w1: ['炸雞', '披薩'],
      w2: ['牛排', '冰淇淋'],
      w3: ['泡麵', '熱狗'],
    },
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: (v) => `${v.holiday}全家會做什麼事？`,
    options: (v) => ({ '1': v.right, '2': v.w1, '3': v.w2, '4': v.w3 }),
    answer: '1',
    explanation: (v) => `${v.holiday}的傳統習俗是${v.right}。`,
    data: [
      { holiday: '農曆新年', right: '圍爐吃年夜飯' },
      { holiday: '中秋節',   right: '一起賞月' },
      { holiday: '清明節',   right: '到祖墳掃墓' },
      { holiday: '端午節',   right: '看龍舟比賽' },
      { holiday: '元宵節',   right: '提燈籠猜燈謎' },
    ],
    vars: {
      w1: ['打雪仗', '滑雪'],
      w2: ['騎駱駝', '看金字塔'],
      w3: ['玩萬聖節', '塗鴉牆壁'],
    },
  },
  {
    theory_type: 'sociocultural', category_type: 'travel', question_type: 'single_choice',
    prompt: () => '臺北捷運上禁止做的事是？',
    options: () => ({
      '1': '飲食', '2': '看書', '3': '聊天', '4': '坐著',
    }),
    answer: '1',
    explanation: () => '臺北捷運嚴禁飲食以維持整潔。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'sociocultural', category_type: 'business', question_type: 'single_choice',
    prompt: () => '臺灣最普及的小額付款方式是？',
    options: () => ({
      '1': '悠遊卡或一卡通', '2': '只能用現金', '3': '寄信付款', '4': '用糖果交換',
    }),
    answer: '1',
    explanation: () => '悠遊卡與一卡通是臺灣最普及的小額電子票證。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'sociocultural', category_type: 'health', question_type: 'single_choice',
    prompt: () => '臺灣全民健康保險最重要的功能是？',
    options: () => ({
      '1': '看病時減輕家庭負擔', '2': '免費入學', '3': '免費搭飛機', '4': '免費租房子',
    }),
    answer: '1',
    explanation: () => '全民健保讓看病費用大幅降低，照顧人民健康。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: () => '聽到「叮咚叮咚」的音樂從巷子來，最有可能是？',
    options: () => ({
      '1': '垃圾車', '2': '警車', '3': '消防車', '4': '冰淇淋小販',
    }),
    answer: '1',
    explanation: () => '臺灣的垃圾車會放「給愛麗絲」或「少女的祈禱」的音樂。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'sociocultural', category_type: 'housing', question_type: 'single_choice',
    prompt: () => '臺灣常見的「鐵窗」是用來做什麼？',
    options: () => ({
      '1': '防止小偷', '2': '裝飾房子', '3': '隔音', '4': '防水',
    }),
    answer: '1',
    explanation: () => '臺灣公寓常裝鐵窗防止小偷與墜落。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },
  {
    theory_type: 'sociocultural', category_type: 'digital', question_type: 'single_choice',
    prompt: () => '臺灣最多人使用的通訊軟體是？',
    options: () => ({
      '1': 'LINE', '2': 'WhatsApp', '3': 'Telegram', '4': 'WeChat',
    }),
    answer: '1',
    explanation: () => 'LINE 在臺灣有最廣泛的使用者基礎。',
    vars: { n: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16'] },
  },

  // ──────────────────────────────────────────────────────
  // USAGE × 8 sorting — 詞語排序
  // ──────────────────────────────────────────────────────
  {
    theory_type: 'usage', category_type: 'food_shopping', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.s, '2': v.tense, '3': v.v, '4': v.what }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.s}${v.tense}${v.v}${v.what}。`,
    vars: {
      s:     ['我', '小華', '美玲', '志強'],
      tense: ['昨天', '剛才', '今天早上'],
      v:     ['吃了', '買了'],
      what:  ['一個飯糰', '兩個包子', '三塊餅乾'],
    },
  },
  {
    theory_type: 'usage', category_type: 'social', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.s, '2': v.adv, '3': v.v, '4': v.obj }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.s}${v.adv}${v.v}${v.obj}。`,
    vars: {
      s:   ['老師', '同學', '朋友', '哥哥'],
      adv: ['認真地', '快樂地', '小心地'],
      v:   ['教', '幫', '陪'],
      obj: ['我', '我們', '小華'],
    },
  },
  {
    theory_type: 'usage', category_type: 'travel', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.s, '2': v.v, '3': v.where, '4': v.purpose }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.s}${v.v}${v.where}${v.purpose}。`,
    vars: {
      s:       ['我', '我們', '小華', '爸爸'],
      v:       ['搭', '坐', '騎'],
      where:   ['捷運', 'YouBike', '公車'],
      purpose: ['去學校', '去夜市', '去公園'],
    },
  },
  {
    theory_type: 'usage', category_type: 'business', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.s, '2': v.v1, '3': v.thing, '4': v.v2 }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.s}${v.v1}${v.thing}${v.v2}。`,
    vars: {
      s:     ['老闆', '客人', '店員', '媽媽'],
      v1:    ['把'],
      thing: ['錢', '便當', '袋子', '收據'],
      v2:    ['交給我', '遞給我', '收起來', '放在桌上'],
    },
  },
  {
    theory_type: 'usage', category_type: 'health', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.time, '2': v.s, '3': v.v, '4': v.what }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.time}${v.s}${v.v}${v.what}。`,
    vars: {
      time: ['每天', '每週', '每個月'],
      s:    ['我', '小華', '阿志', '美玲'],
      v:    ['運動', '練習', '走路'],
      what: ['三十分鐘', '一個小時', '半個小時'],
    },
  },
  {
    theory_type: 'usage', category_type: 'leisure', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.s, '2': v.adv, '3': v.v, '4': v.what }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.s}${v.adv}${v.v}${v.what}。`,
    vars: {
      s:    ['我', '弟弟', '姊姊', '同學'],
      adv:  ['正在', '快樂地', '安靜地'],
      v:    ['看', '聽', '玩'],
      what: ['電影', '音樂', '遊戲'],
    },
  },
  {
    theory_type: 'usage', category_type: 'housing', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.s, '2': v.v, '3': v.in, '4': v.room }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.s}${v.v}${v.in}${v.room}。`,
    vars: {
      s:    ['媽媽', '爸爸', '哥哥', '小狗'],
      v:    ['睡'],
      in:   ['在'],
      room: ['臥室', '客廳', '書房', '陽台'],
    },
  },
  {
    theory_type: 'usage', category_type: 'digital', question_type: 'sorting',
    prompt: () => '請將詞語排成正確的句子：',
    options: (v) => ({ '1': v.s, '2': v.v, '3': v.tool, '4': v.purpose }),
    answer: '1,2,3,4',
    explanation: (v) => `正確語序：${v.s}${v.v}${v.tool}${v.purpose}。`,
    vars: {
      s:       ['我', '姊姊', '老師', '小華'],
      v:       ['用'],
      tool:    ['電腦', '手機', '平板'],
      purpose: ['寫作業', '查資料', '看影片'],
    },
  },
];

// Re-export the data-merging logic for matrix.ts
export function templateRows(t: Template): Array<Record<string, string>> {
  const dataRows = t.data ?? [{}];
  const keys = Object.keys(t.vars);
  if (keys.length === 0) return dataRows;
  const varRows = keys.reduce<Array<Record<string, string>>>(
    (acc, key) => acc.flatMap((row) => t.vars[key].map((v) => ({ ...row, [key]: v }))),
    [{}]
  );
  return dataRows.flatMap((d) => varRows.map((v) => ({ ...d, ...v })));
}

// Suppress unused exports lint
void WRONG_THINGS; void WRONG_ACTIONS; void WRONG_FEELINGS;
