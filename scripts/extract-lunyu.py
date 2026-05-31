#!/usr/bin/env python3
"""
從 chinese-poetry/chinese-poetry 萃取「論語」→ 簡轉繁 → 切句 → 配對「下一句」+ 注音。

來源：https://github.com/chinese-poetry/chinese-poetry/論語/lunyu.json (簡體；公共領域)

切句策略：
  - 每段用「。！？」拆成個別句子（去掉「子曰：」「：」「『』」等冗餘）
  - 同段內連續兩句配對 (前→後)
  - 過濾：句子長度 3..20 字 (避免太短沒意義或太長塞爆 UI)
  - 兩句句子各加入「子曰：」前綴若該段以「子曰」開頭

輸出：frontend/public/data/lunyu.json
[
  {
    "phrase": "學而時習之",
    "zhuyin": ["ㄒㄩㄝˊ", "ㄦˊ", "ㄕˊ", "ㄒㄧˊ", "ㄓ"],
    "next": "不亦說乎",
    "nextZhuyin": ["ㄅㄨˋ", "ㄧˋ", "ㄩㄝˋ", "ㄏㄨ"],
    "chapter": "學而篇",
    "pairContext": "學而時習之，不亦說乎",
    "explanation": "讀過的東西常常拿出來複習，不也是很開心嗎？"   # 部分有 curated 白話
  }, ...
]

執行：
  cd scripts/scrape && .venv/bin/python3 ../extract-lunyu.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TMP = Path('/tmp/lunyu.json')
DICT_PATH = ROOT / 'backend' / 'data' / 'dictionary.json'
OUT = ROOT / 'frontend' / 'public' / 'data' / 'lunyu.json'

SOURCE_URL = ('https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/'
              '%E8%AE%BA%E8%AF%AD/lunyu.json')

SANDHI_RE = re.compile(r'[（(]變[）)]')

# 切句的 punctuation — 用 「，。？！；」全部切，因為論語句子常用 「，」 接續但已是獨立子句
SPLIT_RE = re.compile(r'[，。！？；,]')

# 去掉的引號 / 冒號（含全形 curly quotes / 半形 / 中文書名號）
QUOTE_CHARS = '「」『』""''“”‘’《》：:'

# 「X 曰」前綴（去掉）
SPEAKER_PREFIX_RE = re.compile(
    r'^(子曰|有子曰|曾子曰|子夏曰|子貢曰|子游曰|子張曰|子禽問於子貢曰'
    r'|子路曰|顏淵曰|閔子騫曰|冉求曰|宰我問曰|樊遲問仁|樊遲問'
    r'|孔子曰|夫子曰|孟懿子問孝|公西華曰|林放問禮之本'
    r'|周公謂魯公曰|哀公問曰|定公問'
    r'|陳司敗問|司馬牛憂曰|司馬牛問|顏淵問仁'
    r'|衛公孫朝問於子貢曰|微子去之'
    r')[，：、，]?',
)

# 國小常見的論語段落白話文（curated, 口語化）
# Key 為「上句，下句」(片段配對的 pairContext)
EXPLANATIONS = {
    '學而時習之，不亦說乎': '學過的東西常常拿出來複習，不是很開心嗎？',
    '不亦說乎，有朋自遠方來': '不是很開心嗎？有朋友從遠方來看你。',
    '有朋自遠方來，不亦樂乎': '有朋友從遠方來看你，不是很快樂嗎？',
    '不亦樂乎，人不知而不慍': '不是很快樂嗎？別人不了解你，你也不生氣。',
    '人不知而不慍，不亦君子乎': '別人不了解你，你也不生氣，這不就是君子嗎？',
    '巧言令色，鮮矣仁': '說好聽的話、裝可愛的表情，這種人通常不太善良。',
    '吾日三省吾身，為人謀而不忠乎': '我每天要反省自己三件事：幫別人做事有沒有盡心？',
    '為人謀而不忠乎，與朋友交而不信乎': '幫別人做事有沒有盡心？跟朋友相處有沒有講信用？',
    '與朋友交而不信乎，傳不習乎': '跟朋友相處有沒有講信用？學過的東西有沒有複習？',
    '弟子入則孝，出則弟': '當小孩子，在家要孝順爸媽，在外要尊敬長輩。',
    '出則弟，謹而信': '在外要尊敬長輩，做事要小心、說話要算話。',
    '謹而信，泛愛眾': '做事小心、說話算話，還要愛護身邊每一個人。',
    '泛愛眾，而親仁': '愛護大家，並且親近善良的人。',
    '而親仁，行有餘力': '親近善良的人，做完這些有空餘力。',
    '行有餘力，則以學文': '做完這些有空，再去學各種知識。',
    '溫故而知新，可以為師矣': '常複習舊知識又能體會出新道理，就可以當老師了。',
    '學而不思則罔，思而不學則殆': '只讀書不思考會迷糊，只思考不讀書會危險。',
    '知之為知之，不知為不知': '知道就說知道，不知道就說不知道。',
    '不知為不知，是知也': '不知道就承認不知道，這才是真正的明白。',
    '見賢思齊焉': '看到比我厲害的人，就想要跟他一樣好。',
    '見不賢而內自省也': '看到不好的人，就反省自己是不是也有同樣毛病。',
    '三人行，必有我師焉': '三個人一起走，裡面一定有我可以學習的對象。',
    '擇其善者而從之': '看到別人的優點，就跟著學。',
    '其不善者而改之': '看到別人的缺點，自己有的話就改掉。',
    '己所不欲，勿施於人': '自己不喜歡的事，不要硬要別人做。',
    '工欲善其事，必先利其器': '想把事情做好，要先把工具準備好。',
    '不患人之不己知，患不知人也': '不怕別人不了解我，怕的是我不了解別人。',
    '君子坦蕩蕩，小人長戚戚': '君子心胸開闊，小人總是煩惱憂愁。',
    '敏而好學，不恥下問': '聰明又好學，向地位比自己低的人請教也不覺得丟臉。',
    '逝者如斯夫，不舍晝夜': '時間像流水，白天晚上都不停地流過去。',
    '歲寒，然後知松柏之後凋也': '到了冷天，才看得出松樹柏樹是最不怕冷的（用樹比喻品格堅強的人）。',
    '知者不惑，仁者不憂': '有智慧的人不會迷惑，有仁德的人不會憂愁。',
    '仁者不憂，勇者不懼': '有仁德的人不會憂愁，勇敢的人不會害怕。',
    '父母在，不遠遊': '父母還在的時候，不要跑到太遠的地方。',
    '不遠遊，遊必有方': '不要跑得太遠，去也要讓父母知道地方。',
    '父在，觀其志': '爸爸還在的時候，看一個人有什麼志向。',
    '父沒，觀其行': '爸爸過世了，看他平常的行為。',
    '言必信，行必果': '說話算話，做事有結果。',
    '士不可以不弘毅': '讀書人不能沒有寬大的胸襟和堅強的毅力。',
    '任重而道遠': '責任重大、路途遙遠（學習做君子的路很長）。',
    '當仁，不讓於師': '遇到該做的好事，連對老師也不必客氣讓。',
    '君子和而不同': '君子和大家好好相處，但有自己的想法。',
    '小人同而不和': '小人表面附和大家，其實心裡並不和睦。',
    '過而不改，是謂過矣': '有錯不改，這才叫做錯。',
    '有教無類': '只要願意學，不分什麼樣的學生都可以教。',
    '欲速則不達': '太想快反而做不好。',
    '見小利則大事不成': '只看到眼前小好處，大事就做不成。',
    '人無遠慮，必有近憂': '人如果不為未來打算，眼前就會有煩惱。',
}


def first_zhuyin(z: str) -> str:
    return SANDHI_RE.split(z or '')[0].strip()


def char_zhuyin(ch: str, dictionary: dict) -> str:
    entry = dictionary.get(ch)
    if not entry or not isinstance(entry, list):
        return ''
    return first_zhuyin(entry[0].get('zhuyin', ''))


def clean_sentence(s: str) -> str:
    """去掉引號、冒號、空白；多輪 strip 把句首的「子曰」類前綴去掉。"""
    s = s.strip()
    for ch in QUOTE_CHARS:
        s = s.replace(ch, '')
    s = s.strip()
    # 反覆去頭部 speaker prefix（部分句首可能有多個冒號或括號殘餘）
    for _ in range(3):
        new = SPEAKER_PREFIX_RE.sub('', s).strip()
        if new == s:
            break
        s = new
    # 去頭尾的 ，。 等
    s = s.strip('，。、,.; \t')
    return s


def download_if_missing() -> None:
    if TMP.exists() and TMP.stat().st_size > 1000:
        return
    req = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        TMP.write_bytes(resp.read())


def main() -> None:
    try:
        from opencc import OpenCC
    except ImportError:
        print('[X] opencc not installed. Run:\n'
              '   cd scripts/scrape && .venv/bin/pip install opencc-python-reimplemented',
              file=sys.stderr)
        sys.exit(1)
    cc = OpenCC('s2twp')

    download_if_missing()
    if not DICT_PATH.exists():
        print(f'[X] {DICT_PATH} not found', file=sys.stderr)
        sys.exit(1)
    print(f'[load] dictionary.json ...', flush=True)
    dictionary = json.loads(DICT_PATH.read_text(encoding='utf-8'))
    print(f'[load] {len(dictionary):,} entries')

    raw = json.loads(TMP.read_text(encoding='utf-8'))
    print(f'[parse] {len(raw)} chapters, {sum(len(c["paragraphs"]) for c in raw)} paragraphs')

    out: list[dict] = []
    for chapter in raw:
        chap_name = cc.convert(chapter['chapter'])
        for paragraph in chapter['paragraphs']:
            para_trad = cc.convert(paragraph)
            # 切句 + 清掉引號 / 冒號 / 子曰前綴
            sentences = [clean_sentence(s) for s in SPLIT_RE.split(para_trad)]
            sentences = [s for s in sentences if s]
            # 配對連續兩句
            for i in range(len(sentences) - 1):
                cur, nxt = sentences[i], sentences[i + 1]
                # 過濾：兩句都要 3..15 字（避免太短或太長）
                if not (3 <= len(cur) <= 15 and 3 <= len(nxt) <= 15):
                    continue
                pair_ctx = f'{cur}，{nxt}'
                out.append({
                    'phrase': cur,
                    'zhuyin': [char_zhuyin(c, dictionary) for c in cur],
                    'next': nxt,
                    'nextZhuyin': [char_zhuyin(c, dictionary) for c in nxt],
                    'chapter': chap_name,
                    'pairContext': pair_ctx,
                    'explanation': EXPLANATIONS.get(pair_ctx, ''),
                })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    with_exp = sum(1 for e in out if e['explanation'])
    print()
    print(f'[output] {len(out)} 題接句 → {OUT} ({OUT.stat().st_size/1024:.0f} KB)')
    print(f'         其中 {with_exp} 題有白話文解釋')
    print()
    print('sample 5:')
    for e in out[:5]:
        z = ' '.join(e['zhuyin'])
        zn = ' '.join(e['nextZhuyin'])
        print(f'  [{e["chapter"]}] {e["phrase"]} [{z}] → {e["next"]} [{zn}]')
        if e['explanation']:
            print(f'    解：{e["explanation"]}')


if __name__ == '__main__':
    main()
