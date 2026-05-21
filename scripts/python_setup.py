"""
Python 版フルセットアップ — WSL / Linux 環境から DB を生成する。
Windows 側の better-sqlite3 / tsx / esbuild に依存しない。
"""
import sqlite3, bcrypt, json, random, os, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB   = ROOT / "database" / "redmushroom.db"
SQL  = ROOT / "database" / "init.sql"
VER  = ROOT / "database" / ".db-version"

# ── helpers ──────────────────────────────────────────────────────────────────

def shuffle_options(opts: dict, answer: str):
    """Shuffle single-choice options; sorting questions (answer contains ',') untouched."""
    if ',' in answer:
        return opts, answer
    entries = list(opts.items())
    random.shuffle(entries)
    new_opts, new_answer = {}, answer
    for idx, (old_key, value) in enumerate(entries):
        new_key = str(idx + 1)
        new_opts[new_key] = value
        if old_key == answer:
            new_answer = new_key
    return new_opts, new_answer

def zhuyin(text):
    """Return minimal ZhuyinChar JSON array (pinyin left empty — acceptable)."""
    return json.dumps([{"char": c, "pinyin": ""} for c in text])

def insert_question(cur, subject, theory, category, qtype, prompt,
                    opts: dict, answer: str, explanation: str):
    shuffled_opts, shuffled_answer = shuffle_options(opts, answer)
    cur.execute("""
        INSERT OR IGNORE INTO questions
          (subject, theory_type, category_type, question_type,
           content, options, correct_answer, explanation, score)
        VALUES (?,?,?,?,?,?,?,?,10)
    """, (subject, theory, category, qtype,
          zhuyin(prompt),
          json.dumps(shuffled_opts),
          shuffled_answer,
          explanation))

# ── step 1: init schema ───────────────────────────────────────────────────────

print("[python_setup] 建立 DB 結構...")
DB.parent.mkdir(parents=True, exist_ok=True)
if DB.exists():
    DB.unlink()

con = sqlite3.connect(str(DB))
cur = con.cursor()
cur.executescript(SQL.read_text(encoding="utf-8"))
con.commit()
print("[python_setup] ✅ schema OK")

# ── step 2: demo accounts ────────────────────────────────────────────────────

print("[python_setup] 建立示範帳號...")

def make_hash(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()

teacher_hash = make_hash("teacher123")
student_hash = make_hash("student123")

cur.execute("""
    INSERT OR IGNORE INTO users
      (username, password_hash, display_name, role, grade, class_id)
    VALUES ('teacher', ?, '示範老師', 'teacher', '0', 'class-A')
""", (teacher_hash,))
tid = cur.lastrowid or cur.execute("SELECT user_id FROM users WHERE username='teacher'").fetchone()[0]
cur.execute("INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)", (tid,))
cur.execute("INSERT OR IGNORE INTO user_sprites (user_id) VALUES (?)", (tid,))

cur.execute("""
    INSERT OR IGNORE INTO users
      (username, password_hash, display_name, role, grade, class_id)
    VALUES ('student1', ?, '小蘑菇', 'student', '3', 'class-A')
""", (student_hash,))
sid = cur.lastrowid or cur.execute("SELECT user_id FROM users WHERE username='student1'").fetchone()[0]
cur.execute("INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)", (sid,))
cur.execute("INSERT OR IGNORE INTO user_sprites (user_id) VALUES (?)", (sid,))

con.commit()
print("[python_setup] ✅ accounts OK (teacher/teacher123, student1/student123)")

# ── step 3: Chinese questions (cognitive × 8 categories) ────────────────────

print("[python_setup] 生成中文題庫...")

# cognitive: word → meaning (6 words × 8 categories = 48 questions)
cognitive_data = {
    "food_shopping": [
        ("美食","好吃的食物","不能吃的東西","一種玩具","天氣很熱"),
        ("夜市","晚上的市集","一所學校","一本書","一種運動"),
        ("便當","盒裝的飯菜","一種衣服","電腦遊戲","一棵樹"),
        ("飯糰","飯捏成的點心","一種電器","一種樂器","一隻動物"),
        ("小吃","簡單的食物","一種工具","一種顏色","一首歌"),
        ("甜點","甜的食物","一種科目","一種天氣","一種職業"),
    ],
    "social": [
        ("朋友","友好的夥伴","敵人","陌生人","機器人"),
        ("老師","教導學生的人","廚師","司機","醫生"),
        ("同學","一起上學的人","鄰居","外國人","路人"),
        ("家人","住在一起的親人","客人","老闆","同事"),
        ("鄰居","住在附近的人","朋友","同學","老師"),
        ("客人","來訪的人","主人","服務生","警衛"),
    ],
    "travel": [
        ("捷運","軌道大眾運輸","一種食物","一棵樹","一種樂器"),
        ("公車","路面公共汽車","一所學校","一本書","一種運動"),
        ("腳踏車","人力雙輪車","一種飲料","一種衣服","一種遊戲"),
        ("計程車","叫車載客的車","一種顏色","一種食物","一條河"),
        ("火車","長距離鐵路車","一種藥物","一種工具","一座山"),
        ("飛機","飛在天上的運輸","一種電器","一種動物","一種植物"),
    ],
    "business": [
        ("買","用錢換東西","打掃","唱歌","睡覺"),
        ("賣","把東西換成錢","上學","跑步","畫畫"),
        ("錢包","裝錢的物品","書包","便當盒","水壺"),
        ("收銀台","結帳的櫃台","廚房","浴室","書房"),
        ("價錢","商品的金額","天氣","顏色","重量"),
        ("找錢","多付的錢退回","送禮","打折","包裝"),
    ],
    "health": [
        ("健康","身體強壯","脆弱","懶惰","難過"),
        ("運動","活動身體","睡覺","吃飯","看書"),
        ("休息","停下來放鬆","繼續工作","跑步","唱歌"),
        ("睡眠","夜晚的睡覺","白天的玩耍","早上的起床","午間的休息"),
        ("營養","食物中的好東西","壞的東西","多餘的東西","有毒的東西"),
        ("清潔","把身體洗乾淨","弄髒身體","穿衣服","化妝"),
    ],
    "leisure": [
        ("遊戲","好玩的活動","一種食物","一種工具","一種衣服"),
        ("電影","在電影院看的故事","一種運動","一種食物","一種工具"),
        ("音樂","好聽的聲音藝術","一種科目","一種遊戲","一種食物"),
        ("畫畫","用筆畫出圖畫","用嘴唱歌","用腳跑步","用耳朵聽"),
        ("閱讀","看書學知識","看電視","玩遊戲","睡覺"),
        ("旅行","到外地玩","待在家裡","上學讀書","去醫院看病"),
    ],
    "housing": [
        ("客廳","家人聚會的房間","睡覺的房間","洗澡的房間","煮飯的地方"),
        ("廚房","煮飯的地方","睡覺的房間","學習的地方","洗澡的房間"),
        ("臥室","睡覺的房間","煮飯的地方","洗澡的房間","讀書的地方"),
        ("浴室","洗澡的地方","睡覺的房間","煮飯的地方","聚會的房間"),
        ("陽台","曬衣服的小空間","睡覺的地方","煮飯的地方","洗澡的地方"),
        ("書房","看書寫字的房間","睡覺的房間","煮飯的地方","洗澡的地方"),
    ],
    "digital": [
        ("電腦","可運算的電子機器","一種樂器","一種食物","一種交通工具"),
        ("網路","電腦相連的系統","一種遊戲","一種運動","一種食物"),
        ("手機","可帶在身上的通訊機器","一種玩具","一種書本","一種食物"),
        ("滑鼠","操作電腦的小工具","一種食物","一種樂器","一種動物"),
        ("螢幕","顯示畫面的螢光板","一種食物","一種衣服","一種運動"),
        ("鍵盤","輸入文字的工具","一種樂器","一種餐具","一種玩具"),
    ],
}

# Multiple prompt variants to avoid "always same sentence"
cog_prompts = [
    lambda w: f"「{w}」這個詞是什麼意思？",
    lambda w: f"請問「{w}」最接近哪一個解釋？",
    lambda w: f"下列哪一個和「{w}」最像？",
    lambda w: f"「{w}」指的是？",
]

for cat, items in cognitive_data.items():
    for i, (word, right, w1, w2, w3) in enumerate(items):
        prompt_fn = cog_prompts[i % len(cog_prompts)]
        insert_question(cur, "chinese", "cognitive", cat, "single_choice",
                        prompt_fn(word),
                        {"1": right, "2": w1, "3": w2, "4": w3},
                        "1",
                        f"「{word}」的意思是{right}。")

# input × 8 categories
input_qs = [
    ("food_shopping","小華在夜市買 3 杯珍奶，每杯 60 元，要付多少錢？",
     {"1":"180 元","2":"120 元","3":"60 元","4":"240 元"},"1","3 × 60 = 180。"),
    ("social","小明幫助了受傷的同學，老師說他很「X」。X 最可能是？",
     {"1":"熱心","2":"懶惰","3":"粗心","4":"害羞"},"1","主動幫忙是熱心的表現。"),
    ("travel","捷運從淡水到象山要 45 分鐘，8:30 出發幾點到？",
     {"1":"9:15","2":"9:00","3":"8:45","4":"9:30"},"1","8:30 + 45 分 = 9:15。"),
    ("business","一個便當 80 元，付 100 元，找回多少？",
     {"1":"20 元","2":"10 元","3":"30 元","4":"80 元"},"1","100 - 80 = 20。"),
    ("health","小明每天運動 30 分鐘，一週運動幾分鐘？",
     {"1":"210","2":"150","3":"180","4":"120"},"1","30 × 7 = 210。"),
    ("leisure","電影 1 小時 50 分，14:00 開始幾點結束？",
     {"1":"15:50","2":"15:00","3":"16:10","4":"15:30"},"1","14:00 + 1:50 = 15:50。"),
    ("housing","房間長 4 公尺寬 3 公尺，面積是？",
     {"1":"12 平方公尺","2":"7 平方公尺","3":"14 平方公尺","4":"9 平方公尺"},"1","4 × 3 = 12。"),
    ("digital","手機電量剩 80%，每小時掉 20%，幾小時用光？",
     {"1":"4 小時","2":"2 小時","3":"8 小時","4":"6 小時"},"1","80 ÷ 20 = 4。"),
    # 補齊 ≥10 （input 共 8 類，補 2 題確保 ≥10）
    ("food_shopping","媽媽準備了 5 個便當，全家 3 人吃，剩幾個？",
     {"1":"2 個","2":"3 個","3":"5 個","4":"8 個"},"1","5 - 3 = 2。"),
    ("social","班級 32 人，今天缺席 4 人，到校幾人？",
     {"1":"28","2":"36","3":"32","4":"30"},"1","32 - 4 = 28。"),
]
for cat, prompt, opts, ans, expl in input_qs:
    insert_question(cur, "chinese", "input", cat, "single_choice",
                    prompt, opts, ans, expl)

# usage × 8 (single_choice, grammar)
usage_qs = [
    ("food_shopping","請選出正確的句子：",
     {"1":"我吃了很多飯。","2":"我吃很飯多。","3":"很多我飯吃了。","4":"飯很多我吃。"},"1",
     "正確語序：主語＋動詞＋副詞＋賓語。"),
    ("social","下列哪一句最有禮貌？",
     {"1":"請問可以借我橡皮擦嗎？","2":"把橡皮擦給我！","3":"橡皮擦借！","4":"橡皮擦快點。"},"1",
     "「請問」開頭最有禮貌。"),
    ("travel","「我___捷運去學校」空格填什麼？",
     {"1":"搭","2":"吃","3":"寫","4":"彈"},"1","搭乘交通工具用「搭」。"),
    ("business","哪一句語意通順？",
     {"1":"老闆把找零的錢還給了客人。","2":"客人錢把找零的還給了老闆。",
      "3":"把老闆找零還給的錢客人了。","4":"了找零還給錢的老闆客人。"},"1",
     "「把」字句：主語＋把＋賓語＋動詞。"),
    ("health","下列哪一句是「未來式」？",
     {"1":"明天我要去看醫生。","2":"昨天我去看醫生了。",
      "3":"我正在看醫生。","4":"我從來不看醫生。"},"1","「明天」+「要」表示未來。"),
    ("leisure","「越___越___」可以怎麼填？",
     {"1":"越唱越開心","2":"開心越唱越","3":"唱越開心越","4":"越越開心唱"},"1",
     "越A越B：A增加B也增加。"),
    ("housing","下列哪一句量詞正確？",
     {"1":"我家有一棟房子。","2":"我家有一片房子。",
      "3":"我家有一根房子。","4":"我家有一張房子。"},"1","房子的量詞是「棟」。"),
    ("digital","哪一句最通順？",
     {"1":"我用手機打電話給媽媽。","2":"手機我打用電話媽媽給。",
      "3":"打給媽媽我用手機電話。","4":"我打給用手機媽媽電話。"},"1",
     "主語＋工具＋動詞＋對象。"),
]
for cat, prompt, opts, ans, expl in usage_qs:
    insert_question(cur, "chinese", "usage", cat, "single_choice",
                    prompt, opts, ans, expl)

# usage × 4 sorting
sorting_qs = [
    ("food_shopping","請將詞語排成正確的句子：",
     {"1":"我","2":"昨天","3":"吃了","4":"一個飯糰"},"1,2,3,4","我 昨天 吃了 一個飯糰。"),
    ("social","請將詞語排成正確的句子：",
     {"1":"老師","2":"認真地","3":"教","4":"我們"},"1,2,3,4","老師 認真地 教 我們。"),
    ("travel","請將詞語排成正確的句子：",
     {"1":"我","2":"搭","3":"捷運","4":"去夜市"},"1,2,3,4","我 搭 捷運 去夜市。"),
    ("digital","請將詞語排成正確的句子：",
     {"1":"我","2":"用","3":"電腦","4":"寫作業"},"1,2,3,4","我 用 電腦 寫作業。"),
]
for cat, prompt, opts, ans, expl in sorting_qs:
    # sorting: keep option order, don't shuffle
    cur.execute("""
        INSERT OR IGNORE INTO questions
          (subject, theory_type, category_type, question_type,
           content, options, correct_answer, explanation, score)
        VALUES ('chinese','usage',?,?,?,?,?,?,10)
    """, (cat, "sorting", zhuyin(prompt), json.dumps(opts), ans, expl))

# sociocultural × 8
socio_qs = [
    ("food_shopping","端午節最常吃的食物是？",
     {"1":"粽子","2":"月餅","3":"湯圓","4":"年糕"},"1","端午節傳統食物是粽子。"),
    ("social","農曆新年全家會做什麼？",
     {"1":"圍爐吃年夜飯","2":"看龍舟","3":"賞月","4":"掃墓"},"1","圍爐是農曆新年習俗。"),
    ("travel","臺北捷運上禁止做什麼？",
     {"1":"飲食","2":"看書","3":"聊天","4":"坐著"},"1","捷運嚴禁飲食。"),
    ("business","臺灣最普及的小額付款是？",
     {"1":"悠遊卡或一卡通","2":"只能現金","3":"寄信","4":"糖果交換"},"1","悠遊卡是臺灣最普及電子票證。"),
    ("health","臺灣全民健康保險最重要的功能是？",
     {"1":"看病時減輕家庭負擔","2":"免費入學","3":"免費搭飛機","4":"免費租房"},"1","健保讓看病費用降低。"),
    ("leisure","聽到「叮咚叮咚」音樂從巷子來，最可能是？",
     {"1":"垃圾車","2":"警車","3":"消防車","4":"冰淇淋車"},"1","臺灣垃圾車播放「給愛麗絲」。"),
    ("housing","臺灣常見的「鐵窗」用途是？",
     {"1":"防止小偷","2":"裝飾","3":"隔音","4":"防水"},"1","鐵窗防止入侵與墜落。"),
    ("digital","臺灣最多人用的通訊軟體是？",
     {"1":"LINE","2":"WhatsApp","3":"Telegram","4":"WeChat"},"1","LINE 在臺灣最普及。"),
]
for cat, prompt, opts, ans, expl in socio_qs:
    insert_question(cur, "chinese", "sociocultural", cat, "single_choice",
                    prompt, opts, ans, expl)

# ── Taiwan questions (subset, already hand-crafted) ──────────────────────────
tw_qs = [
    ("sociocultural","food_shopping","到士林夜市最常吃的是？",
     {"1":"蚵仔煎","2":"披薩","3":"漢堡","4":"壽司"},"1","蚵仔煎是夜市代表小吃。"),
    ("sociocultural","food_shopping","臺灣國民飲料是？",
     {"1":"珍珠奶茶","2":"可樂","3":"柳橙汁","4":"咖啡"},"1","珍珠奶茶起源臺灣。"),
    ("sociocultural","travel","搭臺北捷運最常用什麼付款？",
     {"1":"悠遊卡","2":"紙鈔","3":"糖果","4":"撲克牌"},"1","悠遊卡最普及。"),
    ("cognitive","travel","YouBike 是什麼？",
     {"1":"公共自行車","2":"公車","3":"計程車","4":"飛機"},"1","YouBike 是公共自行車系統。"),
    ("usage","travel","「我要___捷運去學校」空格填？",
     {"1":"搭","2":"飛","3":"走","4":"游"},"1","搭乘交通工具用「搭」。"),
    ("sociocultural","food_shopping","臺灣便利商店茶葉蛋最常在哪買？",
     {"1":"便利商店","2":"銀行","3":"醫院","4":"電影院"},"1","7-11 等便利商店常見。"),
    ("sociocultural","business","臺灣最常見的便利商店是？",
     {"1":"7-ELEVEN","2":"麥當勞","3":"誠品","4":"家樂福"},"1","7-ELEVEN 是臺灣最普及便利商店。"),
    ("sociocultural","social","農曆正月十五是什麼節日？",
     {"1":"元宵節","2":"端午節","3":"中秋節","4":"清明節"},"1","農曆正月十五是元宵節。"),
    ("sociocultural","social","端午節時通常會吃什麼？",
     {"1":"粽子","2":"湯圓","3":"月餅","4":"年糕"},"1","端午節傳統食物是粽子。"),
    ("sociocultural","leisure","聽到垃圾車音樂，最常聽到哪首曲子？",
     {"1":"給愛麗絲","2":"生日快樂","3":"小星星","4":"兩隻老虎"},"1","臺灣垃圾車播放給愛麗絲。"),
]
for theory, cat, prompt, opts, ans, expl in tw_qs:
    insert_question(cur, "chinese", theory, cat, "single_choice",
                    prompt, opts, ans, expl)

# ── Math questions ────────────────────────────────────────────────────────────
math_qs = [
    ("cognitive","food_shopping","一打雞蛋是幾顆？",
     {"1":"12","2":"10","3":"6","4":"8"},"1","一打 = 12。"),
    ("cognitive","social","「半小時」是幾分鐘？",
     {"1":"30","2":"15","3":"45","4":"60"},"1","半小時 = 30 分鐘。"),
    ("cognitive","travel","1 公里等於幾公尺？",
     {"1":"1000","2":"100","3":"10","4":"10000"},"1","1 公里 = 1000 公尺。"),
    ("cognitive","business","1000 元裡有幾張 100 元？",
     {"1":"10","2":"5","3":"100","4":"1"},"1","1000 ÷ 100 = 10。"),
    ("cognitive","health","體溫 36.5 度是幾度幾分？",
     {"1":"36 度 5 分","2":"36 度","3":"37 度","4":"36 度 50 分"},"1","小數點後 5 唸作「5 分」。"),
    ("cognitive","leisure","一副撲克牌含鬼牌幾張？",
     {"1":"54","2":"52","3":"48","4":"56"},"1","52 張 + 2 張鬼牌 = 54。"),
    ("cognitive","housing","1 坪約多少平方公尺？",
     {"1":"3.3","2":"1","3":"10","4":"100"},"1","1 坪 ≈ 3.3 m²。"),
    ("cognitive","digital","1 KB 約是幾個 byte？",
     {"1":"1024","2":"100","3":"1000","4":"10"},"1","1 KB = 1024 bytes。"),
    ("input","food_shopping","3 杯珍奶每杯 60 元，共多少？",
     {"1":"180 元","2":"120 元","3":"150 元","4":"200 元"},"1","3 × 60 = 180。"),
    ("input","social","28 人加 2 位老師，共幾人？",
     {"1":"30","2":"28","3":"32","4":"26"},"1","28 + 2 = 30。"),
    ("input","travel","捷運 45 分，8:30 出發幾點到？",
     {"1":"9:15","2":"9:00","3":"9:30","4":"8:45"},"1","8:30 + 45 = 9:15。"),
    ("input","business","80 元便當付 100 元找回多少？",
     {"1":"20 元","2":"30 元","3":"10 元","4":"80 元"},"1","100 - 80 = 20。"),
    ("input","health","每天 30 分鐘運動，一週幾分鐘？",
     {"1":"210","2":"150","3":"180","4":"300"},"1","30 × 7 = 210。"),
    ("input","leisure","電影 1 小時 50 分，14:00 開始幾點結束？",
     {"1":"15:50","2":"15:00","3":"16:00","4":"15:30"},"1","14:00 + 1:50 = 15:50。"),
    ("input","housing","長 4 公尺寬 3 公尺，面積是？",
     {"1":"12 平方公尺","2":"7 平方公尺","3":"14 平方公尺","4":"9 平方公尺"},"1","4 × 3 = 12。"),
    ("input","digital","電量 80% 每小時掉 20%，幾小時用光？",
     {"1":"4 小時","2":"2 小時","3":"8 小時","4":"20 小時"},"1","80 ÷ 20 = 4。"),
    ("usage","food_shopping","計算 2 + 3 × 4 等於？",
     {"1":"14","2":"20","3":"24","4":"9"},"1","先乘後加：3×4=12，+2=14。"),
    ("usage","social","計算 (6 + 4) × 2 等於？",
     {"1":"20","2":"14","3":"16","4":"12"},"1","括號先算：10×2=20。"),
    ("usage","travel","正方形周長公式是？",
     {"1":"邊長 × 4","2":"邊長 × 邊長","3":"邊長 × 2","4":"邊長 + 4"},"1","正方形四邊相等，×4。"),
    ("usage","business","9 折優惠是？",
     {"1":"原價的 90%","2":"原價的 9%","3":"省 90%","4":"原價的 10%"},"1","臺灣 9 折 = 90%。"),
    ("usage","health","100 - 25 × 2 等於？",
     {"1":"50","2":"150","3":"75","4":"25"},"1","先乘：25×2=50，再 100-50=50。"),
    ("usage","leisure","「分數一半」是？",
     {"1":"1/2","2":"2/2","3":"1/4","4":"1/3"},"1","1/2 = 一半。"),
    ("usage","housing","長 5 寬 3，周長是？",
     {"1":"16","2":"15","3":"8","4":"30"},"1","(5+3)×2=16。"),
    ("usage","digital","60 MB 網速 12 MB/s，下載幾秒？",
     {"1":"5 秒","2":"72 秒","3":"48 秒","4":"12 秒"},"1","60 ÷ 12 = 5。"),
    ("sociocultural","food_shopping","咖啡買 5 送 1，共拿幾杯？",
     {"1":"6","2":"5","3":"10","4":"4"},"1","買 5 送 1 = 6 杯。"),
    ("sociocultural","social","1 萬元裝在幾個 1000 元？",
     {"1":"10","2":"100","3":"1","4":"5"},"1","10000 ÷ 1000 = 10。"),
    ("sociocultural","travel","350 公里時速 100 需幾小時？",
     {"1":"3.5 小時","2":"3 小時","3":"5 小時","4":"2 小時"},"1","350 ÷ 100 = 3.5。"),
    ("sociocultural","business","發票對中 200 元，買幾個 50 元便當？",
     {"1":"4","2":"2","3":"5","4":"200"},"1","200 ÷ 50 = 4。"),
    ("sociocultural","health","健保掛號費 150 元，付 200 找回？",
     {"1":"50 元","2":"100 元","3":"150 元","4":"350 元"},"1","200 - 150 = 50。"),
    ("sociocultural","leisure","烤肉串 15 元 4 支，加飲料 20 元，共？",
     {"1":"80 元","2":"60 元","3":"75 元","4":"100 元"},"1","15×4=60，60+20=80。"),
    ("sociocultural","housing","30 坪約多少平方公尺？",
     {"1":"99","2":"30","3":"10","4":"300"},"1","30 × 3.3 = 99 m²。"),
    ("sociocultural","digital","YouBike 每 30 分 10 元，騎 90 分要付？",
     {"1":"30 元","2":"20 元","3":"10 元","4":"60 元"},"1","90 ÷ 30 × 10 = 30 元。"),
    # 各 theory 再補 2 題確保 ≥10
    ("cognitive","social","一個禮拜是幾天？",
     {"1":"7","2":"5","3":"6","4":"30"},"1","一個禮拜 = 7 天。"),
    ("cognitive","leisure","一年有幾個月？",
     {"1":"12","2":"10","3":"4","4":"52"},"1","一年 = 12 個月。"),
    ("input","social","小班 15 人大班 18 人，共幾人？",
     {"1":"33","2":"30","3":"35","4":"18"},"1","15 + 18 = 33。"),
    ("input","leisure","看電影 2 小時，看了 3 場，共幾小時？",
     {"1":"6","2":"5","3":"3","4":"8"},"1","2 × 3 = 6。"),
    ("usage","social","計算 50 ÷ 5 等於？",
     {"1":"10","2":"5","3":"45","4":"55"},"1","50 ÷ 5 = 10。"),
    ("usage","leisure","計算 3² 等於？",
     {"1":"9","2":"6","3":"8","4":"12"},"1","3² = 3×3 = 9。"),
    ("sociocultural","social","春節紅包習俗，長輩給晚輩代表？",
     {"1":"祝福與新年好兆頭","2":"罰錢","3":"考試成績","4":"借錢"},"1","紅包是長輩給晚輩的吉祥祝福。"),
    ("sociocultural","leisure","中秋節除了月餅，臺灣最常做什麼？",
     {"1":"烤肉","2":"游泳","3":"滑雪","4":"爬山"},"1","近年臺灣中秋有全民烤肉習慣。"),
]
for theory, cat, prompt, opts, ans, expl in math_qs:
    insert_question(cur, "math", theory, cat, "single_choice",
                    prompt, opts, ans, expl)

con.commit()

# Verify
for subject in ("chinese", "math"):
    rows = cur.execute(
        "SELECT theory_type, COUNT(*) FROM questions WHERE subject=? GROUP BY 1", (subject,)
    ).fetchall()
    print(f"[python_setup] {subject}:", {r[0]: r[1] for r in rows})

# ── step 4: praise library ────────────────────────────────────────────────────

print("[python_setup] 讚美語庫...")

praises = [
    # passed
    ("passed","enthusiastic","答得超棒！繼續保持！🌟"),
    ("passed","enthusiastic","太厲害了！這個主題你掌握了！"),
    ("passed","enthusiastic","通關啦！蘑菇為你歡呼！🎉"),
    ("passed","enthusiastic","你今天的表現像金牌選手！🥇"),
    ("passed","enthusiastic","蘑菇給你大大的擁抱！🤗"),
    ("passed","growth_mindset","你的努力有了成果！每次練習都讓你更強。"),
    ("passed","growth_mindset","你掌握了這個主題，這就是學習的力量。"),
    ("passed","growth_mindset","每一次的成功都是下一次的基礎。"),
    ("passed","growth_mindset","你的進步是真的，不是運氣。"),
    ("passed","growth_mindset","繼續這樣練，你會越走越遠。"),
    ("passed","humorous","蘑菇精靈為你跳起森巴！💃"),
    ("passed","humorous","你的腦袋今天裝了渦輪引擎！🚀"),
    ("passed","humorous","答題就像吃蛋糕一樣輕鬆！🍰"),
    # failed
    ("failed_encouragement","enthusiastic","沒關係！失敗是成功的媽媽！下次一定可以！💪"),
    ("failed_encouragement","enthusiastic","蘑菇相信你下一場會更好！"),
    ("failed_encouragement","enthusiastic","繼續！你絕對可以的！"),
    ("failed_encouragement","growth_mindset","這次的錯誤是學習的機會。"),
    ("failed_encouragement","growth_mindset","錯誤是大腦在長肌肉，繼續！"),
    ("failed_encouragement","growth_mindset","失敗不是終點，是下一次起點。"),
    ("failed_encouragement","humorous","哎呀，蘑菇也需要雨水才能長大，再試一次！☔"),
    ("failed_encouragement","humorous","題目跟你玩躲貓貓，下次找到牠！👀"),
    # perfect
    ("perfect_score","enthusiastic","滿分！蘑菇都跪了！"),
    ("perfect_score","enthusiastic","100 分！你是今天最厲害的國語勇士！🏆"),
    ("perfect_score","growth_mindset","完美！這說明你真的掌握了這個主題。"),
    ("perfect_score","humorous","蘑菇精靈跑去告訴整個森林！🌲"),
    # streak
    ("streak_bonus","enthusiastic","連續練習！你的毅力讓蘑菇感動！🔥🔥"),
    ("streak_bonus","growth_mindset","每天一點點，累積就是大進步。"),
    ("streak_bonus","humorous","蘑菇精靈幫你續火！🔥"),
    # level_up
    ("level_up","enthusiastic","升級啦！更大的挑戰等著你！⬆️✨"),
    ("level_up","growth_mindset","新的等級，新的視野。"),
    ("level_up","humorous","蘑菇給你蘑菇皇冠！👑"),
    # weakness
    ("weakness_improved","growth_mindset","弱點變優點，這就是進步的證據。"),
    ("weakness_improved","enthusiastic","弱項翻身！太精彩！⭐"),
    ("weakness_improved","humorous","錯題怪獸：「我輸了……」🐲💧"),
    # sen
    ("sen_encouragement","growth_mindset","按你的節奏走，每一步都算數。"),
    ("sen_encouragement","growth_mindset","今天比昨天多認識一個字，太棒了。"),
    ("sen_encouragement","growth_mindset","想了好久才答出來，那是用腦的證明。"),
    ("sen_encouragement","growth_mindset","答錯沒關係，記住這個感覺就好。"),
    ("sen_encouragement","growth_mindset","深呼吸，再來一次，沒有壓力。"),
    ("sen_encouragement","growth_mindset","你比剛剛的自己更靠近答案了。"),
    ("sen_encouragement","growth_mindset","一步一步來，蘑菇精靈陪著你。"),
    ("sen_encouragement","growth_mindset","休息一下也是學習的一部分。"),
    ("sen_encouragement","growth_mindset","你今天願意學，已經非常厲害了。"),
    ("sen_encouragement","enthusiastic","你願意再試一次，就是最大的進步！🌟"),
    ("sen_encouragement","enthusiastic","小蘑菇看到你今天認真的眼神！🍄"),
    ("sen_encouragement","enthusiastic","完成一題就值得鼓掌！👏"),
    ("sen_encouragement","humorous","哎呀，這題會跟你捉迷藏，下次抓到它！"),
    ("sen_encouragement","humorous","蘑菇精靈陪你慢慢走，不比快的！"),
]

for scenario, tone, content in praises:
    cur.execute(
        "INSERT OR IGNORE INTO praise_library (scenario_type, tone_type, content) VALUES (?,?,?)",
        (scenario, tone, content)
    )

con.commit()
praise_count = cur.execute("SELECT COUNT(*) FROM praise_library").fetchone()[0]
print(f"[python_setup] ✅ {praise_count} praises")

# ── done ─────────────────────────────────────────────────────────────────────

q_count = cur.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
print(f"[python_setup] ✅ {q_count} questions total")

# Verify answers are NOT all '1'
dist = cur.execute(
    "SELECT correct_answer, COUNT(*) FROM questions WHERE question_type='single_choice' GROUP BY 1 ORDER BY 1"
).fetchall()
print("[python_setup] Answer slot distribution:", {r[0]: r[1] for r in dist})

con.close()

# Write version marker
VER.write_text("shuffle-v1")
print(f"[python_setup] ✅ Wrote {VER}")
print("[python_setup] 🍄 完成！")
