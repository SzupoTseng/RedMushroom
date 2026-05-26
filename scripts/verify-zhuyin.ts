/**
 * Verifies context-aware polyphonic (破音字) bopomofo conversion.
 *
 *   npx tsx scripts/verify-zhuyin.ts
 *
 * Each case asserts that a specific character inside a sentence receives the
 * reading expected from its CONTEXT (word), proving longest-prefix matching
 * overrides the single-char default.
 */
import { zhuyinize } from './questions/zhuyin';

interface Case {
  sentence: string;
  char: string;      // the character under test
  occurrence: number; // 1-based index among that char's occurrences
  expect: string;    // expected bopomofo
  note: string;
}

const CASES: Case[] = [
  // 長: ㄔㄤˊ (long) vs ㄓㄤˇ (grow / elder / chief)
  { sentence: '小樹會慢慢長大', char: '長', occurrence: 1, expect: 'ㄓㄤˇ', note: '長大 = grow' },
  { sentence: '這條路很長',     char: '長', occurrence: 1, expect: 'ㄔㄤˊ', note: '長 = long (standalone default)' },
  // 和: ㄏㄜˊ (peace/harmony) vs ㄏㄢˋ (and, TW conjunction)
  { sentence: '世界和平最重要', char: '和', occurrence: 1, expect: 'ㄏㄜˊ', note: '和平 = peace' },
  { sentence: '我和弟弟去公園', char: '和', occurrence: 1, expect: 'ㄏㄢˋ', note: '和 = and (standalone)' },
  // 重: ㄓㄨㄥˋ (heavy/important) vs ㄔㄨㄥˊ (repeat/again)
  { sentence: '這件事很重要',   char: '重', occurrence: 1, expect: 'ㄓㄨㄥˋ', note: '重要 = important' },
  { sentence: '請不要重複說話', char: '重', occurrence: 1, expect: 'ㄔㄨㄥˊ', note: '重複 = repeat' },
  // 樂: ㄌㄜˋ (happy) vs ㄩㄝˋ (music)
  { sentence: '大家都很快樂',   char: '樂', occurrence: 1, expect: 'ㄌㄜˋ', note: '快樂 = happy' },
  { sentence: '我喜歡聽音樂',   char: '樂', occurrence: 1, expect: 'ㄩㄝˋ', note: '音樂 = music' },
  // 行: ㄒㄧㄥˊ (walk/ok) vs ㄏㄤˊ (row/bank)
  { sentence: '媽媽去銀行存錢', char: '行', occurrence: 1, expect: 'ㄏㄤˊ', note: '銀行 = bank' },
];

let pass = 0;
let fail = 0;

for (const c of CASES) {
  const zc = zhuyinize(c.sentence);
  // find the nth occurrence of the target char
  let seen = 0;
  let got = '<not found>';
  for (const item of zc) {
    if (item.char === c.char) {
      seen += 1;
      if (seen === c.occurrence) { got = item.pinyin; break; }
    }
  }
  const ok = got === c.expect;
  if (ok) pass += 1; else fail += 1;
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${c.sentence}  「${c.char}」→ ${got}  (expect ${c.expect}; ${c.note})`);
}

console.log(`\n${pass}/${pass + fail} passed.`);
if (fail > 0) process.exit(1);
