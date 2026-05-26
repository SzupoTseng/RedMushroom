/**
 * 補充題庫種子 — 涵蓋國小 3-4 年級中文常見教學主題：
 *   - 量詞（一隻、一條、一張…）
 *   - 反義詞、同義詞
 *   - 季節、天氣、動物特徵
 *   - 時間表達、基本句型
 *
 * 全部題目均為原創，未從任何外部教材複製或衍生。
 * 主題類別本身（量詞、反義詞等）為普遍公共教學知識，無著作權疑慮。
 *
 * Run: npm run seed:supplementary
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { zhuyinize, optionsZhuyin } from './questions/zhuyin';
import { shuffleSingleChoice } from './questions/shuffle';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../database/redmushroom.db');

interface Q {
  theory_type: 'cognitive' | 'input' | 'usage' | 'sociocultural';
  category_type:
    | 'food_shopping' | 'social' | 'travel' | 'business'
    | 'health' | 'leisure' | 'housing' | 'digital';
  question_type: 'single_choice';
  prompt: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
}

// ─── 量詞 (Measure words) ───────────────────────────────────────────
const measureWords: Q[] = [
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '一___小狗', options: { '1': '隻', '2': '條', '3': '張', '4': '本' },
    answer: '1', explanation: '動物中的小動物（貓、狗、鳥）通常用「隻」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '一___魚', options: { '1': '條', '2': '隻', '3': '張', '4': '塊' },
    answer: '1', explanation: '長條形的動物（魚、蛇）用「條」。' },
  { theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '一___紙', options: { '1': '張', '2': '本', '3': '隻', '4': '條' },
    answer: '1', explanation: '平面的物品（紙、桌子、椅子）用「張」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '一___書', options: { '1': '本', '2': '張', '3': '條', '4': '塊' },
    answer: '1', explanation: '冊裝的物品（書、雜誌）用「本」。' },
  { theory_type: 'cognitive', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '一___麵包', options: { '1': '塊', '2': '條', '3': '張', '4': '隻' },
    answer: '1', explanation: '塊狀食物（麵包、蛋糕、肉）用「塊」。' },
  { theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '一___衣服', options: { '1': '件', '2': '本', '3': '張', '4': '隻' },
    answer: '1', explanation: '衣物（衣服、外套、襯衫）用「件」。' },
  { theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '一___房子', options: { '1': '間', '2': '張', '3': '個', '4': '塊' },
    answer: '1', explanation: '房屋、教室、店面用「間」。' },
  { theory_type: 'cognitive', category_type: 'travel', question_type: 'single_choice',
    prompt: '一___車', options: { '1': '輛', '2': '隻', '3': '張', '4': '條' },
    answer: '1', explanation: '交通工具（汽車、機車、公車）用「輛」。' },
  { theory_type: 'cognitive', category_type: 'travel', question_type: 'single_choice',
    prompt: '一___飛機', options: { '1': '架', '2': '隻', '3': '條', '4': '張' },
    answer: '1', explanation: '機械類大型物（飛機、相機、鋼琴）用「架」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '一___鳥', options: { '1': '隻', '2': '條', '3': '張', '4': '個' },
    answer: '1', explanation: '禽類用「隻」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '一___花', options: { '1': '朵', '2': '條', '3': '塊', '4': '個' },
    answer: '1', explanation: '花朵的量詞是「朵」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '一___樹', options: { '1': '棵', '2': '條', '3': '張', '4': '隻' },
    answer: '1', explanation: '植物中的樹用「棵」。' },
  { theory_type: 'cognitive', category_type: 'business', question_type: 'single_choice',
    prompt: '一___錢', options: { '1': '塊', '2': '張', '3': '隻', '4': '本' },
    answer: '1', explanation: '臺幣口語單位「一塊錢」。' },
  { theory_type: 'cognitive', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '一___水', options: { '1': '杯', '2': '塊', '3': '張', '4': '隻' },
    answer: '1', explanation: '液體用容器作量詞，水通常用「杯」。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '一___人', options: { '1': '位', '2': '條', '3': '塊', '4': '張' },
    answer: '1', explanation: '禮貌稱呼人時用「位」（一般用「個」）。' },
];

// ─── 反義詞 ──────────────────────────────────────────────────────────
const antonyms: Q[] = [
  { theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '「大」的反義詞是？', options: { '1': '小', '2': '高', '3': '長', '4': '亮' },
    answer: '1', explanation: '大↔小是常見反義詞。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「高」的反義詞是？', options: { '1': '矮', '2': '寬', '3': '長', '4': '輕' },
    answer: '1', explanation: '描述高度：高↔矮。' },
  { theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '「長」的反義詞是？', options: { '1': '短', '2': '小', '3': '矮', '4': '輕' },
    answer: '1', explanation: '描述長度：長↔短。' },
  { theory_type: 'cognitive', category_type: 'business', question_type: 'single_choice',
    prompt: '「多」的反義詞是？', options: { '1': '少', '2': '輕', '3': '矮', '4': '黑' },
    answer: '1', explanation: '數量：多↔少。' },
  { theory_type: 'cognitive', category_type: 'health', question_type: 'single_choice',
    prompt: '「重」的反義詞是？', options: { '1': '輕', '2': '矮', '3': '少', '4': '黑' },
    answer: '1', explanation: '重量：重↔輕。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「快」的反義詞是？', options: { '1': '慢', '2': '小', '3': '短', '4': '輕' },
    answer: '1', explanation: '速度：快↔慢。' },
  { theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '「亮」的反義詞是？', options: { '1': '暗', '2': '輕', '3': '甜', '4': '硬' },
    answer: '1', explanation: '光線：亮↔暗。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「胖」的反義詞是？', options: { '1': '瘦', '2': '矮', '3': '輕', '4': '少' },
    answer: '1', explanation: '身材：胖↔瘦。' },
  { theory_type: 'cognitive', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '「甜」的反義詞是？', options: { '1': '苦', '2': '硬', '3': '輕', '4': '矮' },
    answer: '1', explanation: '味道：甜↔苦（也可與「鹹」相對，但「苦」是最常見的反義）。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「對」的反義詞是？', options: { '1': '錯', '2': '輕', '3': '冷', '4': '高' },
    answer: '1', explanation: '正確與否：對↔錯。' },
  { theory_type: 'cognitive', category_type: 'health', question_type: 'single_choice',
    prompt: '「熱」的反義詞是？', options: { '1': '冷', '2': '輕', '3': '矮', '4': '黑' },
    answer: '1', explanation: '溫度：熱↔冷。' },
  { theory_type: 'cognitive', category_type: 'health', question_type: 'single_choice',
    prompt: '「乾」的反義詞是？', options: { '1': '濕', '2': '冷', '3': '矮', '4': '輕' },
    answer: '1', explanation: '水分：乾↔濕。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「新」的反義詞是？', options: { '1': '舊', '2': '矮', '3': '輕', '4': '小' },
    answer: '1', explanation: '時間／使用程度：新↔舊。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「早」的反義詞是？', options: { '1': '晚', '2': '少', '3': '矮', '4': '輕' },
    answer: '1', explanation: '時間先後：早↔晚。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「近」的反義詞是？', options: { '1': '遠', '2': '輕', '3': '矮', '4': '少' },
    answer: '1', explanation: '距離：近↔遠。' },
];

// ─── 同義詞 ──────────────────────────────────────────────────────────
const synonyms: Q[] = [
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「漂亮」的同義詞是？', options: { '1': '美麗', '2': '辛苦', '3': '勇敢', '4': '聰明' },
    answer: '1', explanation: '漂亮和美麗都形容好看的外表。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「高興」的同義詞是？', options: { '1': '快樂', '2': '辛苦', '3': '害怕', '4': '生氣' },
    answer: '1', explanation: '高興和快樂都表示開心。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '「立刻」的同義詞是？', options: { '1': '馬上', '2': '慢慢', '3': '快樂', '4': '辛苦' },
    answer: '1', explanation: '立刻和馬上都表示「現在就」。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「困難」的同義詞是？', options: { '1': '辛苦', '2': '快樂', '3': '輕鬆', '4': '簡單' },
    answer: '1', explanation: '困難和辛苦都表示不容易。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「聰明」的同義詞是？', options: { '1': '機靈', '2': '辛苦', '3': '害怕', '4': '糊塗' },
    answer: '1', explanation: '聰明和機靈都形容頭腦反應快。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「努力」的同義詞是？', options: { '1': '用功', '2': '快樂', '3': '害怕', '4': '懶惰' },
    answer: '1', explanation: '努力和用功都表示認真做事或讀書。' },
  { theory_type: 'cognitive', category_type: 'health', question_type: 'single_choice',
    prompt: '「害怕」的同義詞是？', options: { '1': '恐懼', '2': '快樂', '3': '生氣', '4': '高興' },
    answer: '1', explanation: '害怕和恐懼都表示心裡感到不安。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「幫忙」的同義詞是？', options: { '1': '幫助', '2': '反對', '3': '討厭', '4': '害怕' },
    answer: '1', explanation: '幫忙和幫助意思相近。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「全部」的同義詞是？', options: { '1': '所有', '2': '一半', '3': '部分', '4': '少數' },
    answer: '1', explanation: '全部和所有都表示「整個」、「沒有遺漏」。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「忽然」的同義詞是？', options: { '1': '突然', '2': '慢慢', '3': '常常', '4': '永遠' },
    answer: '1', explanation: '忽然和突然都表示「事先沒料到」。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「以為」的同義詞是？', options: { '1': '認為', '2': '害怕', '3': '討厭', '4': '幫忙' },
    answer: '1', explanation: '以為和認為都表示心裡這樣想（可能對也可能錯）。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「保護」的同義詞是？', options: { '1': '愛護', '2': '討厭', '3': '反對', '4': '害怕' },
    answer: '1', explanation: '保護和愛護都表示細心照顧、不讓受傷。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「美味」的同義詞是？', options: { '1': '好吃', '2': '難看', '3': '辛苦', '4': '害怕' },
    answer: '1', explanation: '美味和好吃都形容食物的味道很棒。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「微笑」的同義詞是？', options: { '1': '笑容', '2': '生氣', '3': '害怕', '4': '哭泣' },
    answer: '1', explanation: '微笑和笑容都指輕輕地笑。' },
  { theory_type: 'cognitive', category_type: 'social', question_type: 'single_choice',
    prompt: '「常常」的同義詞是？', options: { '1': '經常', '2': '永遠', '3': '從不', '4': '偶爾' },
    answer: '1', explanation: '常常和經常都表示「頻繁地」。' },
];

// ─── 季節 / 天氣 ──────────────────────────────────────────────────────
const seasonsWeather: Q[] = [
  { theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪個季節最熱？', options: { '1': '夏天', '2': '冬天', '3': '春天', '4': '秋天' },
    answer: '1', explanation: '一年中夏天溫度最高。' },
  { theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪個季節最冷？', options: { '1': '冬天', '2': '夏天', '3': '春天', '4': '秋天' },
    answer: '1', explanation: '冬天天氣最寒冷，可能會下雪（高山地區）。' },
  { theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪個季節樹葉會變黃變紅？', options: { '1': '秋天', '2': '夏天', '3': '春天', '4': '冬天' },
    answer: '1', explanation: '秋天樹葉開始變色掉落。' },
  { theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪個季節花開最多？', options: { '1': '春天', '2': '夏天', '3': '秋天', '4': '冬天' },
    answer: '1', explanation: '春天是萬物開始生長、百花盛開的季節。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '下雨的時候要帶什麼出門？', options: { '1': '雨傘', '2': '泳衣', '3': '太陽眼鏡', '4': '滑板' },
    answer: '1', explanation: '雨傘可以擋雨。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '颱風來的時候不適合做什麼？', options: { '1': '到海邊玩', '2': '在家看書', '3': '聽廣播', '4': '打電話給家人' },
    answer: '1', explanation: '颱風天海邊很危險，會有大浪。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '臺灣夏天常下哪種雨？', options: { '1': '午後雷陣雨', '2': '雪', '3': '冰雹', '4': '梅雨' },
    answer: '1', explanation: '臺灣夏天午後常出現雷陣雨。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪一個不是天氣現象？', options: { '1': '微笑', '2': '下雨', '3': '颳風', '4': '打雷' },
    answer: '1', explanation: '微笑是人的表情，不是天氣。' },
  { theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '臺灣春天最有名的花是？', options: { '1': '櫻花', '2': '聖誕紅', '3': '楓葉', '4': '蓮花' },
    answer: '1', explanation: '臺灣春天有許多地方可以賞櫻花，例如阿里山。' },
  { theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '梅雨季節大概是？', options: { '1': '五、六月', '2': '十二月', '3': '九月', '4': '七月' },
    answer: '1', explanation: '臺灣梅雨季節通常是五、六月，連續好幾天下雨。' },
];

// ─── 動物 ────────────────────────────────────────────────────────────
const animals: Q[] = [
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪一種動物會在水裡游？', options: { '1': '魚', '2': '貓', '3': '雞', '4': '狗' },
    answer: '1', explanation: '魚靠鰓呼吸，在水裡游泳。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪一種動物會在天上飛？', options: { '1': '鳥', '2': '魚', '3': '兔子', '4': '老虎' },
    answer: '1', explanation: '鳥用翅膀飛翔。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '「喵喵」是哪一種動物的叫聲？', options: { '1': '貓', '2': '狗', '3': '牛', '4': '雞' },
    answer: '1', explanation: '貓的叫聲是「喵」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '「汪汪」是哪一種動物的叫聲？', options: { '1': '狗', '2': '貓', '3': '羊', '4': '魚' },
    answer: '1', explanation: '狗的叫聲是「汪」。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '蜜蜂會做什麼？', options: { '1': '採花蜜', '2': '織網', '3': '挖洞', '4': '游泳' },
    answer: '1', explanation: '蜜蜂採集花蜜製成蜂蜜。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '蜘蛛會做什麼來捕食？', options: { '1': '織網', '2': '飛翔', '3': '游泳', '4': '跳遠' },
    answer: '1', explanation: '蜘蛛織網來捕捉昆蟲。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '熊貓最喜歡吃什麼？', options: { '1': '竹子', '2': '魚', '3': '蜂蜜', '4': '青草' },
    answer: '1', explanation: '熊貓的主食是竹子。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '長頸鹿最特別的地方是？', options: { '1': '脖子很長', '2': '耳朵很大', '3': '尾巴很短', '4': '會在水裡' },
    answer: '1', explanation: '長頸鹿因為脖子特別長而得名。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '臺灣黑熊胸口有什麼特徵？', options: { '1': '白色 V 字形', '2': '黑色斑點', '3': '紅色十字', '4': '黃色月亮' },
    answer: '1', explanation: '臺灣黑熊胸前有白色 V 字形紋路。' },
  { theory_type: 'cognitive', category_type: 'leisure', question_type: 'single_choice',
    prompt: '哪一種動物會冬眠？', options: { '1': '熊', '2': '蝴蝶', '3': '兔子', '4': '老鼠' },
    answer: '1', explanation: '某些熊會在冬天進入冬眠狀態。' },
];

// ─── 時間表達 ──────────────────────────────────────────────────────
const timeExpr: Q[] = [
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '今天的「前一天」是？', options: { '1': '昨天', '2': '明天', '3': '後天', '4': '前年' },
    answer: '1', explanation: '今天的前一天叫昨天。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '今天的「後一天」是？', options: { '1': '明天', '2': '昨天', '3': '前天', '4': '去年' },
    answer: '1', explanation: '今天的後一天叫明天。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '一個月有幾個星期？', options: { '1': '大約 4 個', '2': '7 個', '3': '12 個', '4': '30 個' },
    answer: '1', explanation: '一個月通常有 4 個多星期。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '一年有幾個月？', options: { '1': '12 個', '2': '7 個', '3': '24 個', '4': '4 個' },
    answer: '1', explanation: '一年共有 12 個月。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '一個星期有幾天？', options: { '1': '7 天', '2': '5 天', '3': '10 天', '4': '12 天' },
    answer: '1', explanation: '一週共 7 天，從星期一到星期日。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '「上午」是指一天中的哪個時間？', options: { '1': '中午前', '2': '半夜', '3': '傍晚', '4': '太陽下山後' },
    answer: '1', explanation: '上午是太陽升起到中午這段時間。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '「下午」是指一天中的哪個時間？', options: { '1': '中午後到傍晚', '2': '半夜', '3': '清晨', '4': '中午前' },
    answer: '1', explanation: '下午是中午後到傍晚這段時間。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '一天有幾個小時？', options: { '1': '24 小時', '2': '12 小時', '3': '7 小時', '4': '60 小時' },
    answer: '1', explanation: '一天共 24 小時。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '一個小時有幾分鐘？', options: { '1': '60 分鐘', '2': '24 分鐘', '3': '100 分鐘', '4': '12 分鐘' },
    answer: '1', explanation: '一小時 = 60 分鐘。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '哪一個是「過去」的時間？', options: { '1': '從前', '2': '將來', '3': '以後', '4': '現在' },
    answer: '1', explanation: '從前指過去已經發生的時候。' },
];

// ─── 基本句型 ──────────────────────────────────────────────────────
const sentencePatterns: Q[] = [
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '___明天下雨，我就不出門。',
    options: { '1': '如果', '2': '雖然', '3': '因為', '4': '但是' },
    answer: '1', explanation: '「如果…就…」表示假設的條件。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '我___感冒了，___還是來上課。',
    options: { '1': '雖然…但是', '2': '如果…就', '3': '因為…所以', '4': '不但…而且' },
    answer: '1', explanation: '「雖然…但是…」表示轉折，前後句意思相反。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '___下雨了，___地上很濕。',
    options: { '1': '因為…所以', '2': '雖然…但是', '3': '如果…就', '4': '不但…還' },
    answer: '1', explanation: '「因為…所以…」表示原因和結果。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '哥哥___會打球，___會游泳。',
    options: { '1': '不但…還', '2': '如果…就', '3': '雖然…但是', '4': '因為…所以' },
    answer: '1', explanation: '「不但…還…」表示在原本能力之上又加上一項。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '這本書比那本書___。',
    options: { '1': '好看', '2': '不好看', '3': '一樣', '4': '都' },
    answer: '1', explanation: '「A 比 B 形容詞」是比較句型。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '弟弟___大就___會走路了。',
    options: { '1': '一…就', '2': '雖然…但是', '3': '因為…所以', '4': '如果…還' },
    answer: '1', explanation: '「一…就…」表示一發生就立刻產生後果。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '請選出表示否定的詞：', options: { '1': '不', '2': '是', '3': '很', '4': '都' },
    answer: '1', explanation: '「不」用來表示否定。「沒」也是否定詞。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '「我喜歡看書，___討厭看書。」括號內哪個詞錯？',
    options: { '1': '所以', '2': '但是', '3': '不是', '4': '而不' },
    answer: '1', explanation: '前後句意思相反，要用轉折詞「但是」，不能用表示因果的「所以」。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '「___你來，我就走。」表示？', options: { '1': '只要', '2': '只是', '3': '雖然', '4': '因為' },
    answer: '1', explanation: '「只要…就…」表示條件達成立刻產生後果。' },
  { theory_type: 'usage', category_type: 'social', question_type: 'single_choice',
    prompt: '請問哪一句是疑問句？', options: { '1': '你今天幾點起床？', '2': '我今天七點起床。', '3': '我每天都七點起床。', '4': '七點起床很好。' },
    answer: '1', explanation: '帶有「嗎」、「幾」、「什麼」等疑問詞的句子是疑問句。' },
];

const ALL: Q[] = [
  ...measureWords,
  ...antonyms,
  ...synonyms,
  ...seasonsWeather,
  ...animals,
  ...timeExpr,
  ...sentencePatterns,
];

function main() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // INSERT OR IGNORE — re-runs are idempotent (by question content uniqueness
  // we'd want, but we use prompt as a soft dedup signal)
  const checkStmt = db.prepare<[string], { question_id: number }>(
    `SELECT question_id FROM questions WHERE subject = 'chinese' AND content = ?`,
  );
  const insertStmt = db.prepare(
    `INSERT INTO questions
       (subject, theory_type, category_type, question_type,
        content, options, options_zhuyin, correct_answer, explanation)
     VALUES ('chinese', ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let inserted = 0, skipped = 0;
  const tx = db.transaction(() => {
    for (const q of ALL) {
      // Shuffle option positions so correct answer isn't always slot 1
      const { options: shuffled, answer: shuffledAns } = shuffleSingleChoice(q.options, q.answer);
      const content = JSON.stringify(zhuyinize(q.prompt));
      const optionsJson = JSON.stringify(shuffled);
      const optionsZhuyinJson = JSON.stringify(optionsZhuyin(shuffled));

      const dup = checkStmt.get(content);
      if (dup) { skipped += 1; continue; }

      insertStmt.run(
        q.theory_type, q.category_type, q.question_type,
        content, optionsJson, optionsZhuyinJson, shuffledAns, q.explanation,
      );
      inserted += 1;
    }
  });
  tx();

  console.log(`[seed-supplementary] inserted ${inserted}, skipped ${skipped} (duplicates).`);
  const total = db.prepare<[], { n: number }>(
    `SELECT COUNT(*) as n FROM questions WHERE subject = 'chinese'`,
  ).get()!.n;
  console.log(`[seed-supplementary] total Chinese questions in DB: ${total}`);
  db.close();
}

main();
