/**
 * 臺灣在地化題庫種子（夜市／捷運／珍奶／YouBike／節慶／在地文化）
 * 為國小 3-4 年級設計，每題 10 分。
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

interface TwQuestion {
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

const tw: TwQuestion[] = [
  // ── 夜市與小吃 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '到士林夜市最常吃到的小吃是？',
    options: { '1': '蚵仔煎', '2': '披薩', '3': '漢堡', '4': '壽司' },
    answer: '1',
    explanation: '蚵仔煎是臺灣夜市的代表小吃。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '臺灣國民飲料是？',
    options: { '1': '珍珠奶茶', '2': '可樂', '3': '柳橙汁', '4': '咖啡' },
    answer: '1',
    explanation: '珍珠奶茶起源於臺灣，已成為全球知名飲料。',
  },
  {
    theory_type: 'cognitive', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '「鹹酥雞」最可能在哪裡買到？',
    options: { '1': '夜市攤位', '2': '銀行', '3': '醫院', '4': '圖書館' },
    answer: '1',
    explanation: '鹹酥雞是臺灣夜市常見的小吃。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '臺灣早餐店最具代表性的飲料是？',
    options: { '1': '豆漿', '2': '熱可可', '3': '蜂蜜檸檬', '4': '葡萄汁' },
    answer: '1',
    explanation: '豆漿是臺灣早餐店最具代表性的飲料，幾乎每家都有供應。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '「滷肉飯」是哪個地方的代表料理？',
    options: { '1': '臺灣', '2': '日本', '3': '韓國', '4': '美國' },
    answer: '1',
    explanation: '滷肉飯是臺灣代表性家常料理。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '「刈包」(ㄍㄨㄚˋ ㄅㄠ) 最像哪種食物？',
    options: { '1': '夾肉的包子', '2': '甜湯', '3': '炒飯', '4': '蛋餅' },
    answer: '1',
    explanation: '刈包是用麵皮對折夾肉的小吃。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '臺灣春節常吃的食物是？',
    options: { '1': '年糕', '2': '粽子', '3': '月餅', '4': '湯圓' },
    answer: '1',
    explanation: '年糕在春節象徵「年年高升」。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '「肉圓」的內餡最常見的是？',
    options: { '1': '豬肉與筍丁', '2': '巧克力', '3': '冰淇淋', '4': '蛋黃酥' },
    answer: '1',
    explanation: '肉圓的傳統內餡是豬肉加筍丁。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '「滷味」是怎麼煮的？',
    options: { '1': '用滷汁長時間滷', '2': '用油快炸', '3': '用烤箱烤', '4': '生吃' },
    answer: '1',
    explanation: '滷味是把食材放入滷汁慢慢入味。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '「茶葉蛋」常在哪裡買到？',
    options: { '1': '便利商店', '2': '銀行', '3': '醫院', '4': '電影院' },
    answer: '1',
    explanation: '臺灣便利商店熱食區常見茶葉蛋。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '中秋節除了月餅，臺灣最常吃什麼？',
    options: { '1': '烤肉', '2': '火鍋', '3': '披薩', '4': '咖哩飯' },
    answer: '1',
    explanation: '近年來臺灣中秋節有「全民烤肉」的習慣。',
  },
  {
    theory_type: 'sociocultural', category_type: 'food_shopping', question_type: 'single_choice',
    prompt: '臺灣的「飯糰」最常見的內餡有？',
    options: { '1': '油條和肉鬆', '2': '巧克力醬', '3': '冰淇淋', '4': '果凍' },
    answer: '1',
    explanation: '臺式飯糰常見內餡有油條、肉鬆、蘿蔔乾。',
  },
  // ── 捷運與交通 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'travel', question_type: 'single_choice',
    prompt: '臺北捷運上禁止做什麼？',
    options: { '1': '飲食', '2': '看書', '3': '聊天', '4': '滑手機' },
    answer: '1',
    explanation: '臺北捷運嚴禁飲食以維持環境清潔。',
  },
  {
    theory_type: 'usage', category_type: 'travel', question_type: 'single_choice',
    prompt: '我要從淡水到象山，可以「___」捷運。',
    options: { '1': '搭', '2': '飛', '3': '走', '4': '跑' },
    answer: '1',
    explanation: '搭乘大眾運輸用「搭」這個動詞。',
  },
  {
    theory_type: 'cognitive', category_type: 'travel', question_type: 'single_choice',
    prompt: 'YouBike 是什麼？',
    options: { '1': '公共自行車', '2': '公車', '3': '計程車', '4': '飛機' },
    answer: '1',
    explanation: 'YouBike 是臺灣的公共自行車租賃系統。',
  },
  {
    theory_type: 'sociocultural', category_type: 'travel', question_type: 'single_choice',
    prompt: '搭臺北捷運最常用什麼付款？',
    options: { '1': '悠遊卡', '2': '紙鈔', '3': '糖果', '4': '撲克牌' },
    answer: '1',
    explanation: '悠遊卡是臺北捷運最常用的付款方式。',
  },
  {
    theory_type: 'cognitive', category_type: 'travel', question_type: 'single_choice',
    prompt: '臺鐵和高鐵最大的差別是？',
    options: { '1': '高鐵速度快很多', '2': '臺鐵不能載人', '3': '高鐵只在水裡跑', '4': '臺鐵在外國' },
    answer: '1',
    explanation: '高鐵時速約 300 公里，遠快於臺鐵。',
  },
  {
    theory_type: 'sociocultural', category_type: 'travel', question_type: 'single_choice',
    prompt: '臺灣的紅綠燈倒數讀秒對行人有什麼好處？',
    options: { '1': '可判斷是否來得及過馬路', '2': '裝飾路口', '3': '叫小狗來', '4': '播放音樂' },
    answer: '1',
    explanation: '倒數讀秒讓行人估算過馬路時間。',
  },
  {
    theory_type: 'cognitive', category_type: 'travel', question_type: 'single_choice',
    prompt: '「博愛座」是給誰坐的？',
    options: { '1': '老人、孕婦、抱小孩或行動不便者', '2': '小狗', '3': '校長', '4': '消防員' },
    answer: '1',
    explanation: '博愛座是禮讓給需要的乘客。',
  },
  {
    theory_type: 'sociocultural', category_type: 'travel', question_type: 'single_choice',
    prompt: '在臺灣騎機車一定要做什麼？',
    options: { '1': '戴安全帽', '2': '撐傘', '3': '帶寵物', '4': '吃飯糰' },
    answer: '1',
    explanation: '臺灣法律規定騎機車必須戴安全帽。',
  },
  {
    theory_type: 'usage', category_type: 'travel', question_type: 'single_choice',
    prompt: '哪一句最通順？',
    options: {
      '1': '我每天騎 YouBike 去學校。',
      '2': '騎 YouBike 我每天去學校。',
      '3': '我每天 YouBike 學校去騎。',
      '4': '學校 YouBike 我每天騎去。',
    },
    answer: '1',
    explanation: '正確語序：主語＋時間＋動詞＋賓語＋目的地。',
  },
  {
    theory_type: 'sociocultural', category_type: 'travel', question_type: 'single_choice',
    prompt: '颱風天時，臺灣常見的交通狀況是？',
    options: { '1': '可能停課停班', '2': '所有人都去爬山', '3': '飛機照常飛', '4': '捷運加開特快車' },
    answer: '1',
    explanation: '颱風時可能會宣布停課停班，並停駛部分交通工具。',
  },
  // ── 節日與文化 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '農曆正月十五是什麼節日？',
    options: { '1': '元宵節', '2': '端午節', '3': '中秋節', '4': '清明節' },
    answer: '1',
    explanation: '農曆正月十五是元宵節，也稱上元節。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '端午節時，我們通常會吃什麼？',
    options: { '1': '粽子', '2': '湯圓', '3': '月餅', '4': '年糕' },
    answer: '1',
    explanation: '端午節傳統食物是粽子，以紀念屈原。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '臺灣媽祖遶境是哪個信仰的活動？',
    options: { '1': '海上女神媽祖', '2': '太陽神', '3': '財神', '4': '雷神' },
    answer: '1',
    explanation: '媽祖遶境是奉祀媽祖的傳統信仰活動。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '臺灣原住民族最具代表性的祭典是？',
    options: { '1': '豐年祭', '2': '聖誕節', '3': '感恩節', '4': '光明節' },
    answer: '1',
    explanation: '豐年祭是阿美族等原住民族的重要祭典。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '臺灣國慶日是哪一天？',
    options: { '1': '10 月 10 日', '2': '7 月 4 日', '3': '5 月 5 日', '4': '12 月 25 日' },
    answer: '1',
    explanation: '中華民國國慶日是 10 月 10 日（雙十節）。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '臺灣最常見的廟宇祭祀對象是？',
    options: { '1': '媽祖、關公、土地公等', '2': '只有一位神明', '3': '外星人', '4': '科學家' },
    answer: '1',
    explanation: '臺灣廟宇常見的祭祀對象有媽祖、關公、土地公等。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '臺灣傳統婚禮中新郎踩什麼？',
    options: { '1': '瓦片', '2': '蛋', '3': '魚', '4': '書' },
    answer: '1',
    explanation: '新郎踩瓦片象徵驅邪納福。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '臺灣過年要做的事是？',
    options: { '1': '貼春聯、放鞭炮、發紅包', '2': '裝飾聖誕樹', '3': '做南瓜燈', '4': '辦復活節彩蛋' },
    answer: '1',
    explanation: '貼春聯、放鞭炮、長輩給紅包都是過年習俗。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '「謝謝你」的客家話怎麼說？',
    options: { '1': '勞力 (lo ̂  liˋ)', '2': '你好', '3': '再見', '4': '對不起' },
    answer: '1',
    explanation: '客家話「勞力」(lo ̂  liˋ) 是「謝謝」的意思。',
  },
  {
    theory_type: 'sociocultural', category_type: 'social', question_type: 'single_choice',
    prompt: '臺語「歹勢」(phái-sè) 是什麼意思？',
    options: { '1': '不好意思', '2': '謝謝', '3': '很高興', '4': '再見' },
    answer: '1',
    explanation: '「歹勢」是臺語的「不好意思／抱歉」。',
  },
  // ── 商業與消費 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'business', question_type: 'single_choice',
    prompt: '臺灣最常見的便利商店是？',
    options: { '1': '7-ELEVEN', '2': '麥當勞', '3': '誠品書店', '4': '家樂福' },
    answer: '1',
    explanation: '7-ELEVEN（小七）是臺灣最常見的便利商店。',
  },
  {
    theory_type: 'cognitive', category_type: 'business', question_type: 'single_choice',
    prompt: '「悠遊卡」可以用來做什麼？',
    options: {
      '1': '搭捷運、買便利商店、租 YouBike',
      '2': '只能寄信',
      '3': '只能買玩具',
      '4': '只能洗衣服',
    },
    answer: '1',
    explanation: '悠遊卡是多功能電子票證，可在多種場合使用。',
  },
  {
    theory_type: 'sociocultural', category_type: 'business', question_type: 'single_choice',
    prompt: '臺灣統一發票有什麼特別之處？',
    options: { '1': '兩個月開獎一次，可以對獎', '2': '不能折抵稅金', '3': '只有商店能拿', '4': '是給外國人的' },
    answer: '1',
    explanation: '臺灣的統一發票每兩個月開獎，民眾可對獎。',
  },
  {
    theory_type: 'sociocultural', category_type: 'business', question_type: 'single_choice',
    prompt: '在臺灣，新臺幣 100 元的紙鈔上有誰？',
    options: { '1': '國父孫中山', '2': '蔣中正', '3': '蔣經國', '4': '李白' },
    answer: '1',
    explanation: '新臺幣 100 元紙鈔印有國父孫中山先生。',
  },
  {
    theory_type: 'input', category_type: 'business', question_type: 'single_choice',
    prompt: '在臺灣的傳統市場，跟攤販討價還價叫做什麼？',
    options: { '1': '殺價', '2': '送禮', '3': '排隊', '4': '結帳' },
    answer: '1',
    explanation: '「殺價」是臺灣傳統市場的議價文化。',
  },
  {
    theory_type: 'sociocultural', category_type: 'business', question_type: 'single_choice',
    prompt: '臺灣每年特定時候會收到「振興券」，這是什麼？',
    options: {
      '1': '政府發放鼓勵消費的票券',
      '2': '免費的衣服',
      '3': '電影票',
      '4': '免費吃飯券',
    },
    answer: '1',
    explanation: '振興券是政府為刺激經濟發放的消費券。',
  },
  // ── 健康與環保 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'health', question_type: 'single_choice',
    prompt: '臺灣全民健康保險的卡叫做？',
    options: { '1': '健保卡', '2': '悠遊卡', '3': '信用卡', '4': '識別證' },
    answer: '1',
    explanation: '臺灣全民健保的證明文件是「健保卡」。',
  },
  {
    theory_type: 'sociocultural', category_type: 'health', question_type: 'single_choice',
    prompt: '看病前在醫院要做什麼？',
    options: { '1': '掛號', '2': '唱歌', '3': '跳舞', '4': '寫信' },
    answer: '1',
    explanation: '看病前要先「掛號」登記。',
  },
  {
    theory_type: 'sociocultural', category_type: 'health', question_type: 'single_choice',
    prompt: '臺灣的垃圾分類最少要分成幾類？',
    options: { '1': '一般垃圾、資源回收、廚餘', '2': '只要一類', '3': '七類', '4': '不需分類' },
    answer: '1',
    explanation: '臺灣常見的垃圾分類有：一般垃圾、資源回收、廚餘三大類。',
  },
  {
    theory_type: 'sociocultural', category_type: 'health', question_type: 'single_choice',
    prompt: '臺灣的飲水機分成什麼？',
    options: { '1': '冰／溫／熱', '2': '只有熱水', '3': '只有冰水', '4': '只有熱湯' },
    answer: '1',
    explanation: '臺灣公共飲水機常見冰、溫、熱三種選擇。',
  },
  // ── 居住與生活 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'housing', question_type: 'single_choice',
    prompt: '臺灣公寓常見的「鐵窗」最主要用途是？',
    options: { '1': '防止小偷與墜落', '2': '裝飾房子', '3': '隔音', '4': '保溫' },
    answer: '1',
    explanation: '鐵窗常見於臺灣公寓，防止入侵與意外墜落。',
  },
  {
    theory_type: 'sociocultural', category_type: 'housing', question_type: 'single_choice',
    prompt: '臺灣老房子常見的「天井」是什麼？',
    options: { '1': '屋內通風採光的小院子', '2': '一種飲料', '3': '神明像', '4': '時鐘' },
    answer: '1',
    explanation: '天井是傳統合院中央通風採光的開放空間。',
  },
  {
    theory_type: 'sociocultural', category_type: 'housing', question_type: 'single_choice',
    prompt: '臺灣公寓樓下「騎樓」的作用是？',
    options: { '1': '讓行人遮陽避雨', '2': '停飛機', '3': '養雞', '4': '裝飾屋頂' },
    answer: '1',
    explanation: '騎樓延伸出建築一樓，提供行人遮蔽空間。',
  },
  {
    theory_type: 'cognitive', category_type: 'housing', question_type: 'single_choice',
    prompt: '「三合院」是什麼？',
    options: {
      '1': '臺灣傳統三面合圍的住宅',
      '2': '三層樓的飯店',
      '3': '三角形的書包',
      '4': '三個球場',
    },
    answer: '1',
    explanation: '三合院是臺灣傳統閩南式建築，三面合圍。',
  },
  // ── 數位生活 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'digital', question_type: 'single_choice',
    prompt: '臺灣最多人用的通訊軟體是？',
    options: { '1': 'LINE', '2': 'WhatsApp', '3': 'Telegram', '4': 'iMessage' },
    answer: '1',
    explanation: 'LINE 是臺灣使用最廣泛的通訊軟體。',
  },
  {
    theory_type: 'sociocultural', category_type: 'digital', question_type: 'single_choice',
    prompt: '「PTT」是臺灣著名的什麼？',
    options: { '1': '電子布告欄（BBS）', '2': '電視台', '3': '夜市', '4': '醫院' },
    answer: '1',
    explanation: 'PTT 是臺灣最大的電子布告欄系統。',
  },
  {
    theory_type: 'sociocultural', category_type: 'digital', question_type: 'single_choice',
    prompt: '臺灣使用人數最多的搜尋引擎是？',
    options: { '1': 'Google', '2': 'Bing', '3': 'Yahoo 奇摩', '4': '百度' },
    answer: '1',
    explanation: 'Google 是臺灣使用人數最多的搜尋引擎，市佔率超過九成。',
  },
  {
    theory_type: 'sociocultural', category_type: 'digital', question_type: 'single_choice',
    prompt: 'Foodpanda 在臺灣是什麼服務？',
    options: { '1': '美食外送', '2': '計程車', '3': '銀行', '4': '電視台' },
    answer: '1',
    explanation: 'Foodpanda 是臺灣常見的美食外送平台。',
  },
  // ── 休閒娛樂 ──────────────────────────────────
  {
    theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '臺灣的「夾娃娃機」最常擺在什麼地方？',
    options: { '1': '街邊或店面', '2': '醫院', '3': '銀行', '4': '飛機上' },
    answer: '1',
    explanation: '夾娃娃機店常設於街邊店面，是臺灣特色。',
  },
  {
    theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '聽到「給愛麗絲」的音樂從巷口傳來，最有可能是？',
    options: { '1': '垃圾車', '2': '消防車', '3': '冰淇淋車', '4': '校車' },
    answer: '1',
    explanation: '臺灣垃圾車常播放「給愛麗絲」或「少女的祈禱」。',
  },
  {
    theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '臺灣大學生最常去的書店是？',
    options: { '1': '誠品', '2': '7-ELEVEN', '3': '電影院', '4': '醫院' },
    answer: '1',
    explanation: '誠品書店是臺灣著名的連鎖書店。',
  },
  {
    theory_type: 'sociocultural', category_type: 'leisure', question_type: 'single_choice',
    prompt: '臺灣特有的卡通主角「電獺」住在哪？',
    options: { '1': '網路與動畫裡', '2': '海邊', '3': '森林', '4': '火星' },
    answer: '1',
    explanation: '電獺是臺灣設計的網路擬人吉祥物。',
  },
  // ── 排序題 ──────────────────────────────────
  {
    theory_type: 'usage', category_type: 'travel', question_type: 'sorting',
    prompt: '請將詞語排成正確的句子：',
    options: { '1': '我', '2': '搭', '3': '捷運', '4': '去夜市' },
    answer: '1,2,3,4',
    explanation: '正確語序：我 搭 捷運 去夜市。',
  },
  {
    theory_type: 'usage', category_type: 'food_shopping', question_type: 'sorting',
    prompt: '請將詞語排成正確的句子：',
    options: { '1': '小華', '2': '在便利商店', '3': '買了', '4': '一個飯糰' },
    answer: '1,2,3,4',
    explanation: '正確語序：小華 在便利商店 買了 一個飯糰。',
  },
  {
    theory_type: 'usage', category_type: 'social', question_type: 'sorting',
    prompt: '請將詞語排成正確的句子：',
    options: { '1': '媽媽', '2': '在元宵節', '3': '煮了', '4': '一鍋湯圓' },
    answer: '1,2,3,4',
    explanation: '正確語序：媽媽 在元宵節 煮了 一鍋湯圓。',
  },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO questions
    (subject, theory_type, category_type, question_type, content, options, correct_answer, explanation, score)
  VALUES ('chinese', @theory_type, @category_type, @question_type, @content, @options, @correct_answer, @explanation, 10)
`);

const insertMany = db.transaction((rows: TwQuestion[]) => {
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
insertMany(tw);

console.log(`[seed-tw] ✅ 寫入 ${tw.length} 道臺灣在地化題目`);
db.close();
