/**
 * AI 兒童測試員 (AI Child Tester)
 *
 * 模擬不同性格的國小學生使用 RedMushroom 應用程式，回報通過率、平均得分、
 * 答題時間等指標，可用於 stress test 與 UX 驗證。
 *
 * 使用方式：
 *   npx tsx tests/ai-child-tester.ts                       # 預設：1 個careful persona
 *   npx tsx tests/ai-child-tester.ts --batch 50            # 跑 50 場
 *   npx tsx tests/ai-child-tester.ts --batch 50 --random-persona
 *   npx tsx tests/ai-child-tester.ts --persona random      # 用 random persona 跑一場
 *
 * 預先條件：前後端已透過 `npm start` 啟動，且 /api/auth 可登入 student1。
 */
import { chromium, type Page, type Browser } from '@playwright/test';

type Persona = 'careful' | 'random' | 'speedy' | 'guesser';

interface RunResult {
  persona: Persona;
  theory: string;
  total_score: number;
  correct: number;
  total_questions: number;
  duration_ms: number;
  passed: boolean;
  level_up: boolean;
  praise: string;
}

interface CliArgs {
  batch: number;
  persona: Persona | null;
  randomPersona: boolean;
  baseURL: string;
  username: string;
  password: string;
  headless: boolean;
}

const ALL_PERSONAS: Persona[] = ['careful', 'random', 'speedy', 'guesser'];
const THEORIES = ['cognitive', 'input', 'usage', 'sociocultural'];
const THEORY_LABELS: Record<string, string> = {
  cognitive: '語詞認知',
  input: '語言輸入',
  usage: '語言運用',
  sociocultural: '社文語境',
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    batch: 1,
    persona: null,
    randomPersona: false,
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    username: process.env.RM_USERNAME ?? 'student1',
    password: process.env.RM_PASSWORD ?? 'student123',
    headless: !process.env.HEADED,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--batch') args.batch = parseInt(argv[++i] ?? '1', 10);
    else if (a === '--persona') args.persona = (argv[++i] ?? 'careful') as Persona;
    else if (a === '--random-persona') args.randomPersona = true;
    else if (a === '--headed') args.headless = false;
  }
  return args;
}

function pickPersona(args: CliArgs, runIdx: number): Persona {
  if (args.randomPersona) return ALL_PERSONAS[Math.floor(Math.random() * ALL_PERSONAS.length)];
  if (args.persona) return args.persona;
  return ALL_PERSONAS[runIdx % ALL_PERSONAS.length];
}

/**
 * Persona answer strategy.
 * Receives the available option keys (e.g. ['1','2','3','4']) and option text lengths.
 * Returns the chosen key.
 */
function chooseAnswer(persona: Persona, optionKeys: string[], optionTexts: string[]): string {
  switch (persona) {
    case 'careful':
      // 80% pick option 1 (which our generator always uses as correct),
      // 20% pick randomly — simulates a kid who reads carefully but isn't infallible.
      return Math.random() < 0.8 ? optionKeys[0] : optionKeys[Math.floor(Math.random() * optionKeys.length)];
    case 'random':
      return optionKeys[Math.floor(Math.random() * optionKeys.length)];
    case 'speedy':
      // First-clickable option, no reading
      return optionKeys[0];
    case 'guesser': {
      // "longest option is usually correct" heuristic
      let maxLen = -1, maxIdx = 0;
      optionTexts.forEach((t, i) => { if (t.length > maxLen) { maxLen = t.length; maxIdx = i; } });
      return optionKeys[maxIdx];
    }
  }
}

function thinkTime(persona: Persona): number {
  switch (persona) {
    case 'careful': return 700 + Math.random() * 800;  // 0.7-1.5s
    case 'random':  return 300 + Math.random() * 400;
    case 'speedy':  return 100 + Math.random() * 100;
    case 'guesser': return 500 + Math.random() * 600;
  }
}

async function login(page: Page, args: CliArgs): Promise<void> {
  await page.goto(args.baseURL);
  await page.waitForSelector('[placeholder="輸入帳號"]', { timeout: 10_000 });
  await page.fill('[placeholder="輸入帳號"]', args.username);
  await page.fill('[placeholder="輸入密碼"]', args.password);
  await Promise.all([
    page.waitForSelector('text=今天要練習哪個主題？', { timeout: 10_000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function selectTheory(page: Page, theory: string): Promise<void> {
  await page.click(`text=${THEORY_LABELS[theory]}`);
  await page.waitForSelector('.answer-btn', { timeout: 10_000 });
}

async function answerOneQuestion(page: Page, persona: Persona): Promise<void> {
  await page.waitForTimeout(thinkTime(persona));

  // Single-choice path: there will be .answer-btn rows.
  const buttons = await page.locator('.answer-btn').all();
  if (buttons.length > 0) {
    const texts: string[] = [];
    for (const b of buttons) texts.push((await b.innerText()).trim());
    const keys = ['1', '2', '3', '4'].slice(0, buttons.length);
    const pickKey = chooseAnswer(persona, keys, texts);
    const pickIdx = keys.indexOf(pickKey);
    await buttons[pickIdx].click({ trial: false }).catch(() => undefined);
    return;
  }

  // Sorting path: just submit whatever default order is on screen.
  const confirm = page.getByRole('button', { name: /確認順序/ });
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click().catch(() => undefined);
  }
}

async function runOne(browser: Browser, args: CliArgs, runIdx: number): Promise<RunResult> {
  const persona = pickPersona(args, runIdx);
  const theory = THEORIES[runIdx % THEORIES.length];
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const started = Date.now();

  try {
    await login(page, args);
    await selectTheory(page, theory);

    // Quiz is 5 (SEN) or 10 questions. Loop until we land on /result.
    let safetyHops = 12;
    while (safetyHops-- > 0) {
      const onResult = await page.locator('text=/總分|測驗結果|分$/').first().isVisible().catch(() => false);
      if (onResult) break;
      await answerOneQuestion(page, persona);
      // SEN board 1.8s cool-down, normal 1.2s — wait a bit longer than the longer of the two
      await page.waitForTimeout(2000);
    }

    const duration_ms = Date.now() - started;

    // Pull the score off the page. ScoreModal renders "{N} 分" as a big number.
    const scoreText = await page.locator('text=/\\d+\\s*分$/').first().innerText().catch(() => '0 分');
    const total_score = parseInt(scoreText.match(/\d+/)?.[0] ?? '0', 10);

    const correctMatch = await page.locator('text=/答對 \\d+ \\/ \\d+ 題/').first().innerText().catch(() => '答對 0 / 0 題');
    const m = correctMatch.match(/(\d+)\s*\/\s*(\d+)/);
    const correct = m ? parseInt(m[1], 10) : 0;
    const total_questions = m ? parseInt(m[2], 10) : 0;

    const level_up = await page.locator('text=升級了').first().isVisible().catch(() => false);
    const praise = await page.locator('.italic').first().innerText().catch(() => '');

    return {
      persona,
      theory,
      total_score,
      correct,
      total_questions,
      duration_ms,
      passed: total_score >= 60,
      level_up,
      praise: praise.replace(/[「」]/g, '').trim(),
    };
  } finally {
    await ctx.close();
  }
}

function summarise(results: RunResult[]): void {
  console.log('\n──────── 測試摘要 ────────');
  console.log(`總場次：${results.length}`);
  const pass = results.filter((r) => r.passed).length;
  const avg = results.reduce((s, r) => s + r.total_score, 0) / Math.max(1, results.length);
  const avgDur = results.reduce((s, r) => s + r.duration_ms, 0) / Math.max(1, results.length);
  console.log(`通過率：${(pass * 100 / results.length).toFixed(1)}%`);
  console.log(`平均得分：${avg.toFixed(1)}`);
  console.log(`平均一場耗時：${(avgDur / 1000).toFixed(1)}s`);

  const byPersona = new Map<Persona, RunResult[]>();
  for (const r of results) {
    if (!byPersona.has(r.persona)) byPersona.set(r.persona, []);
    byPersona.get(r.persona)!.push(r);
  }
  console.log('\n── 依 persona 分組 ──');
  for (const [p, rs] of byPersona) {
    const pPass = rs.filter((r) => r.passed).length;
    const pAvg = rs.reduce((s, r) => s + r.total_score, 0) / rs.length;
    console.log(`  ${p.padEnd(10)} n=${rs.length}  通過率 ${(pPass * 100 / rs.length).toFixed(0)}%  均分 ${pAvg.toFixed(1)}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  console.log(`[ai-child-tester] persona=${args.persona ?? (args.randomPersona ? 'random-mix' : 'rotating')} batch=${args.batch} url=${args.baseURL}`);

  const browser = await chromium.launch({ headless: args.headless });
  const results: RunResult[] = [];
  try {
    for (let i = 0; i < args.batch; i++) {
      try {
        const r = await runOne(browser, args, i);
        results.push(r);
        console.log(
          `[${i + 1}/${args.batch}] ${r.persona.padEnd(8)} ${THEORY_LABELS[r.theory]} ` +
          `${r.total_score} 分 (${r.correct}/${r.total_questions})  ${r.passed ? '✅' : '❌'}` +
          (r.level_up ? ' 🌟升級' : '')
        );
      } catch (err) {
        console.error(`[${i + 1}/${args.batch}] 失敗：${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    await browser.close();
  }
  summarise(results);
  process.exit(results.length > 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
